import React from "react";
import { X, Heart, Compass, ShieldAlert, BookOpen, MessageSquare, User, LogOut, Sparkles, PawPrint, Phone, ShieldCheck } from "lucide-react";
import { UserAccount } from "../types";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserAccount | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenAddModal: () => void;
  onOpenAdminPanel?: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onOpenAddModal,
  onOpenAdminPanel,
}: SidebarProps) {
  if (!isOpen) return null;

  const menuItems = [
    ...(currentUser?.role === "admin"
      ? [
          {
            id: "__admin_panel__",
            label: "لوحة تحكم الأدمن 🛡️",
            description: "إدارة كل الحيوانات، العيادات، المنشورات، والمستخدمين",
            icon: ShieldCheck,
            color: "text-white bg-brand-600",
            activeBg: "bg-brand-600 text-white shadow-md shadow-brand-600/10",
            category: "admin",
          },
        ]
      : []),
    {
      id: "pets",
      label: "حيوانات للتبني 🐾",
      description: "تصفح القطط والكلاب والأرانب المعروضة للتبني مجاناً",
      icon: Compass,
      color: "text-brand-600 bg-brand-50",
      activeBg: "bg-brand-600 text-white shadow-md shadow-brand-600/10",
      category: "browse"
    },
    {
      id: "lost-pets",
      label: "المفقودات وبلاغات الفقدان 🔍",
      description: "ساعد أصحاب الحيوانات الضائعة في العثور عليها مجاناً",
      icon: PawPrint,
      color: "text-rose-600 bg-rose-50",
      activeBg: "bg-rose-600 text-white shadow-md shadow-rose-600/10",
      category: "browse"
    },
    {
      id: "mating",
      label: "طلبات التزاوج 💖",
      description: "ابحث عن شريك تزاوج متوافق وصحي لأليفك",
      icon: Heart,
      color: "text-purple-600 bg-purple-50",
      activeBg: "bg-purple-600 text-white shadow-md shadow-purple-600/10",
      category: "browse"
    },
    {
      id: "rescue-cases",
      label: "حالات الإنقاذ العاجلة 🚨",
      description: "بلاغات عاجلة لحيوانات مصابة أو مشردة تحتاج رعاية",
      icon: ShieldAlert,
      color: "text-red-600 bg-red-50",
      activeBg: "bg-red-600 text-white shadow-md shadow-red-600/10",
      category: "browse"
    },
    {
      id: "clinics",
      label: "دليل العيادات والأطباء 🏥",
      description: "ابحث عن أقرب عيادة بيطرية مرخصة لعلاج أليفك",
      icon: ShieldAlert,
      color: "text-amber-600 bg-amber-50",
      activeBg: "bg-amber-600 text-white shadow-md shadow-amber-600/10",
      category: "info"
    },
    {
      id: "community",
      label: "ملتقى الرعاية والخبرات 💬",
      description: "تبادل النصائح والخبرات وقصص تربية الأليفين",
      icon: BookOpen,
      color: "text-indigo-600 bg-indigo-50",
      activeBg: "bg-indigo-600 text-white shadow-md shadow-indigo-600/10",
      category: "info"
    },
    {
      id: "contact-admin",
      label: "تواصل مع إدارة المنصة 📞",
      description: "اتصل بنا أو تواصل مباشرة لطلب إضافة عيادة بيطرية جديدة",
      icon: Phone,
      color: "text-blue-600 bg-blue-50",
      activeBg: "bg-blue-600 text-white shadow-md shadow-blue-600/10",
      category: "info"
    },
    {
      id: "ai-advisor",
      label: "المستشار الذكي (ذكاء اصطناعي) 🤖",
      description: "اسأل المستشار عن التغذية، الصحة والسلوك فوراً",
      icon: MessageSquare,
      color: "text-emerald-600 bg-emerald-50",
      activeBg: "bg-emerald-600 text-white shadow-md shadow-emerald-600/10",
      category: "ai"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-brand-950/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      ></div>

      <div className="absolute inset-y-0 right-0 max-w-full flex">
        {/* Sidebar content */}
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-[#f1e9dc] transition-all transform duration-300">
          {/* Header */}
          <div className="p-6 border-b border-[#f3ede4] bg-brand-50/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-md">
                <Heart className="w-5.5 h-5.5 fill-current" />
              </div>
              <div>
                <h3 className="text-lg font-black text-brand-900">أليف اليمن</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Account Quick Section */}
          <div className="p-5 border-b border-[#f3ede4] bg-[#faf8f5]">
            {currentUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-brand-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    {currentUser.username.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900">{currentUser.username}</h4>
                    <p className="text-[10px] text-gray-500 font-bold">{currentUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentUser.role === "admin" && onOpenAdminPanel && (
                    <button
                      onClick={() => {
                        onOpenAdminPanel();
                        onClose();
                      }}
                      className="p-2 bg-brand-600 text-white hover:bg-brand-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                      title="لوحة تحكم الأدمن"
                    >
                      <ShieldCheck className="w-4.5 h-4.5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActiveTab("profile");
                      onClose();
                    }}
                    className="p-2 bg-white text-gray-600 hover:text-brand-600 border border-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    title="الملف الشخصي"
                  >
                    <User className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                    className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    title="تسجيل الخروج"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-2.5">
                <p className="text-xs text-gray-500 font-semibold mb-3">سجل دخولك لتتمكن من إضافة إعلانات وتتبع حيواناتك المفضلة</p>
                <button
                  onClick={() => {
                    onOpenAuthModal();
                    onClose();
                  }}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  تسجيل الدخول / إنشاء حساب جديد
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links List */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
            <div>
              <span className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2.5 px-2">أقسام المنصة الرئيسية</span>
              <div className="space-y-1.5">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === "__admin_panel__") {
                          onOpenAdminPanel?.();
                        } else {
                          setActiveTab(item.id);
                        }
                        onClose();
                      }}
                      className={`w-full flex items-start gap-3.5 p-3 rounded-2xl text-right transition-all cursor-pointer border ${
                        isActive
                          ? "bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/15"
                          : item.id === "__admin_panel__"
                          ? "bg-brand-50/60 hover:bg-brand-100/60 text-brand-800 border-brand-100"
                          : "bg-white hover:bg-brand-50/40 text-gray-700 border-transparent hover:border-brand-100"
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${isActive ? "bg-white/10 text-white" : item.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-black">{item.label}</span>
                        <span className={`block text-[10px] font-semibold mt-0.5 leading-relaxed truncate ${isActive ? "text-brand-100" : "text-gray-400"}`}>
                          {item.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Action inside sidebar */}
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="block text-xs font-black text-amber-900">هل لديك أليف تريد عرضه؟</span>
                <span className="block text-[10px] text-amber-800 font-bold mt-0.5">تبني، مفقود، تزاوج، أو إنقاذ</span>
              </div>
              <button
                onClick={() => {
                  onOpenAddModal();
                  onClose();
                }}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
              >
                أضف إعلاناً
              </button>
            </div>
          </div>

          {/* Footer of sidebar */}
          <div className="p-5 border-t border-[#f3ede4] bg-gray-50/50 text-center">
            <p className="text-[10px] text-gray-400 font-bold">منصة أليف اليمن الرائدة للرفق بالحيوان</p>
            <p className="text-[9px] text-gray-400 font-medium mt-0.5">نسخة الويب الحديثة 2026 🇾🇪</p>
          </div>
        </div>
      </div>
    </div>
  );
}
