-- Audit-Runde 2, TODO.md Fund A-5 (= A2 + B6 aus AUDIT-2.md): Es gab bisher keine
-- Möglichkeit, eine Community-Gruppe wieder zu verlassen -- weder App noch Server --
-- und der Einladungscode hatte mit "PRE-" + 4 Hex-Zeichen nur 65.536 mögliche Werte,
-- ohne jede Bremse auf join_group(). Drei zusammengehörige Fixes:
--   1. Einladungscode auf 8 Hex-Zeichen verlängert (16^8 ≈ 4,3 Mrd. statt 65.536
--      Kombinationen) -- macht sowohl Erraten praktisch aussichtslos als auch das in
--      AUDIT-2.md genannte Endlosschleifen-Risiko bei erschöpftem Codevorrat hinfällig.
--      Bereits existierende (kürzere) Codes bleiben gültig, nur neu erzeugte sind länger.
--   2. Rate-Limit auf join_group() nach demselben Muster wie submit_session_score()
--      (max. 20 Versuche/Stunde) -- verhindert automatisiertes Durchprobieren.
--   3. Neue leave_group()-RPC: entfernt nur die eigene Mitgliedschaft, serverseitig an
--      auth.uid() gebunden (niemand kann jemand anderen entfernen). Wird die Gruppe
--      dadurch leer, wird sie gleich mit aufgeräumt (Datenminimierung, CLAUDE.md Regel 6)
--      statt als verwaiste Karteileiche mit gültigem Einladungscode liegenzubleiben.

create or replace function public.create_group(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  code text;
  gid uuid;
  gname text := trim(p_name);
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if char_length(gname) < 2 or char_length(gname) > 40 then
    raise exception 'invalid group name';
  end if;

  loop
    code := 'PRE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.groups where invite_code = code);
  end loop;

  insert into public.groups (name, invite_code, created_by)
  values (gname, code, uid)
  returning id into gid;

  insert into public.group_members (group_id, user_id) values (gid, uid);

  return jsonb_build_object('id', gid, 'name', gname, 'invite_code', code);
end;
$$;

revoke all on function public.create_group(text) from public;
grant execute on function public.create_group(text) to authenticated;

create or replace function public.join_group(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  code text := upper(trim(p_code));
  g public.groups;
  recent int;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  -- Gleiches Rate-Limit-Muster wie submit_session_score(): verhindert, dass ein
  -- einzelnes Konto den (wenn auch jetzt viel groesseren) Code-Raum automatisiert
  -- durchprobiert.
  select count(*) into recent
  from public.group_members
  where user_id = uid and joined_at > now() - interval '1 hour';

  if recent >= 20 then
    raise exception 'rate limit';
  end if;

  select * into g from public.groups where invite_code = code;
  if g.id is null then raise exception 'invalid code'; end if;

  insert into public.group_members (group_id, user_id)
  values (g.id, uid)
  on conflict do nothing;

  return jsonb_build_object('id', g.id, 'name', g.name, 'invite_code', g.invite_code);
end;
$$;

revoke all on function public.join_group(text) from public;
grant execute on function public.join_group(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Neu: Gruppe verlassen
-- ---------------------------------------------------------------------------
create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  remaining int;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  delete from public.group_members
  where group_id = p_group_id and user_id = uid;

  -- Letztes Mitglied ausgetreten -> Gruppe (inkl. Einladungscode) gleich mit entfernen,
  -- statt eine leere, aber weiterhin beitretbare Gruppe liegen zu lassen.
  select count(*) into remaining from public.group_members where group_id = p_group_id;
  if remaining = 0 then
    delete from public.groups where id = p_group_id;
  end if;
end;
$$;

revoke all on function public.leave_group(uuid) from public;
grant execute on function public.leave_group(uuid) to authenticated;
