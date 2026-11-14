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
-- Otomatik bildiriler (ör. hava uyarısı) için tekillik anahtarı: aynı anahtarla ikinci kayıt oluşmaz.
alter table public.notices add column if not exists auto_key text unique;
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

-- ---------- Depo envanteri ----------
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null default '',
  shelf text not null default '',
  quantity numeric not null default 0 check (quantity >= 0),
  unit text not null default 'Adet',
  critical_level numeric not null default 0 check (critical_level >= 0), -- stok bu seviyeye ya da altına inince kritik
  created_by uuid default auth.uid() references public.profiles (id),
  updated_at timestamptz not null default now()
);
alter table public.inventory_items enable row level security;
drop policy if exists inventory_items_all on public.inventory_items;
create policy inventory_items_all on public.inventory_items for all to authenticated
  using (public.is_approved()) with check (public.is_approved());

-- ---------- Teknik bakım: ekipmanlar ve bakım kayıtları ----------
create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- "101.2.7" gibi; ilk bölüm hat numarası
  line text not null,
  kind text not null default 'Konveyör / Motor',
  location text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  technician text not null default '',
  work text not null,
  item_id uuid references public.inventory_items (id) on delete set null,
  item_name text not null default '', -- malzeme silinse de kayıtta kalır
  quantity_used numeric not null default 0,
  unit text not null default '',
  note text not null default '',
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists maintenance_records_equipment_idx on public.maintenance_records (equipment_id, created_at desc);
alter table public.equipment enable row level security;
alter table public.maintenance_records enable row level security;
drop policy if exists equipment_all on public.equipment;
create policy equipment_all on public.equipment for all to authenticated
  using (public.is_approved()) with check (public.is_approved());
drop policy if exists maintenance_records_all on public.maintenance_records;
create policy maintenance_records_all on public.maintenance_records for all to authenticated
  using (public.is_approved()) with check (public.is_approved());

-- Bakım kaydı ekler; yedek parça kullanıldıysa aynı işlemde depo stokundan düşer.
-- Stok yetmezse hiçbir şey kaydedilmez (STOK_YETERSIZ hatası).
create or replace function public.add_maintenance_record(
  p_equipment uuid, p_technician text, p_work text, p_item uuid, p_quantity numeric, p_note text
) returns void language plpgsql security invoker set search_path = public as $$
declare v_item public.inventory_items;
begin
  if p_item is not null then
    if coalesce(p_quantity, 0) <= 0 then raise exception 'Kullanılan miktar sıfırdan büyük olmalı.'; end if;
    update public.inventory_items set quantity = quantity - p_quantity, updated_at = now()
      where id = p_item and quantity >= p_quantity returning * into v_item;
    if not found then raise exception 'STOK_YETERSIZ'; end if;
  end if;
  insert into public.maintenance_records (equipment_id, technician, work, item_id, item_name, quantity_used, unit, note)
  values (p_equipment, coalesce(p_technician, ''), p_work, p_item, coalesce(v_item.name, ''),
          case when p_item is null then 0 else p_quantity end, coalesce(v_item.unit, ''), coalesce(p_note, ''));
end $$;

