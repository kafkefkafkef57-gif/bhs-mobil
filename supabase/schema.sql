-- BHS Mobil veritabanı şeması
-- Supabase panelinde: SQL Editor > New query > bu dosyanın tamamını yapıştırıp "Run".
-- Tekrar çalıştırılabilir (mevcut verileri silmez).

-- ---------- Kullanıcı profilleri ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  email text not null default '',
  role text not null default 'user' check (role in ('admin', 'user')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- Kayıt olan her kullanıcı için profil açılır. İLK kayıt olan kişi otomatik
-- olarak onaylı yönetici (admin) olur; sonrakiler yönetici onayını bekler.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  insert into public.profiles (id, full_name, phone, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.email, ''),
    case when first_user then 'admin' else 'user' end,
    case when first_user then 'approved' else 'pending' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'approved');
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'approved' and role = 'admin');
$$;

alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_approved());
-- Onay durumunu ve rolü yalnızca yönetici değiştirebilir.
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Ortak bildiri panosu ----------
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  importance text not null default 'normal' check (importance in ('normal', 'onemli', 'acil')),
  photo_url text,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.notices enable row level security;
drop policy if exists notices_all on public.notices;
create policy notices_all on public.notices for all to authenticated
  using (public.is_approved()) with check (public.is_approved());

