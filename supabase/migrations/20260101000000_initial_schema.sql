-- PreGame Ranking / Community (Supabase)
--
-- HINWEIS (seit Phase 5b des Setups, DATA-MODEL.md): Dies ist jetzt eine versionierte
-- Migration, kein "per Hand in den SQL-Editor einfuegen"-Skript mehr. Dieser Stand
-- wurde bereits live gegen das Supabase-Projekt ausgefuehrt - beim erstmaligen
-- Umstieg auf die Supabase CLI wird er per "supabase migration repair --status
-- applied" als bereits angewendet markiert, NICHT erneut ausgefuehrt (einige der
-- "create policy"-Statements unten sind nicht idempotent und wuerden bei einem
-- echten Re-Run gegen die bestehende DB fehlschlagen). Alles Neue kommt ab jetzt
-- als eigene Migration via "supabase migration new <name>" dazu - siehe DATA-MODEL.md.
--
-- Ursprüngliche Einrichtungsschritte (Referenz, bereits erledigt):
-- 1) Neues Projekt auf https://supabase.com anlegen
-- 2) Authentication → Providers → Email: für MVP "Confirm email" AUS
-- 3) Project URL + anon key in der App unter Community → Setup speichern
--    (oder in src/ranking/config.js eintragen)
-- 4) npm run cap:sync
-- 5) Monatsende: automatisch via pg_cron (siehe 20260101000001_cron_close_month.sql)
--    Manuell testen: select public.close_month_cron();
--    oder: select public.close_month('2026-08', 'manual'); (2-Parameter-Version,
--    siehe 20260101000001 und die Aufraeum-Migration fuer die alte 1-Parameter-Variante)

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  nickname_normalized text not null,
  created_at timestamptz not null default now(),
  constraint profiles_nickname_len check (char_length(nickname) between 2 and 24),
  constraint profiles_nickname_charset check (nickname ~ '^[A-Za-zÄÖÜäöüß0-9_. -]+$')
);

create unique index if not exists profiles_nickname_normalized_uidx
  on public.profiles (nickname_normalized);

alter table public.profiles enable row level security;

create policy "profiles_select_all"
  on public.profiles for select
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Score events (append-only) + monthly aggregates
-- ---------------------------------------------------------------------------
create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_event_id text not null,
  game_key text not null,
  points int not null check (points >= 0 and points <= 80),
  won boolean not null default false,
  duration_sec int,
  year_month text not null,
  created_at timestamptz not null default now(),
  unique (user_id, client_event_id)
);

create index if not exists score_events_user_month_idx
  on public.score_events (user_id, year_month);

create index if not exists score_events_created_idx
  on public.score_events (created_at desc);

alter table public.score_events enable row level security;

create policy "score_events_select_own"
  on public.score_events for select
  using (auth.uid() = user_id);

-- Inserts nur über RPC (SECURITY DEFINER), daher keine INSERT-Policy für Clients.

create table if not exists public.monthly_scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  year_month text not null,
  points int not null default 0 check (points >= 0),
  games_played int not null default 0 check (games_played >= 0),
  wins int not null default 0 check (wins >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, year_month)
);

create index if not exists monthly_scores_month_points_idx
  on public.monthly_scores (year_month, points desc);

alter table public.monthly_scores enable row level security;

create policy "monthly_scores_select_all"
  on public.monthly_scores for select
  using (true);

create table if not exists public.month_winners (
  year_month text primary key,
  user_id uuid references auth.users (id) on delete set null,
  nickname text not null,
  points int not null,
  closed_at timestamptz not null default now()
);

alter table public.month_winners enable row level security;

create policy "month_winners_select_all"
  on public.month_winners for select
  using (true);

-- ---------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  invite_code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user_idx on public.group_members (user_id);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "groups_select_member"
  on public.groups for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid()
    )
  );

