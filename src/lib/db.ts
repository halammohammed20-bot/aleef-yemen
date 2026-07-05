import { supabase } from "./supabaseClient";
import { PetListing, Clinic, ClinicComment, CommunityPost, UserAccount } from "../types";

/* ---------------------------------------------------------------------- */
/*  Mapping helpers: Supabase (snake_case) <-> App types (camelCase)       */
/* ---------------------------------------------------------------------- */

function petFromRow(row: any): PetListing {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    breed: row.breed,
    age: row.age,
    location: row.location,
    purpose: row.purpose,
    imageUrl: row.image_url,
    imageUrls: row.image_urls || [],
    description: row.description,
    healthStatus: row.health_status,
    vaccinated: row.vaccinated,
    ownerName: row.owner_name,
    ownerPhone: row.owner_phone,
    ownerId: row.owner_id || undefined,
    status: row.status || undefined,
    rescueStory: row.rescue_story || undefined,
    videoUrl: row.video_url || undefined,
    lostDate: row.lost_date || undefined,
    lostTime: row.lost_time || undefined,
    createdAt: row.created_at,
  };
}

function petToRow(pet: Omit<PetListing, "id" | "createdAt">, ownerId?: string) {
  return {
    name: pet.name,
    category: pet.category,
    breed: pet.breed,
    age: pet.age,
    location: pet.location,
    purpose: pet.purpose,
    image_url: pet.imageUrl,
    image_urls: pet.imageUrls || [],
    description: pet.description,
    health_status: pet.healthStatus,
    vaccinated: pet.vaccinated,
    owner_name: pet.ownerName,
    owner_phone: pet.ownerPhone,
    owner_id: ownerId || null,
    status: pet.status || "available",
    rescue_story: pet.rescueStory || null,
    video_url: pet.videoUrl || null,
    lost_date: pet.lostDate || null,
    lost_time: pet.lostTime || null,
  };
}

function clinicCommentFromRow(row: any): ClinicComment {
  return {
    id: row.id,
    authorName: row.author_name,
    rating: row.rating,
    text: row.text,
    createdAt: row.created_at,
  };
}

function clinicFromRow(row: any, comments: ClinicComment[] = []): Clinic {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    phone: row.phone,
    address: row.address,
    rating: row.rating,
    hasEmergency: row.has_emergency,
    images: row.images || [],
    services: row.services || [],
    comments,
    description: row.description || undefined,
    workingHours: row.working_hours || undefined,
  };
}

function postFromRow(row: any): CommunityPost {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    author: row.author,
    likes: row.likes,
    commentsCount: row.comments_count,
    category: row.category,
    createdAt: row.created_at,
  };
}

/* ---------------------------------------------------------------------- */
/*  Pets                                                                    */
/* ---------------------------------------------------------------------- */

export async function fetchPets(): Promise<PetListing[]> {
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(petFromRow);
}

export async function insertPet(
  pet: Omit<PetListing, "id" | "createdAt">,
  ownerId?: string
): Promise<PetListing> {
  const { data, error } = await supabase
    .from("pets")
    .insert(petToRow(pet, ownerId))
    .select()
    .single();
  if (error) throw error;
  return petFromRow(data);
}

export async function updatePet(
  id: string,
  fields: Partial<PetListing>
): Promise<PetListing> {
  const patch: Record<string, any> = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.category !== undefined) patch.category = fields.category;
  if (fields.breed !== undefined) patch.breed = fields.breed;
  if (fields.age !== undefined) patch.age = fields.age;
  if (fields.location !== undefined) patch.location = fields.location;
  if (fields.purpose !== undefined) patch.purpose = fields.purpose;
  if (fields.imageUrl !== undefined) patch.image_url = fields.imageUrl;
  if (fields.imageUrls !== undefined) patch.image_urls = fields.imageUrls;
  if (fields.description !== undefined) patch.description = fields.description;
  if (fields.healthStatus !== undefined) patch.health_status = fields.healthStatus;
  if (fields.vaccinated !== undefined) patch.vaccinated = fields.vaccinated;
  if (fields.ownerName !== undefined) patch.owner_name = fields.ownerName;
  if (fields.ownerPhone !== undefined) patch.owner_phone = fields.ownerPhone;
  if (fields.status !== undefined) patch.status = fields.status;
  if (fields.rescueStory !== undefined) patch.rescue_story = fields.rescueStory;
  if (fields.videoUrl !== undefined) patch.video_url = fields.videoUrl;
  if (fields.lostDate !== undefined) patch.lost_date = fields.lostDate;
  if (fields.lostTime !== undefined) patch.lost_time = fields.lostTime;

  const { data, error } = await supabase
    .from("pets")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return petFromRow(data);
}

