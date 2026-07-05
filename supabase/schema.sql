-- ============================================================================
-- مخطط قاعدة بيانات منصة "أليف" على Supabase
-- انسخ هذا الملف بالكامل والصقه في: Supabase Dashboard > SQL Editor > New query
-- ثم اضغط RUN. هذا الملف آمن التنفيذ أكثر من مرة (idempotent) حتى لو كان
-- المشروع مُعدّاً مسبقاً بنسخة أقدم منه.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1) profiles: ملف تعريف إضافي لكل مستخدم (يُنشأ تلقائياً بعد التسجيل)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- في حال كان الجدول منشأً مسبقاً من نسخة أقدم، أضف الأعمدة الجديدة إن لم تكن موجودة
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text not null default 'user';

alter table public.profiles enable row level security;

-- دالة مساعدة: هل المستخدم الحالي "أدمن"؟ تُستخدم داخل كل سياسات الحماية أدناه
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ملاحظة أمنية مهمة: القراءة مقصورة على صاحب الملف نفسه أو الأدمن فقط،
-- لأن التطبيق لا يعرض أسماء/بيانات مستخدمين آخرين من هذا الجدول أبداً
-- (أسماء أصحاب الإعلانات والمنشورات والتعليقات مخزّنة كنص مباشر في جداولها
-- الخاصة). هذا يمنع تسرب بريد أي مستخدم لبقية الزوار.
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- الأدمن يقدر يعدّل أي ملف مستخدم آخر (مثلاً لترقيته إلى أدمن أو تعديل اسمه)
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());

-- ينشئ سجل profile تلقائياً عند تسجيل مستخدم جديد في Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2) pets: قوائم الحيوانات الأليفة (تبني / تزاوج / مفقود / إنقاذ)
-- ---------------------------------------------------------------------------
create table if not exists public.pets (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  category text not null,
  breed text not null,
  age text not null,
  location text not null,
  purpose text not null,
  image_url text not null,
  image_urls text[] default '{}',
  description text not null,
  health_status text not null,
  vaccinated boolean not null default false,
  owner_name text not null,
  owner_phone text not null,
  owner_id uuid references auth.users(id) on delete set null,
  status text default 'available',
  rescue_story text,
  video_url text,
  lost_date text,
  lost_time text,
  created_at timestamptz not null default now()
);

alter table public.pets enable row level security;

drop policy if exists "pets_select_all" on public.pets;
create policy "pets_select_all" on public.pets
  for select using (true);

drop policy if exists "pets_insert_authenticated" on public.pets;
create policy "pets_insert_authenticated" on public.pets
  for insert with check (auth.uid() = owner_id or public.is_admin());

drop policy if exists "pets_update_owner" on public.pets;
create policy "pets_update_owner" on public.pets
  for update using (auth.uid() = owner_id);

drop policy if exists "pets_delete_owner" on public.pets;
create policy "pets_delete_owner" on public.pets
  for delete using (auth.uid() = owner_id);

-- الأدمن يقدر يعدّل أو يحذف أي إعلان حيوان، حتى لو لم يكن هو صاحبه (للإشراف والمراجعة)
drop policy if exists "pets_update_admin" on public.pets;
create policy "pets_update_admin" on public.pets
  for update using (public.is_admin());

drop policy if exists "pets_delete_admin" on public.pets;
create policy "pets_delete_admin" on public.pets
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3) clinics + clinic_comments: العيادات البيطرية وتقييماتها
-- ---------------------------------------------------------------------------
create table if not exists public.clinics (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  city text not null,
  phone text not null,
  address text not null,
  rating numeric default 5,
  has_emergency boolean default false,
  images text[] default '{}',
  services text[] default '{}',
  description text,
  working_hours text,
  created_at timestamptz not null default now()
);

alter table public.clinics enable row level security;

drop policy if exists "clinics_select_all" on public.clinics;
create policy "clinics_select_all" on public.clinics
  for select using (true);

-- إضافة عيادة جديدة للدليل مقصورة على الأدمن فقط (لضمان دقة وموثوقية الدليل)
drop policy if exists "clinics_insert_authenticated" on public.clinics;
drop policy if exists "clinics_insert_admin" on public.clinics;
create policy "clinics_insert_admin" on public.clinics
  for insert with check (public.is_admin());

-- تعديل بيانات العيادة بالكامل (اسم/هاتف/عنوان...) مقصور على الأدمن فقط
drop policy if exists "clinics_update_authenticated" on public.clinics;
drop policy if exists "clinics_update_admin" on public.clinics;
create policy "clinics_update_admin" on public.clinics
  for update using (public.is_admin());

