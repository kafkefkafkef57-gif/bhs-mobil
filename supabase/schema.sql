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
  foreach t in array array['profiles', 'notices', 'faults'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
