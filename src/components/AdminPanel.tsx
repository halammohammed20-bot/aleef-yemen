import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  PawPrint,
  Stethoscope,
  MessageSquare,
  Users,
  Trash2,
  Pencil,
  Plus,
  X,
  Star,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PetListing, Clinic, CommunityPost, UserAccount } from "../types";
import {
  fetchAllUsers,
  setUserRole,
  insertClinic,
  updateClinic,
  deleteClinic,
  deleteClinicComment,
  deletePost,
  AdminUserRow,
} from "../lib/db";

interface AdminPanelProps {
  currentUser: UserAccount;
  pets: PetListing[];
  clinics: Clinic[];
  posts: CommunityPost[];
  onClose: () => void;
  onRequestEditPet: (pet: PetListing) => void;
  onDeletePet: (id: string) => void;
  deleteConfirmId: string | null;
  onClinicsChange: (clinics: Clinic[]) => void;
  onPostsChange: (posts: CommunityPost[]) => void;
}

type AdminTab = "overview" | "pets" | "clinics" | "community" | "users";

const emptyClinicForm = {
  name: "",
  city: "",
  phone: "",
  address: "",
  hasEmergency: false,
  services: "",
  description: "",
  workingHours: "",
};

export default function AdminPanel({
  currentUser,
  pets,
  clinics,
  posts,
  onClose,
  onRequestEditPet,
  onDeletePet,
  deleteConfirmId,
  onClinicsChange,
  onPostsChange,
}: AdminPanelProps) {
  const [tab, setTab] = useState<AdminTab>("overview");

  /* --------------------------- Users tab state --------------------------- */
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (err: any) {
      setUsersError(err?.message || "تعذر تحميل قائمة المستخدمين.");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "users" && users.length === 0 && !usersLoading) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleToggleRole = async (user: AdminUserRow) => {
    if (user.id === currentUser.id) {
      alert("لا يمكنك تعديل صلاحيات حسابك الخاص من هنا.");
      return;
    }
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await setUserRole(user.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
    } catch (err: any) {
      alert(err?.message || "تعذر تحديث الصلاحية. حاول مرة أخرى.");
    }
  };

  /* -------------------------- Pets tab (delete) --------------------------- */
  const [petDeleteIntent, setPetDeleteIntent] = useState<string | null>(null);

  /* ------------------------------ Clinics tab ------------------------------ */
  const [clinicFormOpen, setClinicFormOpen] = useState(false);
  const [editingClinicId, setEditingClinicId] = useState<string | null>(null);
  const [clinicForm, setClinicForm] = useState(emptyClinicForm);
  const [clinicSaving, setClinicSaving] = useState(false);
  const [clinicError, setClinicError] = useState("");
  const [clinicDeleteIntent, setClinicDeleteIntent] = useState<string | null>(null);
  const [expandedClinicId, setExpandedClinicId] = useState<string | null>(null);

  const openNewClinicForm = () => {
    setEditingClinicId(null);
    setClinicForm(emptyClinicForm);
    setClinicError("");
    setClinicFormOpen(true);
  };

  const openEditClinicForm = (clinic: Clinic) => {
    setEditingClinicId(clinic.id);
    setClinicForm({
      name: clinic.name,
      city: clinic.city,
      phone: clinic.phone,
      address: clinic.address,
      hasEmergency: clinic.hasEmergency,
      services: (clinic.services || []).join("، "),
      description: clinic.description || "",
      workingHours: clinic.workingHours || "",
    });
    setClinicError("");
    setClinicFormOpen(true);
  };

  const handleSaveClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicForm.name.trim() || !clinicForm.city.trim() || !clinicForm.phone.trim() || !clinicForm.address.trim()) {
      setClinicError("الرجاء تعبئة الاسم والمدينة والهاتف والعنوان على الأقل.");
      return;
    }
    setClinicSaving(true);
    setClinicError("");
    try {
      const servicesArr = clinicForm.services
        .split(/[،,]/)
        .map((s) => s.trim())
        .filter(Boolean);

      if (editingClinicId) {
        const updated = await updateClinic(editingClinicId, {
          name: clinicForm.name.trim(),
          city: clinicForm.city.trim(),
          phone: clinicForm.phone.trim(),
          address: clinicForm.address.trim(),
          hasEmergency: clinicForm.hasEmergency,
          services: servicesArr,
          description: clinicForm.description.trim() || undefined,
          workingHours: clinicForm.workingHours.trim() || undefined,
        });
        onClinicsChange(clinics.map((c) => (c.id === editingClinicId ? { ...c, ...updated, comments: c.comments } : c)));
      } else {
        const created = await insertClinic({
          name: clinicForm.name.trim(),
          city: clinicForm.city.trim(),
          phone: clinicForm.phone.trim(),
          address: clinicForm.address.trim(),
          rating: 5,
          hasEmergency: clinicForm.hasEmergency,
          services: servicesArr,
          description: clinicForm.description.trim() || undefined,
          workingHours: clinicForm.workingHours.trim() || undefined,
          images: [],
        });
        onClinicsChange([{ ...created, comments: [] }, ...clinics]);
      }
      setClinicFormOpen(false);
      setClinicForm(emptyClinicForm);
      setEditingClinicId(null);
    } catch (err: any) {
      setClinicError(err?.message || "تعذر حفظ بيانات العيادة. حاول مرة أخرى.");
    } finally {
      setClinicSaving(false);
    }
  };

  const handleDeleteClinic = async (id: string) => {
    if (clinicDeleteIntent !== id) {
      setClinicDeleteIntent(id);
      setTimeout(() => setClinicDeleteIntent((prev) => (prev === id ? null : prev)), 4000);
      return;
    }
    try {
      await deleteClinic(id);
      onClinicsChange(clinics.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err?.message || "تعذر حذف العيادة.");
    } finally {
      setClinicDeleteIntent(null);
    }
  };

  const handleDeleteComment = async (clinicId: string, commentId: string) => {
    try {
      await deleteClinicComment(commentId);
      onClinicsChange(
        clinics.map((c) =>
          c.id === clinicId ? { ...c, comments: (c.comments || []).filter((cm) => cm.id !== commentId) } : c
        )
      );
    } catch (err: any) {
      alert(err?.message || "تعذر حذف التعليق.");
    }
  };

  /* ----------------------------- Community tab ------------------------------ */
  const [postDeleteIntent, setPostDeleteIntent] = useState<string | null>(null);

  const handleDeletePost = async (id: string) => {
    if (postDeleteIntent !== id) {
      setPostDeleteIntent(id);
      setTimeout(() => setPostDeleteIntent((prev) => (prev === id ? null : prev)), 4000);
      return;
    }
    try {
      await deletePost(id);
      onPostsChange(posts.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err?.message || "تعذر حذف المنشور.");
    } finally {
      setPostDeleteIntent(null);
    }
  };

  /* --------------------------------- Tabs UI --------------------------------- */
  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: "overview", label: "نظرة عامة", icon: ShieldCheck },
    { id: "pets", label: "الحيوانات", icon: PawPrint },
    { id: "clinics", label: "العيادات", icon: Stethoscope },
    { id: "community", label: "المجتمع والتعليقات", icon: MessageSquare },
    { id: "users", label: "المستخدمون", icon: Users },
  ];

  const totalComments = clinics.reduce((sum, c) => sum + (c.comments?.length || 0), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-950/40 backdrop-blur-sm" dir="rtl">
      <div className="min-h-screen flex items-start justify-center p-4 sm:p-8">
        <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-[#ede6dc] overflow-hidden my-4">
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#f3ede4] bg-gradient-to-l from-brand-700 to-brand-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <ShieldCheck className="w-5.5 h-5.5" />
              </div>
              <div>
                <h2 className="text-lg font-black">لوحة تحكم الأدمن</h2>
                <p className="text-[11px] text-brand-100 font-bold">إدارة كاملة لبيانات منصة أليف</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/15 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 p-4 border-b border-[#f3ede4] bg-[#faf8f5]">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    active
                      ? "bg-brand-600 text-white shadow-md shadow-brand-600/15"
                      : "bg-white text-gray-600 hover:bg-brand-50 border border-gray-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto space-y-6">
            {/* OVERVIEW */}
            {tab === "overview" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "إجمالي الحيوانات", value: pets.length, color: "brand" },
                  { label: "العيادات المسجلة", value: clinics.length, color: "amber" },
                  { label: "منشورات المجتمع", value: posts.length, color: "indigo" },
                  { label: "تعليقات العيادات", value: totalComments, color: "rose" },
                ].map((stat, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                    <span className="block text-2xl font-black text-brand-800">{stat.value}</span>
                    <span className="block text-[11px] font-bold text-gray-500 mt-1">{stat.label}</span>
                  </div>
                ))}
                <div className="col-span-2 sm:col-span-4 p-4 rounded-2xl bg-brand-50/50 border border-brand-100 text-xs font-bold text-brand-900 leading-relaxed">
                  مرحباً {currentUser.username} 👋 — من هنا تقدر تدير كل بيانات المنصة: تعديل/حذف أي إعلان حيوان،
                  إضافة أو تعديل أو حذف عيادات، حذف منشورات أو تعليقات مخالفة، وترقية/تنزيل صلاحيات المستخدمين.
                </div>
              </div>
            )}

            {/* PETS */}
            {tab === "pets" && (
              <div className="space-y-2.5">
                {pets.length === 0 ? (
                  <p className="text-xs text-gray-400 font-bold text-center py-8">لا توجد إعلانات حيوانات حالياً.</p>
                ) : (
                  pets.map((pet) => (
                    <div
                      key={pet.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-2xl"
                    >
                      <img
                        src={pet.imageUrl}
                        alt={pet.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-200"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{pet.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold truncate">
                          {pet.breed} · {pet.location} · {pet.ownerName}
                        </p>
                      </div>
                      <span className="text-[10px] font-black px-2 py-1 bg-white border border-gray-200 rounded-lg text-gray-500 shrink-0">
                        {pet.status || "available"}
                      </span>
                      <button
                        onClick={() => onRequestEditPet(pet)}
                        className="p-2 bg-white hover:bg-brand-50 text-brand-600 border border-gray-200 rounded-xl transition-all cursor-pointer shrink-0"
                        title="تعديل"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeletePet(pet.id)}
                        className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0 ${
                          deleteConfirmId === pet.id
                            ? "bg-red-600 text-white animate-pulse"
                            : "bg-rose-50 hover:bg-rose-100 text-rose-600"
                        }`}
                      >
                        {deleteConfirmId === pet.id ? "تأكيد ⚠️" : "حذف"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* CLINICS */}
            {tab === "clinics" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={openNewClinicForm}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة عيادة جديدة
                  </button>
                </div>

                {clinicFormOpen && (
                  <form
                    onSubmit={handleSaveClinic}
                    className="p-5 bg-brand-50/40 border border-brand-100 rounded-2xl space-y-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-brand-900">
                        {editingClinicId ? "تعديل بيانات العيادة" : "عيادة جديدة"}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setClinicFormOpen(false)}
                        className="p-1.5 hover:bg-white/60 rounded-lg text-gray-500 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {clinicError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-[11px] font-bold rounded-xl">
                        {clinicError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        placeholder="اسم العيادة *"
                        value={clinicForm.name}
                        onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <input
                        placeholder="المدينة *"
                        value={clinicForm.city}
                        onChange={(e) => setClinicForm({ ...clinicForm, city: e.target.value })}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <input
                        placeholder="رقم الهاتف *"
                        value={clinicForm.phone}
                        onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                        style={{ direction: "ltr", textAlign: "right" }}
                      />
                      <input
                        placeholder="العنوان التفصيلي *"
                        value={clinicForm.address}
                        onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <input
                        placeholder="ساعات العمل (اختياري)"
                        value={clinicForm.workingHours}
                        onChange={(e) => setClinicForm({ ...clinicForm, workingHours: e.target.value })}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={clinicForm.hasEmergency}
                          onChange={(e) => setClinicForm({ ...clinicForm, hasEmergency: e.target.checked })}
                        />
                        تتوفر خدمة طوارئ 24 ساعة
                      </label>
                    </div>

                    <input
                      placeholder="الخدمات (افصل بينها بفاصلة، مثال: تطعيمات، جراحة، أشعة)"
                      value={clinicForm.services}
                      onChange={(e) => setClinicForm({ ...clinicForm, services: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />

                    <textarea
                      placeholder="وصف مختصر عن العيادة (اختياري)"
                      rows={2}
                      value={clinicForm.description}
                      onChange={(e) => setClinicForm({ ...clinicForm, description: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={clinicSaving}
                        className="flex items-center gap-1.5 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-60"
                      >
                        {clinicSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {editingClinicId ? "حفظ التعديلات" : "إضافة العيادة"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2.5">
                  {clinics.map((clinic) => (
                    <div key={clinic.id} className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden">
                      <div className="flex items-center gap-3 p-3.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-gray-900 truncate">{clinic.name}</p>
                          <p className="text-[10px] text-gray-500 font-bold truncate">
                            {clinic.city} · {clinic.phone} · {clinic.comments?.length || 0} تعليق
                          </p>
                        </div>
                        <button
                          onClick={() => setExpandedClinicId(expandedClinicId === clinic.id ? null : clinic.id)}
                          className="p-2 bg-white hover:bg-gray-100 text-gray-500 border border-gray-200 rounded-xl transition-all cursor-pointer shrink-0"
                        >
                          {expandedClinicId === clinic.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditClinicForm(clinic)}
                          className="p-2 bg-white hover:bg-brand-50 text-brand-600 border border-gray-200 rounded-xl transition-all cursor-pointer shrink-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClinic(clinic.id)}
                          className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0 ${
                            clinicDeleteIntent === clinic.id
                              ? "bg-red-600 text-white animate-pulse"
                              : "bg-rose-50 hover:bg-rose-100 text-rose-600"
                          }`}
                        >
                          {clinicDeleteIntent === clinic.id ? "تأكيد ⚠️" : "حذف"}
                        </button>
                      </div>

                      {expandedClinicId === clinic.id && (
                        <div className="border-t border-gray-100 p-3.5 space-y-2 bg-white">
                          {(clinic.comments || []).length === 0 ? (
                            <p className="text-[11px] text-gray-400 font-bold text-center py-2">
                              لا توجد تعليقات على هذه العيادة.
                            </p>
                          ) : (
                            clinic.comments!.map((cm) => (
                              <div
                                key={cm.id}
                                className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded-xl"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-black text-gray-800">{cm.authorName}</span>
                                    <div className="flex items-center text-amber-400">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`w-2.5 h-2.5 ${i < cm.rating ? "fill-current" : "opacity-30"}`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <p className="text-[11px] text-gray-600 font-semibold truncate">{cm.text}</p>
                                </div>
                                <button
                                  onClick={() => handleDeleteComment(clinic.id, cm.id)}
                                  className="p-1.5 bg-white hover:bg-rose-50 text-rose-500 border border-gray-200 rounded-lg transition-all cursor-pointer shrink-0"
                                  title="حذف التعليق"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COMMUNITY */}
            {tab === "community" && (
              <div className="space-y-2.5">
                {posts.length === 0 ? (
                  <p className="text-xs text-gray-400 font-bold text-center py-8">لا توجد منشورات حالياً.</p>
                ) : (
                  posts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{post.title}</p>
                        <p className="text-[10px] text-gray-500 font-bold truncate">
                          {post.author} · {post.likes} إعجاب · {post.commentsCount} تعليق
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0 ${
                          postDeleteIntent === post.id
                            ? "bg-red-600 text-white animate-pulse"
                            : "bg-rose-50 hover:bg-rose-100 text-rose-600"
                        }`}
                      >
                        {postDeleteIntent === post.id ? "تأكيد ⚠️" : "حذف"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* USERS */}
            {tab === "users" && (
              <div className="space-y-2.5">
                {usersError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl">
                    {usersError}
                  </div>
                )}
                {usersLoading ? (
                  <div className="flex items-center justify-center py-10 text-gray-400 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-bold">جاري التحميل...</span>
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-xs text-gray-400 font-bold text-center py-8">لا يوجد مستخدمون بعد.</p>
                ) : (
                  users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl"
                    >
                      <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                        {u.username.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">
                          {u.username} {u.id === currentUser.id && <span className="text-[10px] text-brand-600">(أنت)</span>}
                        </p>
                        <p className="text-[10px] text-gray-500 font-bold truncate">{u.email || "—"}</p>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0 ${
                          u.role === "admin" ? "bg-brand-600 text-white" : "bg-white border border-gray-200 text-gray-500"
                        }`}
                      >
                        {u.role === "admin" ? "أدمن" : "مستخدم"}
                      </span>
                      <button
                        onClick={() => handleToggleRole(u)}
                        disabled={u.id === currentUser.id}
                        className="px-3 py-2 bg-white hover:bg-brand-50 text-brand-700 border border-gray-200 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {u.role === "admin" ? "إزالة صلاحية الأدمن" : "ترقية إلى أدمن"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