-- ---------- Arızalar (ana ekrandaki "Bugünkü Arıza" sayacı için; alanlar ileride genişleyecek) ----------
create table if not exists public.faults (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  description text not null default '',
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.faults enable row level security;
drop policy if exists faults_all on public.faults;
create policy faults_all on public.faults for all to authenticated
  using (public.is_approved()) with check (public.is_approved());

-- ---------- Arıza bölgeleri ve arıza kayıtları ----------
create table if not exists public.fault_zones (
  id uuid primary key default gen_random_uuid(),
  line text not null check (line in ('dogu', 'bati')),
  name text not null,
  sort_no bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (line, name)
);
alter table public.fault_zones enable row level security;
-- Bölgeleri herkes (onaylı) görür ve ekleyebilir; silmeyi yalnızca yönetici yapar.
drop policy if exists fault_zones_select on public.fault_zones;
create policy fault_zones_select on public.fault_zones for select to authenticated using (public.is_approved());
drop policy if exists fault_zones_insert on public.fault_zones;
create policy fault_zones_insert on public.fault_zones for insert to authenticated with check (public.is_approved());
drop policy if exists fault_zones_delete on public.fault_zones;
create policy fault_zones_delete on public.fault_zones for delete to authenticated using (public.is_admin());

-- Başlangıç bölgeleri: Batı 29, Doğu 24 (yenileri uygulamadaki "Bölge ekle" ile eklenir).
insert into public.fault_zones (line, name, sort_no) values
  ('bati', 'Batı 3 Vertisorter', 1),
  ('bati', 'Batı 2 Vertisorter', 2),
  ('bati', 'Batı 1 Vertisorter', 3),
  ('bati', 'Batı 3 Uzunbant', 4),
  ('bati', 'Batı 2 Uzunbant', 5),
  ('bati', 'Batı 1 Uzunbant', 6),
  ('bati', 'Batı 3 MVT Çıkış', 7),
  ('bati', 'Batı 2 MVT Çıkış', 8),
  ('bati', 'Batı 1 MVT Çıkış', 9),
  ('bati', 'Batı 1 MVT Giriş', 10),
  ('bati', 'Batı 2 MVT Giriş', 11),
  ('bati', 'Batı 3 MVT Giriş', 12),
  ('bati', 'Batı 1 Scanner', 13),
  ('bati', 'Batı 2 Scanner', 14),
  ('bati', 'Batı 3 Scanner', 15),
  ('bati', 'Batı 1 Gerisi Köşe', 16),
  ('bati', 'Batı 2 Gerisi Köşe', 17),
  ('bati', 'Batı 3 Gerisi Köşe', 18),
  ('bati', 'Eco Vertibelt', 19),
  ('bati', 'Fox Vertibelt', 20),
  ('bati', 'Eco Vertibelt Gerisi Köşe', 21),
  ('bati', 'Fox Vertibelt Gerisi Köşe', 22),
  ('bati', 'Charlie Vertibelt', 23),
  ('bati', 'Delta Vertibelt', 24),
  ('bati', 'Rapiscan Vertibelt', 25),
  ('bati', 'Batı Transfer Scanner', 26),
  ('bati', 'Batı Transfer Kepenk', 27),
  ('bati', 'A-B Scanner', 28),
  ('bati', 'Rapiscan Vertibelt Gerisi Köşe', 29),
  ('dogu', 'Doğu 3 Vertisorter', 1),
  ('dogu', 'Doğu 2 Vertisorter', 2),
  ('dogu', 'Doğu 1 Vertisorter', 3),
  ('dogu', 'Doğu 3 Uzunbant', 4),
  ('dogu', 'Doğu 2 Uzunbant', 5),
  ('dogu', 'Doğu 1 Uzunbant', 6),
  ('dogu', 'Doğu 3 MVT Çıkış', 7),
  ('dogu', 'Doğu 2 MVT Çıkış', 8),
  ('dogu', 'Doğu 1 MVT Çıkış', 9),
  ('dogu', 'Doğu 3 MVT Giriş', 10),
  ('dogu', 'Doğu 2 MVT Giriş', 11),
  ('dogu', 'Doğu 1 MVT Giriş', 12),
  ('dogu', 'Doğu 3 Scanner', 13),
  ('dogu', 'Doğu 2 Scanner', 14),
  ('dogu', 'Doğu 1 Scanner', 15),
  ('dogu', 'Golf Vertibelt Gerisi Köşe', 16),
  ('dogu', 'Hotel Vertibelt Gerisi Köşe', 17),
  ('dogu', 'Doğu 3 Gerisi Köşe', 18),
  ('dogu', 'Doğu 2 Gerisi Köşe', 19),
  ('dogu', 'Doğu 1 Gerisi Köşe', 20),
  ('dogu', 'Doğu Transfer Kepenk', 21),
  ('dogu', 'Doğu Transfer 2. Köşe', 22),
  ('dogu', 'Doğu Transfer Kilo Birleşim', 23),
  ('dogu', 'Juliet Vertibelt', 24)
on conflict (line, name) do update set sort_no = excluded.sort_no;

alter table public.faults add column if not exists line text check (line in ('dogu', 'bati'));
alter table public.faults add column if not exists zone_id uuid references public.fault_zones (id) on delete set null;
alter table public.faults add column if not exists zone_name text not null default ''; -- bölge silinse de kayıtta kalır
alter table public.faults add column if not exists company text not null default '';
alter table public.faults add column if not exists photo_url text;
alter table public.faults add column if not exists shift text check (shift in ('A', 'B', 'C', 'D'));
alter table public.faults add column if not exists team text check (team in ('Operasyon', 'Teknik'));
create index if not exists faults_created_at_idx on public.faults (created_at);

-- ---------- Olay tutanakları ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  no bigint generated by default as identity,
  incident_at timestamptz not null default now(),
  officer text not null default '',
  staff_name text not null default '',
  company text not null default '',
  summary text not null default '',
  photo_urls text[] not null default '{}',
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists reports_all on public.reports;
create policy reports_all on public.reports for all to authenticated
  using (public.is_approved()) with check (public.is_approved());

-- ---------- Operasyon takip görevleri ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  shift text not null check (shift in ('A', 'B', 'C', 'D')),
  due_date date not null default current_date,
  description text not null default '',
  photo_url text,
  status text check (status in ('yapildi', 'yapilmadi')), -- boş: henüz işaretlenmedi
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
-- Tablo eski haliyle kurulduysa yeni düzene geçir.
alter table public.tasks add column if not exists status text check (status in ('yapildi', 'yapilmadi'));
alter table public.tasks drop column if exists done_at;
alter table public.tasks enable row level security;
drop policy if exists tasks_all on public.tasks;
create policy tasks_all on public.tasks for all to authenticated
  using (public.is_approved()) with check (public.is_approved());

-- ---------- Personel ve çalışma planı ----------
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  sicil text not null unique,
  full_name text not null,
  title text not null default '',
  department text not null check (department in ('Operasyon', 'Teknik')),
  sort_no int not null default 0
);
create table if not exists public.staff_shifts (
  staff_id uuid not null references public.staff (id) on delete cascade,
  day date not null,
  value text not null, -- "08:30-20:30", "T", "Yİ" ...
  primary key (staff_id, day)
);
create table if not exists public.staff_assignments (
  staff_id uuid not null references public.staff (id) on delete cascade,
  day date not null,
  location text not null check (location in ('T1', 'T2', 'Yeni Şut Altı')),
  assigned_by uuid default auth.uid() references public.profiles (id),
  primary key (staff_id, day)
);
alter table public.staff enable row level security;
alter table public.staff_shifts enable row level security;
alter table public.staff_assignments enable row level security;
-- Herkes (onaylı) görür ve görev yeri ataması yapabilir; personel listesini ve planı yalnızca yönetici değiştirir.
drop policy if exists staff_select on public.staff;
create policy staff_select on public.staff for select to authenticated using (public.is_approved());
drop policy if exists staff_admin on public.staff;
create policy staff_admin on public.staff for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists staff_shifts_select on public.staff_shifts;
create policy staff_shifts_select on public.staff_shifts for select to authenticated using (public.is_approved());
drop policy if exists staff_shifts_admin on public.staff_shifts;
create policy staff_shifts_admin on public.staff_shifts for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists staff_assignments_select on public.staff_assignments;
create policy staff_assignments_select on public.staff_assignments for select to authenticated using (public.is_approved());
drop policy if exists staff_assignments_admin on public.staff_assignments;
drop policy if exists staff_assignments_write on public.staff_assignments;
create policy staff_assignments_write on public.staff_assignments for all to authenticated using (public.is_approved()) with check (public.is_approved());

