
create extension if not exists btree_gist;

-- ROLES
create type public.app_role as enum ('admin','staff');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  email text,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','staff'))
$$;
create policy "own roles or staff read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

-- first account becomes admin
create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles) then
    insert into public.user_roles(user_id, role, email) values (new.id, 'admin', new.email);
  end if;
  return new;
end $$;
create trigger on_auth_user_first_admin after insert on auth.users
  for each row execute function public.handle_first_admin();

-- SETTINGS
create table public.restaurant_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Khaosan',
  location_name text not null default 'Khaosan Dhaka',
  logo_url text,
  address text,
  phone text,
  email text,
  map_url text,
  timezone text not null default 'Asia/Dhaka',
  open_time time not null default '12:00',
  close_time time not null default '23:00',
  slot_interval_min int not null default 30,
  dining_min int not null default 90,
  buffer_min int not null default 15,
  hold_min int not null default 5,
  advance_days int not null default 30,
  grace_min int not null default 15,
  cancellation_policy text not null default 'Free cancellation up to 2 hours before your booking. (Demonstration policy — to be confirmed by the restaurant.)',
  arrival_policy text not null default 'Tables are held for 15 minutes after the booking time. (Demonstration policy — to be confirmed by the restaurant.)',
  allow_table_choice boolean not null default true,
  default_country_code text not null default '+880',
  is_demo boolean not null default true,
  updated_at timestamptz not null default now()
);
grant select on public.restaurant_settings to anon, authenticated;
grant update on public.restaurant_settings to authenticated;
grant all on public.restaurant_settings to service_role;
alter table public.restaurant_settings enable row level security;
create policy "settings public read" on public.restaurant_settings for select to anon, authenticated using (true);
create policy "admin update settings" on public.restaurant_settings for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.closures (
  id uuid primary key default gen_random_uuid(),
  closed_on date not null unique,
  reason text,
  created_at timestamptz not null default now()
);
grant select on public.closures to anon, authenticated;
grant insert, update, delete on public.closures to authenticated;
grant all on public.closures to service_role;
alter table public.closures enable row level security;
create policy "closures public read" on public.closures for select to anon, authenticated using (true);
create policy "admin manage closures" on public.closures for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- TABLES
create type public.table_status as enum ('empty','occupied','cleaning','unavailable');
create table public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  capacity int not null check (capacity > 0),
  min_party int not null default 1,
  area text not null default 'Main hall',
  pos_x int not null default 10,
  pos_y int not null default 10,
  shape text not null default 'square',
  status public.table_status not null default 'empty',
  status_changed_at timestamptz not null default now(),
  active boolean not null default true,
  sort int not null default 0
);
grant select on public.dining_tables to anon, authenticated;
grant insert, update, delete on public.dining_tables to authenticated;
grant all on public.dining_tables to service_role;
alter table public.dining_tables enable row level security;
create policy "tables public read" on public.dining_tables for select to anon, authenticated using (true);
create policy "admin manage tables" on public.dining_tables for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.table_combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  table_ids uuid[] not null,
  min_party int not null default 1,
  capacity int not null
);
grant select on public.table_combos to anon, authenticated;
grant insert, update, delete on public.table_combos to authenticated;
grant all on public.table_combos to service_role;
alter table public.table_combos enable row level security;
create policy "combos public read" on public.table_combos for select to anon, authenticated using (true);
create policy "admin manage combos" on public.table_combos for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- RESERVATIONS
create type public.res_status as enum ('held','confirmed','arrived','seated','completed','cancelled','no_show','expired');
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('KS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  manage_token text not null unique default (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  source text not null default 'online',
  guest_name text,
  phone text,
  email text,
  notes text,
  staff_notes text,
  party_size int not null check (party_size > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.res_status not null,
  hold_expires_at timestamptz,
  idempotency_key text unique,
  seated_at timestamptz,
  departed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.reservations to authenticated;
grant all on public.reservations to service_role;
alter table public.reservations enable row level security;
create policy "staff read reservations" on public.reservations for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff update notes" on public.reservations for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create index on public.reservations(starts_at);

create table public.reservation_tables (
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  table_id uuid not null references public.dining_tables(id) on delete cascade,
  block tstzrange not null,
  active boolean not null default true,
  primary key (reservation_id, table_id),
  exclude using gist (table_id with =, block with &&) where (active)
);
grant select on public.reservation_tables to authenticated;
grant all on public.reservation_tables to service_role;
alter table public.reservation_tables enable row level security;
create policy "staff read allocations" on public.reservation_tables for select to authenticated using (public.is_staff(auth.uid()));

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  phone text not null,
  email text,
  party_size int not null,
  desired_date date not null,
  earliest time not null,
  latest time not null,
  status text not null default 'waiting',
  notes text,
  offered_until timestamptz,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.waitlist to authenticated;
grant all on public.waitlist to service_role;
alter table public.waitlist enable row level security;
create policy "staff manage waitlist" on public.waitlist for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.audit_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_email text,
  action text not null,
  reservation_id uuid,
  table_id uuid,
  details jsonb
);
grant select on public.audit_events to authenticated;
grant all on public.audit_events to service_role;
alter table public.audit_events enable row level security;
create policy "staff read audit" on public.audit_events for select to authenticated using (public.is_staff(auth.uid()));

create table public.availability_pulse (id int primary key default 1 check (id=1), bumped_at timestamptz not null default now());
grant select on public.availability_pulse to anon, authenticated;
grant all on public.availability_pulse to service_role;
alter table public.availability_pulse enable row level security;
create policy "pulse public read" on public.availability_pulse for select to anon, authenticated using (true);
insert into public.availability_pulse(id) values (1);

-- TRIGGERS
create or replace function public._res_status_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin
  new.updated_at := now();
  if new.status in ('completed','cancelled','no_show','expired') and old.status is distinct from new.status then
    update public.reservation_tables set active = false where reservation_id = new.id;
  end if;
  return new;
end $$;
create trigger reservations_status before update on public.reservations for each row execute function public._res_status_trg();

create or replace function public._bump_pulse() returns trigger language plpgsql security definer set search_path=public as $$
begin update public.availability_pulse set bumped_at = now() where id = 1; return null; end $$;
create trigger pulse_res after insert or update or delete on public.reservations for each statement execute function public._bump_pulse();
create trigger pulse_rt after insert or update or delete on public.reservation_tables for each statement execute function public._bump_pulse();
create trigger pulse_tables after insert or update or delete on public.dining_tables for each statement execute function public._bump_pulse();
create trigger pulse_settings after update on public.restaurant_settings for each statement execute function public._bump_pulse();
create trigger pulse_closures after insert or update or delete on public.closures for each statement execute function public._bump_pulse();

-- HELPERS
create or replace function public._audit(_action text, _res uuid, _table uuid, _details jsonb)
returns void language sql security definer set search_path=public as $$
  insert into public.audit_events(actor, actor_email, action, reservation_id, table_id, details)
  values (auth.uid(), auth.jwt()->>'email', _action, _res, _table, _details);
$$;

create or replace function public._service_bounds(_d date)
returns table(open_at timestamptz, close_at timestamptz, last_start timestamptz)
language sql stable set search_path=public as $$
  select (_d + s.open_time) at time zone s.timezone,
         ((_d + case when s.close_time <= s.open_time then 1 else 0 end) + s.close_time) at time zone s.timezone,
         (((_d + case when s.close_time <= s.open_time then 1 else 0 end) + s.close_time) at time zone s.timezone) - make_interval(mins => s.dining_min)
  from public.restaurant_settings s where s.id = 1
$$;

create or replace function public._table_free(_table uuid, _s timestamptz, _e timestamptz, _exclude uuid, _ignore_holds boolean)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare t record; buf int;
begin
  select * into t from public.dining_tables where id = _table;
  if not found or not t.active or t.status = 'unavailable' then return false; end if;
  select buffer_min into buf from public.restaurant_settings where id = 1;
  if t.status = 'cleaning' and _s < now() + make_interval(mins => buf) then return false; end if;
  if t.status = 'occupied' and _s < now() + make_interval(mins => 30 + buf) and not exists (
      select 1 from public.reservation_tables rt join public.reservations r on r.id = rt.reservation_id
      where rt.table_id = _table and rt.active and r.status = 'seated') then
    return false;
  end if;
  return not exists (
    select 1 from public.reservation_tables rt join public.reservations r on r.id = rt.reservation_id
    where rt.table_id = _table and rt.active and r.id is distinct from _exclude
      and r.status in ('held','confirmed','arrived','seated')
      and (r.status <> 'held' or (r.hold_expires_at > now() and not _ignore_holds))
      and tstzrange(lower(rt.block),
            case when r.status = 'seated' then greatest(upper(rt.block), now() + make_interval(mins => buf)) else upper(rt.block) end)
          && tstzrange(_s, _e)
  );
end $$;

create or replace function public._find_option(_s timestamptz, _party int, _exclude uuid, _ignore_holds boolean, _pref uuid)
returns uuid[] language plpgsql stable security definer set search_path=public as $$
declare st record; e timestamptz; opt record;
begin
  select * into st from public.restaurant_settings where id = 1;
  e := _s + make_interval(mins => st.dining_min + st.buffer_min);
  if _pref is not null then
    if exists (select 1 from public.dining_tables where id = _pref and active and capacity >= _party and min_party <= _party)
       and public._table_free(_pref, _s, e, _exclude, _ignore_holds) then
      return array[_pref];
    end if;
    return null;
  end if;
  for opt in select id from public.dining_tables where active and capacity >= _party and min_party <= _party order by capacity, sort loop
    if public._table_free(opt.id, _s, e, _exclude, _ignore_holds) then return array[opt.id]; end if;
  end loop;
  for opt in select table_ids from public.table_combos where capacity >= _party and min_party <= _party order by capacity loop
    if (select bool_and(public._table_free(x, _s, e, _exclude, _ignore_holds)) from unnest(opt.table_ids) x) then
      return opt.table_ids;
    end if;
  end loop;
  return null;
end $$;

create or replace function public._count_free(_s timestamptz, _party int, _ignore_holds boolean)
returns int language plpgsql stable security definer set search_path=public as $$
declare st record; e timestamptz; n int;
begin
  select * into st from public.restaurant_settings where id = 1;
  e := _s + make_interval(mins => st.dining_min + st.buffer_min);
  select count(*) into n from public.dining_tables t
    where t.active and t.capacity >= _party and t.min_party <= _party and public._table_free(t.id, _s, e, null, _ignore_holds);
  if n = 0 then
    select count(*) into n from public.table_combos c where c.capacity >= _party and c.min_party <= _party
      and (select bool_and(public._table_free(x, _s, e, null, _ignore_holds)) from unnest(c.table_ids) x);
    n := least(n, 1);
  end if;
  return n;
end $$;

create or replace function public._slot_reason(_s timestamptz)
returns text language plpgsql stable security definer set search_path=public as $$
declare st record; d date; dd date; b record; today date;
begin
  select * into st from public.restaurant_settings where id = 1;
  if _s <= now() then return 'past'; end if;
  today := (now() at time zone st.timezone)::date;
  d := (_s at time zone st.timezone)::date;
  foreach dd in array array[d - 1, d] loop
    select * into b from public._service_bounds(dd);
    if _s >= b.open_at and _s <= b.last_start
       and mod(extract(epoch from (_s - b.open_at))::bigint, st.slot_interval_min * 60) = 0 then
      if exists (select 1 from public.closures where closed_on = dd) then return 'closed'; end if;
      if dd > today + st.advance_days then return 'beyond_window'; end if;
      return null;
    end if;
  end loop;
  return 'outside_hours';
end $$;

create or replace function public._release_expired() returns void language sql security definer set search_path=public as $$
  update public.reservations set status = 'expired' where status = 'held' and hold_expires_at <= now();
$$;

-- PUBLIC: slots
create or replace function public.get_slots(_date date, _party int)
returns table(slot_start timestamptz, status text, free_count int)
language plpgsql stable security definer set search_path=public as $$
declare st record; b record; s timestamptz; c int; maxcap int; today date; closed boolean;
begin
  select * into st from public.restaurant_settings where id = 1;
  today := (now() at time zone st.timezone)::date;
  select greatest(coalesce((select max(capacity) from public.dining_tables where active), 0),
                  coalesce((select max(capacity) from public.table_combos), 0)) into maxcap;
  closed := exists (select 1 from public.closures where closed_on = _date);
  select * into b from public._service_bounds(_date);
  for s in select g from generate_series(b.open_at, b.last_start, make_interval(mins => st.slot_interval_min)) g loop
    slot_start := s; free_count := 0;
    if closed then status := 'closed';
    elsif _date < today then status := 'past';
    elsif _date > today + st.advance_days then status := 'beyond_window';
    elsif s <= now() then status := 'past';
    elsif _party > maxcap then status := 'too_large';
    else
      c := public._count_free(s, _party, false);
      if c > 0 then status := 'available'; free_count := c;
      elsif public._count_free(s, _party, true) > 0 then status := 'held';
      else status := 'full';
      end if;
    end if;
    return next;
  end loop;
end $$;

create or replace function public._alternatives(_s timestamptz, _party int)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare st record; d date; res jsonb;
begin
  select * into st from public.restaurant_settings where id = 1;
  d := (_s at time zone st.timezone)::date;
  select coalesce(jsonb_agg(x.slot_start order by abs(extract(epoch from x.slot_start - _s))), '[]'::jsonb) into res
  from (
    select g.slot_start from (
      select * from public.get_slots(d, _party)
      union all select * from public.get_slots(d + 1, _party)
    ) g where g.status = 'available'
    order by abs(extract(epoch from g.slot_start - _s)) limit 4
  ) x;
  return res;
end $$;

create or replace function public.get_public_tables(_start timestamptz default null, _party int default 2)
returns table(id uuid, label text, capacity int, min_party int, area text, pos_x int, pos_y int, shape text,
              status public.table_status, status_changed_at timestamptz, next_reserved_at timestamptz,
              held boolean, fits boolean, free_for_visit boolean)
language plpgsql stable security definer set search_path=public as $$
declare st record; s timestamptz; e timestamptz;
begin
  select * into st from public.restaurant_settings where id = 1;
  s := coalesce(_start, now());
  e := s + make_interval(mins => st.dining_min + st.buffer_min);
  return query
  select t.id, t.label, t.capacity, t.min_party, t.area, t.pos_x, t.pos_y, t.shape, t.status, t.status_changed_at,
    (select min(lower(rt.block)) from public.reservation_tables rt join public.reservations r on r.id = rt.reservation_id
      where rt.table_id = t.id and rt.active and r.status in ('confirmed','arrived') and lower(rt.block) > now() - interval '15 minutes'
        and lower(rt.block) < now() + interval '24 hours'),
    exists (select 1 from public.reservation_tables rt join public.reservations r on r.id = rt.reservation_id
      where rt.table_id = t.id and rt.active and r.status = 'held' and r.hold_expires_at > now() and rt.block && tstzrange(s, e)),
    (t.capacity >= _party and t.min_party <= _party),
    (t.capacity >= _party and t.min_party <= _party and public._table_free(t.id, s, e, null, false)
       and (_start is not null or t.status = 'empty'))
  from public.dining_tables t where t.active order by t.sort, t.label;
end $$;

-- booking json
create or replace function public._booking_json(_id uuid) returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'ok', true,
    'id', r.id, 'ref', r.ref, 'token', r.manage_token, 'status', r.status,
    'guest_name', r.guest_name, 'phone', r.phone, 'email', r.email, 'notes', r.notes,
    'party_size', r.party_size, 'starts_at', r.starts_at, 'ends_at', r.ends_at,
    'hold_expires_at', r.hold_expires_at, 'server_now', now(),
    'tables', coalesce((select jsonb_agg(t.label order by t.label) from public.reservation_tables rt join public.dining_tables t on t.id = rt.table_id where rt.reservation_id = r.id), '[]'::jsonb)
  ) from public.reservations r where r.id = _id