create policy "group_members_select_same_group"
  on public.group_members for select
  using (
    exists (
      select 1 from public.group_members mine
      where mine.group_id = group_members.group_id and mine.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_year_month()
returns text
language sql
stable
as $$
  select to_char((now() at time zone 'Europe/Berlin'), 'YYYY-MM');
$$;

create or replace function public.normalize_nickname(raw text)
returns text
language sql
immutable
as $$
  select lower(trim(regexp_replace(coalesce(raw, ''), '\s+', ' ', 'g')));
$$;

-- Auto-profile hook optional: clients create profile after signup via ensure_profile RPC.

create or replace function public.ensure_profile(p_nickname text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  nick text := trim(p_nickname);
  norm text;
  row public.profiles;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if char_length(nick) < 2 or char_length(nick) > 24 then
    raise exception 'invalid nickname length';
  end if;
  norm := public.normalize_nickname(nick);
  if norm = '' then
    raise exception 'invalid nickname';
  end if;

  insert into public.profiles (id, nickname, nickname_normalized)
  values (uid, nick, norm)
  on conflict (id) do update
    set nickname = excluded.nickname,
        nickname_normalized = excluded.nickname_normalized
  returning * into row;

  return row;
exception
  when unique_violation then
    raise exception 'nickname taken';
end;
$$;

revoke all on function public.ensure_profile(text) from public;
grant execute on function public.ensure_profile(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Submit session score (rate-limited, server-side points clamp)
-- ---------------------------------------------------------------------------
create or replace function public.submit_session_score(
  p_client_event_id text,
  p_game_key text,
  p_points int,
  p_won boolean,
  p_duration_sec int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ym text := public.current_year_month();
  pts int := greatest(0, least(coalesce(p_points, 0), 80));
  recent int;
  existing uuid;
  ms public.monthly_scores;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_client_event_id is null or char_length(p_client_event_id) < 8 then
    raise exception 'invalid client_event_id';
  end if;
  if p_game_key is null or char_length(p_game_key) < 2 or char_length(p_game_key) > 40 then
    raise exception 'invalid game_key';
  end if;

  select id into existing
  from public.score_events
  where user_id = uid and client_event_id = p_client_event_id;

  if existing is not null then
    select * into ms from public.monthly_scores where user_id = uid and year_month = ym;
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'year_month', ym,
      'points', coalesce(ms.points, 0),
      'games_played', coalesce(ms.games_played, 0),
      'wins', coalesce(ms.wins, 0)
    );
  end if;

  select count(*) into recent
  from public.score_events
  where user_id = uid and created_at > now() - interval '1 hour';

  if recent >= 20 then
    raise exception 'rate limit';
  end if;

  insert into public.score_events (
    user_id, client_event_id, game_key, points, won, duration_sec, year_month
  ) values (
    uid, p_client_event_id, p_game_key, pts, coalesce(p_won, false), p_duration_sec, ym
  );

  insert into public.monthly_scores (user_id, year_month, points, games_played, wins, updated_at)
  values (
    uid, ym, pts, 1,
    case when coalesce(p_won, false) then 1 else 0 end,
    now()
  )
  on conflict (user_id, year_month) do update
    set points = public.monthly_scores.points + excluded.points,
        games_played = public.monthly_scores.games_played + 1,
        wins = public.monthly_scores.wins + excluded.wins,
        updated_at = now()
  returning * into ms;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'year_month', ym,
    'points', ms.points,
    'games_played', ms.games_played,
    'wins', ms.wins,
    'awarded', pts
  );
end;
$$;

revoke all on function public.submit_session_score(text, text, int, boolean, int) from public;
grant execute on function public.submit_session_score(text, text, int, boolean, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Rankings
-- ---------------------------------------------------------------------------
create or replace function public.get_de_ranking(p_limit int default 50)
returns table (
  rank bigint,
  user_id uuid,
  nickname text,
  points int,
  games_played int,
  wins int,
  year_month text,
  is_me boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with ym as (
    select public.current_year_month() as year_month
  ),
  board as (
    select
      ms.user_id,
      p.nickname,
      ms.points,
      ms.games_played,
      ms.wins,
      ms.year_month,
      rank() over (order by ms.points desc, ms.wins desc, ms.games_played asc, p.nickname_normalized asc) as rank
    from public.monthly_scores ms
    join public.profiles p on p.id = ms.user_id
    join ym on ym.year_month = ms.year_month
  )
  select
    b.rank,
    b.user_id,
    b.nickname,
    b.points,
    b.games_played,
    b.wins,
    b.year_month,
    (b.user_id = auth.uid()) as is_me
  from board b
  where b.rank <= greatest(1, least(coalesce(p_limit, 50), 100))
     or b.user_id = auth.uid()
  order by b.rank asc;
$$;

revoke all on function public.get_de_ranking(int) from public;
grant execute on function public.get_de_ranking(int) to anon, authenticated;

create or replace function public.get_my_month_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'year_month', ms.year_month,
        'points', ms.points,
        'games_played', ms.games_played,
        'wins', ms.wins,
        'rank', (
          select count(*) + 1
          from public.monthly_scores o
          where o.year_month = ms.year_month
            and (
              o.points > ms.points
              or (o.points = ms.points and o.wins > ms.wins)
            )
        )
      )
      from public.monthly_scores ms
      where ms.user_id = auth.uid()
        and ms.year_month = public.current_year_month()
    ),
    jsonb_build_object(
      'year_month', public.current_year_month(),
      'points', 0,
      'games_played', 0,
      'wins', 0,
      'rank', null
    )
  );
$$;

revoke all on function public.get_my_month_stats() from public;
grant execute on function public.get_my_month_stats() to authenticated;

create or replace function public.get_previous_month_winner()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'year_month', mw.year_month,
        'nickname', mw.nickname,
        'points', mw.points
      )
      from public.month_winners mw
      order by mw.year_month desc
      limit 1
    ),
    'null'::jsonb
  );
