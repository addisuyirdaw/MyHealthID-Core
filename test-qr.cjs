async function run() {
  const { Jimp } = await import("jimp");
  const QrCode = require("qrcode-reader");
  
  const imagePath = "C:/Users/usser/.gemini/antigravity/brain/64826e32-5efc-4f95-aafa-817477b3480e/media__1778518998269.jpg";
  console.log(`Loading image from ${imagePath}`);
  
  try {
    const image = await Jimp.read(imagePath);
    console.log(`Image loaded: ${image.bitmap.width}x${image.bitmap.height}`);
    
    function tryDecode(img, label) {
      return new Promise((resolve) => {
        const qr = new QrCode();
        qr.callback = function(err, value) {
          if (err) {
            console.log(`${label} FAILED: ${err}`);
            resolve(false);
          } else {
            console.log(`${label} SUCCESS:`, value.result);
            resolve(true);
          }
        };
        qr.decode(img.bitmap);
      });
    }

    if (await tryDecode(image, "Raw")) return;
    
    let clone = image.clone().greyscale().contrast(0.7);
    if (await tryDecode(clone, "Contrast")) return;

    let upscale = image.clone().resize({ w: image.bitmap.width * 2, h: image.bitmap.height * 2 });
    if (await tryDecode(upscale, "Upscale 2x")) return;
    
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
