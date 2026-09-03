-- DSGVO Art. 15 (Auskunft) + Art. 17 (Löschung) - Phase 5 des Setups.
--
-- Vorher gab es in der App keine Möglichkeit, das eigene Konto wirklich zu löschen oder
-- die eigenen Daten auszulesen - beides ist Pflicht (siehe AUDIT.md/DATA-MODEL.md).

-- ---------------------------------------------------------------------------
-- Bugfix, gefunden beim Bauen von delete_my_account(): groups.created_by hatte
-- "on delete cascade" auf auth.users. Loescht sich die Erstellerin/der Ersteller
-- einer Gruppe selbst, wuerde das bisher automatisch die GANZE GRUPPE fuer ALLE
-- anderen Mitglieder mitloeschen (groups -> cascade -> group_members). Das ist ein
-- unerwarteter Seiteneffekt einer eigentlich rein individuellen Handlung und wird
-- hier korrigiert: die Gruppe bleibt fuer die verbleibenden Mitglieder erhalten,
-- nur der Ersteller-Verweis wird auf NULL gesetzt.
-- ---------------------------------------------------------------------------
do $$
declare
  fk_name text;
begin
  select conname into fk_name
  from pg_constraint
  where conrelid = 'public.groups'::regclass
    and confrelid = 'auth.users'::regclass
    and contype = 'f';
  if fk_name is not null then
    execute format('alter table public.groups drop constraint %I', fk_name);
  end if;
end $$;

alter table public.groups alter column created_by drop not null;

alter table public.groups
  add constraint groups_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Art. 15: Datenauskunft - alle Daten der eingeloggten Person als JSON
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
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.export_my_data() from public;
grant execute on function public.export_my_data() to authenticated;

-- ---------------------------------------------------------------------------
-- Art. 17: Löschung - löscht das komplette Konto inkl. aller abhängigen Daten.
-- Loescht den auth.users-Eintrag; profiles/score_events/monthly_scores/group_members
-- verschwinden automatisch ueber die bestehenden "on delete cascade"-Fremdschluessel.
-- Von der Person selbst erstellte Gruppen bleiben jetzt (siehe Fix oben) fuer die
-- anderen Mitglieder erhalten, nur der Ersteller-Verweis wird NULL.
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

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
