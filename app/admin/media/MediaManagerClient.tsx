"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Trash2, Edit3, Plus, Save, X, Image as ImageIcon,
  Eye, EyeOff, Loader2, Check, ArrowRight, ShieldCheck, AlertTriangle
} from "lucide-react";
import { uploadLandingMedia, updateLandingMedia, deleteLandingMedia } from "@/lib/actions/media.actions";

interface MediaItem {
  id: string;
  imageUrl: string;
  altText: string;
  title: string | null;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  uploadedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MediaManagerClientProps {
  initialItems: any[];
  userName: string;
}

export default function MediaManagerClient({ initialItems, userName }: MediaManagerClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<MediaItem[]>(initialItems as MediaItem[]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [altText, setAltText] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.type.startsWith("image/")) {
        setError("Only image files are allowed.");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  // Reset form
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAltText("");
    setDisplayOrder(0);
    setIsActive(true);
    setImageUrl("");
    setFile(null);
    setEditingId(null);
    setError(null);
  };

  // Switch to editing mode
  const handleEditClick = (item: MediaItem) => {
    setEditingId(item.id);
    setTitle(item.title || "");
    setDescription(item.description || "");
    setAltText(item.altText);
    setDisplayOrder(item.displayOrder);
    setIsActive(item.isActive);
    setImageUrl(item.imageUrl);
    setFile(null);
    setError(null);
    setSuccess(null);
  };

  // Handle Form Submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!altText.trim()) {
      setError("Alt text is required for accessibility.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingId) {
          // Update Mode
          let finalImageUrl = imageUrl;
          
          if (file) {
            // If they uploaded a new file during edit, do standard upload media and delete the old record, or update it
            const formData = new FormData();
            formData.append("file", file);
            formData.append("altText", altText);
            formData.append("title", title);
            formData.append("description", description);
            formData.append("displayOrder", displayOrder.toString());
            formData.append("isActive", isActive.toString());
            
            // Delete old record
            await deleteLandingMedia(editingId);
            // Upload new
            await uploadLandingMedia(formData);
          } else {
            // Update fields of the existing record
            await updateLandingMedia(editingId, {
              title: title || null,
              description: description || null,
              altText,
              displayOrder: Number(displayOrder),
              isActive,
              imageUrl: finalImageUrl,
            });
          }
          setSuccess("Media item updated successfully!");
        } else {
          // Create Mode
          const formData = new FormData();
          if (file) {
            formData.append("file", file);
          } else if (imageUrl.trim()) {
            formData.append("imageUrl", imageUrl.trim());
          } else {
            setError("Please upload an image file or provide an image URL.");
            return;
          }
          formData.append("title", title);
          formData.append("description", description);
          formData.append("altText", altText);
          formData.append("displayOrder", displayOrder.toString());
          formData.append("isActive", isActive.toString());

          await uploadLandingMedia(formData);
          setSuccess("Media item added successfully!");
        }

        resetForm();
        router.refresh();
        // Wait briefly for server state to sync and update local list
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err: any) {
        setError(err.message || "An error occurred.");
      }
    });
  };

  // Handle Delete
  const handleDeleteClick = async (id: string) => {
    if (!confirm("Are you sure you want to delete this image from the carousel?")) {
      return;
    }
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await deleteLandingMedia(id);
        setSuccess("Media item deleted successfully!");
        router.refresh();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err: any) {
        setError(err.message || "An error occurred.");
      }
    });
  };

  // Toggle active quick action
  const handleToggleActive = async (item: MediaItem) => {
    startTransition(async () => {
      try {
        await updateLandingMedia(item.id, {
          isActive: !item.isActive,
        });
        router.refresh();
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } catch (err: any) {
        setError(err.message || "An error occurred.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* ── Background glows ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-8%] right-[-8%] w-[45%] h-[45%] bg-blue-500/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-8%] left-[-8%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[140px]" />
      </div>

      {/* ── TOP NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm leading-none">MyHealthID</p>
              <p className="text-neutral-500 text-[10px] font-medium">Admin Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-500 hidden sm:block">
              {userName} (System Admin)
            </span>
            <Link href="/admin/dashboard">
              <button className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold px-4 py-2 rounded-xl transition border border-neutral-700">
                <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Landing Carousel Media Manager
          </h1>
          <p className="text-sm text-neutral-400 max-w-2xl">
            Configure, order, and toggle active states for the public landing page hero carousel images.
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-950/30 px-5 py-4 text-red-300">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-5 py-4 text-emerald-300">
            <Check className="w-5 h-5 shrink-0 text-emerald-400" />
            <p className="text-sm font-semibold">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Side */}
          <div className="lg:col-span-4 bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" />
              {editingId ? "Edit Carousel Media" : "Upload Carousel Media"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Modern EMR System"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="e.g. Empowering clinicians with instant, secure patient records."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                  Alt Text (Required for accessibility)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Doctor viewing records on a tablet"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                  Display Order
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Upload image or use URL */}
              <div className="border border-neutral-800/80 rounded-xl p-4 bg-neutral-950/40 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                    Upload Image File
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20 cursor-pointer"
                    />
                  </div>
                  {file && (
                    <p className="text-[11px] text-emerald-400 mt-1">
                      Selected: {file.name} ({Math.round(file.size / 1024)} KB)
                    </p>
                  )}
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-neutral-800"></div>
                  <span className="flex-shrink mx-4 text-neutral-500 text-xs font-bold">OR</span>
                  <div className="flex-grow border-t border-neutral-800"></div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                    Direct Image URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-neutral-800 bg-neutral-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-neutral-950 h-4.5 w-4.5"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-neutral-300 cursor-pointer select-none">
                  Set Active (Visible in carousel)
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition shadow-lg"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingId ? "Update Media" : "Add to Carousel"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm px-4 py-2.5 rounded-xl transition border border-neutral-700"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Grid Side */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-400" />
                Active Carousel Items ({items.length})
              </h2>
              <span className="text-xs text-neutral-500 font-medium">Sorted by Display Order</span>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-neutral-900/30 border border-dashed border-neutral-800 rounded-3xl text-center">
                <ImageIcon className="w-12 h-12 text-neutral-700 mb-4" />
                <p className="text-neutral-400 font-medium">No media uploaded yet.</p>
                <p className="text-xs text-neutral-600 max-w-sm mt-1">Use the upload form to add your first landing page carousel image.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`relative bg-neutral-900/40 border ${
                      editingId === item.id ? "border-blue-500/50 bg-neutral-900/70" : "border-neutral-800/80"
                    } rounded-2xl overflow-hidden hover:border-neutral-700/80 transition flex flex-col group`}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-full bg-neutral-950 overflow-hidden flex items-center justify-center border-b border-neutral-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt={item.altText}
                        className="object-cover w-full h-full group-hover:scale-105 transition duration-500"
                        onError={(e) => {
                          // Fallback icon if image fails to load
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/20 to-transparent opacity-60" />
                      
                      {/* Floating details */}
                      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                        <span className="text-[10px] bg-neutral-900/90 backdrop-blur border border-neutral-800 px-2 py-0.5 rounded-full text-neutral-400 font-bold">
                          Order: {item.displayOrder}
                        </span>
                        
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border transition ${
                            item.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/25"
                              : "bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/25"
                          }`}
                        >
                          {item.isActive ? (
                            <>
                              <Eye className="w-3 h-3" /> Visible
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" /> Hidden
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-1 mb-4">
                        <h3 className="text-sm font-bold text-white truncate">
                          {item.title || <span className="text-neutral-600 italic">No Title</span>}
                        </h3>
                        <p className="text-xs text-neutral-400 line-clamp-2">
                          {item.description || <span className="text-neutral-600 italic">No Description</span>}
                        </p>
                        <p className="text-[10px] text-neutral-500 truncate mt-1">
                          <span className="font-semibold">Alt:</span> {item.altText}
                        </p>
                      </div>

                      {/* Card Actions */}
                      <div className="flex gap-2 pt-3 border-t border-neutral-800/80">
                        <button
                          onClick={() => handleEditClick(item)}
                          className="flex-1 flex items-center justify-center gap-1 bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 text-xs font-bold py-2 rounded-xl transition border border-neutral-700"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>

                        <button
                          onClick={() => handleDeleteClick(item.id)}
                          className="flex items-center justify-center bg-red-950/20 hover:bg-red-950/60 text-red-400 p-2 rounded-xl transition border border-red-900/30 hover:border-red-500/40"
                          title="Delete image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