$$;

create or replace function public.create_hold(_start timestamptz, _party int, _table uuid default null, _idem text default null)
returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare st record; r record; reason text; opt uuid[]; rid uuid;
begin
  if _party is null or _party < 1 or _party > 30 then return jsonb_build_object('ok', false, 'error', 'invalid_party'); end if;
  if _idem is not null then
    select * into r from public.reservations where idempotency_key = _idem;
    if found then
      if r.status <> 'held' or r.hold_expires_at > now() then return public._booking_json(r.id); end if;
      update public.reservations set idempotency_key = null where id = r.id;
    end if;
  end if;
  select * into st from public.restaurant_settings where id = 1;
  if not st.allow_table_choice then _table := null; end if;
  reason := public._slot_reason(_start);
  if reason is not null then
    return jsonb_build_object('ok', false, 'error', reason, 'alternatives', public._alternatives(_start, _party));
  end if;
  perform public._release_expired();
  perform 1 from public.dining_tables order by id for update;
  opt := public._find_option(_start, _party, null, false, _table);
  if opt is null then
    return jsonb_build_object('ok', false, 'error', 'unavailable', 'alternatives', public._alternatives(_start, _party));
  end if;
  insert into public.reservations(party_size, starts_at, ends_at, status, hold_expires_at, idempotency_key, source)
  values (_party, _start, _start + make_interval(mins => st.dining_min), 'held', now() + make_interval(mins => st.hold_min), _idem, 'online')
  returning id into rid;
  insert into public.reservation_tables(reservation_id, table_id, block)
  select rid, x, tstzrange(_start, _start + make_interval(mins => st.dining_min + st.buffer_min)) from unnest(opt) x;
  return public._booking_json(rid);
