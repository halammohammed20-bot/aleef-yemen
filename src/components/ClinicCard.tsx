import React, { useState, useRef } from "react";
import { Phone, MapPin, Star, ShieldAlert, Check, Clock, MessageSquare, Upload, Plus, Sparkles, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { Clinic, ClinicComment } from "../types";
import { uploadMedia, validateImageFile } from "../lib/storage";
import ImageCropper from "./ImageCropper";

interface ClinicCardProps {
  key?: React.Key;
  clinic: Clinic;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAddComment: (clinicId: string, comment: ClinicComment) => void;
  onAddImage: (clinicId: string, imageUrl: string) => void;
}

export default function ClinicCard({
  clinic,
  isExpanded,
  onToggleExpand,
  onAddComment,
  onAddImage,
}: ClinicCardProps) {
  // New Comment state
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Active image index
  const images = clinic.images || [];
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !commentText.trim()) {
      setError("الرجاء إدخال اسمك وكتابة التعليق أولاً.");
      return;
    }

    const newComment: ClinicComment = {
      id: "comment-" + Date.now(),
      authorName: authorName.trim(),
      rating,
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    };

    onAddComment(clinic.id, newComment);

    // Clear state
    setAuthorName("");
    setRating(5);
    setCommentText("");
    setError("");
    setSuccess("تم إضافة تعليقك وتقييمك بنجاح! شكراً لك ❤️");

    setTimeout(() => {
      setSuccess("");
    }, 4000);
  };

  const [imageUploadProgress, setImageUploadProgress] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  // Handle device image upload: يفتح أداة الاقتصاص أولاً، ثم يرفع الصورة المُقتصَّة
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      e.target.value = "";
      return;
    }

    setError("");
    const err = validateImageFile(file);
    if (err) {
      setError(err);
      e.target.value = "";
      return;
    }
    setCropFile(file);
    e.target.value = "";
  };

  const handleCropConfirm = async (croppedFile: File) => {
    setCropFile(null);
    setImageUploadProgress(true);
    try {
      const url = await uploadMedia(croppedFile, "clinics");
      onAddImage(clinic.id, url);
      setActiveImageIndex(images.length);
    } catch (err: any) {
      setError(err?.message || "تعذر رفع الصورة. حاول مرة أخرى.");
    } finally {
      setImageUploadProgress(false);
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    // Avoid expanding when clicking active links or buttons
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest("input") || target.closest("textarea")) {
      return;
    }
    onToggleExpand();
  };

  return (
    <div
      onClick={handleToggleClick}
      className={`bg-white rounded-3xl border ${
        isExpanded ? "border-brand-400 ring-4 ring-brand-50" : "border-[#f3ede4]"
      } p-6 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between w-full cursor-pointer group`}
    >
      {/* Outer grid - image beside details on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column / Image: 4 cols */}
        <div className="md:col-span-4 w-full">
          <div className="relative aspect-16/10 md:aspect-4/3 w-full bg-gray-50 rounded-2xl overflow-hidden border border-[#f3ede4]">
            {images.length > 0 ? (
              <img
                src={images[activeImageIndex]}
                alt={clinic.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-all duration-300"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4">
                <ImageIcon className="w-10 h-10 mb-1.5 stroke-1" />
                <span className="text-xs font-black text-center">لا توجد صور حالياً</span>
              </div>
            )}

            {/* Badge Overlay */}
            {clinic.hasEmergency && (
              <div className="absolute top-2 right-2">
                <span className="shrink-0 flex items-center gap-1 text-[9px] font-black bg-rose-600 border border-rose-500 text-white px-2 py-0.5 rounded-md shadow-md">
                  <ShieldAlert className="w-3 h-3" />
                  طوارئ 24ساعة
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails if clinic has multiple images and is expanded */}
          {isExpanded && images.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pt-2 pb-1" onClick={(e) => e.stopPropagation()}>
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImageIndex(i)}
                  className={`relative w-12 h-9 shrink-0 rounded-lg overflow-hidden border transition-all ${
                    activeImageIndex === i ? "border-brand-600 ring-2 ring-brand-100" : "border-gray-200 opacity-70"
                  }`}
                >
                  <img src={img} alt="thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column / Details: 8 cols */}
        <div className="md:col-span-8 space-y-3">
          {/* Title and Expand State Indicator */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-gray-900 group-hover:text-brand-600 transition-colors leading-tight">
                {clinic.name}
              </h3>
              {/* Rating */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="flex items-center text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.floor(clinic.rating) ? "fill-current" : "opacity-30"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-black text-gray-700">{clinic.rating}</span>
              </div>
            </div>

            <span className="p-1.5 bg-gray-50 text-gray-400 rounded-xl group-hover:text-brand-600 group-hover:bg-brand-50 transition-all shrink-0">
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </span>
          </div>

          {/* Location & Address */}
          <div className="space-y-1.5 text-xs font-bold text-gray-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span className="text-gray-800 font-black">{clinic.city} - {clinic.address}</span>
            </div>
            {clinic.workingHours && (
              <div className="flex items-center gap-1.5 text-gray-400">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>ساعات العمل: {clinic.workingHours}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {clinic.description && (
            <p className="text-xs text-gray-600 font-semibold leading-relaxed line-clamp-2">
              {clinic.description}
            </p>
          )}

          {/* Call & Quick Details buttons */}
          <div className="pt-3 flex items-center justify-between border-t border-gray-50" onClick={(e) => e.stopPropagation()}>
            <span className="text-[11px] font-bold text-gray-400">الهاتف: {clinic.phone}</span>
            <div className="flex gap-2">
              <button
                onClick={onToggleExpand}
                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-black transition-all"
              >
                {isExpanded ? "إغلاق التفاصيل" : "عرض التفاصيل البيطرية"}
              </button>
              <a
                href={`tel:${clinic.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-600 text-brand-700 hover:text-white rounded-lg text-xs font-black transition-all duration-300"
              >
                <Phone className="w-3.5 h-3.5" />
                اتصل بالدكتور
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Accordion Inner Layout */}
      {isExpanded && (
        <div className="mt-6 pt-6 border-t border-gray-100 space-y-6 w-full animate-fadeIn" onClick={(e) => e.stopPropagation()}>
          {/* Services Section */}
          {clinic.services && clinic.services.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-600" />
                الخدمات الطبية والرعاية البيطرية المتوفرة:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {clinic.services.map((service, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 bg-brand-50/20 border border-brand-100/30 rounded-xl text-xs font-bold text-gray-700"
                  >
                    <div className="w-4 h-4 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>{service}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Rating & Reviews Engine */}
          <div className="space-y-4 pt-2 border-t border-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-brand-600" />
                <h4 className="text-xs font-black text-gray-900">آراء ومراجعات المربين ({clinic.comments?.length || 0})</h4>
              </div>

              {/* Upload image action button inside card — إدخال ملف ظاهر بالكامل لضمان عمله على الجوال */}
              <div className="flex items-center gap-1 bg-brand-50 rounded-lg px-1.5 py-1">
                <Upload className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                <span className="text-[10px] font-black text-brand-700 shrink-0">
                  {imageUploadProgress ? "جاري الرفع..." : "رفع صورة:"}
                </span>
                <input
                  type="file"
                  onChange={handleImageUpload}
                  accept="image/*"
                  disabled={imageUploadProgress}
                  className="block w-[76px] text-[8px] text-transparent file:mr-1 file:py-1 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:font-black file:bg-brand-600 file:text-white file:cursor-pointer disabled:opacity-50"
                />
              </div>
            </div>

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] font-bold rounded-xl">
                {success}
              </div>
            )}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-[11px] font-bold rounded-xl">
                {error}
              </div>
            )}

            {/* List of comments */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {!clinic.comments || clinic.comments.length === 0 ? (
                <div className="text-center py-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-[11px] text-gray-400 font-bold">لا تتوفر مراجعات حالياً. كن أول من يكتب تجربته!</p>
                </div>
              ) : (
                clinic.comments.map((comment) => (
                  <div key={comment.id} className="p-3 bg-gray-50/70 rounded-xl border border-gray-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-gray-800">{comment.authorName}</span>
                      <div className="flex items-center text-amber-400">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`w-3 h-3 ${
                              idx < comment.rating ? "fill-current" : "opacity-35"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed font-semibold">
                      {comment.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleSubmitComment} className="p-4 bg-brand-50/30 border border-brand-100/60 rounded-2xl space-y-3.5">
              <h5 className="text-[11px] font-black text-brand-900">شارك تجربتك واكتب تقييماً للعيادة:</h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-gray-500 mb-1">اسمك الكريم *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: يوسف..."
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-gray-500 mb-1">التقييم بالنجوم *</label>
                  <div className="flex items-center gap-1 h-8 bg-white border border-gray-200 rounded-lg px-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRating(i + 1)}
                        className="text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            i < rating ? "fill-current" : "opacity-35"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-[10px] font-black text-gray-400 mr-1.5">({rating}/5)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 mb-1">تعليقك ووصف تجربتك *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="كيف كان مستوى الطبيب، النظافة، الرعاية، والأسعار؟"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="text-left">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-black transition-all shadow-sm"
                >
                  إرسال التقييم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cropFile && (
        <ImageCropper file={cropFile} onCancel={() => setCropFile(null)} onConfirm={handleCropConfirm} />
      )}
    </div>
  );
}
