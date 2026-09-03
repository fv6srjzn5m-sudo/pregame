# Sicherheits- und Datenschutz-Audit

Phase 9 des Projekt-Setups. Jeder Punkt mit Status (`OK` / `Finding` / `Nicht anwendbar`), Schweregrad und Empfehlung. Wo etwas ohne Zugriff auf euer Supabase-/Store-Dashboard oder ohne echtes Gerät nicht prüfbar war, steht das explizit dabei — nicht stillschweigend übersprungen.

**Wiederholbarkeit:** Dieses Audit ist als Skill unter `.claude/skills/full-audit/` hinterlegt und sollte vor jedem größeren Release erneut laufen, nicht nur einmalig.

---

## 9.1 Sicherheits-Audit

### Secrets und Credentials

| Punkt | Status | Details |
|---|---|---|
| Client-Code/Bundle auf eingebettete Keys durchsucht | **OK** | Der einzige gefundene Key ist der Supabase *Publishable*-Key (`src/ranking/config.js`) — laut Design öffentlich, RLS-geschützt. Details: `DATA-MODEL.md`. |
| Vollständige Git-History (nicht nur aktueller Stand) | **OK** | Geprüft in Phase 1 mit `detect-secrets` + gezielten Greps (AWS/Google/Slack/private-key/`service_role`-Muster) über alle Commits. Keine Funde. |
| Keys rotieren nötig? | **Nicht anwendbar** | Kein Leak gefunden. |
| Dauerhafter Schutz (nicht nur einmalig) | **OK** | Gitleaks läuft seit Phase 4 in jedem CI-Lauf (`.github/workflows/ci.yml`). |

### Authentifizierung und Session

| Punkt | Status | Details |
|---|---|---|
| Selbstgebaute Auth? | **OK** | Supabase Auth, kein eigenes Passwort-Hashing/Session-Handling. |
| Passwort-Anforderungen/Rate-Limiting auf Login/Registrierung/Reset | **Nicht prüfbar von hier** | Läuft über Supabase-Standardeinstellungen — braucht euren Dashboard-Zugriff (Authentication → Policies), um zu verifizieren, dass die Defaults aktiv sind. Siehe `INFRASTRUCTURE.md`, Punkt 4. |
| **Finding: Session-Token-Speicherort** | **Finding — WARNING** | `src/ranking/index.js:36` konfiguriert den Supabase-Client mit `storage: window.localStorage`. Das Projekt hat bereits `@aparajita/capacitor-secure-storage` (Keychain-backed) im Einsatz — aber nur für den Google-API-Key, nicht für die Supabase-Session. Auf einem WebView ist `localStorage` nicht durch andere Apps auslesbar, aber weniger geschützt als Keychain (z. B. bei einem kompromittierten/gejailbreakten Gerät). **Auf Web/PWA bringt eine Umstellung ohnehin nichts** — der SecureStorage-Plugin-Kommentar im Code bestätigt: "auf Web fällt das Plugin auf localStorage zurück", der Vorteil gilt nur nativ auf iOS. **Bewusst nicht selbst gefixt** — das ist eine Änderung an der Auth-Session-Mechanik und fällt unter die Eskalationsregel in `CLAUDE.md` (Auth-Änderungen zuerst besprechen). Empfehlung: Custom-Storage-Adapter auf `SecureStorage` umstellen, aber vorher klären, ob bestehende eingeloggte Nutzer:innen beim Umstieg neu einloggen müssen. |
| IDOR (Manipulation von IDs) | **OK, mit Einschränkung** | Alle RLS-Policies wurden gelesen und logisch geprüft (siehe unten) — keine Lücke gefunden. **Aber:** das ist eine Code-Review, kein echter Penetrationstest mit zwei realen Testkonten gegen die live Datenbank (kein DB-Zugriff von hier aus). Vor dem Launch einmal mit zwei echten Test-Accounts real gegenprüfen. |

### Autorisierung und Datenzugriff (Row Level Security)

**Methode:** Jede Tabelle und Policy in `supabase/migrations/` einzeln gelesen und die Zugriffslogik nachvollzogen (kein Live-Test, siehe oben).

