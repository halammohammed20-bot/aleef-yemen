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

// إعدادات ضغط الصور — 3 مستويات يختار المستخدم بينها عند الرفع
export type ImageQualityLevel = "small" | "medium" | "high";

const QUALITY_PRESETS: Record<ImageQualityLevel, { maxDimension: number; quality: number }> = {
  small: { maxDimension: 900, quality: 0.6 }, // توفير أقصى للمساحة
  medium: { maxDimension: 1600, quality: 0.78 }, // متوازن (موصى به)
  high: { maxDimension: 2200, quality: 0.9 }, // أعلى جودة ممكنة
};

function randomFileName(originalName: string, forcedExt?: string): string {
  const ext = forcedExt || (originalName.includes(".") ? originalName.split(".").pop() : "bin");
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${random}.${ext}`;
}

/**
 * يضغط الصورة تلقائياً قبل الرفع حسب المستوى الذي يختاره المستخدم (صغير/متوسط/جودة عالية):
 * يصغّر أبعادها ويحوّلها لصيغة JPEG مضغوطة، مما يقلل حجم الملف الحقيقي بشكل كبير
 * (غالباً 60-90%) دون فرق واضح في الجودة المرئية عند المستوى المتوسط أو الأعلى.
 */
export async function compressImage(file: File, level: ImageQualityLevel = "medium"): Promise<File> {
  // نتجاهل GIF (قد تكون متحركة) ونرفعها كما هي
  if (file.type === "image/gif") return file;

  const { maxDimension, quality } = QUALITY_PRESETS[level];

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    if (width > maxDimension || height > maxDimension) {
      const scale = maxDimension / Math.max(width, height);
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
      canvas.toBlob(resolve, "image/jpeg", quality)
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
 * الصور تُضغط تلقائياً قبل الرفع حسب المستوى المختار لتقليل استهلاك المساحة.
 *
 * @param file الملف المطلوب رفعه
 * @param folder المجلد داخل الـ bucket، مثال: "pets", "clinics", "videos"
 * @param qualityLevel مستوى جودة الصورة بعد الضغط (يتجاهله الفيديو)
 */
export async function uploadMedia(
  file: File,
  folder: string,
  qualityLevel: ImageQualityLevel = "medium"
): Promise<string> {
  const isImage = file.type.startsWith("image/") || (!file.type && hasImageExtension(file.name));
  const fileToUpload = isImage ? await compressImage(file, qualityLevel) : file;

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
export async function uploadImages(files: File[], folder: string, qualityLevel: ImageQualityLevel = "medium"): Promise<string[]> {
  return Promise.all(files.map((file) => uploadMedia(file, folder, qualityLevel)));
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp", "avif"];

function hasImageExtension(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXTENSIONS.includes(ext);
}

/** يتأكد أن الملف صورة صحيحة الحجم قبل رفعها. */
export function validateImageFile(file: File): string | null {
  // بعض متصفحات الجوال (خصوصاً أندرويد عند الاختيار من تطبيقات معينة) لا تُرجع
  // نوع الملف (file.type) بشكل صحيح ويكون فارغاً، رغم أن الملف صورة فعلية.
  // لذلك نتحقق أيضاً من امتداد اسم الملف كخيار احتياطي قبل الرفض.
  const looksLikeImage = file.type.startsWith("image/") || (!file.type && hasImageExtension(file.name));
  if (!looksLikeImage) return "الرجاء اختيار ملف صورة صحيح.";
  if (file.size > MAX_IMAGE_SIZE) return "حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت لكل صورة (سيتم ضغطها تلقائياً بعد الرفع).";
  return null;
}

/** يتأكد أن الملف فيديو صحيح الحجم قبل رفعه. */
export function validateVideoFile(file: File): string | null {
  if (!file.type.startsWith("video/")) return "الرجاء اختيار ملف فيديو صحيح (مثل mp4, webm).";
  if (file.size > MAX_VIDEO_SIZE) return "حجم الفيديو كبير جداً. يرجى اختيار فيديو بحجم أقل من 25 ميجابايت.";
  return null;
}
