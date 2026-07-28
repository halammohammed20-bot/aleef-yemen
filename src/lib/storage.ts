import { supabase } from "./supabaseClient";

/**
 * اسم الـ Storage bucket المستخدم لتخزين كل الوسائط (صور وفيديوهات) في المنصة.
 * يتم إنشاؤه تلقائياً عبر supabase/schema.sql (قسم Storage).
 */
export const MEDIA_BUCKET = "aleef-media";

// الحد الأقصى لحجم الصورة الواحدة (5 ميجابايت) — قبل الضغط التلقائي
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
// الحد الأقصى لحجم الفيديو الواحد (25 ميجابايت)
export const MAX_VIDEO_SIZE = 25 * 1024 * 1024;

// إعدادات ضغط الصور التلقائي (يقلل استهلاك مساحة التخزين وحد النقل الشهري في Supabase)
const IMAGE_MAX_DIMENSION = 1600; // أقصى عرض/ارتفاع بالبكسل بعد الضغط
const IMAGE_QUALITY = 0.78; // جودة الضغط (0 إلى 1)

function randomFileName(originalName: string, forcedExt?: string): string {
  const ext = forcedExt || (originalName.includes(".") ? originalName.split(".").pop() : "bin");
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${random}.${ext}`;
}

/**
 * يضغط الصورة تلقائياً قبل الرفع: يصغّر أبعادها إن كانت كبيرة، ويحوّلها لصيغة JPEG
 * مضغوطة، مما يقلل حجم الملف الحقيقي بشكل كبير (غالباً 60-90%) دون فرق واضح
 * في الجودة المرئية. هذا يحافظ على مساحة التخزين وحد النقل الشهري المجاني في Supabase.
 */
export async function compressImage(file: File): Promise<File> {
  // نتجاهل GIF (قد تكون متحركة) ونرفعها كما هي
  if (file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    if (width > IMAGE_MAX_DIMENSION || height > IMAGE_MAX_DIMENSION) {
      const scale = IMAGE_MAX_DIMENSION / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", IMAGE_QUALITY)
    );

    if (!blob || blob.size >= file.size) return file; // لا تستبدل الملف لو الضغط ما فادنا

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    // أي فشل بالضغط (مثلاً متصفح قديم) يرجع الملف الأصلي بدون توقف العملية
    return file;
  }
}

/**
 * يرفع ملف (صورة أو فيديو) إلى Supabase Storage ويعيد الرابط العام (public URL)
 * الذي يمكن حفظه مباشرة في عمود image_url / image_urls / video_url داخل قاعدة البيانات.
 * الصور تُضغط تلقائياً قبل الرفع لتقليل استهلاك المساحة.
 *
 * @param file الملف المطلوب رفعه
 * @param folder المجلد داخل الـ bucket، مثال: "pets", "clinics", "videos"
 */
export async function uploadMedia(file: File, folder: string): Promise<string> {
  const isImage = file.type.startsWith("image/");
  const fileToUpload = isImage ? await compressImage(file) : file;

  const path = `${folder}/${randomFileName(fileToUpload.name)}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, fileToUpload, {
    cacheControl: "3600",
    upsert: false,
    contentType: fileToUpload.type || undefined,
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
  if (file.size > MAX_IMAGE_SIZE) return "حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت لكل صورة (سيتم ضغطها تلقائياً بعد الرفع).";
  return null;
}

/** يتأكد أن الملف فيديو صحيح الحجم قبل رفعه. */
export function validateVideoFile(file: File): string | null {
  if (!file.type.startsWith("video/")) return "الرجاء اختيار ملف فيديو صحيح (مثل mp4, webm).";
  if (file.size > MAX_VIDEO_SIZE) return "حجم الفيديو كبير جداً. يرجى اختيار فيديو بحجم أقل من 25 ميجابايت.";
  return null;
}
