import React, { useState, useEffect } from "react";
import { X, Check, ArrowRight, ShieldCheck, Camera, Sparkles, Upload, Calendar, HelpCircle, Plus } from "lucide-react";
import { PetListing, PetCategory, PetPurpose } from "../types";
import { CITIES_YEMEN, GOVERNORATES_YEMEN, CITIES_BY_GOVERNORATE } from "../data";
import { uploadMedia, validateImageFile, validateVideoFile } from "../lib/storage";
import ImageCropper from "./ImageCropper";

interface AddPetModalProps {
  onClose: () => void;
  onAddPet: (pet: Omit<PetListing, "id" | "createdAt">) => void;
  defaultOwnerName?: string;
  editingPet?: PetListing | null;
  onEditPet?: (id: string, updatedFields: Partial<PetListing>) => void;
  activeTab?: string;
}

const PRESET_IMAGES = [
  { label: "قطة برتقالية", url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80", type: "cats" },
  { label: "قطة جميلة", url: "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600&auto=format&fit=crop&q=80", type: "cats" },
  { label: "كلب جيرمن", url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80", type: "dogs" },
  { label: "جرو لطيف", url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&auto=format&fit=crop&q=80", type: "dogs" },
  { label: "ببغاء ملون", url: "https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=600&auto=format&fit=crop&q=80", type: "birds" },
  { label: "أرنب صغير", url: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=600&auto=format&fit=crop&q=80", type: "rabbits" },
];

export default function AddPetModal({ 
  onClose, 
  onAddPet, 
  defaultOwnerName = "",
  editingPet = null,
  onEditPet,
  activeTab
}: AddPetModalProps) {
  // Determine initial purpose from active tab if not editing
  const getInitialPurpose = (): PetPurpose => {
    if (editingPet) return editingPet.purpose;
    if (activeTab === "lost-pets") return "lost";
    if (activeTab === "mating") return "mating";
    if (activeTab === "rescue-cases") return "rescue";
    return "adoption";
  };

  const [purpose, setPurpose] = useState<PetPurpose>(getInitialPurpose());
  const [name, setName] = useState(editingPet ? editingPet.name : "");
  const [category, setCategory] = useState<PetCategory>(editingPet ? editingPet.category : "cats");
  const [breed, setBreed] = useState(editingPet ? editingPet.breed : "");
  const [age, setAge] = useState(editingPet ? editingPet.age : "");
  
  // Dual location states
  const getInitialLocation = () => {
    if (!editingPet) return { gov: "صنعاء", city: "مدينة صنعاء" };
    const parts = editingPet.location.split(" - ");
    const gov = parts[0] || "صنعاء";
    const city = parts[1] || "مدينة صنعاء";
    return { gov, city };
  };
  const initialLoc = getInitialLocation();
  const [gov, setGov] = useState(initialLoc.gov);
  const [city, setCity] = useState(initialLoc.city);

  const [imageUrls, setImageUrls] = useState<string[]>(
    editingPet?.imageUrls || (editingPet?.imageUrl ? [editingPet.imageUrl] : [])
  );
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [description, setDescription] = useState(editingPet ? editingPet.description : "");
  const [healthStatus, setHealthStatus] = useState(editingPet ? editingPet.healthStatus : "بصحة ممتازة ولا تظهر عليه أي عوارض مرضية");
  const [vaccinated, setVaccinated] = useState(editingPet ? editingPet.vaccinated : true);
  const [ownerName, setOwnerName] = useState(editingPet ? editingPet.ownerName : defaultOwnerName);
  const [ownerPhone, setOwnerPhone] = useState(editingPet ? editingPet.ownerPhone : "");
  const [status, setStatus] = useState<"available" | "adopted" | "found" | "rescued" | "completed">(editingPet?.status || "available");
  const [rescueStory, setRescueStory] = useState(editingPet?.rescueStory || "");
  const [videoUrl, setVideoUrl] = useState(editingPet?.videoUrl || "");

  // Custom topic specific states (extends description without breaking basic structure)
  const [rewardAmount, setRewardAmount] = useState("");
  const [petGender, setPetGender] = useState("أنثى");
  const [urgencyLevel, setUrgencyLevel] = useState("متوسطة");
  const [lostDate, setLostDate] = useState(editingPet?.lostDate || "");
  const [lostTime, setLostTime] = useState(editingPet?.lostTime || "");

  const [formError, setFormError] = useState("");
  const [videoUploadProgress, setVideoUploadProgress] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(false);
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [cropQueueTotal, setCropQueueTotal] = useState(0);

  // Handle local device file upload: يرفع الصور مباشرة إلى Supabase Storage
  // ويحفظ روابطها العامة (public URLs) بدل تخزينها كـ base64 ضخم داخل قاعدة البيانات.
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) {
        e.target.value = "";
        return;
      }

      const validFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const err = validateImageFile(file);
        if (err) {
          setFormError(err);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) {
        e.target.value = "";
        return;
      }

      setFormError("");
      // بدل الرفع المباشر، نمرر الصور على أداة الاقتصاص أولاً واحدة تلو الأخرى
      // ليتحكم المستخدم بحجم وإطار كل صورة قبل رفعها فعلياً
      setCropQueueTotal(validFiles.length);
      setCropQueue(validFiles);
      e.target.value = "";
    } catch (err: any) {
      console.error("handleFileUpload error:", err);
      setFormError("حدث خطأ غير متوقع أثناء اختيار الصورة. حاول مرة أخرى أو اختر صورة أخرى.");
    }
  };

  // تُستدعى بعد ما المستخدم يأكد اقتصاص صورة واحدة من طابور الصور المحددة
  const handleCropConfirm = async (croppedFile: File) => {
    setCropQueue((prev) => prev.slice(1));
    setImageUploadProgress(true);
    try {
      const url = await uploadMedia(croppedFile, "pets");
      setImageUrls((prev) => {
        const updated = [...prev, url].slice(0, 8);
        setActivePreviewIndex(updated.length - 1);
        return updated;
      });
    } catch (err: any) {
      setFormError(err?.message || "تعذر رفع الصورة. حاول مرة أخرى.");
    } finally {
      setImageUploadProgress(false);
    }
  };

  // إلغاء اقتصاص الصورة الحالية في الطابور (يتخطاها وينتقل للتالية إن وجدت)
  const handleCropCancel = () => {
    setCropQueue((prev) => prev.slice(1));
  };

  // Handle local device video upload: يرفع الفيديو إلى Supabase Storage ويحفظ رابطه العام.
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateVideoFile(file);
    if (err) {
      setFormError(err);
      e.target.value = "";
      return;
    }

    setFormError("");
    setVideoUploadProgress(true);
    try {
      const url = await uploadMedia(file, "videos");
      setVideoUrl(url);
    } catch (err: any) {
      setFormError(err?.message || "تعذر رفع الفيديو. حاول مرة أخرى.");
    } finally {
      setVideoUploadProgress(false);
      e.target.value = "";
    }
  };

  const getModalTitle = () => {
    if (editingPet) return `تعديل بيانات الأليف (${editingPet.name})`;
    switch (purpose) {
      case "adoption":
        return "إعلان إضافة أليف جديد للتبني";
      case "lost":
        return "إبلاغ عن حيوان أليف مفقود";
      case "mating":
        return "طلب تزاوج لحيوان أليف";
      case "rescue":
        return "إبلاغ عن حالة إنقاذ عاجلة";
      default:
        return "إعلان إضافة أليف جديد";
    }
  };

  const getStatusOptions = () => {
    switch (purpose) {
      case "adoption":
        return [
          { value: "available", label: "متاح للتبني (نشط)" },
          { value: "adopted", label: "تم التبني بسلام 🎉" }
        ];
      case "lost":
        return [
          { value: "available", label: "مفقود (نشط)" },
          { value: "found", label: "تم العثور عليه وإرجاعه للبيت 🏠" }
        ];
      case "mating":
        return [
          { value: "available", label: "طلب تزاوج نشط" },
          { value: "completed", label: "تم التزاوج بنجاح 💖" }
        ];
      case "rescue":
        return [
          { value: "available", label: "بحاجة لإنقاذ عاجل 🚨" },
          { value: "rescued", label: "تم الإنقاذ والتكفل به ✅" }
        ];
      default:
        return [{ value: "available", label: "نشط" }];
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !breed || !age || !ownerName || !ownerPhone || !description) {
      setFormError("الرجاء ملء جميع الحقول المطلوبة لضمان قبول الإعلان.");
      return;
    }

    if (imageUrls.length === 0) {
      setFormError("الرجاء رفع صورة واحدة على الأقل من جهازك قبل نشر الإعلان 📷");
      return;
    }

    if (purpose === "lost" && (!lostDate || !lostTime)) {
      setFormError("الرجاء تحديد تاريخ ووقت فقدان الأليف لتفعيل عداد الوقت بدقة ⏰");
      return;
    }

    const combinedLocation = `${gov} - ${city}`;

    // Append dynamic fields to the description or store them gracefully
    let finalDescription = description;
    if (purpose === "lost" && rewardAmount) {
      finalDescription = `[قيمة المكافأة المالية: ${rewardAmount}]\n${finalDescription}`;
    } else if (purpose === "mating") {
      finalDescription = `[جنس الأليف: ${petGender}]\n${finalDescription}`;
    } else if (purpose === "rescue") {
      finalDescription = `[مستوى الاستعجال: ${urgencyLevel}]\n${finalDescription}`;
    }

    const petData = {
      name,
      category,
      breed,
      age,
      location: combinedLocation,
      purpose,
      imageUrl: imageUrls[0],
      imageUrls,
      description: finalDescription,
      healthStatus,
      vaccinated,
      ownerName,
      ownerPhone,
      status,
      rescueStory: (purpose === "rescue" || status === "rescued") ? rescueStory : "",
      videoUrl: videoUrl.trim(),
      lostDate: purpose === "lost" ? lostDate : undefined,
      lostTime: purpose === "lost" ? lostTime : undefined,
    };

    if (editingPet && onEditPet) {
      onEditPet(editingPet.id, petData);
    } else {
      onAddPet(petData);
    }
    onClose();
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
                {getModalTitle()}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-grow">
            {formError && (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-xs font-bold">
                {formError}
              </div>
            )}

            {/* General Purpose Selector (Can change dynamically) */}
            {!editingPet && (
              <div className="p-4 bg-brand-50/40 border border-brand-100/80 rounded-2xl">
                <label className="block text-xs font-black text-brand-900 mb-2">نوع وموضوع الإعلان الأساسي:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: "adoption", label: "عرض للتبني" },
                    { value: "lost", label: "بلاغ مفقود" },
                    { value: "mating", label: "طلب تزاوج" },
                    { value: "rescue", label: "حالة إنقاذ" }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setPurpose(opt.value as PetPurpose);
                        // reset status when purpose changes
                        setStatus("available");
                      }}
                      className={`px-3 py-2 text-xs font-black rounded-xl border transition-all ${
                        purpose === opt.value
                          ? "bg-brand-600 text-white border-brand-600 shadow-md"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grid 1: Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1.5">اسم الأليف *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: لولو، بسبوس..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1.5">نوع الأليف *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PetCategory)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-right"
                >
                  <option value="cats">قطط</option>
                  <option value="dogs">كلاب</option>
                  <option value="birds">طيور</option>
                  <option value="rabbits">أرانب</option>
                  <option value="others">كائنات أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1.5">
                  {purpose === "mating" ? "السلالة / فصيلة الأليف *" : "السلالة / الفصيلة *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شيرازي، هاسكي، بلدي..."
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1.5">العمر المُراد نشره *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 6 أشهر، سنة ونصف، غير معروف..."
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                />
              </div>

              {/* Dynamic Theme Field: Gender for Mating */}
              {purpose === "mating" && (
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1.5">جنس الأليف لغرض التزاوج *</label>
                  <select
                    value={petGender}
                    onChange={(e) => setPetGender(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-right"
                  >
                    <option value="ذكر">ذكر ♂</option>
                    <option value="أنثى">أنثى ♀</option>
                  </select>
                </div>
              )}

              {/* Dynamic Theme Field: Reward for Lost */}
              {purpose === "lost" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-gray-700 mb-1.5">تاريخ الضياع *</label>
                      <input
                        type="date"
                        value={lostDate}
                        onChange={(e) => setLostDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-700 mb-1.5">ساعة الضياع (تقريبية) *</label>
                      <input
                        type="time"
                        value={lostTime}
                        onChange={(e) => setLostTime(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-right"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1.5">قيمة المكافأة المالية (إن وجدت)</label>
                    <input
                      type="text"
                      placeholder="مثال: 20 ألف ريال يمني، أو هدية عينية..."
                      value={rewardAmount}
                      onChange={(e) => setRewardAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                    />
                  </div>
                </>
              )}

              {/* Dynamic Theme Field: Urgency Level for Rescue */}
              {purpose === "rescue" && (
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1.5">مستوى خطورة الحالة واستعجالها *</label>
                  <select
                    value={urgencyLevel}
                    onChange={(e) => setUrgencyLevel(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-right"
                  >
                    <option value="حرجة جداً وخطيرة 🚨">حرجة جداً وخطيرة 🚨</option>
                    <option value="متوسطة الخطورة">متوسطة الخطورة</option>
                    <option value="منخفضة (حالة بحاجة لمأوى)">منخفضة (حالة بحاجة لمأوى)</option>
                  </select>
                </div>
              )}

              {/* Context-tailored Status options */}
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1.5">حالة الطلب / الإعلان حالياً *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-brand-200 bg-brand-50/20 rounded-xl text-sm font-extrabold text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-right"
                >
                  {getStatusOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location (Governorate & City) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1.5">المحافظة *</label>
                <select
                  value={gov}
                  onChange={(e) => {
                    setGov(e.target.value);
                    const firstCity = CITIES_BY_GOVERNORATE[e.target.value]?.[0] || "";
                    setCity(firstCity);
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-right"
                >
                  {GOVERNORATES_YEMEN.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1.5">المدينة / المنطقة *</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-right"
                >
                  {CITIES_BY_GOVERNORATE[gov]?.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* UPLOADER / Photo Selection with Multi-image gallery support */}
            <div className="space-y-4">
              <label className="block text-xs font-black text-gray-700">صور الأليف * (يرجى رفع صور حقيقية من جهازك، يمكنك اقتصاص كل صورة والتحكم بحجمها قبل الإضافة):</label>

              <div className="flex flex-col md:flex-row gap-5 items-stretch">
                {/* Active Image Preview Box with scrolling thumbnails inside */}
                <div className="relative w-full md:w-1/2 aspect-video md:aspect-square bg-gray-100 rounded-3xl overflow-hidden border border-[#f3ede4] flex flex-col justify-between p-4 shadow-xs">
                  {imageUrls.length > 0 ? (
                    <>
                      <img 
                        src={imageUrls[activePreviewIndex] || imageUrls[0]} 
                        alt="Active preview" 
                        className="absolute inset-0 w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 flex justify-between items-center z-10">
                        <span className="text-white text-xs font-black">الصورة {activePreviewIndex + 1} من {imageUrls.length}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (imageUrls.length <= 1) {
                              setFormError("يجب وجود صورة واحدة على الأقل للأليف.");
                              return;
                            }
                            setImageUrls(prev => prev.filter((_, idx) => idx !== activePreviewIndex));
                            setActivePreviewIndex(0);
                          }}
                          className="px-2 py-1 bg-red-600/90 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold transition-all shadow-md cursor-pointer"
                        >
                          حذف هذه الصورة
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <Camera className="w-10 h-10 stroke-1 mb-2" />
                      <span className="text-xs font-bold">لا تتوفر صور بعد</span>
                    </div>
                  )}
                  {/* Upload Trigger — إدخال ملف ظاهر بالكامل (بدون أي إخفاء) لضمان عمله على كل الجوالات */}
                  <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-2.5 py-1.5 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span className="text-[10px] font-black text-gray-700 shrink-0">
                      {imageUploadProgress ? "جاري الرفع..." : "إضافة صورة:"}
                    </span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept="image/*"
                      disabled={imageUploadProgress}
                      className="block w-[90px] text-[9px] text-gray-500 file:mr-1.5 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-brand-600 file:text-white file:cursor-pointer disabled:opacity-50"
                    />
                  </div>
                </div>


                {/* Thumbnails grid & Presets panel */}
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  {/* Selected Images List */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-black text-gray-400 block">الصور المضافة حالياً للطلب (اضغط لتكبيرها أو احذفها):</span>
                    <div className="flex flex-wrap gap-2">
                      {imageUrls.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <button
                            type="button"
                            onClick={() => setActivePreviewIndex(idx)}
                            className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                              activePreviewIndex === idx ? "border-brand-600 ring-2 ring-brand-100" : "border-gray-200 opacity-85 hover:opacity-100"
                            }`}
                          >
                            <img src={url} alt={`thumb ${idx}`} className="w-full h-full object-cover" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (imageUrls.length <= 1) {
                                setFormError("يجب وجود صورة واحدة على الأقل للأليف.");
                                return;
                              }
                              setImageUrls(prev => prev.filter((_, i) => i !== idx));
                              setActivePreviewIndex(0);
                            }}
                            className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 shadow-md cursor-pointer text-[10px]"
                            title="حذف"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
              </div>


            </div>
            </div>

            {/* Description & Health Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1.5">
                  {purpose === "lost" 
                    ? "تفاصيل الفقدان وأين شوهد الأليف لآخر مرة؟ *"
                    : purpose === "rescue"
                    ? "تفاصيل حالة الإنقاذ والعون المطلوب تقديمه؟ *"
                    : "الوصف والتفاصيل العامة للأليف *"}
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={
                    purpose === "lost"
                      ? "اكتب تفاصيل دقيقة عن زمان ومكان الفقدان، وأي تفاصيل تميزه مثل طوق أو خصلات شعر مميزة لمساعدتنا في البحث..."
                      : purpose === "rescue"
                      ? "صف حالة الحيوان بدقة، تفاصيل الإصابة، الموقع الحالي بالضبط، ومدى استعجال تقديم الإسعاف أو مأوى مناسب له..."
                      : "اكتب تفاصيل كافية عن طباع الأليف، سلوكه، هل يحب الأطفال، وهل يتدرب على صندوق الرمال..."
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                />
              </div>

              {/* Device Native Video File — متاح فقط لحالات الإنقاذ والمفقود */}
              {(purpose === "rescue" || purpose === "lost") && (
              <div className="space-y-2.5 p-4 bg-slate-50/70 rounded-2xl border border-slate-200">
                <label className="block text-xs font-black text-gray-800">مقطع فيديو للأليف 🎥 (اختياري، يرجى رفعه من جهازك مباشرة):</label>
                
                <div className="flex flex-col gap-2 items-stretch bg-white rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-brand-600 shrink-0" />
                    <span className="text-xs font-black text-gray-700 shrink-0">
                      {videoUploadProgress ? "جاري المعالجة..." : "اختر مقطع فيديو:"}
                    </span>
                    <input
                      type="file"
                      onChange={handleVideoUpload}
                      accept="video/*"
                      disabled={videoUploadProgress}
                      className="block flex-1 min-w-0 text-[10px] text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-brand-600 file:text-white file:cursor-pointer disabled:opacity-50"
                    />
                  </div>
                </div>

                {videoUrl && (
                  <div className="mt-2.5 p-3 bg-white rounded-xl border border-gray-200 flex flex-col gap-2">
                    <span className="text-[11px] text-gray-400 font-bold block">مقطع الفيديو المرفق حالياً للطلب:</span>
                    {videoUrl.startsWith("data:video") ? (
                      <div className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                          <span className="text-emerald-600">✅</span>
                          <span className="truncate">ملف فيديو محلي جاهز ومرفق بنجاح</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVideoUrl("")}
                          className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                        >
                          إزالة الفيديو
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                          <span className="text-brand-600">🔗</span>
                          <span className="truncate ltr max-w-xs">{videoUrl}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVideoUrl("")}
                          className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                        >
                          إزالة الرابط
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}
              {(purpose === "rescue" || status === "rescued") && (
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2">
                  <label className="block text-xs font-black text-emerald-900 mb-1">قصة وتفاصيل الإنقاذ الناجح 💚🏆</label>
                  <textarea
                    rows={3}
                    placeholder="اكتب كيف تم إنقاذ الأليف، من ساعده، وأين يعيش الآن بأمان..."
                    value={rescueStory}
                    onChange={(e) => setRescueStory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-emerald-200 rounded-xl text-sm font-semibold text-gray-800 placeholder-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              )}

              {/* Health conditions are hidden/optional for lost/rescue when critical */}
              {purpose !== "lost" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1.5">الحالة الصحية للأليف</label>
                    <input
                      type="text"
                      value={healthStatus}
                      onChange={(e) => setHealthStatus(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-5">
                    <input
                      type="checkbox"
                      id="vaccinated"
                      checked={vaccinated}
                      onChange={(e) => setVaccinated(e.target.checked)}
                      className="w-5 h-5 text-brand-600 focus:ring-brand-500 border-gray-300 rounded-lg cursor-pointer"
                    />
                    <label htmlFor="vaccinated" className="text-xs font-bold text-gray-700 cursor-pointer flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      هذا الأليف مُلقّح ومطعم بانتظام
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Owner Details */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <h4 className="text-sm font-black text-gray-900">معلومات الاتصال بالمعلن / المالك:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1.5">اسمك الكريم *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: صالح العبسي..."
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1.5">رقم الهاتف / واتساب للتواصل المباشر *</label>
                  <input
                    type="tel"
                    required
                    placeholder="مثال: +967770000000"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Auto-expiry notice */}
            {!editingPet && (
              <p className="text-[11px] text-gray-400 font-bold text-center bg-gray-50 rounded-xl py-2 px-3">
                ℹ️ ملاحظة: يُحذف هذا الإعلان تلقائياً بعد مرور 90 يوماً من تاريخ نشره للحفاظ على تحديث المحتوى المعروض في المنصة.
              </p>
            )}

            {/* Footer buttons inside scrolling container to ensure visible */}
            <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-all"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={imageUploadProgress || videoUploadProgress}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-600/15 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {imageUploadProgress || videoUploadProgress ? "جاري رفع الوسائط..." : editingPet ? "حفظ التعديلات" : "نشر الإعلان الآن"}
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* أداة اقتصاص الصورة — تظهر تلقائياً لكل صورة يختارها المستخدم قبل رفعها */}
      {cropQueue.length > 0 && (
        <ImageCropper
          file={cropQueue[0]}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
          queueLabel={cropQueueTotal > 1 ? `صورة ${cropQueueTotal - cropQueue.length + 1} من ${cropQueueTotal}` : undefined}
        />
      )}
    </div>
  );
}