-- Başlangıç ekipman listesi (422 konveyör / motor). Yenileri uygulamadaki "Ekipman Ekle" ile eklenir.
insert into public.equipment (code, line) values
  ('101.2.7', '101'), ('101.26.1', '101'), ('102.26.1', '102'), ('103.26.1', '103'), ('104.26.1', '104'), ('201.26.1', '201'),
  ('202.26.1', '202'), ('203.26.1', '203'), ('204.26.1', '204'), ('301.2.1', '301'), ('301.2.3', '301'), ('301.2.5', '301'),
  ('301.2.7', '301'), ('301.4.1', '301'), ('301.4.3', '301'), ('301.6.1', '301'), ('301.8.1', '301'), ('301.8.3', '301'),
  ('301.8.7', '301'), ('301.8.9', '301'), ('302.2.1', '302'), ('302.2.3', '302'), ('302.2.5', '302'), ('302.2.7', '302'),
  ('302.2.9', '302'), ('302.11', '302'), ('303.2.1', '303'), ('303.2.3', '303'), ('303.4.1', '303'), ('303.4.2', '303'),
  ('303.6.1', '303'), ('303.6.5', '303'), ('303.8.1', '303'), ('303.8.3', '303'), ('303.8.5', '303'), ('303.8.7', '303'),
  ('303.10.2', '303'), ('303.10.3', '303'), ('303.10.4', '303'), ('303.12.1', '303'), ('303.12.3', '303'), ('303.14.1', '303'),
  ('303.16.1', '303'), ('303.16.2', '303'), ('303.18.1', '303'), ('303.18.5', '303'), ('303.20.1', '303'), ('303.20.3', '303'),
  ('303.20.5', '303'), ('303.20.7', '303'), ('303.22.2', '303'), ('303.22.3', '303'), ('303.22.4', '303'), ('303.24.1', '303'),
  ('303.26.1', '303'), ('304.2.1', '304'), ('304.2.3', '304'), ('304.2.5', '304'), ('304.2.7', '304'), ('304.2.9', '304'),
  ('304.4.1', '304'), ('304.4.3', '304'), ('304.4.5', '304'), ('304.4.7', '304'), ('304.4.9', '304'), ('304.4.11', '304'),
  ('305.2.1', '305'), ('305.2.3', '305'), ('305.2.5', '305'), ('305.2.7', '305'), ('305.4.1', '305'), ('305.4.3', '305'),
  ('305.4.5', '305'), ('305.4.7', '305'), ('305.4.9', '305'), ('306.2.1', '306'), ('306.2.3', '306'), ('306.2.5', '306'),
  ('306.2.7', '306'), ('306.2.9', '306'), ('306.2.15', '306'), ('307.2.1', '307'), ('307.2.3', '307'), ('307.2.5', '307'),
  ('307.4.1', '307'), ('307.4.3', '307'), ('307.4.5', '307'), ('307.6.1', '307'), ('307.6.2', '307'), ('307.8.1', '307'),
  ('307.8.5', '307'), ('307.10.1', '307'), ('307.10.3', '307'), ('307.10.5', '307'), ('307.10.7', '307'), ('307.12.2', '307'),
  ('307.12.3', '307'), ('307.12.4', '307'), ('307.14.1', '307'), ('307.16.1', '307'), ('307.16.3', '307'), ('307.16.5', '307'),
  ('307.16.7', '307'), ('307.18.1', '307'), ('307.20.1', '307'), ('308.14.1', '308'), ('308.14.3', '308'), ('308.14.5', '308'),
  ('308.14.7', '308'), ('308.14.9', '308'), ('308.14.11', '308'), ('308.14.13', '308'), ('309.2.1', '309'), ('309.2.3', '309'),
  ('309.4.1', '309'), ('309.4.3', '309'), ('309.4.5', '309'), ('309.4.7', '309'), ('309.4.9', '309'), ('310.2.1', '310'),
  ('310.2.3', '310'), ('310.4.1', '310'), ('310.4.3', '310'), ('310.4.5', '310'), ('310.4.7', '310'), ('310.6.1', '310'),
  ('310.6.2', '310'), ('310.8.2', '310'), ('310.8.5', '310'), ('310.10.1', '310'), ('310.12.1', '310'), ('310.12.3', '310'),
  ('310.13.1', '310'), ('310.14.2', '310'), ('310.14.3', '310'), ('310.14.5', '310'), ('310.36.1', '310'), ('310.81.1', '310'),
  ('401.2.1', '401'), ('401.2.3', '401'), ('401.2.5', '401'), ('401.2.9', '401'), ('401.2.11', '401'), ('401.8.1', '401'),
  ('401.8.3', '401'), ('401.8.5', '401'), ('401.8.7', '401'), ('401.8.9', '401'), ('401.12.13', '401'), ('402.2.1', '402'),
  ('402.2.3', '402'), ('402.2.5', '402'), ('402.2.7', '402'), ('402.2.9', '402'), ('402.2.11', '402'), ('403.2.1', '403'),
  ('403.2.3', '403'), ('403.4.1', '403'), ('403.4.2', '403'), ('403.6.1', '403'), ('403.6.5', '403'), ('403.8.1', '403'),
  ('403.8.3', '403'), ('403.8.5', '403'), ('403.8.7', '403'), ('403.10.2', '403'), ('403.10.3', '403'), ('403.10.4', '403'),
  ('403.12.1', '403'), ('403.12.3', '403'), ('403.14.1', '403'), ('403.16.1', '403'), ('403.16.2', '403'), ('403.18.1', '403'),
  ('403.18.5', '403'), ('403.20.1', '403'), ('403.20.3', '403'), ('403.20.7', '403'), ('403.22.2', '403'), ('403.22.3', '403'),
  ('403.22.4', '403'), ('403.24.1', '403'), ('403.26.1', '403'), ('403.205', '403'), ('404.2.1', '404'), ('404.2.3', '404'),
  ('404.2.5', '404'), ('404.2.7', '404'), ('404.2.9', '404'), ('404.4.1', '404'), ('404.4.3', '404'), ('404.4.5', '404'),
  ('404.4.7', '404'), ('404.4.9', '404'), ('404.4.11', '404'), ('405.2.1', '405'), ('405.2.3', '405'), ('405.2.5', '405'),
  ('405.2.7', '405'), ('405.4.1', '405'), ('405.4.3', '405'), ('405.4.5', '405'), ('405.4.7', '405'), ('405.4.9', '405'),
  ('406.2.1', '406'), ('406.2.3', '406'), ('406.2.5', '406'), ('406.2.7', '406'), ('406.2.9', '406'), ('406.2.11', '406'),
  ('406.2.13', '406'), ('406.2.15', '406'), ('406.2.17', '406'), ('407.2.1', '407'), ('407.2.3', '407'), ('407.4.1', '407'),
  ('407.4.3', '407'), ('407.4.5', '407'), ('407.6.1', '407'), ('407.6.2', '407'), ('407.8.1', '407'), ('407.8.5', '407'),
  ('407.10.1', '407'), ('407.10.3', '407'), ('407.10.5', '407'), ('407.10.7', '407'), ('407.12.2', '407'), ('407.12.3', '407'),
  ('407.12.4', '407'), ('407.14.1', '407'), ('407.16.1', '407'), ('407.16.3', '407'), ('407.16.5', '407'), ('407.16.7', '407'),
  ('407.18.1', '407'), ('407.20.1', '407'), ('407.25', '407'), ('408.14.1', '408'), ('408.14.3', '408'), ('408.14.5', '408'),
  ('408.14.7', '408'), ('408.14.9', '408'), ('408.14.11', '408'), ('408.14.13', '408'), ('410.1.1', '410'), ('410.1.3', '410'),
  ('410.3.1', '410'), ('410.3.3', '410'), ('410.3.5', '410'), ('410.3.7', '410'), ('410.3.9', '410'), ('410.3.11', '410'),
  ('410.3.13', '410'), ('410.3.15', '410'), ('410.3.17', '410'), ('701.2.1', '701'), ('701.2.3', '701'), ('701.2.5', '701'),
  ('701.2.7', '701'), ('701.2.9', '701'), ('701.2.11', '701'), ('701.2.13', '701'), ('701.2.15', '701'), ('701.2.17', '701'),
  ('701.4.1', '701'), ('701.4.3', '701'), ('701.4.4', '701'), ('701.6.1', '701'), ('701.6.3', '701'), ('701.6.5', '701'),
  ('701.6.7', '701'), ('701.6.9', '701'), ('701.6.11', '701'), ('701.8.1', '701'), ('701.8.3', '701'), ('701.8.5', '701'),
  ('701.8.7', '701'), ('701.8.9', '701'), ('701.10.3', '701'), ('701.10.5', '701'), ('701.10.7', '701'), ('701.10.11', '701'),
  ('701.12.1', '701'), ('701.14.1', '701'), ('701.14.3', '701'), ('701.14.4', '701'), ('701.16.1', '701'), ('701.16.3', '701'),
  ('701.16.5', '701'), ('701.18.1', '701'), ('701.18.3', '701'), ('701.20.1', '701'), ('701.20.3', '701'), ('701.22.1', '701'),
  ('701.22.3', '701'), ('801.2.1', '801'), ('801.2.3', '801'), ('801.2.5', '801'), ('801.2.7', '801'), ('801.2.9', '801'),
  ('801.4.0', '801'), ('801.4.3', '801'), ('801.4.4', '801'), ('801.6.1', '801'), ('801.6.5', '801'), ('801.6.7', '801'),
  ('801.6.9', '801'), ('801.6.11', '801'), ('801.8.1', '801'), ('801.8.3', '801'), ('801.8.5', '801'), ('801.8.7', '801'),
  ('801.8.9', '801'), ('801.10.1', '801'), ('801.10.3', '801'), ('801.10.5', '801'), ('801.12.1', '801'), ('801.14.1', '801'),
  ('801.14.3', '801'), ('801.14.4', '801'), ('801.16.1', '801'), ('801.16.3', '801'), ('801.16.5', '801'), ('801.18.1', '801'),
  ('801.18.3', '801'), ('801.20.1', '801'), ('801.20.3', '801'), ('801.22.1', '801'), ('801.22.3', '801'), ('801.107', '801'),
  ('901.2.1', '901'), ('901.6.1', '901'), ('901.6.3', '901'), ('901.8.1', '901'), ('901.8.3', '901'), ('901.18.3', '901'),
  ('902.38.1', '902'), ('903.34.1', '903'), ('903.38.1', '903'), ('904.2.1', '904'), ('904.2.3', '904'), ('904.2.5', '904'),
  ('904.2.7', '904'), ('904.2.94', '904'), ('904.4.1', '904'), ('904.6.1', '904'), ('904.8.1', '904'), ('904.10.1', '904'),
  ('904.10.2', '904'), ('904.10.99', '904'), ('904.12.1', '904'), ('905.2.1', '905'), ('905.2.3', '905'), ('905.2.5', '905'),
  ('905.2.7', '905'), ('905.2.94', '905'), ('1001.2.1', '1001'), ('1001.2.3', '1001'), ('1001.4.3', '1001'), ('1001.4.5', '1001'),
  ('1001.6.3', '1001'), ('1001.8.1', '1001'), ('1001.8.3', '1001'), ('1001.10.1', '1001'), ('1001.10.3', '1001'), ('1001.12.1', '1001'),
  ('1001.12.3', '1001'), ('1061.4.5', '1061'), ('1101.2.1', '1101'), ('1101.2.3', '1101'), ('1101.4.1', '1101'), ('1101.4.3', '1101'),
  ('1101.4.3.1', '1101'), ('1101.4.5', '1101'), ('1102.2.1', '1102'), ('1102.2.2', '1102'), ('1201.2.1', '1201'), ('1201.2.3', '1201'),
  ('1201.4.1', '1201'), ('1201.4.3', '1201'), ('1201.4.5', '1201'), ('1202.2.1', '1202'), ('1202.2.2', '1202'), ('1301.2.1', '1301'),
  ('1301.2.3', '1301'), ('1301.4.1', '1301'), ('1301.4.3', '1301'), ('1301.4.5', '1301'), ('1301.4.7', '1301'), ('1301.4.9', '1301'),
  ('1301.4.11', '1301'), ('1302.2.1', '1302'), ('1302.2.2', '1302'), ('1401.2.1', '1401'), ('1401.2.3', '1401'), ('1401.4.1', '1401'),
  ('1401.4.3', '1401'), ('1401.4.5', '1401'), ('1402.2.1', '1402'), ('1501.2.1', '1501'), ('1501.2.3', '1501'), ('1501.4.1', '1501'),
  ('1501.4.3', '1501'), ('1501.4.5', '1501'), ('1502.2.1', '1502'), ('1502.2.2', '1502'), ('1601.2.1', '1601'), ('1601.2.3', '1601'),
  ('1601.4.1', '1601'), ('1601.4.3', '1601'), ('1602.2.1', '1602'), ('1602.2.2', '1602'), ('1701.2.1', '1701'), ('1701.2.3', '1701'),
  ('1701.4.1', '1701'), ('1701.4.3', '1701'), ('1701.4.5', '1701'), ('1701.4.7', '1701'), ('1701.4.9', '1701'), ('1702.2.1', '1702'),
  ('1702.2.2', '1702'), ('8013.6.3', '8013')
on conflict (code) do nothing;

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
  foreach t in array array['profiles', 'notices', 'faults', 'fault_zones', 'inventory_items', 'equipment', 'maintenance_records', 'reports', 'tasks', 'staff_assignments', 'shift_entries', 'shift_reports'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
