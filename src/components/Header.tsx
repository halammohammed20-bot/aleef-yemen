import React from "react";
import { Heart, Plus, BookOpen, ShieldAlert, MessageSquare, Compass, User, LogOut, Menu, Phone } from "lucide-react";
import { UserAccount } from "../types";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAddModal: () => void;
  currentUser: UserAccount | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export default function Header({ 
  activeTab, 
  setActiveTab, 
  onOpenAddModal,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onToggleSidebar
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#f3ede4] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Sidebar Trigger */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="p-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl transition-all cursor-pointer border border-brand-100 shadow-xs"
              title="القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("pets")}>
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-md shadow-brand-500/10">
                <Heart className="w-6 h-6 fill-current" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-brand-900 flex items-center gap-1.5">
                  أليف
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-bold">اليمن</span>
                </h1>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="hidden xl:flex items-center gap-1.5" dir="rtl">
            <button
              onClick={() => setActiveTab("pets")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer ${
                ["pets", "lost-pets", "mating", "rescue-cases", "success-stories"].includes(activeTab)
                  ? "bg-brand-600 text-white shadow-md shadow-brand-600/10"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Compass className="w-4 h-4" />
              الرئيسية
            </button>
 
            <button
              onClick={() => setActiveTab("clinics")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer ${
                activeTab === "clinics"
                  ? "bg-brand-50 text-brand-700 shadow-xs"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-brand-500" />
              العيادات والأطباء
            </button>
 
            <button
              onClick={() => setActiveTab("ai-advisor")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-300 relative cursor-pointer ${
                activeTab === "ai-advisor"
                  ? "bg-brand-50 text-brand-700 shadow-xs"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <MessageSquare className="w-4 h-4 text-brand-500" />
              مستشار أليف الذكي
              <span className="absolute -top-1.5 -left-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab("contact-admin")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer ${
                activeTab === "contact-admin"
                  ? "bg-brand-50 text-brand-700 shadow-xs"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Phone className="w-4 h-4 text-brand-500" />
              تواصل مع الإدارة
            </button>
 
            <button
              onClick={() => {
                if (currentUser) {
                  setActiveTab("profile");
                } else {
                  onOpenAuthModal();
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer ${
                activeTab === "profile"
                  ? "bg-brand-50 text-brand-700 shadow-xs"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <User className="w-4 h-4 text-brand-500" />
              {currentUser ? `حسابي (${currentUser.username})` : "دخول / تسجيل"}
            </button>
          </nav>

          {/* Action Button */}
          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                onClick={onLogout}
                title="تسجيل الخروج"
                className="p-2.5 bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-xl transition-all duration-300 cursor-pointer"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            )}

            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-600/10 hover:bg-brand-700 hover:shadow-brand-600/20 active:scale-98 transition-all duration-300"
            >
              <Plus className="w-4.5 h-4.5" />
              أضف أليفاً
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav rail for smaller screens */}
      <div className="xl:hidden border-t border-gray-100 flex items-center justify-around py-2 bg-white px-4">
        <button
          onClick={() => setActiveTab("pets")}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-black shrink-0 cursor-pointer ${
            ["pets", "lost-pets", "mating", "rescue-cases"].includes(activeTab) ? "text-brand-600" : "text-gray-500"
          }`}
        >
          <Compass className="w-5 h-5" />
          تصفح الأليفين
        </button>

        <button
          onClick={() => setActiveTab("clinics")}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-black shrink-0 cursor-pointer ${
            activeTab === "clinics" ? "text-brand-600" : "text-gray-500"
          }`}
        >
          <ShieldAlert className="w-5 h-5 text-brand-500" />
          العيادات
        </button>

        <button
          onClick={() => setActiveTab("community")}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-black shrink-0 cursor-pointer ${
            activeTab === "community" ? "text-brand-600" : "text-gray-500"
          }`}
        >
          <BookOpen className="w-5 h-5 text-brand-500" />
          الملتقى
        </button>

        <button
          onClick={() => setActiveTab("ai-advisor")}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-black shrink-0 cursor-pointer ${
            activeTab === "ai-advisor" ? "text-brand-600" : "text-gray-500"
          }`}
        >
          <MessageSquare className="w-5 h-5 text-brand-500" />
          المستشار
        </button>

        <button
          onClick={() => {
            if (currentUser) {
              setActiveTab("profile");
            } else {
              onOpenAuthModal();
            }
          }}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-black shrink-0 cursor-pointer ${
            activeTab === "profile" ? "text-brand-600" : "text-gray-500"
          }`}
        >
          <User className="w-5 h-5 text-brand-500" />
          {currentUser ? "حسابي" : "تسجيل"}
        </button>
      </div>
    </header>
  );
}