| Tabelle | Policy(s) | Bewertung |
|---|---|---|
| `profiles` | select: `true` (öffentlich); insert/update: `auth.uid() = id` | **OK.** Öffentlich lesbar ist Absicht (Ranking zeigt Nicknamen), enthält keine E-Mail. Schreiben nur am eigenen Datensatz. |
| `score_events` | select: `auth.uid() = user_id`; kein Insert/Update/Delete für Clients | **OK.** Append-only, nur über die validierende RPC `submit_session_score` beschreibbar — genau richtig für ein Audit-Log. |
| `monthly_scores` | select: `true`; kein Client-Write | **OK.** Öffentlich lesbar (Ranking), nur über RPC beschreibbar. |
| `month_winners` | select: `true` | **OK.** Öffentliche Sieger-Historie, by design. |
| `groups` | select: nur eigene Mitgliedschaft; kein Client-Write | **OK.** |
| `group_members` | select: nur Mitglieder derselben Gruppe | **OK.** |
| `get_group_ranking`-RPC | prüft Mitgliedschaft intern (`allowed`-CTE), bevor sie Daten zurückgibt | **OK.** Da die Funktion `security definer` ist (RLS wird umgangen), muss die Prüfung *in* der Funktion passieren — sie tut es. |

**Ergebnis:** Keine RLS-Lücke gefunden. Alle Tabellen hatten von Anfang an eine Policy (siehe `DATA-MODEL.md`).

### Eingaben und Ausgaben

| Punkt | Status | Details |
|---|---|---|
| SQL/NoSQL-Injection | **OK** | Alle Datenbankzugriffe laufen über den Supabase-JS-Client (`supabase-js`) mit parametrisierten Aufrufen (`.rpc()`, `.from()`) — keine manuelle SQL-String-Konkatenation im Client-Code gefunden. |
| XSS über `innerHTML` | **OK, aber strukturell fragil** | Systematisch geprüft: alle 84 `innerHTML`-Zuweisungen und gezielt alle 36 Stellen, die einen Spielernamen über die `t()`-i18n-Funktion einsetzen. **Wichtiger Fund dabei:** `t()` selbst escaped nicht (reine `String.split/join`-Substitution, `saufapp.html:5209`) — die Sicherheit hängt komplett davon ab, dass jede der 36 Aufrufstellen selbst escaped. Alle 36 tun das, über eines von drei Mustern: (1) Ergebnis landet in `.textContent` statt `innerHTML` (escaped automatisch durch den Browser), (2) der Name wird *vor* der Übergabe an `t()` mit `escapeHtml()` umschlossen, (3) das komplette `t()`-Ergebnis wird nachträglich mit `escapeHtml()` umschlossen. **Kein aktueller XSS-Fund — aber keine strukturelle Absicherung.** Ein 37. Aufrufstelle in der Zukunft, die das vergisst, wäre eine echte Lücke, und nichts im Code verhindert das automatisch. Empfehlung (nicht dringend, aber sinnvoll): `t()` so erweitern, dass es standardmäßig escaped, mit einer expliziten Ausnahme für die wenigen Stellen, die absichtlich rohes HTML brauchen (`data-i18n-html`, siehe `applyI18n()`). |
| `document.write` | **OK** | Nicht verwendet. |
| Serverseitige Validierung aller Eingaben | **OK** | Punktegrenzen (0-80), Rate-Limits (20/Stunde), Namenslängen etc. laufen über `security definer`-RPCs mit eigener Validierung, nicht nur Client-seitig — siehe `supabase/migrations/`. |

### Transport und Speicherung

| Punkt | Status | Details |
|---|---|---|
| Ausschließlich HTTPS | **OK** | Kein `http://` (außer der harmlosen DTD-Referenz in `Info.plist`, kein Netzwerk-Aufruf) im Code gefunden. |
| Verschlüsselung sensibler lokaler Daten | **Gemischt** | Google-API-Key: `SecureStorage`/Keychain — **OK**. Supabase-Session: `localStorage` — siehe Finding oben. |
| Passwörter serverseitig gehasht, nie im Klartext | **OK** | Passwörter werden nie vom App-Code selbst verarbeitet/gespeichert — nur über `supabase.auth.signUp/signInWithPassword` direkt an Supabase Auth übergeben, das den Hashing-Teil übernimmt. Keine Logging-Stelle mit Passwort/Token/API-Key gefunden (siehe unten). |

### Zahlungen und Abo

| Punkt | Status | Details |
|---|---|---|
| Serverseitige Receipt-Validierung | **Nicht anwendbar** | Es existiert noch **kein** Kauf-/Abo-Mechanismus im Code — "Premium" ist aktuell nur der Name eines visuellen Themes, kein IAP. Siehe `DATA-MODEL.md`/`INFRASTRUCTURE.md`, Punkt 2. **Wichtig für später:** Sobald IAP gebaut wird, ist serverseitige Validierung *der erste Schritt*, nicht ein Nachgedanke — das steht jetzt schon in `CLAUDE.md` als verbindliche Regel. |

