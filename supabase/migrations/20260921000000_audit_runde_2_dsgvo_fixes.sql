-- Audit-Runde 2 (zweite, unabhängige Prüfung), Fund A-12 + A-7 + A-8 aus TODO.md /
-- AUDIT-2.md Abschnitt B4/B7. Entscheidung C-1 (21.09.2026): Der Nickname eines
-- Monatssiegers wird nach Kontolöschung anonymisiert statt unverändert stehen zu bleiben.
--
-- Drei Teile, die laut TODO.md bewusst in einer Migration zusammengehören:
--   1. Fehlende Foreign Keys auf winner_user_id nachrüsten (month_close_runs, month_closures)
--   2. Öffentliche Lesbarkeit dieser beiden internen/Protokoll-Tabellen einschränken
--   3. delete_my_account() um Nickname-Anonymisierung erweitern, export_my_data() um
--      die drei Monats-Tabellen ergänzen (Art. 15 war bisher unvollständig)

-- ---------------------------------------------------------------------------
-- 1. Fehlende Foreign Keys nachrüsten
--
-- month_winners.user_id hatte von Anfang an "references auth.users (id) on delete set
-- null" (siehe 20260101000000_initial_schema.sql:104). month_close_runs.winner_user_id
-- und month_closures.winner_user_id wurden strukturell identisch angelegt, aber ohne
-- diese Referenz (20260101000001_cron_close_month.sql:44/68) - vermutlich ein Versehen,
-- keine bewusste Entscheidung. Nachgezogen fuer Konsistenz; loest die Loesch-Zusage
-- an sich noch nicht (siehe Punkt 3), aber ohne FK wuerde selbst die Anonymisierung
-- unten keine zukuenftigen Zeilen erfassen, sobald die user_id einer geloeschten Person
-- gehoert.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.month_close_runs'::regclass
      and contype = 'f'
      and conname = 'month_close_runs_winner_user_id_fkey'
  ) then
    alter table public.month_close_runs
      add constraint month_close_runs_winner_user_id_fkey
      foreign key (winner_user_id) references auth.users (id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.month_closures'::regclass
      and contype = 'f'
      and conname = 'month_closures_winner_user_id_fkey'
  ) then
    alter table public.month_closures
      add constraint month_closures_winner_user_id_fkey
      foreign key (winner_user_id) references auth.users (id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Oeffentliche Lesbarkeit einschraenken
--
-- Beide Tabellen wurden beim Anlegen mit demselben "using (true)"-Muster wie die
-- bewusst oeffentlichen Leaderboard-Tabellen (profiles, monthly_scores, month_winners)
-- versehen - vermutlich Copy-Paste ohne erneute Abwaegung. Anders als dort enthalten
-- sie aber interne Betriebsdaten (skip_reason/SQLERRM, Timing, Cron-Details) und werden
-- vom Client nirgends direkt gelesen (nur ueber security-definer-Funktionen wie
-- close_month(), die RLS ohnehin umgehen) - dafuer braucht es keine Policy.
-- ---------------------------------------------------------------------------
drop policy if exists "month_close_runs_select_all" on public.month_close_runs;
drop policy if exists "month_closures_select_all" on public.month_closures;

-- ---------------------------------------------------------------------------
-- 3. delete_my_account(): Nickname anonymisieren statt nur die user_id zu nullen
--
-- Muss VOR dem "delete from auth.users" passieren - danach wuerde die anschliessende
-- on-delete-set-null-Kaskade die user_id bereits auf NULL gesetzt haben, und diese
-- UPDATE-Statements koennten die betroffenen Zeilen nicht mehr ueber "= uid" finden.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  update public.month_winners set nickname = 'Ehemaliges Mitglied' where user_id = uid;
  update public.month_closures set winner_nickname = 'Ehemaliges Mitglied' where winner_user_id = uid;
  update public.month_close_runs set winner_nickname = 'Ehemaliges Mitglied' where winner_user_id = uid;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. export_my_data(): die drei Monats-Tabellen ergaenzen (Art. 15 war unvollstaendig)
--
-- Wer schon mal Monatssieger war, bekam diese Daten (eigener Sieg, Punkte, Zeitpunkt)
-- beim Auskunfts-Export bisher nicht angezeigt, obwohl sie serverseitig gespeichert sind.
-- ---------------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'email', (select email from auth.users where id = auth.uid()),
    'profile', (
      select jsonb_build_object('nickname', p.nickname, 'created_at', p.created_at)
      from public.profiles p where p.id = auth.uid()
    ),
    'score_events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'game_key', se.game_key, 'points', se.points, 'won', se.won,
        'duration_sec', se.duration_sec, 'year_month', se.year_month,
        'created_at', se.created_at
      ) order by se.created_at)
      from public.score_events se where se.user_id = auth.uid()
    ), '[]'::jsonb),
    'monthly_scores', coalesce((
      select jsonb_agg(jsonb_build_object(
        'year_month', ms.year_month, 'points', ms.points,
        'games_played', ms.games_played, 'wins', ms.wins
      ) order by ms.year_month)
      from public.monthly_scores ms where ms.user_id = auth.uid()
    ), '[]'::jsonb),
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object('name', g.name, 'invite_code', g.invite_code))
      from public.groups g
      join public.group_members gm on gm.group_id = g.id
      where gm.user_id = auth.uid()
    ), '[]'::jsonb),
    'month_winners', coalesce((
      select jsonb_agg(jsonb_build_object(
        'year_month', mw.year_month, 'points', mw.points, 'closed_at', mw.closed_at
      ) order by mw.year_month)
      from public.month_winners mw where mw.user_id = auth.uid()
    ), '[]'::jsonb),
    'month_closures_won', coalesce((
      select jsonb_agg(jsonb_build_object(
        'year_month', mc.year_month, 'winner_points', mc.winner_points, 'closed_at', mc.closed_at
      ) order by mc.year_month)
      from public.month_closures mc where mc.winner_user_id = auth.uid()
    ), '[]'::jsonb),
    'month_close_runs_won', coalesce((
      select jsonb_agg(jsonb_build_object(
        'year_month', mcr.year_month, 'winner_points', mcr.winner_points, 'triggered_at', mcr.triggered_at
      ) order by mcr.triggered_at)
      from public.month_close_runs mcr where mcr.winner_user_id = auth.uid()
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.export_my_data() from public;
grant execute on function public.export_my_data() to authenticated;