end $$;

create or replace function public.confirm_booking(_token text, _name text, _phone text, _email text default null, _notes text default null)
returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare r record; st record; opt uuid[];
begin
  select * into st from public.restaurant_settings where id = 1;
  select * into r from public.reservations where manage_token = _token for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.status in ('confirmed','arrived','seated','completed') then return public._booking_json(r.id); end if;
  if r.status not in ('held','expired') then return jsonb_build_object('ok', false, 'error', 'not_holdable'); end if;
  if coalesce(length(trim(_name)), 0) < 1 or length(_name) > 100 then return jsonb_build_object('ok', false, 'error', 'invalid_name'); end if;
  if _phone is null or _phone !~ '^\+?[0-9][0-9 \-]{6,19}$' then return jsonb_build_object('ok', false, 'error', 'invalid_phone'); end if;
  if _email is not null and _email <> '' and _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'error', 'invalid_email'); end if;
  if r.status = 'expired' or r.hold_expires_at <= now() then
    perform public._release_expired();
    perform 1 from public.dining_tables order by id for update;
    if r.starts_at <= now() then return jsonb_build_object('ok', false, 'error', 'past', 'alternatives', public._alternatives(now(), r.party_size)); end if;
    opt := public._find_option(r.starts_at, r.party_size, r.id, false, null);
    if opt is null then
      return jsonb_build_object('ok', false, 'error', 'hold_expired_unavailable', 'alternatives', public._alternatives(r.starts_at, r.party_size));
    end if;
    delete from public.reservation_tables where reservation_id = r.id;
    insert into public.reservation_tables(reservation_id, table_id, block)
    select r.id, x, tstzrange(r.starts_at, r.starts_at + make_interval(mins => st.dining_min + st.buffer_min)) from unnest(opt) x;
  end if;
  update public.reservations set status = 'confirmed', hold_expires_at = null,
    guest_name = trim(_name), phone = trim(_phone), email = nullif(trim(coalesce(_email,'')), ''), notes = nullif(trim(coalesce(_notes,'')), '')
  where id = r.id;
  perform public._audit('booking_confirmed', r.id, null, jsonb_build_object('source','online'));
  return public._booking_json(r.id);
