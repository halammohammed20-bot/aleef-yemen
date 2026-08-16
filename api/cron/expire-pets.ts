import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const MEDIA_BUCKET = "aleef-media";
const EXPIRY_DAYS = 90;

/**
 * يستخرج مسار الملف داخل bucket "aleef-media" من رابطه العام الكامل.
 * مثال: ".../object/public/aleef-media/pets/123-abc.jpg" -> "pets/123-abc.jpg"
 */
function extractMediaPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = "/aleef-media/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

/**
 * وظيفة مجدولة (Vercel Cron) تعمل يومياً: تحذف أي إعلان حيوان مضى عليه أكثر
 * من 90 يوماً من تاريخ نشره، مع حذف صوره وفيديوهاته من Storage أولاً (لأن
 * Supabase تمنع حذف ملفات Storage مباشرة عبر SQL، فهذا التنظيف يجب أن يمر
 * عبر Storage API هنا، تماماً مثل حذف الإعلانات اليدوي من داخل الموقع).
 *
 * محمية بمفتاح CRON_SECRET حتى لا يستطيع أي شخص خارجي استدعاءها يدوياً.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // تحقق من صلاحية الاستدعاء: يجب أن يأتي من Vercel Cron نفسه ومعه المفتاح السري
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: "Supabase service credentials are not configured" });
    return;
  }

  // نستخدم service role key هنا (وليس anon key) لأن هذه العملية تعمل من الخادم
  // فقط دون أي جلسة مستخدم، وتحتاج صلاحية كاملة لحذف أي إعلان منتهي الصلاحية
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const cutoffDate = new Date(Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredPets, error: fetchError } = await supabaseAdmin
      .from("pets")
      .select("id, image_url, image_urls, video_url")
      .lt("created_at", cutoffDate);

    if (fetchError) throw fetchError;

    if (!expiredPets || expiredPets.length === 0) {
      res.status(200).json({ deleted: 0, message: "لا توجد إعلانات منتهية الصلاحية اليوم" });
      return;
    }

    let deletedCount = 0;
    for (const pet of expiredPets) {
      const paths = [...(pet.image_urls || []), pet.image_url, pet.video_url]
        .map(extractMediaPath)
        .filter((p): p is string => !!p);

      const uniquePaths = Array.from(new Set(paths));
      if (uniquePaths.length > 0) {
        await supabaseAdmin.storage.from(MEDIA_BUCKET).remove(uniquePaths).catch(() => null);
      }

      const { error: deleteError } = await supabaseAdmin.from("pets").delete().eq("id", pet.id);
      if (!deleteError) deletedCount++;
    }

    res.status(200).json({ deleted: deletedCount, total: expiredPets.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "حدث خطأ أثناء تنظيف الإعلانات المنتهية" });
  }
}