$$;

revoke all on function public.get_previous_month_winner() from public;
grant execute on function public.get_previous_month_winner() to anon, authenticated;

-- Manuell oder per pg_cron am 1. des Monats aufrufen:
create or replace function public.close_month(p_year_month text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ym text := coalesce(
    p_year_month,
    to_char(((now() at time zone 'Europe/Berlin') - interval '1 month'), 'YYYY-MM')
  );
  winner record;
begin
  if exists (select 1 from public.month_winners where year_month = ym) then
    return jsonb_build_object('ok', true, 'already_closed', true, 'year_month', ym);
  end if;

  select ms.user_id, p.nickname, ms.points
  into winner
  from public.monthly_scores ms
  join public.profiles p on p.id = ms.user_id
  where ms.year_month = ym
  order by ms.points desc, ms.wins desc, ms.games_played asc
  limit 1;

  if winner.user_id is null then
    return jsonb_build_object('ok', true, 'empty', true, 'year_month', ym);
  end if;

  insert into public.month_winners (year_month, user_id, nickname, points)
  values (ym, winner.user_id, winner.nickname, winner.points);

  return jsonb_build_object(
    'ok', true,
    'year_month', ym,
    'nickname', winner.nickname,
    'points', winner.points
  );
end;
$$;

-- close_month absichtlich nur für service_role / Dashboard (kein Grant an authenticated)

-- ---------------------------------------------------------------------------
-- Groups RPCs
-- ---------------------------------------------------------------------------
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
    code := 'PRE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
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
begin
  if uid is null then raise exception 'not authenticated'; end if;

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

create or replace function public.list_my_groups()
returns table (
  id uuid,
  name text,
  invite_code text,
  member_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.name, g.invite_code,
         (select count(*) from public.group_members gm2 where gm2.group_id = g.id) as member_count
  from public.groups g
  join public.group_members gm on gm.group_id = g.id
  where gm.user_id = auth.uid()
  order by g.created_at desc;
$$;

revoke all on function public.list_my_groups() from public;
grant execute on function public.list_my_groups() to authenticated;

create or replace function public.get_group_ranking(p_group_id uuid, p_limit int default 50)
returns table (
  rank bigint,
  user_id uuid,
  nickname text,
  points int,
  games_played int,
  wins int,
  is_me boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with allowed as (
    select exists (
      select 1 from public.group_members
      where group_id = p_group_id and user_id = auth.uid()
    ) as ok
  ),
  board as (
    select
      ms.user_id,
      p.nickname,
      ms.points,
      ms.games_played,
      ms.wins,
      rank() over (order by ms.points desc, ms.wins desc, ms.games_played asc) as rank
    from public.monthly_scores ms
    join public.profiles p on p.id = ms.user_id
    join public.group_members gm on gm.user_id = ms.user_id and gm.group_id = p_group_id
    where ms.year_month = public.current_year_month()
      and (select ok from allowed)
  )
  select
    b.rank, b.user_id, b.nickname, b.points, b.games_played, b.wins,
    (b.user_id = auth.uid()) as is_me
  from board b
  where b.rank <= greatest(1, least(coalesce(p_limit, 50), 100))
     or b.user_id = auth.uid()
  order by b.rank;
$$;

revoke all on function public.get_group_ranking(uuid, int) from public;
grant execute on function public.get_group_ranking(uuid, int) to authenticated;
