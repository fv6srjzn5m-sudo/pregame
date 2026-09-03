-- =============================================================================
-- PreGame: automatischer Monatsabschluss (pg_cron)
-- =============================================================================
-- VOR DEM AUSFÜHREN: Cron-Zeiten unten gegenprüfen (siehe Kommentar "CRON").
--
-- Dashboard-Schritte (einmalig, kann der Agent nicht remote):
-- 1) Supabase → Database → Extensions → "pg_cron" aktivieren (Enable)
-- 2) Falls vorhanden: auch unter Integrations / Cron Jobs prüfen
-- 3) Dieses Script im SQL Editor ausführen (als postgres / SQL-Editor)
-- 4) Kontrolle: select * from cron.job;
--
-- CRON (pg_cron läuft in UTC; 5-Felder: Min Stunde Tag Monat Wochentag)
-- -----------------------------------------------------------------------------
-- Job A  '59 21 * * *'  → täglich 21:59 UTC = 23:59 Europe/Berlin in der
--                          Sommerzeit (CEST, UTC+2). Die Funktion prüft, ob
--                          in Berlin wirklich Monatsletzter ist.
-- Job B  '59 22 * * *'  → täglich 22:59 UTC = 23:59 Europe/Berlin in der
--                          Winterzeit (CET, UTC+1).
-- Job C  '15 0 * * *'   → täglich 00:15 UTC = Catch-up, falls ein Lauf
--                          ausfiel (schließt überfällige Monate nach).
--
-- Warum nicht "nur am Monatsletzten"? Klassisches cron kann "letzter Tag
-- des Monats" nicht zuverlässig. Deshalb täglich + Gate in der Funktion.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Logging / Protokoll
-- ---------------------------------------------------------------------------
create table if not exists public.month_close_runs (
  id uuid primary key default gen_random_uuid(),
  year_month text not null,
  triggered_at timestamptz not null default now(),
  trigger_source text not null default 'cron',
  success boolean not null default false,
  already_closed boolean not null default false,
  empty_month boolean not null default false,
  skipped boolean not null default false,
  skip_reason text,
  winner_user_id uuid,
  winner_nickname text,
  winner_points int,
  details jsonb not null default '{}'::jsonb
);

create index if not exists month_close_runs_triggered_idx
  on public.month_close_runs (triggered_at desc);

create index if not exists month_close_runs_month_idx
  on public.month_close_runs (year_month, triggered_at desc);

alter table public.month_close_runs enable row level security;

drop policy if exists "month_close_runs_select_all" on public.month_close_runs;
create policy "month_close_runs_select_all"
  on public.month_close_runs for select
  using (true);

-- Marker: Monat wurde finalisiert (auch wenn niemand Punkte hatte)
create table if not exists public.month_closures (
  year_month text primary key,
  closed_at timestamptz not null default now(),
  empty_month boolean not null default false,
  winner_user_id uuid,
  winner_nickname text,
  winner_points int
);

alter table public.month_closures enable row level security;

drop policy if exists "month_closures_select_all" on public.month_closures;
create policy "month_closures_select_all"
  on public.month_closures for select
  using (true);

-- Bestehende Sieger nachziehen (falls Schema schon lief)
insert into public.month_closures (year_month, closed_at, empty_month, winner_user_id, winner_nickname, winner_points)
select mw.year_month, mw.closed_at, false, mw.user_id, mw.nickname, mw.points
from public.month_winners mw
on conflict (year_month) do nothing;

