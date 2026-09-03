# Infrastruktur-Bestandsaufnahme

Phase 6 des Projekt-Setups. **Nur Analyse und Dokumentation** — hier wird nichts umgebaut, nur der Ist-Zustand jeder Schicht festgestellt und ein konkreter nächster Schritt vorgeschlagen. Priorisiert, nicht alles gleichzeitig angehen.

**Realistische Priorisierung für dieses Team:** Auth → RLS → Error Tracking → serverseitige Abo-Validierung → Backups → Rate Limiting. Der Rest folgt, wenn es echte Nutzer gibt. Ergebnis dieser Bestandsaufnahme vorweg: **Auth und RLS sind bereits solide**, **Error Tracking ist die größte echte Lücke** — nichts ist eingerichtet, ein Absturz bei einer Nutzerin/einem Nutzer bleibt aktuell komplett unsichtbar.

## 1. Frontend-Foundations

**Ist-Zustand:** Eine Datei (`saufapp.html`, ~13.600 Zeilen), globales `state`-Objekt, IIFE-Modul pro Minispiel, kein Router (ein einziger Screen-Container, Wechsel per `innerHTML`), kein Frontend-Framework. Details: `ARCHITECTURE.md`.

**Bewertung:** Funktioniert für den aktuellen Umfang, ist aber am Limit für "noch mit bloßem Auge wartbar" — 17 Minispiel-Module in einer Datei. Kein akuter Handlungsdruck.

**Nächster Schritt (niedrige Priorität):** Wenn neue große Features dazukommen, über eine Aufteilung in mehrere Dateien nachdenken (z. B. ein Modul pro Spiel als eigene `.js`-Datei, per `<script type="module">` eingebunden) — das würde nebenbei auch ESLint auf den Spiel-Code ausweiten (aktuell nur `src/`, siehe `eslint.config.js`). Kein Rewrite, sondern eine mechanische Aufteilung bei Bedarf.

## 2. APIs & Backend-Logik

**Ist-Zustand:** Kein eigenes Backend (kein Node/Express-Server). Die gesamte serverseitige Logik liegt in Supabase-Postgres-Funktionen (RPC, `security definer`) — siehe `supabase/migrations/`.

**Wo läuft Abo-Validierung?** **Nirgends — es gibt noch keine Abo-Logik.** "Premium" ist aktuell nur ein visuelles Theme, kein Kauf-/Freischalt-Mechanismus (siehe `DATA-MODEL.md`). Das ist kein Fehler, nur ein Fakt: sobald In-App-Käufe gebaut werden, **muss** die Prüfung serverseitig passieren (Apple/Google-Receipt gegen deren Server validieren, z. B. über eine Supabase Edge Function als Proxy — der App-Store-Shared-Secret darf nie in den Client). Client-seitige Prüfung wäre mit minimalem Aufwand umgehbar.

**Nächster Schritt:** Kein Handlungsbedarf, bis IAP gebaut wird — dann ist das der erste Schritt, nicht ein Nachgedanke.

## 3. Datenbank & Storage

**Ist-Zustand:** Supabase Postgres, Schema jetzt versioniert unter `supabase/migrations/` (Phase 5b). Kein Supabase-Storage-Bucket in Benutzung (keine Datei-Uploads, keine Avatare — geprüft, keine `storage.from(...)`-Aufrufe im Code).

**Backups:** **Ungeprüft.** Braucht Zugriff auf euer Supabase-Dashboard (siehe `DATA-MODEL.md`) — welcher Tarif, welche Aufbewahrungsdauer, und ein echter Restore-Test. Bis das gemacht ist: **kein verlässliches Backup vorhanden**, unabhängig davon, was Supabase im Hintergrund automatisch tut.

**Nächster Schritt (mittlere Priorität, braucht euch):** Dashboard prüfen, einmal Restore testen, Ergebnis hier nachtragen.

## 4. Auth & Permissions

**Ist-Zustand:** Supabase Auth (E-Mail/Passwort), kein selbstgebautes Auth-System. Das ist bereits die richtige Entscheidung — selbstgebaute Auth ist laut Vorgabe die häufigste Sicherheitslücke bei Erstprojekten, hier nicht passiert.

**Was ungeprüft bleibt:** Passwort-Mindestanforderungen und Rate-Limiting auf Login/Registrierung/Passwort-Reset laufen über Supabase-Standardeinstellungen — ich habe nicht verifiziert, welche das in eurem Projekt konkret sind (braucht Dashboard-Zugriff: Authentication → Policies/Rate Limits). Wird in `AUDIT.md` (Phase 9) konkret geprüft, hier nur als offener Punkt vermerkt.

