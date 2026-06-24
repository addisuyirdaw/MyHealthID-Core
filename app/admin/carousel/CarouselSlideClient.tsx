"use client";

import React, { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Trash2,
  Edit3,
  Plus,
  Save,
  X,
  Image as ImageIcon,
  Loader2,
  Check,
  AlertTriangle,
  ShieldCheck,
  GripVertical,
  Languages,
  LayoutPanelLeft,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface CarouselSlide {
  id: string;
  imageUrl: string;
  headingEn: string;
  headingAm: string;
  textEn: string;
  textAm: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface CarouselSlideClientProps {
  initialSlides: CarouselSlide[];
  userName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  imageUrl: "",
  headingEn: "",
  headingAm: "",
  textEn: "",
  textAm: "",
  sortOrder: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function CarouselSlideClient({
  initialSlides,
  userName,
}: CarouselSlideClientProps) {
  const [slides, setSlides] = useState<CarouselSlide[]>(initialSlides);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewLocale, setPreviewLocale] = useState<"en" | "am">("en");
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // ── Form helpers ─────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
  }, []);

  const handleEditClick = (slide: CarouselSlide) => {
    setEditingId(slide.id);
    setForm({
      imageUrl: slide.imageUrl,
      headingEn: slide.headingEn,
      headingAm: slide.headingAm,
      textEn: slide.textEn,
      textAm: slide.textAm,
      sortOrder: slide.sortOrder,
    });
    setError(null);
    setSuccess(null);
  };

  const field = (key: keyof typeof EMPTY_FORM, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleUpload = async (file: File) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError("File exceeds maximum size limit of 5MB.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showError("Only JPEG, PNG, and WEBP images are allowed.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/admin/carousel/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to upload file.");
      }

      field("imageUrl", data.imageUrl);
      showSuccess("Image uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      showError(err.message || "An error occurred during file upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setError(null);
    setTimeout(() => setSuccess(null), 4000);
  };

  const showError = (msg: string) => {
    setError(msg);
    setSuccess(null);
  };

  // ── Refresh slides from API ───────────────────────────────────────────────
  const refreshSlides = async () => {
    const res = await fetch("/api/admin/carousel", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setSlides(data.slides ?? []);
    }
  };

  // ── Submit (Create / Update) ──────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const { imageUrl, headingEn, headingAm, textEn, textAm } = form;
    if (!imageUrl.trim() || !headingEn.trim() || !headingAm.trim() || !textEn.trim() || !textAm.trim()) {
      showError("All fields except Sort Order are required.");
      return;
    }

    startTransition(async () => {
      try {
        const body = {
          imageUrl: imageUrl.trim(),
          headingEn: headingEn.trim(),
          headingAm: headingAm.trim(),
          textEn: textEn.trim(),
          textAm: textAm.trim(),
          sortOrder: Number(form.sortOrder) || 0,
        };

        if (editingId) {
          // UPDATE
          const res = await fetch(`/api/admin/carousel/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const d = await res.json();
            throw new Error(d.error || "Update failed.");
          }
          showSuccess("Slide updated successfully.");
        } else {
          // CREATE
          const res = await fetch("/api/admin/carousel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const d = await res.json();
            throw new Error(d.error || "Create failed.");
          }
          showSuccess("New slide added to the carousel.");
        }

        resetForm();
        await refreshSlides();
      } catch (err: any) {
        showError(err.message || "An unexpected error occurred.");
      }
    });
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (id: string, heading: string) => {
    if (!confirm(`Delete slide "${heading}"? This action cannot be undone.`)) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/carousel/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Delete failed.");
        }
        showSuccess("Slide deleted.");
        await refreshSlides();
      } catch (err: any) {
        showError(err.message || "An unexpected error occurred.");
      }
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* ── Ambient glow blobs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[42%] h-[42%] bg-blue-600/6 rounded-full blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[38%] h-[38%] bg-indigo-600/5 rounded-full blur-[130px]" />
      </div>

      {/* ── Top Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-neutral-800/80 bg-neutral-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm leading-none">MyHealthID</p>
              <p className="text-neutral-500 text-[10px] font-medium">Admin Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 hidden sm:block">{userName}</span>
            <Link href="/admin/dashboard">
              <button className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold px-3 py-2 rounded-xl transition border border-neutral-700 cursor-pointer">
                <ArrowLeft className="w-3.5 h-3.5" />
                Dashboard
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Page Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-500/25 flex items-center justify-center">
              <LayoutPanelLeft className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-none">
                Carousel Slide Manager
              </h1>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                System Administrator · Landing Page Configuration
              </p>
            </div>
          </div>
          <p className="text-sm text-neutral-400 max-w-2xl mt-3">
            Configure the public landing page hero carousel. Changes publish immediately without redeployment. All text is bilingual — provide both English and Amharic content for each slide.
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-950/30 px-5 py-4 text-red-300 animate-in slide-in-from-top-2 duration-200">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-5 py-4 text-emerald-300 animate-in slide-in-from-top-2 duration-200">
            <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <p className="text-sm font-semibold">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* ── Form Panel (left) ── */}
          <div className="xl:col-span-4 bg-neutral-900/50 backdrop-blur-md border border-neutral-800/80 rounded-3xl p-6 shadow-2xl sticky top-20">
            <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
              {editingId ? (
                <><Edit3 className="w-4 h-4 text-amber-400" /> Edit Slide</>
              ) : (
                <><Plus className="w-4 h-4 text-blue-400" /> New Slide</>
              )}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Image Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">
                  Slide Image <span className="text-red-400">*</span>
                </label>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-upload")?.click()}
                  className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 min-h-[160px] ${
                    dragActive
                      ? "border-blue-500 bg-blue-500/5"
                      : "border-neutral-800 bg-neutral-950 hover:border-neutral-700 hover:bg-neutral-900/50"
                  }`}
                >
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />

                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      <p className="text-xs text-neutral-400">Uploading image...</p>
                    </div>
                  ) : form.imageUrl ? (
                    <div className="relative w-full h-full group/preview">
                      <div className="rounded-xl overflow-hidden border border-neutral-800 aspect-video bg-neutral-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/images/fallback-carousel.jpg";
                          }}
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 flex items-center justify-center transition-opacity duration-300 rounded-xl">
                        <p className="text-xs text-white font-bold flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4" /> Change Image
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-300 font-bold">
                          Drag & drop image here or click to select
                        </p>
                        <p className="text-[10px] text-neutral-500 mt-1">
                          JPEG, PNG, or WEBP (Max 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bilingual section divider */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 border-t border-neutral-800" />
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                  <Languages className="w-3 h-3" /> Bilingual Content
                </span>
                <div className="flex-1 border-t border-neutral-800" />
              </div>

              {/* English Heading */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">
                  English Heading <span className="text-red-400">*</span>
                </label>
                <input
                  id="carousel-heading-en"
                  type="text"
                  placeholder="e.g. National Digital Health ID"
                  value={form.headingEn}
                  onChange={(e) => field("headingEn", e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Amharic Heading */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">
                  Amharic Heading <span className="text-red-400">*</span>
                </label>
                <input
                  id="carousel-heading-am"
                  type="text"
                  placeholder="ለምሳሌ፡ ሀገራዊ ዲጂታል ጤና መታወቂያ"
                  value={form.headingAm}
                  onChange={(e) => field("headingAm", e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition font-[system-ui]"
                  dir="auto"
                />
              </div>

              {/* English Body */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">
                  English Body Copy <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="carousel-text-en"
                  placeholder="Describe the slide in a sentence or two…"
                  value={form.textEn}
                  onChange={(e) => field("textEn", e.target.value)}
                  rows={3}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

              {/* Amharic Body */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">
                  Amharic Body Copy <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="carousel-text-am"
                  placeholder="ስላይዱን በአንድ ወይም ሁለት ዓረፍተ ነገር ይግለጹ…"
                  value={form.textAm}
                  onChange={(e) => field("textAm", e.target.value)}
                  rows={3}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition resize-none font-[system-ui]"
                  dir="auto"
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">
                  Sort Order
                </label>
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-neutral-600 shrink-0" />
                  <input
                    id="carousel-sort-order"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={form.sortOrder}
                    onChange={(e) => field("sortOrder", parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <p className="text-[10px] text-neutral-600 mt-1.5">Lower numbers appear first in the carousel.</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  id="carousel-save-btn"
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-70 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition shadow-lg cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingId ? "Update Slide" : "Add Slide"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm px-4 py-2.5 rounded-xl transition border border-neutral-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* ── Data Grid (right) ── */}
          <div className="xl:col-span-8 space-y-5">
            {/* Grid Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <LayoutPanelLeft className="w-4.5 h-4.5 text-indigo-400" />
                  Active Slides ({slides.length})
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">Slides are displayed in ascending sort order on the public landing page.</p>
              </div>

              {/* Locale preview toggle */}
              <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
                <button
                  onClick={() => setPreviewLocale("en")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${previewLocale === "en" ? "bg-blue-600 text-white shadow" : "text-neutral-400 hover:text-white"}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setPreviewLocale("am")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${previewLocale === "am" ? "bg-blue-600 text-white shadow" : "text-neutral-400 hover:text-white"}`}
                >
                  አማ
                </button>
              </div>
            </div>

            {slides.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-neutral-900/30 border border-dashed border-neutral-800 rounded-3xl text-center">
                <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4">
                  <ImageIcon className="w-8 h-8 text-neutral-700" />
                </div>
                <p className="text-neutral-400 font-semibold">No slides configured yet.</p>
                <p className="text-xs text-neutral-600 max-w-xs mt-1.5">
                  Use the form to add your first bilingual carousel slide. It will appear on the public homepage immediately.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {slides.map((slide) => (
                  <div
                    key={slide.id}
                    className={`relative bg-neutral-900/40 border rounded-2xl overflow-hidden transition group flex flex-col ${
                      editingId === slide.id
                        ? "border-blue-500/60 ring-1 ring-blue-500/30 bg-neutral-900/70"
                        : "border-neutral-800/80 hover:border-neutral-700"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-full bg-neutral-950 overflow-hidden border-b border-neutral-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slide.imageUrl}
                        alt={previewLocale === "am" ? slide.headingAm : slide.headingEn}
                        className="object-cover w-full h-full group-hover:scale-105 transition duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/images/fallback-carousel.jpg";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-neutral-950/20 to-transparent" />

                      {/* Order badge */}
                      <span className="absolute bottom-3 left-3 text-[10px] bg-neutral-900/90 backdrop-blur border border-neutral-800 px-2 py-0.5 rounded-full text-neutral-400 font-bold">
                        Order: {slide.sortOrder}
                      </span>

                      {/* Active editing badge */}
                      {editingId === slide.id && (
                        <span className="absolute top-3 right-3 text-[10px] bg-blue-600 px-2 py-0.5 rounded-full text-white font-bold">
                          Editing
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5 mb-4">
                        <h3 className="text-sm font-bold text-white leading-snug" dir="auto">
                          {previewLocale === "am" ? slide.headingAm : slide.headingEn}
                        </h3>
                        <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed" dir="auto">
                          {previewLocale === "am" ? slide.textAm : slide.textEn}
                        </p>
                        {/* Show the other locale quietly */}
                        <p className="text-[10px] text-neutral-600 truncate">
                          {previewLocale === "am" ? (
                            <><span className="font-bold text-neutral-500">EN:</span> {slide.headingEn}</>
                          ) : (
                            <><span className="font-bold text-neutral-500">አማ:</span> {slide.headingAm}</>
                          )}
                        </p>
                      </div>

                      {/* Card Actions */}
                      <div className="flex gap-2 pt-3 border-t border-neutral-800/80">
                        <button
                          id={`edit-slide-${slide.id}`}
                          onClick={() => handleEditClick(slide)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 text-xs font-bold py-2 rounded-xl transition border border-neutral-700/60 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          id={`delete-slide-${slide.id}`}
                          onClick={() =>
                            handleDelete(
                              slide.id,
                              previewLocale === "am" ? slide.headingAm : slide.headingEn
                            )
                          }
                          disabled={isPending}
                          className="flex items-center justify-center gap-1.5 bg-red-950/20 hover:bg-red-950/60 text-red-400 hover:text-red-300 text-xs font-bold px-3 py-2 rounded-xl transition border border-red-900/30 hover:border-red-500/40 cursor-pointer"
                          title="Delete slide"
                        >
                          {isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Info footer */}
            {slides.length > 0 && (
              <p className="text-[11px] text-neutral-600 text-center pt-2">
                {slides.length} slide{slides.length !== 1 ? "s" : ""} configured · Changes reflect instantly on the public landing page
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