-- ---------------------------------------------------------------------------
-- close_month: idempotent + Advisory-Lock + Logging
-- ---------------------------------------------------------------------------
create or replace function public.close_month(
  p_year_month text default null,
  p_source text default 'manual'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ym text;
  winner record;
  result jsonb;
  src text := coalesce(nullif(trim(p_source), ''), 'manual');
begin
  -- Verhindert parallele Doppel-Läufe (z.B. CET+CEST-Job am gleichen Abend)
  perform pg_advisory_xact_lock(hashtext('pregame_close_month'));

  ym := coalesce(
    nullif(trim(p_year_month), ''),
    to_char((timezone('Europe/Berlin', now()) - interval '1 month'), 'YYYY-MM')
  );

  if exists (select 1 from public.month_closures where year_month = ym) then
    result := jsonb_build_object(
      'ok', true,
      'already_closed', true,
      'year_month', ym,
      'source', src
    );
    insert into public.month_close_runs (
      year_month, trigger_source, success, already_closed, details
    ) values (
      ym, src, true, true, result
    );
    return result;
  end if;

  select ms.user_id, p.nickname, ms.points
  into winner
  from public.monthly_scores ms
  join public.profiles p on p.id = ms.user_id
  where ms.year_month = ym
  order by ms.points desc, ms.wins desc, ms.games_played asc, p.nickname_normalized asc
  limit 1;

  if winner.user_id is null then
    insert into public.month_closures (year_month, empty_month)
    values (ym, true);

    result := jsonb_build_object(
      'ok', true,
      'empty', true,
      'year_month', ym,
      'source', src
    );
    insert into public.month_close_runs (
      year_month, trigger_source, success, empty_month, details
    ) values (
      ym, src, true, true, result
    );
    return result;
  end if;

  insert into public.month_closures (
    year_month, empty_month, winner_user_id, winner_nickname, winner_points
  ) values (
    ym, false, winner.user_id, winner.nickname, winner.points
  );

  insert into public.month_winners (year_month, user_id, nickname, points)
  values (ym, winner.user_id, winner.nickname, winner.points)
  on conflict (year_month) do nothing;

  result := jsonb_build_object(
    'ok', true,
    'year_month', ym,
    'nickname', winner.nickname,
    'points', winner.points,
    'user_id', winner.user_id,
    'source', src
  );

  insert into public.month_close_runs (
    year_month, trigger_source, success, already_closed, empty_month,
    winner_user_id, winner_nickname, winner_points, details
  ) values (
    ym, src, true, false, false,
    winner.user_id, winner.nickname, winner.points, result
  );

  return result;
exception
  when others then
    insert into public.month_close_runs (
      year_month, trigger_source, success, skipped, skip_reason, details
    ) values (
      coalesce(ym, 'unknown'), src, false, true, SQLERRM,
      jsonb_build_object('sqlstate', SQLSTATE)
    );
    raise;
end;
$$;

-- Abwärtskompatibel: alter 1-Argument-Aufruf bleibt gültig
-- (Default p_source = 'manual')

-- ---------------------------------------------------------------------------
-- Cron-Wrapper: schließt fällige Monate (Berlin-Zeit)
-- ---------------------------------------------------------------------------
create or replace function public.close_month_cron()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  berlin timestamp := timezone('Europe/Berlin', now());
  berlin_date date := berlin::date;
  berlin_hour int := extract(hour from berlin)::int;
  berlin_min int := extract(minute from berlin)::int;
  last_day date := (date_trunc('month', berlin) + interval '1 month - 1 day')::date;
  current_ym text := to_char(berlin, 'YYYY-MM');
  prev_ym text := to_char(berlin - interval '1 month', 'YYYY-MM');
  actions jsonb := '[]'::jsonb;
  r jsonb;
  did_eom boolean := false;
begin
  perform pg_advisory_xact_lock(hashtext('pregame_close_month_cron'));

  -- 1) Monatsende 23:59 Berlin: aktuellen Monat abschließen
  if berlin_date = last_day and berlin_hour = 23 and berlin_min >= 59 then
    did_eom := true;
    r := public.close_month(current_ym, 'cron_eom');
    actions := actions || jsonb_build_array(r);
  end if;

  -- 2) Catch-up: jeder bereits abgelaufene Monat (prev und älter), der noch offen ist
  --    (z.B. Job verpasst, Outage, DST-Verwechslung)
  if not exists (select 1 from public.month_closures where year_month = prev_ym) then
    -- Nur closen, wenn der Vormonat wirklich vorbei ist (immer true außer Sekunde 0 des 1.)
    -- Am 1. des Monats nach Mitternacht Berlin ist prev_ym der abgeschlossene Monat.
    if berlin_date >= (date_trunc('month', berlin))::date then
      r := public.close_month(prev_ym, case when did_eom then 'cron_eom_prev' else 'cron_catchup' end);
      actions := actions || jsonb_build_array(r);
    end if;
  end if;

  -- Nichts zu tun → trotzdem kurzer Log (nur wenn wirklich idle), max. 1 Idle-Log / Tag
  if jsonb_array_length(actions) = 0 then
    if not exists (
      select 1 from public.month_close_runs
      where trigger_source = 'cron_idle'
        and triggered_at > now() - interval '20 hours'
    ) then
      insert into public.month_close_runs (
        year_month, trigger_source, success, skipped, skip_reason, details
      ) values (
        current_ym, 'cron_idle', true, true, 'not due',
        jsonb_build_object(
          'berlin', berlin,
          'last_day', last_day,
          'hour', berlin_hour,
          'minute', berlin_min
        )
      );
    end if;
    return jsonb_build_object('ok', true, 'actions', actions, 'due', false);
  end if;

  return jsonb_build_object('ok', true, 'actions', actions, 'due', true);
end;
$$;

revoke all on function public.close_month(text, text) from public;
revoke all on function public.close_month_cron() from public;
-- Kein Grant an authenticated/anon – nur SQL-Editor / cron (superuser)

-- ---------------------------------------------------------------------------
-- pg_cron Jobs einrichten
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

-- Alte Jobs gleichen Namens entfernen (idempotent neu setzen)
do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname in (
    'pregame-close-month-cest',
    'pregame-close-month-cet',
    'pregame-close-month-catchup'
  );
exception
  when undefined_table then
    raise notice 'cron.job nicht gefunden – Extension pg_cron aktivieren und Script erneut ausführen';
  when undefined_function then
    raise notice 'cron.unschedule fehlt – Extension pg_cron aktivieren und Script erneut ausführen';
end $$;

-- Job A: 23:59 Berlin während CEST (Sommer, UTC+2)
select cron.schedule(
  'pregame-close-month-cest',
  '59 21 * * *',
  $cron$select public.close_month_cron();$cron$
);

-- Job B: 23:59 Berlin während CET (Winter, UTC+1)
select cron.schedule(
  'pregame-close-month-cet',
  '59 22 * * *',
  $cron$select public.close_month_cron();$cron$
);

-- Job C: täglicher Catch-up (UTC 00:15)
select cron.schedule(
  'pregame-close-month-catchup',
  '15 0 * * *',
  $cron$select public.close_month_cron();$cron$
);

-- Übersicht
select jobid, jobname, schedule, command, active
from cron.job
where jobname like 'pregame-close-month%'
order by jobname;