-- دالة آمنة تسمح لأي مستخدم مسجل دخول بإضافة صورة لعيادة فقط (دون التمكن
-- من تعديل أي حقل آخر مثل الاسم أو الهاتف أو العنوان)
create or replace function public.add_clinic_image(target_clinic_id text, new_image_url text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() <> 'authenticated' then
    raise exception 'يجب تسجيل الدخول لإضافة صورة.';
  end if;
  update public.clinics
  set images = array_append(coalesce(images, '{}'), new_image_url)
  where id = target_clinic_id;
end;
$$;

-- حذف عيادة بالكامل مقصور على الأدمن فقط
drop policy if exists "clinics_delete_admin" on public.clinics;
create policy "clinics_delete_admin" on public.clinics
  for delete using (public.is_admin());

create table if not exists public.clinic_comments (
  id text primary key default gen_random_uuid()::text,
  clinic_id text not null references public.clinics(id) on delete cascade,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.clinic_comments enable row level security;

drop policy if exists "clinic_comments_select_all" on public.clinic_comments;
create policy "clinic_comments_select_all" on public.clinic_comments
  for select using (true);

drop policy if exists "clinic_comments_insert_authenticated" on public.clinic_comments;
create policy "clinic_comments_insert_authenticated" on public.clinic_comments
  for insert with check (auth.role() = 'authenticated');

-- الأدمن يقدر يحذف أي تعليق/تقييم غير لائق على عيادة
drop policy if exists "clinic_comments_delete_admin" on public.clinic_comments;
create policy "clinic_comments_delete_admin" on public.clinic_comments
  for delete using (public.is_admin());

-- تحدّث تقييم العيادة تلقائياً كل مرة يُضاف أو يُحذف فيها تعليق
create or replace function public.refresh_clinic_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_clinic_id text;
begin
  target_clinic_id := coalesce(new.clinic_id, old.clinic_id);
  update public.clinics
  set rating = coalesce((
    select round(avg(rating)::numeric, 1)
    from public.clinic_comments
    where clinic_id = target_clinic_id
  ), 5)
  where id = target_clinic_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists on_clinic_comment_added on public.clinic_comments;
create trigger on_clinic_comment_added
  after insert on public.clinic_comments
  for each row execute procedure public.refresh_clinic_rating();

drop trigger if exists on_clinic_comment_deleted on public.clinic_comments;
create trigger on_clinic_comment_deleted
  after delete on public.clinic_comments
  for each row execute procedure public.refresh_clinic_rating();

-- ---------------------------------------------------------------------------
-- 4) community_posts: منشورات مجتمع أليف (نصائح / قصص / عام)
-- ---------------------------------------------------------------------------
create table if not exists public.community_posts (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  content text not null,
  author text not null,
  likes int not null default 0,
  comments_count int not null default 0,
  category text not null default 'general',
  created_at timestamptz not null default now()
);

alter table public.community_posts enable row level security;

drop policy if exists "posts_select_all" on public.community_posts;
create policy "posts_select_all" on public.community_posts
  for select using (true);

drop policy if exists "posts_insert_authenticated" on public.community_posts;
create policy "posts_insert_authenticated" on public.community_posts
  for insert with check (auth.role() = 'authenticated');

-- الأدمن يقدر يحذف أي منشور مخالف من المجتمع
drop policy if exists "posts_delete_admin" on public.community_posts;
create policy "posts_delete_admin" on public.community_posts
  for delete using (public.is_admin());

-- دالة آمنة لزيادة عدد الإعجابات دون الحاجة لصلاحية تعديل كاملة
create or replace function public.increment_post_likes(post_id text)
returns void
language sql
security definer set search_path = public
as $$
  update public.community_posts set likes = likes + 1 where id = post_id;
$$;

-- ---------------------------------------------------------------------------
-- 5) favorites: الحيوانات المفضلة لكل مستخدم
-- ---------------------------------------------------------------------------
create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id text not null references public.pets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pet_id)
);

alter table public.favorites enable row level security;

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own" on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own" on public.favorites
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6) Storage: مساحة تخزين موحّدة لكل الصور والفيديوهات في المنصة
-- ---------------------------------------------------------------------------
-- ينشئ bucket باسم "aleef-media" ويجعله عاماً (Public) حتى تظهر الصور مباشرة
-- في التطبيق عبر الرابط العام public URL دون الحاجة لأي مفتاح توقيع.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'aleef-media',
  'aleef-media',
  true,
  26214400, -- 25 ميجابايت كحد أقصى لكل ملف
  array['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = array['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/webm','video/quicktime'];

-- القراءة عامة للجميع (لعرض الصور والفيديوهات في التطبيق)
drop policy if exists "aleef_media_select_all" on storage.objects;
create policy "aleef_media_select_all" on storage.objects
  for select using (bucket_id = 'aleef-media');

-- الرفع مسموح فقط للمستخدمين المسجلين (authenticated)
drop policy if exists "aleef_media_insert_authenticated" on storage.objects;
create policy "aleef_media_insert_authenticated" on storage.objects
  for insert with check (bucket_id = 'aleef-media' and auth.role() = 'authenticated');

-- التعديل/الحذف مسموح لصاحب الملف نفسه، أو للأدمن على أي ملف (للإشراف والحذف)
drop policy if exists "aleef_media_update_owner" on storage.objects;
create policy "aleef_media_update_owner" on storage.objects
  for update using (bucket_id = 'aleef-media' and (auth.uid() = owner or public.is_admin()));

drop policy if exists "aleef_media_delete_owner" on storage.objects;
create policy "aleef_media_delete_owner" on storage.objects
  for delete using (bucket_id = 'aleef-media' and (auth.uid() = owner or public.is_admin()));

-- ============================================================================
-- انتهى المخطط بالكامل ✅
--
-- خطوة أخيرة ضرورية لتفعيل لوحة تحكم الأدمن: اجعل حسابك أنت تحديداً "أدمن"
-- بتنفيذ هذا الأمر في نفس محرر SQL (بدّل البريد الإلكتروني ببريدك الحقيقي
-- الذي سجّلت به في الموقع):
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');
--
-- بعدها سجّل خروج ثم دخول مرة أخرى في الموقع لتظهر لك "لوحة التحكم" في القائمة.
-- ============================================================================