### Abhängigkeiten und Plattform

| Punkt | Status | Details |
|---|---|---|
| `npm audit` | **OK** | 0 Schwachstellen (in Phase 4 einen echten "high"-Fund behoben, siehe CI-Historie). Läuft seit Phase 4 in jedem CI-Lauf. |
| Werbe-/Analytics-SDKs sammeln mehr als deklariert? | **Nicht anwendbar** | Kein Werbe- oder Analytics-SDK im Projekt gefunden. |
| iOS-Berechtigungen (`Info.plist`) unnötig? | **OK** | Nur zwei Berechtigungen angefragt: Mikrofon + Spracherkennung, beide mit klaren, ehrlichen Beschreibungstexten und tatsächlich für die STT-Minispiele gebraucht (siehe `ARCHITECTURE.md`). Keine Kamera-, Standort-, Kontakte- oder Tracking-Berechtigung — entsprechend auch kein `NSUserTrackingUsageDescription` (konsistent mit "kein Werbe-SDK"). |
| Android-Berechtigungen (`AndroidManifest.xml`) | **Nicht anwendbar** | Es existiert noch keine Android-Plattform (`npx cap add android` wurde nie ausgeführt, siehe `README.md`). |

### Fehlerbehandlung und Logging

| Punkt | Status | Details |
|---|---|---|
| Technische Fehlermeldungen an Nutzer:innen durchgereicht? | **OK** | Geprüft: Fehlertexte im UI sind durchgehend nutzerfreundlich (`rk_err_generic`, `rk_err_auth` etc.), keine rohen Stacktraces/Exception-Messages gefunden. |
| Personenbezogene Daten in Logs? | **Nicht anwendbar** | Es gibt noch kein zentrales Error-Tracking/Logging-System (kein Sentry, siehe `INFRASTRUCTURE.md`, Punkt 12) — es gibt also aktuell nichts, wo Daten "landen" könnten. Lokale `console.log/error`-Aufrufe wurden auf Passwort/Token/API-Key/E-Mail-Muster durchsucht: keine Funde. **Sobald Error-Tracking eingerichtet wird** (empfohlene nächste Infrastruktur-Priorität), muss das von Anfang an mit PII-Filterung konfiguriert werden, nicht nachträglich. |

---

## 9.2 Datenschutz-Audit

### Datenbestandsaufnahme

Vollständig in `DATA-MODEL.md` — dort steht pro Datenkategorie, wo sie liegt (lokal/Cloud/Drittanbieter) und warum. Hier nicht dupliziert, nur referenziert (Art. 30 DSGVO ist damit inhaltlich abgedeckt, auch wenn das Dokument nicht so heißt).

### Datenminimierung

**Bereits geprüft in Phase 5b** (`DATA-MODEL.md`): Mitspieler-Namen verlassen das Gerät nachweislich nicht (`computeSessionPoints()` extrahiert nur die Punkte des eingeloggten Nutzers, keine Namen). Kein neuer Fund in dieser Phase.

### Betroffenenrechte

| Recht | Status | Details |
|---|---|---|
| Löschfunktion vorhanden | **OK** | `delete_my_account()`-RPC + UI-Button, seit Phase 5. |
| Löschfunktion *getestet* (Daten wirklich weg, auch in Backups/Logs) | **Nicht prüfbar von hier** | Die SQL-Logik wurde sorgfältig gelesen (Cascade-Verhalten über `on delete cascade`, siehe `DATA-MODEL.md`), aber ein echter End-to-End-Test gegen die live Datenbank braucht euren Supabase-Zugriff. Backups: siehe `DATA-MODEL.md` (ungetestet). |
| Datenauskunft vorhanden und vollständig | **OK, mit derselben Einschränkung** | `export_my_data()`-RPC deckt Profil, Score-Events, Monatswerte, Gruppenmitgliedschaften ab — logisch vollständig gegen das Schema geprüft, aber nicht live gegen echte Daten getestet. |
| Löschfristen für inaktive Konten | **Finding — kein Handlungsbedarf jetzt** | Es gibt keine automatische Löschung inaktiver Konten nach X Monaten. Für den aktuellen Umfang (noch keine echten Nutzer) keine Priorität, aber vor dem Launch mit einer Frist versehen (z. B. "2 Jahre keine Aktivität → Löschhinweis + Löschung"). |

### Einwilligungen

| Punkt | Status |
|---|---|
| Consent-Banner für Werbe-Tracking | **Nicht anwendbar** — kein Werbe-SDK vorhanden. |
| iOS App Tracking Transparency | **Nicht anwendbar** — aus demselben Grund, konsistent mit der fehlenden `NSUserTrackingUsageDescription`. |

