import React from "react";
import { Search, MapPin } from "lucide-react";
import { GOVERNORATES_YEMEN, CITIES_BY_GOVERNORATE } from "../data";

interface HeroProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedGovernorate: string;
  setSelectedGovernorate: (gov: string) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedPurpose: string;
  setSelectedPurpose: (purpose: string) => void;
  totalListings: number;
}

export default function Hero({
  searchQuery,
  setSearchQuery,
  selectedGovernorate,
  setSelectedGovernorate,
  selectedCity,
  setSelectedCity,
  selectedPurpose,
  setSelectedPurpose,
  totalListings,
}: HeroProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-brand-100/60 via-brand-50/20 to-transparent pt-12 pb-8 px-4 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute top-12 left-10 w-72 h-72 rounded-full bg-brand-200/30 blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-4 right-10 w-96 h-96 rounded-full bg-brand-100/20 blur-3xl -z-10"></div>

      <div className="max-w-7xl mx-auto text-center">
        {/* Main Title */}
        <h2 className="text-3xl sm:text-4xl font-black text-brand-900 tracking-tight leading-tight">
          منصة أليف اليمن 🇾🇪
        </h2>
        
        <p className="mt-2 text-sm text-gray-500 max-w-xl mx-auto font-bold leading-relaxed">
          الدليل اليمني الشامل لتسهيل رعاية، تبني، وتأمين الحيوانات الأليفة في كافة المحافظات
        </p>

        {/* Search & Filter Container */}
        <div className="mt-10 max-w-4xl mx-auto bg-white p-4 sm:p-5 rounded-3xl border border-[#f1e9dc] shadow-xl shadow-brand-900/5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3" dir="rtl">
            
            {/* Search Input */}
            <div className="md:col-span-3 relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث بالنوع أو السلالة (مثال: قط شيرازي)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-right"
              />
            </div>

            {/* Governorate Filter */}
            <div className="md:col-span-1 relative">
              <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-500 pointer-events-none" />
              <select
                value={selectedGovernorate}
                onChange={(e) => {
                  setSelectedGovernorate(e.target.value);
                  setSelectedCity(""); // Reset city when governorate changes
                }}
                className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white appearance-none cursor-pointer transition-all text-right"
              >
                <option value="">المحافظة 🇾🇪</option>
                {GOVERNORATES_YEMEN.map((gov) => (
                  <option key={gov} value={gov}>
                    {gov}
                  </option>
                ))}
              </select>
            </div>

            {/* City/District Filter */}
            <div className="md:col-span-1 relative">
              <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={!selectedGovernorate}
                className={`w-full pr-11 pl-4 py-3 border rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none cursor-pointer transition-all text-right ${
                  selectedGovernorate
                    ? "bg-gray-50 border-gray-100 text-gray-700 focus:bg-white animate-fadeIn"
                    : "bg-gray-100/50 border-gray-200/50 text-gray-400 cursor-not-allowed"
                }`}
              >
                <option value="">المدينة / المنطقة 📍</option>
                {selectedGovernorate && CITIES_BY_GOVERNORATE[selectedGovernorate]?.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
