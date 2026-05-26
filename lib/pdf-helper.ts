/**
 * pdf-helper.ts
 * 
 * Dynamic loader for pdfjs-dist from CDN.
 * Renders uploaded PDF pages (such as National ID documents) to high-resolution PNG Files client-side.
 */

function loadPdfJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("PDF conversion can only be run in the browser."));
      return;
    }
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      // Configure PDF worker location using the matching version CDN worker script
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
      resolve(pdfjs);
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js library from CDN."));
    document.head.appendChild(script);
  });
}

/**
 * Converts a PDF file into an array of PNG Image Files (one per page).
 */
export async function convertPdfToImages(file: File): Promise<File[]> {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  
  // Load PDF
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const imageFiles: File[] = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    
    // Render at 2.0x scale to ensure details are preserved for OCR and QR decoding
    const viewport = page.getViewport({ scale: 2.0 });
    
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const context = canvas.getContext("2d");
    if (!context) throw new Error(`Could not create canvas context for page ${pageNum}.`);
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(`Page ${pageNum} render failed`))), "image/png");
    });
    
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    const pageFile = new File([blob], `${nameWithoutExt}-page-${pageNum}.png`, {
      type: "image/png"
    });
    
    imageFiles.push(pageFile);
  }
  
  return imageFiles;
}