### Konsistenz der Angaben

| Punkt | Status |
|---|---|
| Datenschutzerklärung vorhanden | **Finding — CRITICAL, siehe GitHub-Issue #1** | Registrierung verlangt Zustimmung zu Dokumenten, die nur "folgt in Kürze" zeigen. |
| Apple Privacy Nutrition Labels / Google Data Safety Form | **Nicht prüfbar von hier** | Braucht Zugriff auf App Store Connect / Play Console — kann erst befüllt werden, wenn die Datenschutzerklärung (Issue #1) steht, dann gegen `DATA-MODEL.md` abgleichen. |
| Impressum | **Offen** | Noch nicht erstellt (Teil derselben Rechtsdokumente-Lücke wie Issue #1). |

### Auftragsverarbeiter

| Dienst | AVV | Serverstandort | Status |
|---|---|---|---|
| Supabase | **Offen** | Zu verifizieren: Frankfurt (`eu-central-1`), nicht die allgemeine "Europe"-Gruppierung | Finding, siehe `DATA-MODEL.md`/`INFRASTRUCTURE.md` |
| Google (Cloud TTS / Gemini) | **Offen**, nur relevant bei aktivem Nutzer-Key | Google, Standort variabel | Finding, siehe `DATA-MODEL.md` |

### Minderjährige

**Siehe GitHub-Issue #2 (CRITICAL).** Altersfreigabe/Zielgruppen-Konflikt muss anwaltlich geklärt werden, bevor eine echte Altersabfrage gebaut wird — bewusst nicht hart verdrahtet.

---

## 9.3 Ergebnis

### Zusammenfassung nach Schweregrad

| Schweregrad | Anzahl | Punkte |
|---|---|---|
| `CRITICAL` | 2 | Fehlende Nutzungsbedingungen/Datenschutzrichtlinie (Issue #1), Altersfreigabe-Konflikt (Issue #2) |
| `WARNING` | 6 | Supabase-Session in `localStorage` statt SecureStorage; `t()` ohne eigene Escaping-Absicherung; nur ein Supabase-Projekt (keine Dev/Staging/Prod-Trennung); Backups ungetestet; Region unverifiziert; AVV mit Supabase+Google offen |
| `Nicht prüfbar von hier` | 5 | Auth-Rate-Limits (Supabase-Defaults), Löschung/Auskunft live getestet, Apple/Google-Privacy-Formulare, IDOR-Livetest mit zwei echten Accounts |
| `Nicht anwendbar` | 6 | Abo-Validierung (kein IAP), Werbe-/Analytics-SDKs, Android-Berechtigungen, PII-in-Logs (kein Logging-System), Consent-Banner/ATT (kein Tracking) |
| `OK` | ~15 | Auth, RLS (alle Tabellen), Injection, HTTPS, Passwort-Handling, npm audit, iOS-Berechtigungen, Datenminimierung, Löschfunktion vorhanden, u. a. |

### Ist die App aus technischer Sicht launch-fähig?

**Nein, noch nicht — aber die offenen Punkte sind überwiegend rechtlich/organisatorisch, nicht technisch.**

Die eigentliche Code-Basis ist in einem soliden Zustand: keine offene Sicherheitslücke gefunden (RLS korrekt, keine Injection, keine Secrets im Client, Auth über einen etablierten Dienst). Was fehlt, um launch-fähig zu sein:

1. **Muss vor dem Launch:** Beide CRITICAL-Issues lösen (Rechtsdokumente + Altersfreigabe-Entscheidung).
2. **Sollte vor dem Launch:** Dev/Staging-Trennung bei Supabase (nicht gegen Produktionsdaten testen), Backup/Restore einmal echt testen, AVVs abschließen.
3. **Kann nach dem Launch, aber bald:** Session-Storage auf SecureStorage umstellen, Error-Tracking einrichten (`INFRASTRUCTURE.md`, höchste technische Priorität), `t()` härten.

### Punkte, die nicht technisch lösbar sind (gehen an euch/Anwalt)

- Altersfreigabe 18+ vs. 16+ (Issue #2) — **anwaltliche Klärung nötig, keine Entscheidung, die Claude Code treffen sollte.**
- Ob/wie das Unternehmen rechtlich strukturiert ist (für Impressum/AGB) — braucht eure Angaben, kann nicht erfunden werden (Issue #1).
- Supabase-Dashboard-Zugriff für: Rate-Limit-Verifikation, Backup/Restore-Test, Region-Bestätigung, AVV-Abschluss.
