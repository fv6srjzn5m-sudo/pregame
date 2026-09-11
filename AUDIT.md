# Sicherheits- und Datenschutz-Audit

Phase 9 des Projekt-Setups. Jeder Punkt mit Status (`OK` / `Finding` / `Nicht anwendbar`), Schweregrad und Empfehlung. Wo etwas ohne Zugriff auf euer Supabase-/Store-Dashboard oder ohne echtes Gerät nicht prüfbar war, steht das explizit dabei — nicht stillschweigend übersprungen.

**Wiederholbarkeit:** Dieses Audit ist als Skill unter `.claude/skills/full-audit/` hinterlegt und sollte vor jedem größeren Release erneut laufen, nicht nur einmalig.

---

## Nachtrag: Audit-Runde 2 (zweite, unabhängige Prüfung durch Madalin Stanila)

**Was korrigiert wurde:** Runde 1 bewertete "Session-Token in `localStorage`" und "`t()` escaped nicht" als zwei getrennte `WARNING`-Punkte mit der Aussage "kein aktueller Sicherheits-Exploit gefunden". Das war **pro Einzelbefund korrekt, in der Kombination aber irreführend** — die Kombination beider Punkte ist eine potenzielle Kette zur Kontoübernahme (fremder Code liest den Session-Token aus). Auf `CRITICAL` hochgestuft, wie vom Berater verlangt.

**Beim gezielten Nachprüfen der Kette gefunden:** Nicht `t()` selbst hatte eine ausnutzbare Lücke (alle 36 geprüften Aufrufstellen aus Runde 1 waren tatsächlich sicher), sondern eine **strukturell identische Schwester-Funktion, `getComment()`, die in Runde 1 nicht mitgeprüft wurde.** Eine von zwei Aufrufstellen mit variablen Werten (`saufapp.html`, `renderResults()`, Zeile 7439/damals) setzte einen Spielernamen unescaped in `innerHTML` ein.

**Konkreter Reproduktionsschritt (nicht nur theoretisch):**
1. Auf dem Spieler-Setup-Screen einen Spieler mit Namen `<img src=x onerror=alert(1)>` (oder echtem Schadcode) anlegen.
2. Eine beliebige Runde spielen, bei der dieser Spieler gewinnt (höchste Punktzahl).
3. Auf dem Ergebnis-Screen (`renderResults()`) wird der eingeschleuste Code über den Sieger-Kommentar (`getComment('winner', {playerName})`) ausgeführt.
4. Läuft das auf einem Gerät, das gleichzeitig für das Community-Ranking eingeloggt ist, hätte der eingeschleuste Code Zugriff auf denselben `localStorage` wie der Supabase-Session-Token — theoretisch auslesbar und exfiltrierbar.

**Realistische Einordnung:** Das ist kein Angriff über das Internet — jemand müsste physisch am geteilten Gerät einen bösartigen Namen eintippen ("pass the phone"-Szenario). Aber genau das ist das Nutzungsmuster dieser App, und die Folge (Kontoübernahme des Geräte-Besitzers) ist real, nicht hypothetisch.

**Behoben (Freigabe für diese konkrete Arbeit lag laut Berater bereits vor):**
- `saufapp.html`, `renderResults()`: die verwundbare Stelle jetzt mit `escapeHtml(getComment(...))` abgesichert. `getComment()` selbst bewusst **nicht** global geändert — eine zweite Aufrufstelle setzt das Ergebnis per `.textContent` (dort würde globales Escapen Sonderzeichen wie "&" fälschlich als sichtbaren Text zeigen). Gezielter Fix an der tatsächlichen Stelle statt einer riskanten globalen Änderung.
- `src/ranking/index.js`: Supabase-Session-Storage von `window.localStorage` auf einen `SecureStorage`-Adapter umgestellt (gleiches Muster wie der bereits vorhandene Google-API-Key-Schutz). Fällt automatisch auf `localStorage` zurück, wenn das Plugin fehlt (Web/PWA). **Nebenwirkung:** Bereits eingeloggte Personen werden beim ersten Laden nach diesem Update einmalig ausgeloggt (alter Token ist unter dem neuen Speicherort nicht auffindbar) — einmalige, akzeptierte Kosten.
- `t()` wurde bewusst **nicht** angefasst — alle 36 Aufrufstellen mit Namen waren nachweislich sicher, eine globale Änderung hätte das Risiko einer schwer prüfbaren Kosmetik-Regression (doppelt escapte Sonderzeichen) über viele Screens gehabt, ohne einen realen Fehler zu beheben. Bleibt als strukturelle `WARNING` dokumentiert (siehe unten).

