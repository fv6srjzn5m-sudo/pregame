# Status: PreGame Projekt-Setup

Abschluss-Deliverable des Setups aus `PREGAME-SETUP-INSTRUCTIONS.md`. Zustand jeder Phase, alle offenen Punkte sortiert danach, wer sie klären muss. Für Madalin (Berater) gedacht: hier reicht ein Blick, um den kompletten Stand zu verstehen, ohne durch den Chat-Verlauf zu scrollen.

**Kurzfassung:** Das Setup (alle 11 Schritte) ist durch. Der Code ist in einem soliden, dokumentierten Zustand — keine offene Sicherheitslücke gefunden. **Nicht launch-fähig ist die App aktuell wegen zweier rechtlicher Blocker** (fehlende Rechtsdokumente, ungeklärte Altersfreigabe), nicht wegen des Codes. Mehrere technische Punkte brauchen einmaligen Zugriff der Gründer (GitHub-Settings, Supabase-Dashboard), bevor der nächste Schritt automatisiert werden kann.

---

## Phase für Phase

| # | Phase | Status | Ergebnis |
|---|---|---|---|
| 1 | Repo-Grundlagen | ✅ Fertig | `.gitignore` gehärtet, Git-History auf Secrets geprüft (sauber), `README.md`/`ARCHITECTURE.md`/`CONSULTING.md`/PR-Template angelegt. **Offen bei euch:** Branch Protection, Madalin einladen. |
| 8.1 | `CLAUDE.md` | ✅ Fertig | Verbindliche Projektregeln, werden bei jeder Claude-Code-Session automatisch geladen. |
| 2+3 | AI-Review-Pipeline | ✅ Fertig (Aktivierung offen) | Zwei Workflows + architektur-fokussierter Review-Prompt (`.claude/review-guidelines.md`). **Läuft erst, wenn `CLAUDE_CODE_OAUTH_TOKEN` als Secret existiert.** |
| 4 | CI-Stufe | ✅ Fertig | 5 Statuschecks (Build, Lint, Tests, `npm audit`, Gitleaks), dabei einen echten "high"-Fund in einer Dependency gefixt. CD-Stufe bewusst zurückgestellt (Vereinbarung). |
| 5b | Datenbank-Entscheidung | ✅ Fertig | Bestätigt: Mitspieler-Namen verlassen das Gerät nicht. SQL-Bug gefunden+gefixt (doppelte `close_month`-Funktion). Migrations-Workflow eingerichtet. **Offen bei euch:** Supabase-CLI verlinken. |
| 6 | Infrastruktur-Bestandsaufnahme | ✅ Fertig | Größte Lücke: kein Error-Tracking. Zweitgrößte: nur ein Supabase-Projekt (keine Dev/Staging-Trennung). |
| 5 | Recht & Datenschutz (technisch) | ✅ Fertig | Art. 15/17 (Auskunft/Löschung) gebaut, dabei einen echten Gruppen-Lösch-Bug gefixt. Rechtsdokumente-Lücke bewusst nicht mit erfundenem Text gefüllt → Issue #1. |
| 7 | Design-System | ✅ Fertig | Token-System existierte bereits, mit echten Zahlen geprüft (Spacing-Tokens 0× genutzt trotz Definition). Loading-State-Bug bei Login/Registrieren gefunden+gefixt. |
| 7b | Audio | ✅ Fertig | Ist-Zustand entspricht bereits der Empfehlung (Geräte-TTS). Audio-Interruption-Bug in Swift gefunden+gefixt (ungetestet, kein Xcode hier verfügbar). Asset-Pipeline-Gerüst für später. |
| 8.2–8.5 | Skills & Hooks | ✅ Fertig | 6 Skills (`security-check`, `new-component`, `privacy-impact`, `release-check`, `explain-to-founder`, `full-audit`), 3 Hooks (`.env`-Schutz, Auto-Lint, Session-Status) — alle einzeln getestet. |
| 9 | Voll-Audit | ✅ Fertig | `AUDIT.md`. 2 `CRITICAL`-Findings als GitHub-Issues, 6 `WARNING`-Findings dokumentiert. Kein aktueller Sicherheits-Exploit gefunden. |

---

## Offene Punkte — sortiert nach "wer muss das klären"

### Anwalt (nicht technisch lösbar)

