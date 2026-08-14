import React, { useState, useRef } from "react";
import { X, MapPin, Phone, Star, ShieldAlert, Check, Clock, MessageSquare, Upload, Plus, Sparkles, Image as ImageIcon } from "lucide-react";
import { Clinic, ClinicComment } from "../types";
import { uploadMedia, validateImageFile } from "../lib/storage";
import ImageCropper from "./ImageCropper";

interface ClinicDetailsModalProps {
  clinic: Clinic | null;
  onClose: () => void;
  onAddComment: (clinicId: string, comment: ClinicComment) => void;
  onAddImage: (clinicId: string, imageUrl: string) => void;
}

export default function ClinicDetailsModal({
  clinic,
  onClose,
  onAddComment,
  onAddImage,
}: ClinicDetailsModalProps) {
  if (!clinic) return null;

  // New Comment state
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!file) return;

    setError("");
    const err = validateImageFile(file);
    if (err) {
      setError(err);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true" dir="rtl">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-brand-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-3xl bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-[#ede6dc] flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#f3ede4] bg-brand-50/50">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-brand-900">
                تفاصيل ومعلومات العيادة
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-grow">
            {/* Gallery Section */}
            <div className="space-y-3">
              <div className="relative aspect-16/9 w-full bg-gray-100 rounded-2xl overflow-hidden border border-[#f3ede4]">
                {images.length > 0 ? (
                  <img
                    src={images[activeImageIndex]}
                    alt={clinic.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-all duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 p-6">
                    <ImageIcon className="w-12 h-12 mb-2 stroke-1" />
                    <span className="text-sm font-bold">لا تتوفر صور للعيادة حالياً</span>
                  </div>
                )}

                {/* Badge Overlay */}
                <div className="absolute top-4 right-4 flex gap-2">
                  {clinic.hasEmergency && (
                    <span className="shrink-0 flex items-center gap-1 text-[11px] font-black bg-rose-600 border border-rose-500 text-white px-2.5 py-1 rounded-lg shadow-lg">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      طوارئ 24ساعة
                    </span>
                  )}
                </div>

                {/* Upload Button overlay on main image */}
                <div className="absolute bottom-4 left-4">
                  <button
                    disabled={imageUploadProgress}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600/90 hover:bg-brand-600 text-white text-xs font-black rounded-xl shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {imageUploadProgress ? "جاري الرفع..." : "رفع صورة من جهازك"}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                </div>
              </div>

              {/* Thumbnails */}
              {images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      className={`relative w-20 h-14 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        activeImageIndex === i ? "border-brand-600 ring-2 ring-brand-100" : "border-gray-200 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="clinic thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  
                  {/* Plus Thumb button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-14 shrink-0 rounded-lg border-2 border-dashed border-gray-300 hover:border-brand-400 bg-gray-50 flex flex-col items-center justify-center text-gray-400 hover:text-brand-600 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-[9px] font-bold mt-1">أضف صورة</span>
                  </button>
                </div>
              )}
            </div>

            {/* Clinic Details */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">
                  {clinic.name}
                </h2>
                <div className="flex items-center gap-1 mt-2">
                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(clinic.rating) ? "fill-current" : "opacity-30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-black text-gray-700">{clinic.rating} من 5 (بناءً على التقييمات)</span>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-brand-50/50 p-4 rounded-2xl border border-brand-100/60">
                <div className="flex items-start gap-2.5 text-xs">
                  <MapPin className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-gray-400 font-bold mb-0.5">العنوان والمحافظة</span>
                    <span className="text-gray-800 font-black">{clinic.city} - {clinic.address}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs">
                  <Phone className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-gray-400 font-bold mb-0.5">الهاتف المباشر</span>
                    <a href={`tel:${clinic.phone}`} className="text-brand-700 hover:underline font-black">{clinic.phone}</a>
                  </div>
                </div>

                {clinic.workingHours && (
                  <div className="flex items-start gap-2.5 text-xs sm:col-span-2 border-t border-brand-100/30 pt-3 mt-1">
                    <Clock className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-gray-400 font-bold mb-0.5">أوقات وساعات العمل</span>
                      <span className="text-gray-800 font-black">{clinic.workingHours}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Clinic Description */}
              {clinic.description && (
                <div className="space-y-1.5">
                  <h4 className="text-sm font-black text-gray-900">نبذة عن العيادة:</h4>
                  <p className="text-xs text-gray-600 font-semibold leading-relaxed">
                    {clinic.description}
                  </p>
                </div>
              )}

              {/* Services Offered */}
              {clinic.services && clinic.services.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <h4 className="text-sm font-black text-gray-900">الخدمات الطبية والرعاية المتوفرة:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {clinic.services.map((service, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-gray-50/70 border border-gray-100 rounded-xl text-xs font-bold text-gray-700">
                        <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span>{service}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Comments/Reviews List */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-brand-600" />
                <h4 className="text-base font-black text-gray-900">آراء المربين وتعليقات الناس ({clinic.comments?.length || 0})</h4>
              </div>

              {/* Add Comment success/error messages */}
              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-xl">
                  {success}
                </div>
              )}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl">
                  {error}
                </div>
              )}

              {/* Comments container */}
              <div className="space-y-3">
                {!clinic.comments || clinic.comments.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-xs text-gray-400 font-bold">لا توجد تعليقات بعد لهذا الطبيب. كن أول من يكتب تقييماً!</p>
                  </div>
                ) : (
                  clinic.comments.map((comment) => (
                    <div key={comment.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="block text-xs font-black text-gray-800">{comment.authorName}</span>
                          <span className="block text-[10px] text-gray-400 font-bold mt-0.5">
                            {new Date(comment.createdAt).toLocaleDateString("ar-YE", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        {/* Rating stars */}
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < Math.floor(comment.rating) ? "fill-current" : "opacity-30"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 font-semibold leading-relaxed">
                        {comment.text}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Leave Review Form */}
              <form onSubmit={handleSubmitComment} className="p-5 bg-brand-50/30 border border-brand-100 rounded-2xl space-y-4">
                <h5 className="text-xs font-black text-brand-900">أضف تجربتك وتقييمك الشخصي للعيادة:</h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-600 mb-1">اسمك الكريم *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: يوسف، خلود..."
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-600 mb-1">تقييمك الكلي *</label>
                    <div className="flex items-center gap-1.5 h-9 bg-white border border-gray-200 rounded-xl px-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setRating(i + 1)}
                          className="text-amber-400 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              i < rating ? "fill-current" : "opacity-35"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-black text-gray-500 mr-2">({rating} / 5)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-600 mb-1">تعليقك وتفاصيل تجربتك *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="اكتب كيف كانت جودة الرعاية البيطرية، المعاملة والأسعار..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="text-left">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-brand-600/10"
                  >
                    إرسال التقييم والتعليق
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {cropFile && (
        <ImageCropper file={cropFile} onCancel={() => setCropFile(null)} onConfirm={handleCropConfirm} />
      )}
    </div>
  );
}