-- ---------- Vardiya akışı ve vardiya raporları ----------
create table if not exists public.shift_entries (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  shift text not null check (shift in ('A', 'B', 'C', 'D')),
  team text not null check (team in ('Operasyon', 'Teknik')),
  kind text not null check (kind in ('bildirim', 'not', 'rutin', 'devir')),
  title text not null,
  body text not null default '',
  photo_url text,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists shift_entries_day_idx on public.shift_entries (day, shift);
create table if not exists public.shift_reports (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  shift text not null check (shift in ('A', 'B', 'C', 'D')),
  team text not null check (team in ('Operasyon', 'Teknik', 'Tümü')),
  entry_count int not null default 0,
  content jsonb not null default '[]', -- rapor oluşturulduğu andaki kayıtların kopyası
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (day, shift, team)
);
alter table public.shift_entries enable row level security;
alter table public.shift_reports enable row level security;
drop policy if exists shift_entries_all on public.shift_entries;
create policy shift_entries_all on public.shift_entries for all to authenticated
  using (public.is_approved()) with check (public.is_approved());
drop policy if exists shift_reports_all on public.shift_reports;
create policy shift_reports_all on public.shift_reports for all to authenticated
  using (public.is_approved()) with check (public.is_approved());

-- ---------- Fotoğraf deposu ----------
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
  on conflict (id) do nothing;
drop policy if exists photos_insert on storage.objects;
create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.is_approved());

-- ---------- Canlı güncelleme ----------
do $$
declare t text;
begin
  foreach t in array array['profiles', 'notices', 'faults', 'fault_zones', 'reports', 'tasks', 'staff_assignments', 'shift_entries', 'shift_reports'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
