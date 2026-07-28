import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import PetCard from "./components/PetCard";
import PetDetailsModal from "./components/PetDetailsModal";
import AddPetModal from "./components/AddPetModal";
import ClinicCard from "./components/ClinicCard";
import ClinicDetailsModal from "./components/ClinicDetailsModal";
import CommunityHub from "./components/CommunityHub";
import AiAdvisor from "./components/AiAdvisor";
import AuthModal from "./components/AuthModal";
import Sidebar from "./components/Sidebar";
import AdminPanel from "./components/AdminPanel";

import { PetListing, PetCategory, CommunityPost, UserAccount, Clinic, ClinicComment } from "./types";
import { CITIES_YEMEN, GOVERNORATES_YEMEN, CITIES_BY_GOVERNORATE } from "./data";
import { Heart, Cat, Dog, Bird, Info, PawPrint, MessageSquare, AlertCircle, Plus, User, LogOut, Compass, ShieldAlert, Search, MapPin, BookOpen, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import {
  fetchPets,
  insertPet,
  updatePet,
  deletePet,
  fetchClinics,
  insertClinicComment,
  addClinicImage,
  fetchPosts,
  insertPost,
  likePost,
  addFavorite,
  removeFavorite,
  fetchUserAccount,
} from "./lib/db";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("pets");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [rescueSubTab, setRescueSubTab] = useState<"active" | "rescued">("active");
  
  // Media index for success stories slideshow
  const [successStoryMediaIndex, setSuccessStoryMediaIndex] = useState<Record<string, number>>({});
  
  // User Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState("");
  const [profileSubTab, setProfileSubTab] = useState<"added" | "favorites">("added");
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  
  // Localized state with localStorage sync
  const [pets, setPets] = useState<PetListing[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  
  // Filtering & searching
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGovernorate, setSelectedGovernorate] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedPurpose, setSelectedPurpose] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modals state
  const [selectedPet, setSelectedPet] = useState<PetListing | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<PetListing | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Accordion Expanded States
  const [expandedClinicId, setExpandedClinicId] = useState<string | null>(null);
  const [expandedPetId, setExpandedPetId] = useState<string | null>(null);
  const [clinicSearchQuery, setClinicSearchQuery] = useState("");
  const [successStoriesQuery, setSuccessStoriesQuery] = useState("");

  // Filters for success stories & clinics
  const [successStoryGov, setSuccessStoryGov] = useState("");
  const [successStoryCity, setSuccessStoryCity] = useState("");
  const [clinicGov, setClinicGov] = useState("");
  const [clinicCity, setClinicCity] = useState("");

  // Initialize data on mount: pull real data from Supabase instead of localStorage
  useEffect(() => {
    (async () => {
      try {
        const [petsData, clinicsData, postsData] = await Promise.all([
          fetchPets(),
          fetchClinics(),
          fetchPosts(),
        ]);
        setPets(petsData);
        setClinics(clinicsData);
        setPosts(postsData);
      } catch (err) {
        console.error("فشل تحميل البيانات من قاعدة البيانات:", err);
      }
    })();

    // Restore session (if any) and keep currentUser in sync with Supabase Auth
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const user = await fetchUserAccount(session.user.id, session.user.email || "");
          setCurrentUser(user);
        } catch (err) {
          console.error("فشل تحميل بيانات المستخدم:", err);
        }
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          const user = await fetchUserAccount(session.user.id, session.user.email || "");
          setCurrentUser(user);
        } catch (err) {
          console.error("فشل تحميل بيانات المستخدم:", err);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Handler to add a pet (saved directly to the Supabase "pets" table)
  const handleAddPet = async (newPetData: Omit<PetListing, "id" | "createdAt">) => {
    try {
      const newPet = await insertPet(newPetData, currentUser?.id);
      setPets((prev) => [newPet, ...prev]);
    } catch (err) {
      console.error("فشل إضافة الأليف:", err);
      alert("حدث خطأ أثناء حفظ البيانات. الرجاء المحاولة مرة أخرى.");
    }
  };

  // Handler to add a comment to a clinic
  const handleAddClinicComment = async (clinicId: string, comment: ClinicComment) => {
    try {
      const savedComment = await insertClinicComment(clinicId, comment);
      setClinics((prev) => {
        const updated = prev.map((c) => {
          if (c.id === clinicId) {
            const updatedComments = [savedComment, ...(c.comments || [])];
            const sum = updatedComments.reduce((acc, curr) => acc + curr.rating, 0);
            const avgRating = Number((sum / updatedComments.length).toFixed(1));
            return { ...c, comments: updatedComments, rating: avgRating };
          }
          return c;
        });
        if (selectedClinic && selectedClinic.id === clinicId) {
          const targetClinic = updated.find((c) => c.id === clinicId);
          if (targetClinic) setSelectedClinic(targetClinic);
        }
        return updated;
      });
    } catch (err) {
      console.error("فشل إضافة التعليق:", err);
      alert("حدث خطأ أثناء حفظ التعليق. الرجاء المحاولة مرة أخرى.");
    }
  };

  // Handler to add an image uploaded from device to a clinic (رابط عام حقيقي من Supabase Storage)
  const handleAddClinicImage = async (clinicId: string, imageUrl: string) => {
    const target = clinics.find((c) => c.id === clinicId);
    try {
      await addClinicImage(clinicId, imageUrl, target?.images || []);
      setClinics((prev) => {
        const updated = prev.map((c) =>
          c.id === clinicId ? { ...c, images: [...(c.images || []), imageUrl] } : c
        );
        if (selectedClinic && selectedClinic.id === clinicId) {
          const targetClinic = updated.find((c) => c.id === clinicId);
          if (targetClinic) setSelectedClinic(targetClinic);
        }
        return updated;
      });
    } catch (err) {
      console.error("فشل إضافة الصورة:", err);
    }
  };

  // Handler to edit a pet
  const handleEditPet = async (id: string, updatedFields: Partial<PetListing>) => {
    try {
      const updatedPet = await updatePet(id, updatedFields);
      setPets((prev) => prev.map((p) => (p.id === id ? updatedPet : p)));
      setEditingPet(null);
    } catch (err) {
      console.error("فشل تعديل الأليف:", err);
      alert("حدث خطأ أثناء تعديل البيانات. الرجاء المحاولة مرة أخرى.");
    }
  };

  // Handler to delete a pet with multi-click confirmation
  const handleDeletePet = (id: string) => {
    if (deleteConfirmId === id) {
      (async () => {
        try {
          await deletePet(id);
          setPets((prev) => prev.filter((p) => p.id !== id));
        } catch (err) {
          console.error("فشل حذف الأليف:", err);
          alert("حدث خطأ أثناء الحذف. الرجاء المحاولة مرة أخرى.");
        } finally {
          setDeleteConfirmId(null);
        }
      })();
    } else {
      setDeleteConfirmId(id);
      // Auto reset after 4 seconds
      setTimeout(() => {
        setDeleteConfirmId((prev) => (prev === id ? null : prev));
      }, 4000);
    }
  };

  const handleToggleFavorite = async (petId: string) => {
    if (!currentUser) {
      setAuthModalMessage("الرجاء تسجيل الدخول أو إنشاء حساب لإضافة هذا الأليف إلى قائمتك المفضلة وتتبعه ❤️");
      setIsAuthModalOpen(true);
      return;
    }

    const isFav = currentUser.favoritePetIds.includes(petId);
    try {
      if (isFav) {
        await removeFavorite(currentUser.id, petId);
      } else {
        await addFavorite(currentUser.id, petId);
      }
      const updatedFavs = isFav
        ? currentUser.favoritePetIds.filter((id) => id !== petId)
        : [...currentUser.favoritePetIds, petId];
      setCurrentUser({ ...currentUser, favoritePetIds: updatedFavs });
    } catch (err) {
      console.error("فشل تحديث المفضلة:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    if (activeTab === "profile") {
      setActiveTab("pets");
    }
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
  };

  // Handler to add a post
  const handleAddPost = async (newPostData: Omit<CommunityPost, "id" | "likes" | "commentsCount" | "createdAt">) => {
    try {
      const newPost = await insertPost(newPostData);
      setPosts((prev) => [newPost, ...prev]);
    } catch (err) {
      console.error("فشل إضافة المنشور:", err);
      alert("حدث خطأ أثناء نشر المنشور. الرجاء المحاولة مرة أخرى.");
    }
  };

  // Handler to like a post
  const handleLikePost = async (id: string) => {
    setPosts((prev) => prev.map((post) => (post.id === id ? { ...post, likes: post.likes + 1 } : post)));
    try {
      await likePost(id);
    } catch (err) {
      console.error("فشل تسجيل الإعجاب:", err);
    }
  };

  // Filtered pet list logic
  const filteredPets = pets.filter((pet) => {
    // Search match (name, breed, description, story)
    const matchesSearch =
      searchQuery === "" ||
      pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pet.rescueStory && pet.rescueStory.toLowerCase().includes(searchQuery.toLowerCase()));

    // Governorate match
    const matchesGovernorate = selectedGovernorate === "" || pet.location.includes(selectedGovernorate);

    // City match
    const matchesCity = selectedCity === "" || pet.location.includes(selectedCity);

    // Category match
    const matchesCategory = selectedCategory === "all" || pet.category === selectedCategory;

    // Determine target purpose based on active tab
    let targetPurpose = "adoption";
    if (activeTab === "lost-pets") {
      targetPurpose = "lost";
    } else if (activeTab === "mating") {
      targetPurpose = "mating";
    } else if (activeTab === "rescue-cases") {
      targetPurpose = "rescue";
    }

    const matchesPurpose = pet.purpose === targetPurpose;

    // Filter out resolved pets from active tabs so they go to stories page
    const isAvailable = !pet.status || pet.status === "available";

    let matchesRescueStatus = true;
    if (activeTab === "rescue-cases") {
      if (rescueSubTab === "active") {
        matchesRescueStatus = pet.status !== "rescued";
      } else {
        matchesRescueStatus = pet.status === "rescued";
      }
    }

    return matchesPurpose && isAvailable && matchesSearch && matchesGovernorate && matchesCity && matchesCategory && matchesRescueStatus;
  });

  const isListingTab = ["pets", "lost-pets", "mating", "rescue-cases"].includes(activeTab);

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col font-sans selection:bg-brand-100 selection:text-brand-900">
      
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => {
          if (currentUser) {
            setIsAddModalOpen(true);
          } else {
            setAuthModalMessage("الرجاء تسجيل الدخول أولاً لتتمكن من إضافة حيوان أليف وعرض إعلانك 🐾");
            setIsAuthModalOpen(true);
          }
        }}
        currentUser={currentUser}
        onOpenAuthModal={() => {
          setAuthModalMessage("");
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
      />

      {/* Sub-Navigation Mode Switcher for Listings */}
      {isListingTab && (
        <div className="bg-brand-50/30 border-b border-[#f3ede4] py-3.5" dir="rtl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-nowrap sm:flex-wrap items-center justify-start gap-2.5 overflow-x-auto scrollbar-none py-0.5">
              <button
                onClick={() => {
                  setActiveTab("pets");
                  setSelectedCategory("all");
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all border shrink-0 cursor-pointer ${
                  activeTab === "pets"
                    ? "bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/10"
                    : "bg-white text-gray-600 border-gray-200/80 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <PawPrint className="w-4 h-4" />
                <span>حيوانات للتبني 🐾</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("lost-pets");
                  setSelectedCategory("all");
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all border shrink-0 cursor-pointer ${
                  activeTab === "lost-pets"
                    ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/10"
                    : "bg-white text-gray-600 border-gray-200/80 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Compass className="w-4 h-4 text-rose-500" />
                <span>المفقودات وبلاغات الفقدان 🔍</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("mating");
                  setSelectedCategory("all");
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all border shrink-0 cursor-pointer ${
                  activeTab === "mating"
                    ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/10"
                    : "bg-white text-gray-600 border-gray-200/80 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Heart className="w-4 h-4 text-purple-500" />
                <span>طلبات التزاوج 💖</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("rescue-cases");
                  setSelectedCategory("all");
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all border shrink-0 cursor-pointer ${
                  activeTab === "rescue-cases"
                    ? "bg-red-600 text-white border-red-600 shadow-md shadow-red-600/10"
                    : "bg-white text-gray-600 border-gray-200/80 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <span>حالات الإنقاذ العاجلة 🚨</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Sections switcher */}
      <main className="flex-grow">
        {activeTab === "pets" && (
          <div className="pb-16">
            {/* Hero Section */}
            <Hero
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedGovernorate={selectedGovernorate}
              setSelectedGovernorate={setSelectedGovernorate}
              selectedCity={selectedCity}
              setSelectedCity={setSelectedCity}
              selectedPurpose={selectedPurpose}
              setSelectedPurpose={setSelectedPurpose}
              totalListings={pets.filter(p => p.purpose === "adoption").length}
            />

            {/* Category selection bar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
              <h3 className="text-xl font-black text-gray-900 mb-4">تصنيفات الأليفين:</h3>
              <div className="flex flex-nowrap sm:flex-wrap gap-2.5 pb-2 border-b border-gray-100 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all shrink-0 cursor-pointer ${
                    selectedCategory === "all"
                      ? "bg-brand-600 text-white shadow-lg shadow-brand-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <PawPrint className="w-4.5 h-4.5" />
                  كل الأليفين
                </button>

                <button
                  onClick={() => setSelectedCategory("cats")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all shrink-0 cursor-pointer ${
                    selectedCategory === "cats"
                      ? "bg-brand-600 text-white shadow-lg shadow-brand-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <Cat className="w-4.5 h-4.5" />
                  قطط
                </button>

                <button
                  onClick={() => setSelectedCategory("dogs")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all shrink-0 cursor-pointer ${
                    selectedCategory === "dogs"
                      ? "bg-brand-600 text-white shadow-lg shadow-brand-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <Dog className="w-4.5 h-4.5" />
                  كلاب
                </button>

                <button
                  onClick={() => setSelectedCategory("birds")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all shrink-0 cursor-pointer ${
                    selectedCategory === "birds"
                      ? "bg-brand-600 text-white shadow-lg shadow-brand-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <Bird className="w-4.5 h-4.5" />
                  طيور
                </button>

                <button
                  onClick={() => setSelectedCategory("rabbits")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all shrink-0 cursor-pointer ${
                    selectedCategory === "rabbits"
                      ? "bg-brand-600 text-white shadow-lg shadow-brand-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <PawPrint className="w-4.5 h-4.5" />
                  أرانب
                </button>

                <button
                  onClick={() => setSelectedCategory("others")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all shrink-0 cursor-pointer ${
                    selectedCategory === "others"
                      ? "bg-brand-600 text-white shadow-lg shadow-brand-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <PawPrint className="w-4.5 h-4.5" />
                  كائنات أخرى
                </button>
              </div>
            </div>

            {/* Pets Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
              {filteredPets.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-[#e6decf] max-w-lg mx-auto">
                  <PawPrint className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-black text-gray-700">لم نعثر على أي نتائج!</h4>
                  <p className="text-sm text-gray-400 font-semibold mt-1">جرب تغيير شروط البحث، أو مدينة التصفح للحصول على نتائج أوسع.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {filteredPets.map((pet) => (
                    <PetCard
                      key={pet.id}
                      pet={pet}
                      onViewDetails={(p) => setSelectedPet(p)}
                      isFavorite={currentUser?.favoritePetIds.includes(pet.id)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "lost-pets" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" dir="rtl">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 p-6 sm:p-8 bg-gradient-to-r from-rose-50 to-orange-50/30 rounded-3xl border border-rose-100">
              <div>
                <span className="inline-block px-3.5 py-1 bg-rose-100 text-rose-800 text-xs font-black rounded-full mb-3">
                  قسم المفقودات البلاغات العاجلة 🔍
                </span>
                <h2 className="text-3xl font-black text-rose-950">
                  الحيوانات الأليفة المفقودة في اليمن
                </h2>
                <p className="text-sm text-rose-800/80 font-bold mt-1.5 leading-relaxed">
                  إذا فقدت حيوانك الأليف أو عثرت على حيوان تائه في منطقتك، يرجى مشاركة صورته وتفاصيله هنا فوراً لمساعدته في العودة إلى منزله بسلام.
                </p>
              </div>
              <button
                onClick={() => {
                  if (currentUser) {
                    setIsAddModalOpen(true);
                  } else {
                    setAuthModalMessage("الرجاء تسجيل الدخول أولاً لتتمكن من إضافة بلاغ عن أليف مفقود 🐾");
                    setIsAuthModalOpen(true);
                  }
                }}
                className="shrink-0 flex items-center justify-center gap-2 px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-sm font-black shadow-lg shadow-rose-600/10 active:scale-98 transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                أبلغ عن أليف مفقود
              </button>
            </div>

            {/* Compact Search and City filter */}
            <div className="bg-white p-4 rounded-3xl border border-[#f1e9dc] mb-8 grid grid-cols-1 md:grid-cols-4 gap-3" dir="rtl">
              <div className="md:col-span-2 relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، السلالة، أو التفاصيل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all text-right"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-500 pointer-events-none" />
                <select
                  value={selectedGovernorate}
                  onChange={(e) => {
                    setSelectedGovernorate(e.target.value);
                    setSelectedCity(""); // Reset city when governorate changes
                  }}
                  className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white appearance-none cursor-pointer transition-all text-right"
                >
                  <option value="">المحافظة 🇾🇪</option>
                  {GOVERNORATES_YEMEN.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  disabled={!selectedGovernorate}
                  className={`w-full pr-11 pl-4 py-3 border rounded-2xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-rose-500 appearance-none cursor-pointer transition-all text-right ${
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

            {/* Quick Tips Box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="p-5 bg-white rounded-2xl border border-gray-100">
                <span className="text-base font-black text-gray-900 block mb-2">1. تصرف فوراً ⏰</span>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                  ابحث في محيط 500 متر من مكان الفقدان، فالأليفين غالباً يختبئون في الأماكن القريبة أو تحت السيارات عند شعورهم بالخوف.
                </p>
              </div>
              <div className="p-5 bg-white rounded-2xl border border-gray-100">
                <span className="text-base font-black text-gray-900 block mb-2">2. الطعام والنداء 🥣</span>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                  انزل في أوقات الهدوء (الفجر أو الليل المتأخر) ونادهم باسمهم المعتاد، واصنع صوتاً مألوفاً كتحريك علبة الطعام المفضلة.
                </p>
              </div>
              <div className="p-5 bg-white rounded-2xl border border-gray-100">
                <span className="text-base font-black text-gray-900 block mb-2">3. نشر البلاغ 📣</span>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                  انشر الإعلان هنا على منصة أليف، وشارك الرابط في مجموعات واتساب وفيسبوك المحلية لزيادة فرص العثور عليه.
                </p>
              </div>
            </div>

            {/* Category selection bar */}
            <div className="mb-8">
              <h3 className="text-base font-black text-gray-900 mb-3.5">تصفية حسب نوع الحيوان المفقود:</h3>
              <div className="flex flex-wrap gap-2.5 pb-2 border-b border-gray-100">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "all"
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <PawPrint className="w-4.5 h-4.5" />
                  كل المفقودات
                </button>

                <button
                  onClick={() => setSelectedCategory("cats")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "cats"
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <Cat className="w-4.5 h-4.5" />
                  قطط
                </button>

                <button
                  onClick={() => setSelectedCategory("dogs")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "dogs"
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <Dog className="w-4.5 h-4.5" />
                  كلاب
                </button>

                <button
                  onClick={() => setSelectedCategory("birds")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "birds"
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <Bird className="w-4.5 h-4.5" />
                  طيور
                </button>

                <button
                  onClick={() => setSelectedCategory("rabbits")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "rabbits"
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <PawPrint className="w-4.5 h-4.5" />
                  أرانب
                </button>

                <button
                  onClick={() => setSelectedCategory("others")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "others"
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <PawPrint className="w-4.5 h-4.5" />
                  كائنات أخرى
                </button>
              </div>
            </div>

            {/* Grid list */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <h3 className="text-lg font-black text-gray-900">
                  البلاغات النشطة حالياً ({filteredPets.length})
                </h3>
              </div>

              {filteredPets.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#e6decf] max-w-lg mx-auto">
                  <PawPrint className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-black text-gray-700">لا توجد بلاغات مفقودة حالياً!</h4>
                  <p className="text-sm text-gray-400 font-semibold mt-1">الحمد لله، لا يوجد بلاغات نشطة مفقودة تطابق الفلاتر المحددة حالياً.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {filteredPets.map((pet) => (
                    <PetCard
                      key={pet.id}
                      pet={pet}
                      onViewDetails={(p) => setSelectedPet(p)}
                      isFavorite={currentUser?.favoritePetIds.includes(pet.id)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "mating" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" dir="rtl">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 p-6 sm:p-8 bg-gradient-to-r from-purple-50 to-pink-50/30 rounded-3xl border border-purple-100">
              <div>
                <span className="inline-block px-3.5 py-1 bg-purple-100 text-purple-800 text-xs font-black rounded-full mb-3">
                  طلبات التزاوج والرعاية المشتركة 💖
                </span>
                <h2 className="text-3xl font-black text-purple-950">
                  طلبات تزاوج الحيوانات الأليفة
                </h2>
                <p className="text-sm text-purple-800/80 font-bold mt-1.5 leading-relaxed">
                  ابحث عن شريك تزاوج متوافق ومناسب صحياً لأليفك في اليمن، مع التنسيق بين المربين لضمان رعاية كاملة وآمنة.
                </p>
              </div>
              <button
                onClick={() => {
                  if (currentUser) {
                    setIsAddModalOpen(true);
                  } else {
                    setAuthModalMessage("الرجاء تسجيل الدخول أولاً لتتمكن من إضافة طلب تزاوج 🐾");
                    setIsAuthModalOpen(true);
                  }
                }}
                className="shrink-0 flex items-center justify-center gap-2 px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-sm font-black shadow-lg shadow-purple-600/10 active:scale-98 transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                أضف طلب تزاوج جديد
              </button>
            </div>

            {/* Compact Search and City filter */}
            <div className="bg-white p-4 rounded-3xl border border-[#f1e9dc] mb-8 grid grid-cols-1 md:grid-cols-4 gap-3" dir="rtl">
              <div className="md:col-span-2 relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، السلالة، أو التفاصيل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-right"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500 pointer-events-none" />
                <select
                  value={selectedGovernorate}
                  onChange={(e) => {
                    setSelectedGovernorate(e.target.value);
                    setSelectedCity(""); // Reset city when governorate changes
                  }}
                  className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white appearance-none cursor-pointer transition-all text-right"
                >
                  <option value="">المحافظة 🇾🇪</option>
                  {GOVERNORATES_YEMEN.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  disabled={!selectedGovernorate}
                  className={`w-full pr-11 pl-4 py-3 border rounded-2xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer transition-all text-right ${
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

            {/* Quick Tips Box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="p-5 bg-white rounded-2xl border border-gray-100">
                <span className="text-base font-black text-gray-900 block mb-2">1. الفحوصات الطبية 💉</span>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                  تأكد من تحديث دفاتر التحصينات والتطعيمات لكلا الأليفين قبل البدء في أي تزاوج لتجنب انتقال العدوى الفيروسية.
                </p>
              </div>
              <div className="p-5 bg-white rounded-2xl border border-gray-100">
                <span className="text-base font-black text-gray-900 block mb-2">2. فترة التعارف 🏡</span>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                  امنح الأليفين بضعة أيام للتعارف الهادئ في مكان مريح وخاضع لإشرافك الشخصي لضمان عدم حدوث سلوكيات عدوانية.
                </p>
              </div>
              <div className="p-5 bg-white rounded-2xl border border-gray-100">
                <span className="text-base font-black text-gray-900 block mb-2">3. الاتفاق المسبق 🤝</span>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                  اتفق مع صاحب الأليف الآخر بوضوح على مصير الصغار وتوزيعهم على عائلات أمينة لمنع تشردهم مستقبلاً.
                </p>
              </div>
            </div>

            {/* Category selection bar */}
            <div className="mb-8">
              <h3 className="text-base font-black text-gray-900 mb-3.5">تصفية حسب نوع حيوان التزاوج:</h3>
              <div className="flex flex-wrap gap-2.5 pb-2 border-b border-gray-100">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "all"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <PawPrint className="w-4.5 h-4.5" />
                  كل الطلبات
                </button>

                <button
                  onClick={() => setSelectedCategory("cats")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "cats"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <Cat className="w-4.5 h-4.5" />
                  قطط
                </button>

                <button
                  onClick={() => setSelectedCategory("dogs")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "dogs"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <Dog className="w-4.5 h-4.5" />
                  كلاب
                </button>

                <button
                  onClick={() => setSelectedCategory("birds")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "birds"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <Bird className="w-4.5 h-4.5" />
                  طيور
                </button>

                <button
                  onClick={() => setSelectedCategory("rabbits")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "rabbits"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <PawPrint className="w-4.5 h-4.5" />
                  أرانب
                </button>

                <button
                  onClick={() => setSelectedCategory("others")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "others"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <PawPrint className="w-4.5 h-4.5" />
                  كائنات أخرى
                </button>
              </div>
            </div>

            {/* Grid list */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <h3 className="text-lg font-black text-gray-900">
                  طلبات التزاوج النشطة ({filteredPets.length})
                </h3>
              </div>

              {filteredPets.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#e6decf] max-w-lg mx-auto">
                  <PawPrint className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-black text-gray-700">لا توجد طلبات تزاوج حالياً!</h4>
                  <p className="text-sm text-gray-400 font-semibold mt-1">جرب تغيير شروط البحث لتصفح طلبات التزاوج المتوفرة.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {filteredPets.map((pet) => (
                    <PetCard
                      key={pet.id}
                      pet={pet}
                      onViewDetails={(p) => setSelectedPet(p)}
                      isFavorite={currentUser?.favoritePetIds.includes(pet.id)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "rescue-cases" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" dir="rtl">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 p-6 sm:p-8 bg-gradient-to-r from-red-50 to-amber-50/20 rounded-3xl border border-red-100">
              <div>
                <span className="inline-block px-3.5 py-1 bg-red-100 text-red-800 text-xs font-black rounded-full mb-3 animate-pulse">
                  حالات إنقاذ عاجلة وخطيرة 🚨
                </span>
                <h2 className="text-3xl font-black text-red-950">
                  حالات الإنقاذ العاجلة في اليمن
                </h2>
                <p className="text-sm text-red-800/80 font-bold mt-1.5 leading-relaxed">
                  هنا تجد الحيوانات المشردة أو المصابة في شوارع اليمن التي تحتاج لمساعدة طبية، علاج، طعام دافئ، أو مأوى مستضيف (Foster) مؤقتاً لإنقاذ أرواحها.
                </p>
              </div>
              <button
                onClick={() => {
                  if (currentUser) {
                    setIsAddModalOpen(true);
                  } else {
                    setAuthModalMessage("الرجاء تسجيل الدخول أولاً لتتمكن من إضافة بلاغ إنقاذ عاجل 🐾");
                    setIsAuthModalOpen(true);
                  }
                }}
                className="shrink-0 flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-sm font-black shadow-lg shadow-red-600/10 active:scale-98 transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                أبلغ عن حالة إنقاذ عاجلة
              </button>
            </div>

            {/* Compact Search and City filter */}
            <div className="bg-white p-4 rounded-3xl border border-[#f1e9dc] mb-8 grid grid-cols-1 md:grid-cols-4 gap-3" dir="rtl">
              <div className="md:col-span-2 relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، السلالة، أو التفاصيل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-right"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" />
                <select
                  value={selectedGovernorate}
                  onChange={(e) => {
                    setSelectedGovernorate(e.target.value);
                    setSelectedCity(""); // Reset city when governorate changes
                  }}
                  className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white appearance-none cursor-pointer transition-all text-right"
                >
                  <option value="">المحافظة 🇾🇪</option>
                  {GOVERNORATES_YEMEN.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  disabled={!selectedGovernorate}
                  className={`w-full pr-11 pl-4 py-3 border rounded-2xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none cursor-pointer transition-all text-right ${
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

            {/* Rescue Guide Banner */}
            <div className="p-6 bg-red-950 text-white rounded-3xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <h4 className="text-lg font-black flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  كيف تساهم في إنقاذ الأليفين؟
                </h4>
                <p className="text-xs text-red-100/80 font-medium max-w-2xl leading-relaxed">
                  إذا رأيت حيواناً مصاباً أو في حالة خطر، يمكنك نقله لأقرب عيادة بيطرية في دليل عيادات "أليف". تذكر أن مساهمتك بالاستضافة أو التبرع بتكاليف العلاج تنقذ روحاً بريئة لا تستطيع التعبير عن ألمها.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("clinics")}
                  className="px-4 py-2 bg-white text-red-950 rounded-xl text-xs font-black hover:bg-gray-100 transition-all cursor-pointer"
                >
                  تصفح دليل العيادات البيطرية
                </button>
              </div>
            </div>

            {/* Rescue Sub-tabs switcher */}
            <div className="flex border-b border-gray-100 mb-8 gap-6">
              <button
                onClick={() => setRescueSubTab("active")}
                className={`pb-4 text-base font-black border-b-3 transition-all cursor-pointer flex items-center gap-2 ${
                  rescueSubTab === "active"
                    ? "border-red-600 text-red-950 scale-102"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                <span>🚨 حالات بحاجة لإنقاذ عاجل</span>
                <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold ${rescueSubTab === "active" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                  {pets.filter(p => p.purpose === "rescue" && p.status !== "rescued").length}
                </span>
              </button>
              <button
                onClick={() => setRescueSubTab("rescued")}
                className={`pb-4 text-base font-black border-b-3 transition-all cursor-pointer flex items-center gap-2 ${
                  rescueSubTab === "rescued"
                    ? "border-emerald-600 text-emerald-950 scale-102"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                <span>💚🏆 حكايات نجاح: حالات تم إنقاذها بسلام</span>
                <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold ${rescueSubTab === "rescued" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                  {pets.filter(p => p.purpose === "rescue" && p.status === "rescued").length}
                </span>
              </button>
            </div>

            {/* Category selection bar */}
            <div className="mb-8">
              <h3 className="text-sm font-black text-gray-900 mb-3.5">
                {rescueSubTab === "active" ? "تصفية حسب نوع حيوان الإنقاذ:" : "تصفية حسب نوع الحيوان الذي تم إنقاذه:"}
              </h3>
              <div className="flex flex-wrap gap-2.5 pb-2 border-b border-gray-100">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "all"
                      ? rescueSubTab === "active" ? "bg-red-600 text-white shadow-lg shadow-red-600/10" : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <PawPrint className="w-4.5 h-4.5" />
                  كل الفئات
                </button>

                <button
                  onClick={() => setSelectedCategory("cats")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "cats"
                      ? rescueSubTab === "active" ? "bg-red-600 text-white shadow-lg shadow-red-600/10" : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <Cat className="w-4.5 h-4.5" />
                  قطط
                </button>

                <button
                  onClick={() => setSelectedCategory("dogs")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "dogs"
                      ? rescueSubTab === "active" ? "bg-red-600 text-white shadow-lg shadow-red-600/10" : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <Dog className="w-4.5 h-4.5" />
                  كلاب
                </button>

                <button
                  onClick={() => setSelectedCategory("birds")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "birds"
                      ? rescueSubTab === "active" ? "bg-red-600 text-white shadow-lg shadow-red-600/10" : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <Bird className="w-4.5 h-4.5" />
                  طيور
                </button>

                <button
                  onClick={() => setSelectedCategory("rabbits")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "rabbits"
                      ? rescueSubTab === "active" ? "bg-red-600 text-white shadow-lg shadow-red-600/10" : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <PawPrint className="w-4.5 h-4.5" />
                  أرانب
                </button>

                <button
                  onClick={() => setSelectedCategory("others")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "others"
                      ? rescueSubTab === "active" ? "bg-red-600 text-white shadow-lg shadow-red-600/10" : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                      : "bg-white text-gray-600 border border-[#f3ede4] hover:bg-gray-50"
                  }`}
                >
                  <PawPrint className="w-4.5 h-4.5" />
                  كائنات أخرى
                </button>
              </div>
            </div>

            {/* Grid list */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <h3 className="text-lg font-black text-gray-900">
                  {rescueSubTab === "active" ? `بلاغات الإنقاذ النشطة حالياً (${filteredPets.length})` : `حكايات النجاح الملهمة (${filteredPets.length})`}
                </h3>
              </div>

              {filteredPets.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#e6decf] max-w-lg mx-auto">
                  <PawPrint className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-black text-gray-700">
                    {rescueSubTab === "active" ? "لا توجد حالات إنقاذ نشطة حالياً!" : "لا توجد حكايات نجاح مسجلة بعد!"}
                  </h4>
                  <p className="text-sm text-gray-400 font-semibold mt-1">
                    {rescueSubTab === "active" 
                      ? "الحمد لله، لا توجد حالات إنقاذ نشطة تطابق شروط الفلترة الحالية." 
                      : "كن أول من ينقذ حيواناً أليفاً ويكتب حكاية نجاح ملهمة هنا!"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {filteredPets.map((pet) => (
                    <PetCard
                      key={pet.id}
                      pet={pet}
                      onViewDetails={(p) => setSelectedPet(p)}
                      isFavorite={currentUser?.favoritePetIds.includes(pet.id)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "clinics" && (() => {
          const filteredClinics = clinics.filter(c => {
            const query = clinicSearchQuery.toLowerCase();
            const matchesSearch = query === "" ||
              c.name.toLowerCase().includes(query) ||
              c.city.toLowerCase().includes(query) ||
              c.address.toLowerCase().includes(query) ||
              (c.services && c.services.some(s => s.toLowerCase().includes(query)));

            if (!matchesSearch) return false;

            // governorate match
            const matchesGovernorate = clinicGov === "" || c.city.includes(clinicGov) || c.address.includes(clinicGov);
            if (!matchesGovernorate) return false;

            // city match
            const matchesCity = clinicCity === "" || c.city.includes(clinicCity) || c.address.includes(clinicCity);
            if (!matchesCity) return false;

            return true;
          });

          return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" dir="rtl">
              {/* Header */}
              <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-brand-900">
                    العيادات الطبية المعتمدة في اليمن 🏥
                  </h2>
                  <p className="text-sm text-gray-500 font-bold mt-1">
                    دليل العيادات البيطرية المتكامل للحالات المرضية، الفحوصات والتحصينات الطارئة
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("contact-admin")}
                  className="px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md shadow-brand-600/10 hover:shadow-brand-600/20 active:scale-98 cursor-pointer shrink-0 text-center"
                >
                  تواصل مع إدارة المنصة لإضافة عيادة 📞
                </button>
              </div>

              {/* Real-time Filters Bar for Clinics */}
              <div className="bg-white p-5 rounded-3xl border border-[#ede5d8] shadow-xs max-w-4xl mx-auto mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search input */}
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400">
                      <Search className="w-4.5 h-4.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="البحث بالاسم، خدمات مثل: تطعيم..."
                      value={clinicSearchQuery}
                      onChange={(e) => setClinicSearchQuery(e.target.value)}
                      className="w-full pl-4 pr-11 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs sm:text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-right"
                    />
                  </div>

                  {/* Governorate selection */}
                  <div>
                    <select
                      value={clinicGov}
                      onChange={(e) => {
                        setClinicGov(e.target.value);
                        setClinicCity(""); // reset city
                      }}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs sm:text-sm font-black text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-right cursor-pointer"
                    >
                      <option value="">كل المحافظات 🇾🇪</option>
                      {GOVERNORATES_YEMEN.map((gov) => (
                        <option key={gov} value={gov}>
                          {gov}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* City selection */}
                  <div>
                    <select
                      value={clinicCity}
                      onChange={(e) => setClinicCity(e.target.value)}
                      disabled={!clinicGov}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs sm:text-sm font-black text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-right disabled:opacity-50 cursor-pointer"
                    >
                      <option value="">كل المديريات / المناطق</option>
                      {clinicGov &&
                        CITIES_BY_GOVERNORATE[clinicGov]?.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Clinics List using Accordion Cards */}
              {filteredClinics.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#e6decf]">
                  <p className="text-sm text-gray-400 font-bold">لا توجد عيادات مطابقة لبحثك حالياً.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredClinics.map((clinic) => (
                    <ClinicCard 
                      key={clinic.id} 
                      clinic={clinic}
                      isExpanded={expandedClinicId === clinic.id}
                      onToggleExpand={() => setExpandedClinicId(expandedClinicId === clinic.id ? null : clinic.id)}
                      onAddComment={handleAddClinicComment}
                      onAddImage={handleAddClinicImage}
                    />
                  ))}
                </div>
              )}

              {/* Quick Banner info */}
              <div className="mt-12 p-6 bg-amber-50 rounded-3xl border border-amber-100/70 max-w-3xl mx-auto flex flex-col md:flex-row gap-4 items-center md:items-start justify-between">
                <div className="flex gap-4 items-start">
                  <Info className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-black text-amber-900">تنويه لأصحاب العيادات البيطرية في اليمن:</h4>
                    <p className="text-xs text-amber-800 font-bold leading-relaxed mt-1">
                      إذا كنت تمتلك عيادة بيطرية مرخصة أو تقدم خدمات رعاية للحيوانات الأليفة في أي محافظة يمنية وترغب في إضافتك لدليل العيادات لمساعدة المربين، يرجى التواصل مع إدارة منصة "أليف" لتسجيل معلومات عيادتك فوراً.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("contact-admin")}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl transition-all shadow-md shrink-0 cursor-pointer whitespace-nowrap"
                >
                  تواصل معنا الآن 📱
                </button>
              </div>
            </div>
          );
        })()}

        {activeTab === "community" && (
          <CommunityHub
            posts={posts}
            onAddPost={handleAddPost}
            onLikePost={handleLikePost}
          />
        )}

        {activeTab === "ai-advisor" && <AiAdvisor />}

        {activeTab === "contact-admin" && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-right" dir="rtl">
            <div className="text-center max-w-2xl mx-auto mb-10 animate-fadeIn">
              <span className="inline-block px-4 py-1.5 bg-brand-50 text-brand-700 text-xs font-black rounded-full mb-3 border border-brand-100">
                📞 إدارة منصة أليف اليمن
              </span>
              <h2 className="text-3xl font-black text-brand-900 leading-tight">
                تواصل مع إدارة المنصة
              </h2>
              <p className="text-sm text-gray-500 font-bold mt-2 leading-relaxed">
                يسعدنا دائماً الاستماع لآرائكم ومساعدتكم في كل ما يخص رعاية وتبني الأليفين في اليمن.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Contact Information Cards (5 cols) */}
              <div className="md:col-span-5 space-y-4">
                <div className="bg-white rounded-3xl p-6 border border-[#f3ede4] shadow-xs hover:shadow-md transition-all">
                  <span className="text-2xl">📱</span>
                  <h4 className="text-base font-black text-gray-900 mt-2">رقم الهاتف</h4>
                  <p className="text-xs text-gray-400 font-bold mt-1">تواصل معنا عبر واتساب على مدار الساعة:</p>
                  <p className="text-lg font-black text-brand-700 mt-2 tracking-wide" style={{ direction: "ltr" }}>
                    00976781003988
                  </p>
                  <div className="mt-4 flex gap-2">
                    <a
                      href="https://wa.me/00976781003988"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black text-center transition-all"
                    >
                      واتساب 💬
                    </a>
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 rounded-3xl p-6 space-y-2">
                  <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    <span>💡 كيف يمكننا مساعدتك؟</span>
                  </h4>
                  <ul className="text-xs text-amber-800 space-y-1.5 font-bold leading-relaxed list-disc pr-4">
                    <li>طلب إضافة عيادة بيطرية جديدة في محافظتك.</li>
                    <li>المساعدة في استعادة كلمة مرور حسابك.</li>
                    <li>المقترحات والأفكار التطويرية للمنصة.</li>
                  </ul>
                </div>
              </div>

              {/* Message Sending Form (7 cols) */}
              <div className="md:col-span-7 bg-white rounded-3xl p-6 border border-[#f3ede4] shadow-xs">
                <h3 className="text-lg font-black text-gray-900 mb-4">أرسل رسالة سريعة للإدارة:</h3>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    alert("تم إرسال رسالتك بنجاح لطاقم إدارة أليف اليمن! سنقوم بالرد عليك عبر الهاتف أو الواتساب فوراً. ❤️");
                    form.reset();
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1.5">الاسم الكريم *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: محمد اليماني..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1.5">رقم الهاتف أو الواتساب المفضل للتواصل *</label>
                    <input
                      type="tel"
                      required
                      placeholder="مثال: 77XXXXXXX"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-left"
                      style={{ direction: "ltr" }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1.5">نص الرسالة / الطلب *</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="اكتب هنا تفاصيل طلبك أو العيادة التي تود إضافتها مع العنوان والخدمات..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-right"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-black shadow-lg shadow-brand-600/10 transition-all cursor-pointer"
                  >
                    إرسال الرسالة للإدارة
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === "profile" && currentUser && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" dir="rtl">
            {/* Profile Greeting Card */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 sm:p-8 bg-gradient-to-r from-brand-50 to-amber-50/25 rounded-3xl border border-brand-100 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-brand-600/15">
                  {currentUser.username.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-brand-950">أهلاً بك، {currentUser.username} 👋</h2>
                  <p className="text-xs text-gray-500 font-bold mt-1">
                    عضو في منصة أليف اليمن منذ {new Date(currentUser.createdAt).toLocaleDateString("ar-YE", { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-brand-600/10 active:scale-98 transition-all cursor-pointer"
                >
                  أضف أليفاً جديداً
                </button>
                <button
                  onClick={handleLogout}
                  className="px-5 py-3 bg-white hover:bg-rose-50 text-gray-600 hover:text-rose-600 border border-gray-200 hover:border-rose-100 rounded-2xl text-xs font-black transition-all cursor-pointer"
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>

            {/* Account Tab Switchers */}
            <div className="flex border-b border-gray-100 mb-8 gap-4">
              <button
                onClick={() => setProfileSubTab("added")}
                className={`pb-4 text-sm font-black border-b-2 transition-all cursor-pointer ${
                  profileSubTab === "added"
                    ? "border-brand-600 text-brand-900"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                الأليفين الذين أضفتهم 🐾 ({pets.filter((p) => p.ownerId === currentUser.id).length})
              </button>
              <button
                onClick={() => setProfileSubTab("favorites")}
                className={`pb-4 text-sm font-black border-b-2 transition-all cursor-pointer ${
                  profileSubTab === "favorites"
                    ? "border-brand-600 text-brand-900"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                قائمة الأليفين المفضلة ❤️ ({pets.filter((p) => currentUser.favoritePetIds.includes(p.id)).length})
              </button>
            </div>

            {/* Added Pets Tab content */}
            {profileSubTab === "added" && (
              <div>
                {pets.filter((p) => p.ownerId === currentUser.id).length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-[#e6decf] max-w-lg mx-auto">
                    <PawPrint className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-black text-gray-700">لم تقم بإضافة أي حيوان أليف بعد!</h4>
                    <p className="text-sm text-gray-400 font-semibold mt-1">
                      هل لديك قطة للتبني، أو كلب مفقود، أو حالة إنقاذ؟ أضفهم الآن لمساعدتهم فوراً.
                    </p>
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="px-5 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-xs font-black transition-all cursor-pointer mt-4"
                    >
                      أضف إعلاناً الآن
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {pets
                      .filter((p) => p.ownerId === currentUser.id)
                      .map((pet) => (
                        <div key={pet.id} className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition-all border border-[#f3ede4] group/usercard">
                          <div className="flex-grow">
                            <PetCard
                              pet={pet}
                              onViewDetails={(p) => setSelectedPet(p)}
                              isFavorite={currentUser.favoritePetIds.includes(pet.id)}
                              onToggleFavorite={handleToggleFavorite}
                            />
                          </div>
                          <div className="flex border-t border-gray-100 bg-gray-50/50 p-4 gap-2.5">
                            <button
                              onClick={() => {
                                setEditingPet(pet);
                                setIsAddModalOpen(true);
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                            >
                              تعديل البيانات
                            </button>
                            <button
                              onClick={() => handleDeletePet(pet.id)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                deleteConfirmId === pet.id
                                  ? "bg-red-600 text-white animate-pulse"
                                  : "bg-rose-50 hover:bg-rose-100 text-rose-600"
                              }`}
                            >
                              {deleteConfirmId === pet.id ? "تأكيد الحذف ⚠️" : "حذف"}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Favorite Pets Tab content */}
            {profileSubTab === "favorites" && (
              <div>
                {pets.filter((p) => currentUser.favoritePetIds.includes(p.id)).length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-[#e6decf] max-w-lg mx-auto">
                    <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-black text-gray-700">قائمة المفضلة فارغة حالياً!</h4>
                    <p className="text-sm text-gray-400 font-semibold mt-1">
                      تصفح الأليفين وضع رمز القلب على الحيوانات التي تعجبك لتتمكن من تتبعها والتواصل مع أصحابها في أي وقت.
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab("pets");
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-5 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-xs font-black transition-all cursor-pointer mt-4"
                    >
                      تصفح أليفين اليمن الآن
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {pets
                      .filter((p) => currentUser.favoritePetIds.includes(p.id))
                      .map((pet) => (
                        <PetCard
                          key={pet.id}
                          pet={pet}
                          onViewDetails={(p) => setSelectedPet(p)}
                          isFavorite={currentUser.favoritePetIds.includes(pet.id)}
                          onToggleFavorite={handleToggleFavorite}
                        />
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#f3ede4] py-8 text-center text-xs font-bold text-gray-400">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>© 2026 منصة أليف اليمن للحيوانات الأليفة. جميع الحقوق محفوظة لإنقاذ ورعاية الحيوان.</p>
        </div>
      </footer>

      {/* Modals */}
      {selectedPet && (
        <PetDetailsModal
          pet={selectedPet}
          onClose={() => setSelectedPet(null)}
        />
      )}

      {selectedClinic && (
        <ClinicDetailsModal
          clinic={selectedClinic}
          onClose={() => setSelectedClinic(null)}
          onAddComment={handleAddClinicComment}
          onAddImage={handleAddClinicImage}
        />
      )}

      {isAddModalOpen && (
        <AddPetModal
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingPet(null);
          }}
          onAddPet={handleAddPet}
          defaultOwnerName={currentUser?.username || ""}
          editingPet={editingPet}
          onEditPet={handleEditPet}
          activeTab={activeTab}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
          message={authModalMessage}
        />
      )}

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuthModal={() => {
          setAuthModalMessage("");
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpenAddModal={() => {
          if (currentUser) {
            setIsAddModalOpen(true);
          } else {
            setAuthModalMessage("الرجاء تسجيل الدخول أولاً لتتمكن من إضافة إعلان جديد 🐾");
            setIsAuthModalOpen(true);
          }
        }}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
      />

      {isAdminPanelOpen && currentUser?.role === "admin" && (
        <AdminPanel
          currentUser={currentUser}
          pets={pets}
          clinics={clinics}
          posts={posts}
          onClose={() => setIsAdminPanelOpen(false)}
          onRequestEditPet={(pet) => {
            setEditingPet(pet);
            setIsAddModalOpen(true);
            setIsAdminPanelOpen(false);
          }}
          onDeletePet={handleDeletePet}
          deleteConfirmId={deleteConfirmId}
          onClinicsChange={setClinics}
          onPostsChange={setPosts}
        />
      )}

    </div>
  );
}
