# Datenmodell & Datenbank-Entscheidung

Phase 5b des Projekt-Setups. Leitfrage: *Was muss heute wirklich in eine Cloud-Datenbank, und was kann/soll lokal auf dem Gerät bleiben?* PreGame ist im Kern ein Pass-the-Phone-Spiel — eine Gruppe, ein Gerät. Der größte Teil der Spieldaten muss die Cloud nie sehen.

**Kurzfassung:** Eine Cloud-DB (Supabase) ist bereits eingerichtet und in Betrieb — das ist keine offene Entscheidung mehr, sondern gebauter Code (`src/ranking/`, `supabase/`). Diese Phase hat deshalb nicht "brauchen wir überhaupt eine Cloud-DB" neu entschieden, sondern **nachträglich geprüft, ob der Umfang dessen, was dort landet, dem Minimalprinzip entspricht** — mit einem klaren Ergebnis: **ja, mit einer Ausnahme, die dokumentiert werden musste** (siehe unten, Google-Opt-in).

## Datenbestandsaufnahme

| Datenkategorie | Wo | Geprüft anhand | Begründung |
|---|---|---|---|
| Namen der Mitspieler der aktuellen Runde, Scores, Schlucke | **Nur lokal** — `state.players` (In-Memory, `saufapp.html:6848`) | Code gelesen: `reportCommunitySession()` (`saufapp.html:7485`) übergibt die volle Spielerliste an `PreGameRanking.reportSession()`, aber `computeSessionPoints()` in `src/ranking/index.js` extrahiert daraus nur die Punkte **des eingeloggten Nutzers selbst** (Nickname-Match) — das an Supabase gesendete Event enthält `{client_event_id, game_key, points, won, duration_sec}`, **keine Namen**. | Mitspieler haben die App nicht installiert, nie eingewilligt. Bestätigt: verlässt das Gerät nicht. |
| Gerätelokale Bestenliste (Schlucke/Siege/Runden pro Name, dauerhaft) | **Nur lokal** — `localStorage['saufapp_leaderboard']` (`saufapp.html:7463`) | Code gelesen, Kommentar im Code selbst: "kein Backend/Accounts" | Genau das richtige Muster — Party-Statistik ohne Cloud-Bezug. |
| Einstellungen (Theme, Sprache, Lautstärke, Stimme, optionaler Google-API-Key) | **Nur lokal** — `localStorage`/`SecureStorage` | Code gelesen | Kein Cloud-Bezug nötig, rein geräteseitige Präferenz. |
| Account: E-Mail, Nickname, Abo-Status (**noch nicht gebaut**) | **Cloud (Supabase Auth + `profiles`)** | `supabase/migrations/20260101000000_initial_schema.sql` | Muss geräteübergreifend/wiederherstellbar sein — aber nur für Nutzer, die sich aktiv registrieren. |
| Eigene Punkte/Siege/gespielte Runden (aggregiert, monatlich) | **Cloud (`score_events`, `monthly_scores`)** | dito | Nötig für Ranking. Enthält keine Mitspieler-Namen (siehe oben). |
| Gruppen (Name, Invite-Code, Mitgliedschaft) | **Cloud (`groups`, `group_members`)** | dito | Nur registrierte Nutzer, die sich aktiv einer Gruppe anschließen. |
| Monatssieger (Nickname, Punkte) | **Cloud (`month_winners`, `month_closures`)** | dito | Öffentlich sichtbar per Design (Ranking-Feature), nur für registrierte, eingewilligte Nutzer. |

### Finding: Ein Datenfluss, der bei dieser Prüfung neu aufgefallen ist

Zwei Stellen im Code senden Daten **direkt vom Client an Google**, ohne über Supabase/PreGame-Backend zu laufen — beide nur aktiv, wenn die Nutzerin/der Nutzer freiwillig einen eigenen Google-API-Key in den Einstellungen hinterlegt:

1. **Google Cloud Text-to-Speech** (`saufapp.html:5848`): Der komplette gesprochene Ansage-Text wird an Google gesendet. Dieser Text **kann Mitspieler-Namen enthalten** (z. B. "Alice ist an der Reihe").
2. **Google Gemini** (`saufapp.html:13085`, Vokabel-Spiel `judgeWithGemini`): Die frei eingegebenen Rate-Texte aller Mitspieler werden an Gemini gesendet, um sie nach Bedeutungsnähe zu sortieren.

**Einordnung:** Kein `CRITICAL`-Fund im Sinne "Daten laufen unkontrolliert über einen PreGame-Server" — es ist ein Direktaufruf mit dem eigenen Schlüssel der Nutzerin/des Nutzers, ohne PreGame-Zwischenstation, und beide Features sind ohne Key voll spielbar (automatischer Fallback auf geräteeigenes TTS bzw. lokale Wort-Übereinstimmung). Trotzdem: **das ist ein echter Datenfluss zu einem Drittanbieter, der in die Datenschutzerklärung und ins Auftragsverarbeiter-Verzeichnis gehört**, sobald diese Option aktiv genutzt wird — wird in `AUDIT.md` (Phase 9) und `INFRASTRUCTURE.md` (Phase 6, Auftragsverarbeiter-Liste) mitgeführt, nicht hier abschließend bewertet.

### Was (noch) fehlt und deshalb hier nicht bewertet werden kann

