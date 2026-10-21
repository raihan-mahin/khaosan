create or replace function public.get_public_tables(_start timestamptz default null, _party int default 2)
returns table(id uuid, label text, capacity int, min_party int, area text, pos_x int, pos_y int, shape text,
              status public.table_status, status_changed_at timestamptz, next_reserved_at timestamptz,
              held boolean, fits boolean, free_for_visit boolean)
language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
declare st record; s timestamptz; e timestamptz;
begin
  select * into st from public.restaurant_settings rs where rs.id = 1;
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