**Nächster Schritt (niedrig, aber einfach):** Einmal kurz im Dashboard nachsehen, ob die Standard-Rate-Limits aktiv sind (sie sind es normalerweise per Default) — reicht für den MVP.

## 5. Hosting & Deployment

**Ist-Zustand:** Es gibt kein separates Hosting für ein Backend — Supabase ist vollständig managed. Die Web-Version (`www/`) wird nicht öffentlich gehostet, sondern nur als Zwischenschritt für den nativen Capacitor-Build genutzt (kein PWA-Deployment aktuell).

**Fund — real und mit Priorität:** **Es gibt nur ein Supabase-Projekt, das für alles genutzt wird** (`uhsidpjaikqtfcohvwcl`) — keine Trennung zwischen Dev/Staging/Prod. Das heißt: Jeder lokale Test während der Entwicklung läuft aktuell gegen dieselbe Datenbank, die (sobald es echte Nutzer gibt) auch deren Daten enthält. Das widerspricht der Vorgabe "auf keinen Fall mit Produktionsdaten testen".

**Nächster Schritt (mittlere Priorität, vor dem ersten echten Nutzer-Launch wichtig):** Ein zweites Supabase-Projekt für Dev/Staging anlegen, eigene URL/Key in `src/ranking/config.js` (oder besser: als Build-Variable statt hartcodiert, siehe Fund unten) für lokale Entwicklung nutzen. Muss nicht sofort passieren, aber definitiv vor dem ersten Release mit echten Nutzern.

**Kleiner Nebenfund:** `src/ranking/config.js` hat die Supabase-URL/-Key fest im Code — für einen einzigen Umgebungsstand okay (und der Key ist ja ohnehin öffentlich, siehe `DATA-MODEL.md`), aber sobald es zwei Umgebungen gibt, wird ein Build-Zeit-Switch (z. B. per Umgebungsvariable beim `prepare-www`-Schritt) sauberer als zwei Config-Dateien von Hand zu pflegen.

## 6. Cloud & Compute

**Ist-Zustand:** Vollständig Managed/Serverless (Supabase). Kein eigener Server, kein Container, den ihr betreiben müsstet.

**Bewertung:** Genau richtig für dieses Team — kein Handlungsbedarf, und explizit **nicht** in Richtung eigener Server/Container bauen (siehe `DATA-MODEL.md`, Alternativen-Tabelle: Self-Hosting für zwei Nicht-Admins nicht empfohlen).

## 7. CI/CD & Versionskontrolle

**Ist-Zustand:** Erledigt in Phase 1–4 — Branch-Strategie dokumentiert (Branch Protection selbst muss noch manuell in GitHub gesetzt werden), CI-Pipeline mit 5 Checks (`ci.yml`), AI-Review-Pipeline (`claude-code-review.yml`, `claude-mention.yml`).

**Offen:** CD-Stufe (automatischer Build → TestFlight/Play-Internal-Testing → manuelle Freigabe) bewusst zurückgestellt, bis ein Release näher rückt (Phase 4.3).

## 8. Security & Row Level Security

**Ist-Zustand:** RLS ist auf allen Tabellen aktiv, von Anfang an mitgedacht (siehe `DATA-MODEL.md`) — keine Tabelle ohne Policy. Das ist der wichtigste Schutzschild bei Supabase und hier vorhanden.

**Was noch fehlt:** Eine Policy-für-Policy-Korrektheitsprüfung (ist jede Policy nicht nur *vorhanden*, sondern auch *richtig* — z. B. testen, ob ein zweiter Testnutzer wirklich nicht an die Daten des ersten kommt) ist noch nicht gemacht. Das ist Teil von `AUDIT.md` (Phase 9), nicht dieser Bestandsaufnahme.

## 9. Rate Limiting

**Ist-Zustand:** Kein eigenes Rate-Limiting gebaut. Auf Auth-Ebene (Login/Registrierung/Passwort-Reset) greifen Supabase-Standardlimits (siehe Punkt 4). Auf der eigenen RPC-Ebene gibt es **ein** selbstgebautes Limit: `submit_session_score` erlaubt maximal 20 Submits/Stunde pro Nutzer (`supabase/migrations/20260101000000_initial_schema.sql`).

**Bewertung:** Für den MVP ausreichend. Kein Rate-Limiting auf `get_de_ranking` o. ä. (öffentlich lesbare RPCs) — bei echtem Missbrauch (z. B. Scraping) theoretisch ein Thema, aber keine Priorität vor Launch.