**Zusätzlich geprüft (Abschnitt 2.5 der Prüf-Runde-2-Vorgabe): Existiert der `service_role`-Key irgendwo?** Vollständige Git-History (alle Commits) nach dem JWT-Strukturmuster (`eyJ...`) durchsucht, nicht nur nach dem Wort "service_role" — **null Treffer.** Die einzigen Fundstellen des Wortes "service_role" sind harmlose Dokumentationskommentare der Supabase-SDK-Bibliothek selbst (kein echter Schlüsselwert) und ein SQL-Kommentar. `ios/App/App/public/` (enthält einen lokal gebauten `ranking.js`) ist korrekt in `ios/.gitignore` gelistet und nie eingecheckt — geprüft, nicht angenommen.

**Was das für die Runde-1-Tabelle unten bedeutet:** Die betroffenen zwei Zeilen sind unten mit einem Verweis auf diesen Nachtrag aktualisiert, nicht gelöscht — die ursprüngliche Bewertung bleibt sichtbar, damit nachvollziehbar ist, was sich geändert hat und warum.

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
| **Finding: Session-Token-Speicherort** | **Behoben (war WARNING, in Audit-Runde 2 Teil einer CRITICAL-Kette)** | ~~`src/ranking/index.js:36` konfigurierte den Supabase-Client mit `storage: window.localStorage`.~~ **Update Runde 2:** In Kombination mit dem `getComment()`-Fund unten eine reale Kontoübernahme-Kette, siehe "Nachtrag: Audit-Runde 2" oben. Auf `SecureStorage` umgestellt, mit `localStorage`-Fallback für Web/PWA. Eingeloggte Personen werden beim Update einmalig ausgeloggt. |
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
| XSS über `innerHTML` | **Finding behoben (war "OK, strukturell fragil" — Runde 2 fand echten Fund)** | Runde 1 prüfte systematisch alle 84 `innerHTML`-Zuweisungen und gezielt alle 36 Stellen mit Spielernamen über `t()` — alle sicher. **Runde 2, auf gezielte Nachfrage des Beraters:** vollständiger automatisierter Scan aller `.name`/`.nickname`/`.transcript`/`.text`-Interpolationen (99 Stellen) fand eine echte Lücke in der strukturell identischen Schwester-Funktion `getComment()` (nicht in `t()` — das blieb bei 0 Funden). Details, Reproduktionsschritt und Fix: "Nachtrag: Audit-Runde 2" oben. **Zusätzliche Verteidigungsebene entdeckt:** Der Community-Nickname (der einzige Name, der an *andere* Nutzer:innen ausgeliefert wird) darf laut Datenbank-Regel nur Buchstaben/Zahlen/`_`/`.`/Leerzeichen/`-` enthalten (`profiles_nickname_charset`-Constraint in `supabase/migrations/`) — ein Nickname mit `<`, `>`, `"` kann gar nicht erst gespeichert werden, unabhängig vom UI-Code. Das lokale Spieler-Setup (Pass-the-Phone) hat diese Einschränkung nicht, betrifft aber nachweislich nur das eigene Gerät (siehe `DATA-MODEL.md`). `t()` bewusst nicht global geändert (Begründung im Nachtrag oben) — bleibt als kleinere strukturelle `WARNING` bestehen: kein aktueller Fund, aber keine automatische Absicherung gegen eine zukünftige 37. Aufrufstelle, die das Escapen vergisst. |
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
| `CRITICAL` | 2 offen, 1 behoben | Offen: Fehlende Nutzungsbedingungen/Datenschutzrichtlinie (Issue #1), Altersfreigabe-Konflikt (Issue #2). **Behoben in Audit-Runde 2:** XSS-über-`getComment()` + Session-Token-in-`localStorage`-Kette (echte Kontoübernahme-Möglichkeit, siehe Nachtrag oben) — war in Runde 1 fälschlich als zwei getrennte `WARNING` bewertet. |
| `WARNING` | 5 | `t()` ohne eigene Escaping-Absicherung (kein aktueller Fund, aber keine strukturelle Absicherung); nur ein Supabase-Projekt (keine Dev/Staging/Prod-Trennung); Backups ungetestet; Region unverifiziert; AVV mit Supabase+Google offen |
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