end $$;

create or replace function public.get_booking(_token text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare rid uuid;
begin
  select id into rid from public.reservations where manage_token = _token;
  if rid is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return public._booking_json(rid);
end $$;

create or replace function public.cancel_booking(_token text) returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare r record;
begin
  select * into r from public.reservations where manage_token = _token for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.status not in ('held','confirmed') then return jsonb_build_object('ok', false, 'error', 'not_cancellable'); end if;
  update public.reservations set status = 'cancelled' where id = r.id;
  perform public._audit('booking_cancelled_by_guest', r.id, null, null);
  return public._booking_json(r.id);
end $$;

create or replace function public.reschedule_booking(_token text, _start timestamptz, _party int)
returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare r record; st record; reason text; opt uuid[];
begin
  select * into st from public.restaurant_settings where id = 1;
  select * into r from public.reservations where manage_token = _token for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.status <> 'confirmed' then return jsonb_build_object('ok', false, 'error', 'not_changeable'); end if;
  if _party < 1 or _party > 30 then return jsonb_build_object('ok', false, 'error', 'invalid_party'); end if;
  reason := public._slot_reason(_start);
  if reason is not null then return jsonb_build_object('ok', false, 'error', reason, 'alternatives', public._alternatives(_start, _party)); end if;
  perform public._release_expired();
  perform 1 from public.dining_tables order by id for update;
  opt := public._find_option(_start, _party, r.id, false, null);
  if opt is null then
    return jsonb_build_object('ok', false, 'error', 'unavailable', 'alternatives', public._alternatives(_start, _party));
  end if;
  delete from public.reservation_tables where reservation_id = r.id;
  insert into public.reservation_tables(reservation_id, table_id, block)
  select r.id, x, tstzrange(_start, _start + make_interval(mins => st.dining_min + st.buffer_min)) from unnest(opt) x;
  update public.reservations set starts_at = _start, ends_at = _start + make_interval(mins => st.dining_min), party_size = _party where id = r.id;
  perform public._audit('booking_rescheduled_by_guest', r.id, null, jsonb_build_object('from', r.starts_at, 'to', _start, 'party', _party));
  return public._booking_json(r.id);
end $$;

create or replace function public.join_waitlist(_name text, _phone text, _email text, _party int, _date date, _from time, _to time)
returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare wid uuid;
begin
  if coalesce(length(trim(_name)),0) < 1 or length(_name) > 100 then return jsonb_build_object('ok', false, 'error', 'invalid_name'); end if;
  if _phone is null or _phone !~ '^\+?[0-9][0-9 \-]{6,19}$' then return jsonb_build_object('ok', false, 'error', 'invalid_phone'); end if;
  if _party < 1 or _party > 30 or _to < _from then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  insert into public.waitlist(guest_name, phone, email, party_size, desired_date, earliest, latest)
  values (trim(_name), trim(_phone), nullif(trim(coalesce(_email,'')),''), _party, _date, _from, _to) returning id into wid;
  return jsonb_build_object('ok', true, 'id', wid);
end $$;

-- STAFF
create or replace function public._require_staff() returns void language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null or not public.is_staff(auth.uid()) then raise exception 'Staff access required' using errcode = '42501'; end if;
end $$;

create or replace function public.staff_create_reservation(_start timestamptz, _party int, _name text, _phone text, _notes text default null, _table uuid default null, _source text default 'phone')
returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare st record; reason text; opt uuid[]; rid uuid;
begin
  perform public._require_staff();
  select * into st from public.restaurant_settings where id = 1;
  if coalesce(length(trim(_name)),0) < 1 then return jsonb_build_object('ok', false, 'error', 'invalid_name'); end if;
  reason := public._slot_reason(_start);
  if reason is not null then return jsonb_build_object('ok', false, 'error', reason, 'alternatives', public._alternatives(_start, _party)); end if;
  perform public._release_expired();
  perform 1 from public.dining_tables order by id for update;
  opt := public._find_option(_start, _party, null, false, _table);
  if opt is null then return jsonb_build_object('ok', false, 'error', 'unavailable', 'alternatives', public._alternatives(_start, _party)); end if;
  insert into public.reservations(party_size, starts_at, ends_at, status, source, guest_name, phone, notes)
  values (_party, _start, _start + make_interval(mins => st.dining_min), 'confirmed', _source, trim(_name), _phone, _notes) returning id into rid;
  insert into public.reservation_tables(reservation_id, table_id, block)
  select rid, x, tstzrange(_start, _start + make_interval(mins => st.dining_min + st.buffer_min)) from unnest(opt) x;
  perform public._audit('staff_created_reservation', rid, null, jsonb_build_object('source', _source));
  return public._booking_json(rid);
end $$;

create or replace function public.staff_walk_in(_party int, _name text default null, _table uuid default null)
returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare st record; opt uuid[]; rid uuid; s timestamptz := now();
begin
  perform public._require_staff();
  select * into st from public.restaurant_settings where id = 1;
  perform public._release_expired();
  perform 1 from public.dining_tables order by id for update;
  if _table is not null and (select status from public.dining_tables where id = _table) <> 'empty' then
    return jsonb_build_object('ok', false, 'error', 'table_not_empty');
  end if;
  opt := public._find_option(s, _party, null, false, _table);
  if opt is null then return jsonb_build_object('ok', false, 'error', 'unavailable'); end if;
  insert into public.reservations(party_size, starts_at, ends_at, status, source, guest_name, seated_at)
  values (_party, s, s + make_interval(mins => st.dining_min), 'seated', 'walk_in', coalesce(nullif(trim(_name),''), 'Walk-in'), s) returning id into rid;
  insert into public.reservation_tables(reservation_id, table_id, block)
  select rid, x, tstzrange(s, s + make_interval(mins => st.dining_min + st.buffer_min)) from unnest(opt) x;
  update public.dining_tables set status = 'occupied', status_changed_at = now() where id = any(opt);
  perform public._audit('walk_in_seated', rid, opt[1], jsonb_build_object('party', _party));
  return public._booking_json(rid);
end $$;

create or replace function public.staff_update_reservation(_id uuid, _action text, _table uuid default null)
returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare r record; st record; tids uuid[]; opt uuid[]; s timestamptz;
begin
  perform public._require_staff();
  select * into st from public.restaurant_settings where id = 1;
  select * into r from public.reservations where id = _id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select array_agg(table_id) into tids from public.reservation_tables where reservation_id = _id;
  if _action = 'arrive' then
    if r.status <> 'confirmed' then return jsonb_build_object('ok', false, 'error', 'invalid_transition'); end if;
    update public.reservations set status = 'arrived' where id = _id;
  elsif _action = 'seat' then
    if r.status not in ('confirmed','arrived') then return jsonb_build_object('ok', false, 'error', 'invalid_transition'); end if;
    perform 1 from public.dining_tables order by id for update;
    s := least(r.starts_at, now());
    if _table is not null and not (_table = any(coalesce(tids, '{}'))) then
      if (select status from public.dining_tables where id = _table) <> 'empty' then return jsonb_build_object('ok', false, 'error', 'table_not_empty'); end if;
      opt := public._find_option(greatest(r.starts_at, now()), r.party_size, _id, false, _table);
      if opt is null then return jsonb_build_object('ok', false, 'error', 'table_conflict'); end if;
      delete from public.reservation_tables where reservation_id = _id;
      insert into public.reservation_tables(reservation_id, table_id, block)
      select _id, x, tstzrange(s, greatest(r.ends_at, now() + make_interval(mins => st.dining_min)) + make_interval(mins => st.buffer_min)) from unnest(opt) x;
      tids := opt;
    else
      if exists (select 1 from public.dining_tables where id = any(tids) and status in ('occupied','unavailable')) then
        return jsonb_build_object('ok', false, 'error', 'table_not_empty');
      end if;
    end if;
    update public.reservations set status = 'seated', seated_at = now() where id = _id;
    update public.dining_tables set status = 'occupied', status_changed_at = now() where id = any(tids);
  elsif _action = 'depart' then
    if r.status <> 'seated' then return jsonb_build_object('ok', false, 'error', 'invalid_transition'); end if;
    update public.reservations set status = 'completed', departed_at = now() where id = _id;
    update public.dining_tables set status = 'cleaning', status_changed_at = now() where id = any(tids);
  elsif _action = 'cancel' then
    if r.status not in ('held','confirmed','arrived') then return jsonb_build_object('ok', false, 'error', 'invalid_transition'); end if;
    update public.reservations set status = 'cancelled' where id = _id;
  elsif _action = 'no_show' then
    if r.status not in ('confirmed','arrived') then return jsonb_build_object('ok', false, 'error', 'invalid_transition'); end if;
    update public.reservations set status = 'no_show' where id = _id;
  else
    return jsonb_build_object('ok', false, 'error', 'unknown_action');
  end if;
  perform public._audit('reservation_' || _action, _id, _table, jsonb_build_object('from', r.status));
  return public._booking_json(_id);
end $$;

create or replace function public.staff_move_reservation(_id uuid, _start timestamptz, _party int, _table uuid default null)
returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare r record; st record; opt uuid[];
begin
  perform public._require_staff();
  select * into st from public.restaurant_settings where id = 1;
  select * into r from public.reservations where id = _id for update;
  if not found or r.status not in ('confirmed','arrived') then return jsonb_build_object('ok', false, 'error', 'not_changeable'); end if;
  if _start <= now() - interval '30 minutes' then return jsonb_build_object('ok', false, 'error', 'past'); end if;
  perform public._release_expired();
  perform 1 from public.dining_tables order by id for update;
  opt := public._find_option(_start, _party, _id, false, _table);
  if opt is null then return jsonb_build_object('ok', false, 'error', 'unavailable', 'alternatives', public._alternatives(_start, _party)); end if;
  delete from public.reservation_tables where reservation_id = _id;
  insert into public.reservation_tables(reservation_id, table_id, block)
  select _id, x, tstzrange(_start, _start + make_interval(mins => st.dining_min + st.buffer_min)) from unnest(opt) x;
  update public.reservations set starts_at = _start, ends_at = _start + make_interval(mins => st.dining_min), party_size = _party where id = _id;
  perform public._audit('reservation_moved', _id, opt[1], jsonb_build_object('from', r.starts_at, 'to', _start, 'party', _party));
  return public._booking_json(_id);
end $$;

create or replace function public.staff_set_table_status(_table uuid, _status public.table_status)
returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare t record;
begin
  perform public._require_staff();
  select * into t from public.dining_tables where id = _table for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if t.status = 'occupied' and _status <> 'occupied' and exists (
    select 1 from public.reservation_tables rt join public.reservations r on r.id = rt.reservation_id
    where rt.table_id = _table and rt.active and r.status = 'seated') then
    return jsonb_build_object('ok', false, 'error', 'party_seated');
  end if;
  update public.dining_tables set status = _status, status_changed_at = now() where id = _table;
  perform public._audit('table_' || _status::text, null, _table, jsonb_build_object('from', t.status));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_grant_staff(_email text, _role public.app_role default 'staff')
returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare uid uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admin access required' using errcode = '42501'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(_email));
  if uid is null then return jsonb_build_object('ok', false, 'error', 'no_account'); end if;
  insert into public.user_roles(user_id, role, email) values (uid, _role, lower(trim(_email))) on conflict do nothing;
  perform public._audit('staff_granted', null, null, jsonb_build_object('email', _email, 'role', _role));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_revoke_staff(_role_id uuid)
returns jsonb language plpgsql volatile security definer set search_path=public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admin access required' using errcode = '42501'; end if;
  delete from public.user_roles where id = _role_id and user_id <> auth.uid();
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public._audit(text, uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public._release_expired() from public, anon, authenticated;

-- REALTIME
alter publication supabase_realtime add table public.dining_tables;
alter publication supabase_realtime add table public.availability_pulse;
alter publication supabase_realtime add table public.reservations;
alter publication supabase_realtime add table public.waitlist;

-- DEMO SEED (illustrative)
insert into public.restaurant_settings(id) values (1);
insert into public.dining_tables(label, capacity, min_party, area, pos_x, pos_y, shape, sort) values
 ('T1', 2, 1, 'Window', 8, 12, 'round', 1),
 ('T2', 2, 1, 'Window', 8, 40, 'round', 2),
 ('T3', 2, 1, 'Window', 8, 68, 'round', 3),
 ('T4', 4, 2, 'Main hall', 34, 12, 'square', 4),
 ('T5', 4, 2, 'Main hall', 34, 40, 'square', 5),
 ('T6', 4, 2, 'Main hall', 34, 68, 'square', 6),
 ('T7', 4, 2, 'Main hall', 58, 12, 'square', 7),
 ('T8', 4, 2, 'Main hall', 58, 40, 'square', 8),
 ('T9', 6, 3, 'Main hall', 58, 68, 'rect', 9),
 ('T10', 6, 3, 'Family', 82, 18, 'rect', 10),
 ('T11', 8, 4, 'Family', 82, 50, 'rect', 11),
 ('T12', 2, 1, 'Bar', 82, 80, 'round', 12);
insert into public.table_combos(name, table_ids, min_party, capacity)
select 'T7 + T8', array[(select id from public.dining_tables where label='T7'), (select id from public.dining_tables where label='T8')], 6, 8
union all
select 'T10 + T11', array[(select id from public.dining_tables where label='T10'), (select id from public.dining_tables where label='T11')], 9, 14;
