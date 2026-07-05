import React from "react";
import { MapPin, Calendar, Heart, ShieldCheck, HelpCircle } from "lucide-react";
import { PetListing } from "../types";

interface PetCardProps {
  key?: React.Key;
  pet: PetListing;
  onViewDetails: (pet: PetListing) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export default function PetCard({ pet, onViewDetails, isFavorite = false, onToggleFavorite }: PetCardProps) {
  const [elapsedText, setElapsedText] = React.useState<string | null>(null);

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

  // Purpose labels and styles
  const purposeConfig = {
    adoption: {
      label: "تبنّي",
      bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
      indicator: "bg-emerald-500",
    },
    mating: {
      label: "طلب تزاوج",
      bg: "bg-amber-50 text-amber-700 border-amber-100",
      indicator: "bg-amber-500",
    },
    lost: {
      label: "مفقود !",
      bg: "bg-rose-50 text-rose-700 border-rose-100",
      indicator: "bg-rose-500",
    },
    rescue: {
      label: "حالة إنقاذ عاجلة 🚨",
      bg: "bg-red-50 text-red-700 border-red-200 animate-pulse",
      indicator: "bg-red-600",
    },
  };

  const config = purposeConfig[pet.purpose];
  const isRescued = pet.status === "rescued";
  const isStatusResolved = pet.status && pet.status !== "available" && !isRescued;
  
  const statusLabels: Record<string, { label: string, color: string }> = {
    adopted: { label: "تم التبني 🎉", color: "bg-emerald-600/90 text-white" },
    rescued: { label: "تم الإنقاذ ✅", color: "bg-teal-600/90 text-white" },
    found: { label: "تم العثور عليه 🏠", color: "bg-blue-600/90 text-white" },
    completed: { label: "تم التزاوج بنجاح 💖", color: "bg-purple-600/90 text-white" },
  };

  return (
    <div className={`group bg-white rounded-3xl border overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full ${
      isRescued 
        ? "border-emerald-200 hover:border-emerald-400 bg-gradient-to-b from-white to-emerald-50/15" 
        : "border-[#f3ede4] hover:border-brand-200"
    }`}>
      {/* Image container */}
      <div className="relative aspect-4/3 w-full bg-gray-100 overflow-hidden">
        <img
          src={pet.imageUrl}
          alt={pet.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
        />

        {isStatusResolved && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center backdrop-blur-xs z-10 transition-all duration-300">
            <span className={`px-4.5 py-2.5 rounded-2xl text-xs font-black tracking-wide border border-white/20 shadow-xl ${statusLabels[pet.status!].color}`}>
              {statusLabels[pet.status!].label}
            </span>
          </div>
        )}
        
        {/* Favorite Heart Button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(pet.id);
            }}
            className="absolute top-4 left-4 p-2 bg-white/90 hover:bg-white text-gray-400 hover:text-rose-500 rounded-full backdrop-blur-md shadow-md transition-all duration-300 group/fav cursor-pointer z-10"
          >
            <Heart 
              className={`w-4 h-4 transition-all duration-300 ${
                isFavorite ? "fill-rose-500 text-rose-500 scale-110" : "group-hover/fav:scale-110"
              }`} 
            />
          </button>
        )}
        
        {/* Category Label */}
        {isRescued ? (
          <span className="absolute top-4 right-4 px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-500 text-white border border-emerald-400 shadow-md flex items-center gap-1.5">
            <span>🏆 حكاية نجاح ملهمة</span>
          </span>
        ) : (
          <span className={`absolute top-4 right-4 px-3.5 py-1.5 rounded-full text-xs font-black border backdrop-blur-md shadow-sm ${config.bg}`}>
            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${config.indicator}`}></span>
            {config.label}
          </span>
        )}

        {/* Location Badge */}
        <span className="absolute bottom-4 right-4 px-3 py-1 bg-black/40 text-white text-xs font-bold rounded-xl backdrop-blur-xs flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {pet.location}
        </span>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-gray-900 group-hover:text-brand-600 transition-colors flex items-center gap-1.5">
            {pet.name}
            {isRescued && <span className="text-base">💚</span>}
          </h3>
          {pet.vaccinated && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
              <ShieldCheck className="w-3.5 h-3.5" />
              محصن
            </span>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-bold text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">السلالة:</span>
            <span className="text-gray-700 truncate">{pet.breed}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-700">{pet.age}</span>
          </div>
        </div>

        {/* Lost Date/Time & Timer */}
        {pet.purpose === "lost" && pet.lostDate && (
          <div className="mt-3.5 p-3 bg-rose-50/70 rounded-2xl border border-rose-100 flex flex-col gap-1.5 text-[11px] font-bold text-rose-950">
            <div className="flex items-center justify-between">
              <span className="text-rose-700 flex items-center gap-1">
                <span>📅 تاريخ الضياع:</span>
              </span>
              <span>
                {pet.lostDate} {pet.lostTime && `في ${pet.lostTime}`}
              </span>
            </div>
            {elapsedText && (
              <div className="flex items-center justify-between border-t border-rose-200/40 pt-1.5 text-[11px]">
                <span className="text-rose-700">⏱️ غائب منذ:</span>
                <span className="text-rose-600 animate-pulse font-black text-xs">{elapsedText}</span>
              </div>
            )}
          </div>
        )}

        {isRescued && pet.healthStatus && (
          <div className="mt-3 p-2 bg-emerald-50/70 rounded-xl border border-emerald-100/80 flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
            <span>🩹</span>
            <span className="truncate">العلاج: {pet.healthStatus}</span>
          </div>
        )}

        {/* Description Snippet & Story */}
        <div className="space-y-2 mt-3">
          <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-2">
            {pet.description}
          </p>
          {isRescued && pet.rescueStory && (
            <div className="p-2.5 bg-emerald-50/30 rounded-xl border border-dashed border-emerald-200 text-[11px] font-semibold text-emerald-950 leading-relaxed">
              <span className="font-extrabold text-emerald-800 block mb-0.5">📖 قصة البطل:</span>
              <p className="line-clamp-2">{pet.rescueStory}</p>
            </div>
          )}
        </div>

        {/* Action Button at footer of card */}
        <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 text-xs font-black">
              {pet.ownerName.charAt(0)}
            </div>
            <span className="text-xs font-bold text-gray-600">{pet.ownerName}</span>
          </div>

          <button
            onClick={() => onViewDetails(pet)}
            className="px-4 py-2 bg-gray-50 hover:bg-brand-600 hover:text-white text-brand-700 rounded-xl text-xs font-bold transition-all duration-300"
          >
            التفاصيل والتواصل
          </button>
        </div>
      </div>
    </div>
  );
}
