import { supabase } from "./supabaseClient";

/**
 * اسم الـ Storage bucket المستخدم لتخزين كل الوسائط (صور وفيديوهات) في المنصة.
 * يتم إنشاؤه تلقائياً عبر supabase/schema.sql (قسم Storage).
 */
export const MEDIA_BUCKET = "aleef-media";

// الحد الأقصى لحجم الصورة الواحدة (5 ميجابايت)
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
// الحد الأقصى لحجم الفيديو الواحد (25 ميجابايت)
export const MAX_VIDEO_SIZE = 25 * 1024 * 1024;

function randomFileName(originalName: string): string {
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "bin";
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${random}.${ext}`;
}

/**
 * يرفع ملف (صورة أو فيديو) إلى Supabase Storage ويعيد الرابط العام (public URL)
 * الذي يمكن حفظه مباشرة في عمود image_url / image_urls / video_url داخل قاعدة البيانات.
 *
 * @param file الملف المطلوب رفعه
 * @param folder المجلد داخل الـ bucket، مثال: "pets", "clinics", "videos"
 */
export async function uploadMedia(file: File, folder: string): Promise<string> {
  const path = `${folder}/${randomFileName(file.name)}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    throw new Error(
      error.message?.includes("Bucket not found")
        ? "لم يتم إنشاء مساحة تخزين الوسائط بعد. الرجاء تنفيذ supabase/schema.sql كاملاً في مشروع Supabase أولاً."
        : `فشل رفع الملف: ${error.message}`
    );
  }

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** يرفع عدة صور بالتوازي ويعيد مصفوفة بالروابط العامة بنفس الترتيب. */
export async function uploadImages(files: File[], folder: string): Promise<string[]> {
  return Promise.all(files.map((file) => uploadMedia(file, folder)));
}

/** يتأكد أن الملف صورة صحيحة الحجم قبل رفعها. */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "الرجاء اختيار ملف صورة صحيح.";
  if (file.size > MAX_IMAGE_SIZE) return "حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت لكل صورة.";
  return null;
}

/** يتأكد أن الملف فيديو صحيح الحجم قبل رفعه. */
export function validateVideoFile(file: File): string | null {
  if (!file.type.startsWith("video/")) return "الرجاء اختيار ملف فيديو صحيح (مثل mp4, webm).";
  if (file.size > MAX_VIDEO_SIZE) return "حجم الفيديو كبير جداً. يرجى اختيار فيديو بحجم أقل من 25 ميجابايت.";
  return null;
}