export async function deletePet(id: string): Promise<void> {
  const { error } = await supabase.from("pets").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------------------------------------------------- */
/*  Clinics                                                                 */
/* ---------------------------------------------------------------------- */

export async function fetchClinics(): Promise<Clinic[]> {
  const { data: clinicRows, error: clinicErr } = await supabase
    .from("clinics")
    .select("*")
    .order("rating", { ascending: false });
  if (clinicErr) throw clinicErr;

  const { data: commentRows, error: commentErr } = await supabase
    .from("clinic_comments")
    .select("*")
    .order("created_at", { ascending: false });
  if (commentErr) throw commentErr;

  return (clinicRows || []).map((c) => {
    const comments = (commentRows || [])
      .filter((cm) => cm.clinic_id === c.id)
      .map(clinicCommentFromRow);
    return clinicFromRow(c, comments);
  });
}

export async function insertClinicComment(
  clinicId: string,
  comment: Omit<ClinicComment, "id" | "createdAt">
): Promise<ClinicComment> {
  const { data, error } = await supabase
    .from("clinic_comments")
    .insert({
      clinic_id: clinicId,
      author_name: comment.authorName,
      rating: comment.rating,
      text: comment.text,
    })
    .select()
    .single();
  if (error) throw error;
  return clinicCommentFromRow(data);
}

export async function addClinicImage(clinicId: string, imageUrl: string, _existing: string[]): Promise<void> {
  // يستخدم دالة RPC آمنة (security definer) تضيف الصورة فقط دون أي صلاحية
  // لتعديل باقي بيانات العيادة (الاسم، الهاتف، العنوان...).
  const { error } = await supabase.rpc("add_clinic_image", {
    target_clinic_id: clinicId,
    new_image_url: imageUrl,
  });
  if (error) throw error;
}

/* ---------------------------------------------------------------------- */
/*  Community posts                                                        */
/* ---------------------------------------------------------------------- */

export async function fetchPosts(): Promise<CommunityPost[]> {
  const { data, error } = await supabase
    .from("community_posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(postFromRow);
}

export async function insertPost(
  post: Omit<CommunityPost, "id" | "likes" | "commentsCount" | "createdAt">
): Promise<CommunityPost> {
  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      title: post.title,
      content: post.content,
      author: post.author,
      category: post.category,
    })
    .select()
    .single();
  if (error) throw error;
  return postFromRow(data);
}

export async function likePost(id: string): Promise<void> {
  const { error } = await supabase.rpc("increment_post_likes", { post_id: id });
  if (error) throw error;
}

/* ---------------------------------------------------------------------- */
/*  Favorites                                                               */
/* ---------------------------------------------------------------------- */

export async function fetchFavoriteIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("pet_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data || []).map((r) => r.pet_id);
}

export async function addFavorite(userId: string, petId: string): Promise<void> {
  const { error } = await supabase.from("favorites").insert({ user_id: userId, pet_id: petId });
  if (error) throw error;
}

export async function removeFavorite(userId: string, petId: string): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("pet_id", petId);
  if (error) throw error;
}

/* ---------------------------------------------------------------------- */
/*  Auth / profile                                                          */
/* ---------------------------------------------------------------------- */

export async function fetchUserAccount(userId: string, email: string): Promise<UserAccount> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  const favoriteIds = await fetchFavoriteIds(userId);

  return {
    id: userId,
    username: profile?.username || email.split("@")[0],
    email,
    favoritePetIds: favoriteIds,
    role: profile?.role === "admin" ? "admin" : "user",
    createdAt: profile?.created_at || new Date().toISOString(),
  };
}

/* ---------------------------------------------------------------------- */
/*  لوحة تحكم الأدمن (Admin Panel)                                          */
/* ---------------------------------------------------------------------- */

export interface AdminUserRow {
  id: string;
  username: string;
  email: string | null;
  role: "user" | "admin";
  createdAt: string;
}

/** يجلب كل المستخدمين المسجلين في المنصة (متاح فقط للأدمن بموجب RLS). */
export async function fetchAllUsers(): Promise<AdminUserRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role === "admin" ? "admin" : "user",
    createdAt: row.created_at,
  }));
}

/** يرقّي أو يخفّض مستخدماً (admin/user). متاح فقط للأدمن بموجب RLS. */
export async function setUserRole(userId: string, role: "user" | "admin"): Promise<void> {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw error;
}

/** يضيف عيادة جديدة لدليل العيادات. متاح فقط للأدمن بموجب RLS. */
export async function insertClinic(clinic: Omit<Clinic, "id" | "comments">): Promise<Clinic> {
  const { data, error } = await supabase
    .from("clinics")
    .insert({
      name: clinic.name,
      city: clinic.city,
      phone: clinic.phone,
      address: clinic.address,
      rating: clinic.rating ?? 5,
      has_emergency: clinic.hasEmergency ?? false,
      images: clinic.images || [],
      services: clinic.services || [],
      description: clinic.description || null,
      working_hours: clinic.workingHours || null,
    })
    .select()
    .single();
  if (error) throw error;
  return clinicFromRow(data);
}

/** يعدّل بيانات عيادة موجودة. */
export async function updateClinic(id: string, fields: Partial<Clinic>): Promise<Clinic> {
  const patch: Record<string, any> = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.city !== undefined) patch.city = fields.city;
  if (fields.phone !== undefined) patch.phone = fields.phone;
  if (fields.address !== undefined) patch.address = fields.address;
  if (fields.hasEmergency !== undefined) patch.has_emergency = fields.hasEmergency;
  if (fields.images !== undefined) patch.images = fields.images;
  if (fields.services !== undefined) patch.services = fields.services;
  if (fields.description !== undefined) patch.description = fields.description;
  if (fields.workingHours !== undefined) patch.working_hours = fields.workingHours;

  const { data, error } = await supabase
    .from("clinics")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return clinicFromRow(data);
}

/** يحذف عيادة بالكامل (تُحذف تعليقاتها تلقائياً). متاح فقط للأدمن بموجب RLS. */
export async function deleteClinic(id: string): Promise<void> {
  const { error } = await supabase.from("clinics").delete().eq("id", id);
  if (error) throw error;
}

/** يحذف تعليق/تقييم عيادة. متاح فقط للأدمن بموجب RLS. */
export async function deleteClinicComment(id: string): Promise<void> {
  const { error } = await supabase.from("clinic_comments").delete().eq("id", id);
  if (error) throw error;
}

/** يحذف منشوراً من ملتقى المجتمع. متاح فقط للأدمن بموجب RLS. */
export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from("community_posts").delete().eq("id", id);
  if (error) throw error;
}