- **[Issue #2](https://github.com/fv6srjzn5m-sudo/pregame/issues/2) — Altersfreigabe 18+ vs. Zielgruppe 16-30.** Schluck-Tracking als Kernfeature kollidiert mit der genannten Zielgruppe. Muss vor dem Launch geklärt werden — betrifft Store-Listing, Marketing, AGB, Altersabfrage in der App.

### Ihr selbst entscheiden/liefern müsst

- **[Issue #1](https://github.com/fv6srjzn5m-sudo/pregame/issues/1) — Rechtsdokumente fehlen.** Registrierung verlangt Zustimmung zu Nutzungsbedingungen/Datenschutzrichtlinie, die es nicht gibt. Braucht echte Firmendaten (Impressum) — kann von mir nicht erfunden werden. Nächster Schritt: e-recht24.de/iubenda als Startpunkt (siehe `AUDIT.md`), danach in `RankingUI.showLegal()` verlinken.
- **Button-Varianten konsolidieren?** 10 existierende Varianten (`DESIGN-SYSTEM.md`) — eure/Beraters Design-Entscheidung, nicht meine.
- **Wann auf ElevenLabs für Audio wechseln?** Empfehlung bleibt: erst wenn die Ansage-Texte inhaltlich final sind (`AUDIO.md`).

### GitHub-Repo-Einstellungen (Bastian, einmalig, ~10 Minuten)

- Branch Protection auf `main` (Pflicht-PR, min. 1 Review, kein Force-Push) — Settings → Branches
- Required Status Checks aktivieren, sobald die CI-Workflows einmal gelaufen sind
- Squash-Merge/Linear History erzwingen — Settings → General
- Madalin als Read-Collaborator einladen — Settings → Collaborators
- `claude setup-token` lokal ausführen → als Repo-Secret `CLAUDE_CODE_OAUTH_TOKEN` anlegen (Settings → Secrets and variables → Actions) — **ohne das laufen die Review-Workflows rot**

### Supabase-Dashboard (Bastian, braucht euren Account-Zugriff)

- Region wirklich Frankfurt (`eu-central-1`)? Verifizieren, nicht die allgemeine "Europe"-Gruppierung.
- Auth-Rate-Limits (Login/Registrierung/Reset) — Standardwerte aktiv? (Authentication → Policies)
- Backup-Tarif prüfen + **einmal einen echten Restore testen** (ungetestetes Backup zählt nicht)
- AVV mit Supabase abschließen
- Supabase-CLI verlinken (`supabase link --project-ref uhsidpjaikqtfcohvwcl`), dann `migration repair` für die zwei Alt-Migrationen + `db push` für den neuen Fix (Anleitung in `DATA-MODEL.md`)

### Kann ich direkt umsetzen, sobald ihr "los" sagt

- Error-Tracking (Sentry) einrichten — größte technische Infrastruktur-Lücke (`INFRASTRUCTURE.md`)
- Supabase-Session-Token von `localStorage` auf `SecureStorage` umstellen — bewusst nicht selbst gemacht, weil es eine Auth-Änderung ist (`AUDIT.md`, Eskalationsregel)
- `t()`-i18n-Funktion so härten, dass sie standardmäßig escaped (aktuell strukturell fragil, aber kein aktueller Exploit — `AUDIT.md`)
- Spacing-Token-Migration (282 Stellen, screenweise mit visueller Kontrolle — `DESIGN-SYSTEM.md`)
- Zweites Supabase-Projekt für Dev/Staging code-seitig anbinden (Projekt selbst müsst ihr anlegen)
- `audio/lines.json` vollständig befüllen, sobald ihr entscheidet, dass es losgeht
- CD-Stufe (Phase 4.3: automatischer Build → TestFlight → Freigabe), sobald ein Release näher rückt

### Nur auf echtem Gerät verifizierbar (kein Xcode/Device hier verfügbar)

- Der Audio-Interruption-Fix in `AppDelegate.swift` (Testanruf während einer Ansage)
- Der vollständige Loading/Empty/Error/Offline-Durchgang über alle ~20 Screens (nur stichprobenartig geprüft, siehe `DESIGN-SYSTEM.md`)
- WCAG-Kontrast über alle 4 Looks × 2 Theme-Modi

---

## Dateien, die jetzt existieren

`README.md`, `ARCHITECTURE.md`, `CONSULTING.md`, `CLAUDE.md`, `DATA-MODEL.md`, `INFRASTRUCTURE.md`, `DESIGN-SYSTEM.md`, `AUDIO.md`, `AUDIT.md`, `STATUS.md` (diese Datei), `audio/lines.json`, `.claude/` (5 Skills + `full-audit` + Hooks + Settings), `.github/workflows/` (`ci.yml`, `claude-code-review.yml`, `claude-mention.yml` — CD-Workflow fehlt noch, bewusst).

## Empfohlene Reihenfolge für die nächsten Schritte

1. GitHub-Repo-Einstellungen (10 Minuten, siehe oben) — damit die Pipeline überhaupt scharf ist.
2. Rechtsdokumente (Issue #1) anstoßen — das blockiert den Launch am längsten, je früher begonnen, desto besser.
3. Altersfreigabe-Frage (Issue #2) parallel beim Anwalt anfragen.
4. Supabase-Dashboard-Punkte (Backup-Test, Region, AVV) — einmalig, dann erledigt.
5. Error-Tracking einrichten lassen — größter technischer Hebel für "wir merken, wenn was kaputt ist".
6. Vor dem ersten echten Release: `.claude/skills/release-check/` durchgehen und `.claude/skills/full-audit/` erneut laufen lassen.