**Nächster Schritt:** Keiner, bis es Anzeichen für Missbrauch gibt.

## 10. Caching & CDN

**Ist-Zustand:** Nicht relevant, weil aktuell nichts öffentlich über das Web ausgeliefert wird — `www/` ist nur der Build-Zwischenschritt für die native App, Assets (Fonts, Spielerfotos) werden direkt ins App-Bundle gepackt.

**Nächster Schritt:** Erst relevant, wenn es eine öffentlich gehostete Web-Version/Landingpage gibt. Kein Handlungsbedarf jetzt.

## 11. Load Balancing & Scaling

**Ist-Zustand:** Nicht relevant — Supabase übernimmt das für den gebuchten Tarif. Kein eigener Server zum Skalieren.

**Nächster Schritt:** Keiner. Nur wichtig: nicht anfangen, Architektur *gegen* zukünftiges Skalieren zu bauen (z. B. keine Annahme "es gibt immer nur einen Supabase-Request pro Aktion" hart verdrahten) — ist aktuell nicht der Fall.

## 12. Error Tracking & Logs

**Ist-Zustand: Nichts eingerichtet.** Kein Sentry, kein Crash-Reporting, kein zentrales Logging — geprüft (keine Treffer für "Sentry" oder ähnliche SDKs im Code). Ein Absturz oder ein Fehler bei einer echten Nutzerin/einem echten Nutzer ist für euch aktuell **komplett unsichtbar**, es sei denn, sie/er meldet es euch direkt.

**Das ist die größte reale Lücke aus dieser Bestandsaufnahme.**

**Nächster Schritt (hohe Priorität):** Sentry einrichten (hat ein Capacitor-kompatibles SDK, `@sentry/capacitor` + `@sentry/browser` darunter). **Wichtig beim Einrichten (siehe `CLAUDE.md`-Regel Datenminimierung):** Keine personenbezogenen Daten in den Logs — Spielernamen, E-Mail-Adressen o. ä. müssen aus Fehlermeldungen/Breadcrumbs herausgefiltert werden, bevor sie an Sentry gehen (Sentry bietet dafür `beforeSend`-Hooks). Das ist eine bewusste Konfigurationsentscheidung beim Einrichten, kein nachträglicher Fix.

## 13. Availability & Recovery

**Ist-Zustand:** Deckt sich mit Punkt 3 — Backups ungeprüft, kein Restore je getestet.

**Nächster Schritt:** Siehe Punkt 3, hier nicht doppelt geführt.

## Zusammenfassung: was jetzt wirklich zu tun ist

| Priorität | Schicht | Nächster Schritt | Wer |
|---|---|---|---|
| ✅ Bereits gut | Auth (4), RLS (8) | Nur noch die Korrektheitsprüfung in Phase 9 | — |
| 🔴 Hoch | Error Tracking (12) | Sentry einrichten, PII aus Logs filtern | Ich, sobald ihr sagt "los" |
| 🟡 Mittel | Hosting/Umgebungstrennung (5) | Zweites Supabase-Projekt für Dev/Staging, vor dem ersten echten Launch | Ihr (Supabase-Account) + ich fürs Code-seitige |
| 🟡 Mittel | Backups (3/13) | Dashboard prüfen, Restore testen | Ihr (Dashboard-Zugriff) |
| ⚪ Später | Abo-Validierung (2) | Erst wenn IAP gebaut wird — dann sofort serverseitig | Ihr entscheidet, wann IAP kommt |
| ⚪ Später | Rate Limiting (9) | Kein Handlungsbedarf ohne Anzeichen für Missbrauch | — |
| ⚪ Später | Caching/CDN (10), Load Balancing (11) | Nicht relevant ohne öffentliches Web-Hosting | — |

## Auftragsverarbeiter-Übersicht (Vorgriff auf Phase 5/9)

| Dienst | Zweck | AVV abgeschlossen? | Serverstandort |
|---|---|---|---|
| Supabase | Auth, DB, Ranking | **Nein, offen** (siehe `DATA-MODEL.md`) | Zu verifizieren: Frankfurt (`eu-central-1`) |
| Google Cloud TTS / Gemini | Optionale externe Stimme / Vokabel-KI-Bewertung | **Nein, offen** — nur relevant, sobald Nutzer einen eigenen Key hinterlegen | Google, Standort variabel |

Vollständige Bewertung (inkl. Drittland-Transfer-Check) folgt in `AUDIT.md`, Phase 9.