**Abo-Status/Premium existiert im Code aktuell nicht** — "Premium" ist bisher nur der Name eines visuellen Themes ("Clean Premium"), keine echte Kauf-/Freischalt-Logik, kein IAP, kein Werbe-SDK. Die in `CLAUDE.md` festgehaltene Regel ("Abo-Status niemals nur im Client, serverseitige Receipt-Validierung") ist damit ein **Vorgriff für den Tag, an dem das gebaut wird** — kein aktueller Fund, weil es schlicht noch nichts zu validieren gibt. Wichtig, das jetzt schon festzuhalten, damit es beim Bauen nicht vergessen wird.

## Row Level Security — von Anfang an, nicht nachträglich

Geprüft: In `supabase/migrations/20260101000000_initial_schema.sql` folgt auf **jedes** `create table` unmittelbar `alter table ... enable row level security` plus die zugehörigen Policies — nicht "erst Tabellen, RLS später". Das entspricht bereits der Vorgabe. Eine vollständige Policy-für-Policy-Bewertung (ist jede Policy auch *korrekt*, nicht nur *vorhanden*) ist Teil von `AUDIT.md` (Phase 9).

## Migrations-Setup (heute eingerichtet)

**Vorher:** `supabase/schema.sql` + `supabase/cron_close_month.sql` waren Copy-Paste-Skripte für den SQL-Editor — Schema-Änderungen wären nicht versioniert und für einen Außenstehenden (Madalin) nicht nachvollziehbar gewesen.

**Jetzt:** Beide Dateien liegen versioniert unter `supabase/migrations/`:
- `20260101000000_initial_schema.sql` (vormals `schema.sql`)
- `20260101000001_cron_close_month.sql` (vormals `cron_close_month.sql`)
- `20260903000000_fix_close_month_overload.sql` — **neue Migration**, kein nachträgliches Umschreiben der History

**Fund dabei:** `initial_schema.sql` definiert `close_month(p_year_month text)` (1 Parameter). `cron_close_month.sql` definiert per `create or replace function` `close_month(p_year_month text, p_source text)` (2 Parameter). In Postgres ersetzt `create or replace function` eine Funktion nur bei **identischer** Parameterliste — bei unterschiedlicher Parameterzahl entsteht eine **zweite, überladene** Funktion. Die alte 1-Parameter-Version blieb als Altlast in der Datenbank liegen, wird von nichts mehr aufgerufen und ist reine Verwechslungsgefahr (kein Sicherheitsproblem). Die neue Migration räumt das mit `drop function if exists public.close_month(text);` auf.

### Was ihr jetzt einmalig tun müsst (braucht euren Supabase-Login, kann ich nicht remote)

```bash
npm install -g supabase          # Supabase CLI
supabase login
supabase init                    # erzeugt supabase/config.toml (bewusst nicht von mir erzeugt,
                                  # damit es zur echten CLI-Version passt statt geraten zu sein)
supabase link --project-ref uhsidpjaikqtfcohvwcl

# Die ersten beiden Migrationen wurden bereits live gegen das Projekt ausgeführt (das war
# der bisherige "SQL-Editor"-Workflow) - sie dürfen nicht nochmal ausgeführt werden (einige
# "create policy"-Statements sind nicht wiederholbar). Stattdessen als bereits angewendet
# markieren:
supabase migration repair --status applied 20260101000000 20260101000001

# Die neue Aufraeum-Migration ist noch NICHT live - die jetzt wirklich anwenden:
supabase db push
```

**Ab jetzt für jede künftige Schema-Änderung:**
```bash
supabase migration new <kurzbeschreibung>
# SQL in die neu erzeugte Datei unter supabase/migrations/ schreiben
supabase db push
```

Kein Copy-Paste in den Web-SQL-Editor mehr — jede Änderung ist ab sofort eine Datei im Repo, review-bar wie jeder andere Code.

## Backup-Strategie (offen — braucht euren Supabase-Dashboard-Zugriff)

Kann ich nicht von hier aus einrichten oder prüfen (kein Zugriff auf euer Supabase-Dashboard). **Zu tun:**
1. Prüfen, welcher Tarif aktiv ist — Free-Tier hat nur tägliche Backups mit kurzer Aufbewahrung, Pro-Tier bietet Point-in-Time-Recovery.
2. Einmal einen echten Restore-Test durchführen (z. B. in ein Schatten-/Test-Projekt) und das Ergebnis hier oder in `INFRASTRUCTURE.md` festhalten. **Ein ungetestetes Backup zählt nicht als Backup.**

## AVV mit Supabase

Noch nicht abgeschlossen (braucht euren Supabase-Account). Wird zentral in `INFRASTRUCTURE.md` (Phase 6, Auftragsverarbeiter-Liste) zusammen mit allen anderen externen Diensten (inkl. des Google-Opt-in-Flusses oben) getrackt, nicht doppelt hier.

## Ehrlicher Vorbehalt: Data Residency vs. Data Sovereignty

Supabase ist ein US-Unternehmen (Delaware). Die Region Frankfurt (`eu-central-1`) — **bitte im Dashboard verifizieren, dass das Projekt wirklich dort läuft und nicht in der allgemeinen "Europe"-Gruppierung (kann London/Zürich sein, beide nicht EU)** — löst *Data Residency*, aber nicht *Data Sovereignty*: unter dem US CLOUD Act bleibt theoretisch ein Zugriffsrisiko, das sich vertraglich nicht wegverhandeln lässt. Für eine Party-App mit Nickname/E-Mail/Spielstatistiken ist das vertretbar; für sensiblere Daten wäre es das nicht. Bewusst hier festgehalten, nicht stillschweigend hingenommen.
