import React, { useState } from "react";
import { X, MapPin, Calendar, Phone, Heart, CheckCircle2, AlertTriangle, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { PetListing } from "../types";

interface PetDetailsModalProps {
  pet: PetListing | null;
  onClose: () => void;
}

export default function PetDetailsModal({ pet, onClose }: PetDetailsModalProps) {
  if (!pet) return null;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [elapsedText, setElapsedText] = useState<string | null>(null);

  const getElapsedString = (lostDate: string, lostTime?: string) => {
    const lostDateTimeStr = lostTime ? `${lostDate}T${lostTime}` : `${lostDate}T00:00:00`;
    const lostDateTime = new Date(lostDateTimeStr);
    const now = new Date();
    const diffMs = now.getTime() - lostDateTime.getTime();

    if (isNaN(lostDateTime.getTime()) || diffMs < 0) {
      return null;
    }

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    const hours = diffHours % 24;
    const mins = diffMins % 60;

    if (diffDays > 0) {
      return `منذ ${diffDays} يوم و ${hours} ساعة`;
    } else if (diffHours > 0) {
      return `منذ ${diffHours} ساعة و ${mins} دقيقة`;
    } else if (diffMins > 0) {
      return `منذ ${diffMins} دقيقة`;
    } else {
      return `منذ ثوانٍ قليلة`;
    }
  };

  React.useEffect(() => {
    if (pet.purpose === "lost" && pet.lostDate) {
      const updateText = () => {
        const text = getElapsedString(pet.lostDate!, pet.lostTime);
        setElapsedText(text);
      };
      updateText();
      const interval = setInterval(updateText, 60000); // update every minute
      return () => clearInterval(interval);
    }
  }, [pet.purpose, pet.lostDate, pet.lostTime]);

  // Pre-filled WhatsApp message
  const whatsappText = encodeURIComponent(
    `السلام عليكم ورحمة الله، تواصلت معك من خلال منصة "أليف" بخصوص الأليف الجميل "${pet.name}" المعروض لـ (${pet.purpose === "adoption" ? "التبني" : pet.purpose === "mating" ? "التزاوج" : pet.purpose === "rescue" ? "الإنقاذ العاجل" : "البحث عنه كمفقود"}). هل ما زال العرض متوفراً؟`
  );
  
  // Strip non-numbers from phone for WhatsApp link
  const cleanPhone = pet.ownerPhone.replace(/[^\d+]/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappText}`;

  // Multiple images list (fallback to single imageUrl)
  const images = pet.imageUrls && pet.imageUrls.length > 0 ? pet.imageUrls : [pet.imageUrl];

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
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
          
          {/* Close Button (Stays absolute on top left) */}
          <button
            onClick={onClose}
            className="absolute left-4 top-4 z-20 p-2 rounded-full bg-white/80 hover:bg-white text-gray-700 shadow-md transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Scrollable Container Content */}
          <div className="overflow-y-auto flex-grow text-right custom-scrollbar">
            
            {/* Hero Pet Image & Gallery Slider */}
            <div className="relative aspect-16/10 w-full bg-gray-100 shrink-0 group">
              <img
                src={images[activeImageIndex]}
                alt={`${pet.name} - ${activeImageIndex + 1}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-all duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
              
              {/* Navigation Arrows if there is more than 1 image */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all cursor-pointer z-10"
                    title="الصورة السابقة"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all cursor-pointer z-10"
                    title="الصورة التالية"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Overlay details */}
              <div className="absolute bottom-6 right-6 left-6 text-white text-right z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2 mb-2 items-center justify-start">
                    <span className="inline-block px-3.5 py-1 bg-brand-600 text-white text-xs font-black rounded-lg">
                      {pet.purpose === "adoption" ? "تبنّي" : pet.purpose === "mating" ? "طلب تزاوج" : pet.purpose === "rescue" ? "حالة إنقاذ 🚨" : "مفقود !"}
                    </span>
                    {pet.status && pet.status !== "available" && (
                      <span className="inline-block px-3.5 py-1 bg-emerald-600 text-white text-xs font-black rounded-lg animate-pulse">
                        {pet.status === "adopted" && "تم التبني 🎉"}
                        {pet.status === "rescued" && "تم الإنقاذ والتكفل به ✅"}
                        {pet.status === "found" && "تم العثور عليه وإرجاعه لبيته 🏠"}
                        {pet.status === "completed" && "تم التزاوج بنجاح 💖"}
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl font-black">{pet.name}</h2>
                </div>
                {images.length > 1 && (
                  <span className="bg-black/40 px-3 py-1 rounded-full text-xs font-bold text-gray-200">
                    {activeImageIndex + 1} / {images.length}
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail Carousel Dots or Miniature Images below the image */}
            {images.length > 1 && (
              <div className="bg-gray-50 p-3 border-b border-[#f3ede4] flex items-center justify-center gap-2 overflow-x-auto shrink-0">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-12 h-10 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      activeImageIndex === idx ? "border-brand-600 scale-105" : "border-gray-200 opacity-60"
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="p-6 sm:p-8">
              {/* Quick stats banner */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-brand-50/80 rounded-2xl border border-brand-100 text-center mb-6">
                <div>
                  <span className="block text-[11px] text-gray-500 font-bold">السلالة</span>
                  <span className="block text-sm font-extrabold text-brand-900 mt-1">{pet.breed}</span>
                </div>
                <div className="border-r border-l border-brand-200">
                  <span className="block text-[11px] text-gray-500 font-bold">العمر</span>
                  <span className="block text-sm font-extrabold text-brand-900 mt-1">{pet.age}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-gray-500 font-bold">المدينة</span>
                  <span className="block text-sm font-extrabold text-brand-900 mt-1 flex items-center justify-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-600" />
                    {pet.location}
                  </span>
                </div>
              </div>

              {/* Lost Pet Banner with Date/Time & Timer */}
              {pet.purpose === "lost" && pet.lostDate && (
                <div className="mb-6 p-4 bg-rose-50 rounded-2xl border border-rose-200 text-right flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black text-rose-950 flex items-center gap-1.5">
                      <span>📅 تاريخ ووقت الضياع:</span>
                    </span>
                    <span className="text-xs sm:text-sm font-black text-rose-800">
                      {pet.lostDate} {pet.lostTime && `الساعة ${pet.lostTime}`}
                    </span>
                  </div>
                  {elapsedText && (
                    <div className="flex items-center justify-between border-t border-rose-200/50 pt-2 text-xs sm:text-sm">
                      <span className="font-extrabold text-rose-900">⏱️ مضى على غيابه:</span>
                      <span className="font-black text-rose-600 animate-pulse text-sm sm:text-base">{elapsedText}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Description Section */}
              <div className="space-y-4">
                {pet.rescueStory && (
                  <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50/20 border-2 border-emerald-200 rounded-3xl text-right shadow-sm relative overflow-hidden">
                    <div className="absolute -left-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🏆</span>
                    </div>
                    <h4 className="text-base font-black text-emerald-950 flex items-center gap-2 mb-2">
                      <span>🎉</span>
                      قصة نجاح ملهمة: حكاية إنقاذ {pet.name}
                    </h4>
                    <p className="text-xs sm:text-sm text-emerald-900 font-semibold leading-relaxed whitespace-pre-line">
                      {pet.rescueStory}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="text-base font-black text-gray-900 mb-2">حول {pet.name}:</h4>
                  <p className="text-sm text-gray-600 font-medium leading-relaxed whitespace-pre-line">
                    {pet.description}
                  </p>
                </div>

                {/* Health and Vaccinations */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-black text-gray-900">الحالة الصحية:</span>
                      <span className="block text-xs text-gray-500 font-semibold mt-1">{pet.healthStatus}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 pt-2 border-t border-gray-100">
                    <ShieldCheck className={`w-5 h-5 ${pet.vaccinated ? "text-emerald-600" : "text-amber-500"}`} />
                    <div>
                      <span className="block text-xs font-black text-gray-900">حالة التحصينات والتطعيم:</span>
                      <span className={`block text-xs font-bold mt-0.5 ${pet.vaccinated ? "text-emerald-700" : "text-amber-700"}`}>
                        {pet.vaccinated ? "تم التحصين بالكامل وبحالة ممتازة" : "لم يطعم / يحتاج لتلقيح دوري"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Video Section */}
                {pet.videoUrl && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <span className="block text-xs font-black text-gray-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                      🎥 مقطع فيديو للأليف {pet.name}:
                    </span>
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-black aspect-video w-full mt-2 shadow-xs">
                      {pet.videoUrl.includes("youtube.com") || pet.videoUrl.includes("youtu.be") ? (
                        <iframe
                          src={
                            pet.videoUrl.includes("youtu.be")
                              ? `https://www.youtube.com/embed/${pet.videoUrl.split("/").pop()?.split("?")[0]}`
                              : `https://www.youtube.com/embed/${new URLSearchParams(new URL(pet.videoUrl.replace(/&amp;/g, "&")).search).get("v")}`
                          }
                          title={`مطلب فيديو للأليف ${pet.name}`}
                          className="w-full h-full border-0"
                          allowFullScreen
                        ></iframe>
                      ) : pet.videoUrl.startsWith("data:video") || pet.videoUrl.endsWith(".mp4") || pet.videoUrl.endsWith(".webm") ? (
                        <video
                          src={pet.videoUrl}
                          controls
                          className="w-full h-full"
                          preload="metadata"
                        ></video>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-gray-200 space-y-2">
                          <p className="text-xs font-bold">موقع الفيديو جاهز للمشاهدة على منصة خارجية:</p>
                          <a
                            href={pet.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 transition-all shadow-md shadow-rose-600/10"
                          >
                            تشغيل الفيديو الخارجي ↗
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Owner Info Section */}
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-base font-black text-gray-900 mb-3">معلومات صاحب الإعلان:</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-brand-50/30 rounded-2xl border border-brand-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-black">
                        {pet.ownerName ? pet.ownerName.charAt(0) : "أ"}
                      </div>
                      <div>
                        <span className="block text-sm font-extrabold text-gray-900">{pet.ownerName}</span>
                        <span className="block text-xs text-gray-500 font-bold mt-0.5">رقم الاتصال: {pet.ownerPhone}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${cleanPhone}`}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition-all"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        اتصال مباشر
                      </a>
                      
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/10 transition-all"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.637-1.03-5.114-2.905-6.99C16.554 1.874 14.08 1.84 11.439 1.84 6.005 1.84 1.58 6.26 1.577 11.699c-.001 1.709.453 3.376 1.316 4.869l-1.03 3.766 3.86-1.014c1.455.795 3.013 1.205 4.542 1.206h.002z" />
                        </svg>
                        واتساب
                      </a>
                    </div>
                  </div>
                </div>

                {/* Safety warning */}
                <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-[11px] font-medium leading-relaxed">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>تنبيه الأمان والمسؤولية:</strong> منصة أليف لا تطلب أي أموال أو مدفوعات مقابل عمليات التبني أو المساعدات مطلقاً. يرجى الحذر من أي محاولات مشبوهة، والاتفاق على تسليم واستلام الحيوانات الأليفة في أماكن عامة آمنة أو في العيادات البيطرية المعتمدة.
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
