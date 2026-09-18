# Status: PreGame Projekt-Setup

Abschluss-Deliverable des Setups aus `PREGAME-SETUP-INSTRUCTIONS.md`. Zustand jeder Phase, alle offenen Punkte sortiert danach, wer sie klären muss. Für Madalin (Berater) gedacht: hier reicht ein Blick, um den kompletten Stand zu verstehen, ohne durch den Chat-Verlauf zu scrollen.

**Kurzfassung:** Das Setup (alle 11 Schritte) ist durch. Inzwischen ist zusätzlich eine zweite, unabhängige Audit-Runde abgeschlossen (`AUDIT-2.md`, `PLAN.md`, `TODO.md`) — 13 Prüf-Agenten, 4 Bewertungs-Agenten (inkl. eines bewusst kritischen Gegenprüfers) und 2 gezielte Nachverifikationen. Ergebnis: **keine neue Möglichkeit für Fremdzugriff, Kontoübernahme oder Datenpanne** — die Codebasis bleibt in dieser Hinsicht solide. Aber die Aussage "nicht launch-fähig nur wegen rechtlicher Blocker, nicht wegen des Codes" stimmt **nicht mehr uneingeschränkt**: Zwei echte technische Launch-Blocker sind dazugekommen (Hell-Modus macht die 18+-Altersabfrage unsichtbar; keine Möglichkeit, eine Community-Gruppe zu verlassen), dazu mehrere Punkte mit echter, aber stiller Auswirkung auf Ranking-Punkte. Details, Priorisierung und konkrete Aufgabenliste: siehe `AUDIT-2.md` (Ergebnis), `PLAN.md` (Reihenfolge/Begründung), `TODO.md` (abhakbare Liste in 4 Blöcken).

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
| 7 | Design-System | 🟡 Fertig, aber Screen-Durchgang **offen** | Token-System existierte bereits, mit echten Zahlen geprüft (Spacing-Tokens 0× genutzt trotz Definition). Loading-State-Bug bei Login/Registrieren gefunden+gefixt. Audit-Runde 2 fand zusätzlich einen echten Hell-Modus-Fund (unsichtbare Knöpfe, siehe `AUDIT-2.md`) — der vollständige Loading/Empty/Error/Offline-Durchgang über alle ~20 Screens war und ist weiterhin nur stichprobenartig geprüft, Status bewusst auf "offen" zurückgesetzt. |
| 7b | Audio | 🟡 Fertig, aber Fix **offen/ungetestet** | Ist-Zustand entspricht bereits der Empfehlung (Geräte-TTS). Audio-Interruption-Bug in Swift gefunden+committet, aber **nie auf echtem Gerät/Xcode verifiziert** — Status bewusst auf "offen" zurückgesetzt, bis das nachgeholt ist (siehe Audit-Runde 2, `PLAN.md`). Asset-Pipeline-Gerüst für später. |
| 8.2–8.5 | Skills & Hooks | ✅ Fertig | 6 Skills (`security-check`, `new-component`, `privacy-impact`, `release-check`, `explain-to-founder`, `full-audit`), 3 Hooks (`.env`-Schutz, Auto-Lint, Session-Status) — alle einzeln getestet. |
| 9 | Voll-Audit | ✅ Fertig | `AUDIT.md`. 2 `CRITICAL`-Findings als GitHub-Issues, 6 `WARNING`-Findings dokumentiert. Kein aktueller Sicherheits-Exploit gefunden. |
| — | **Audit-Runde 2** (unabhängige Zweitprüfung) | ✅ Prüfung fertig, Umsetzung offen | `AUDIT-2.md`/`PLAN.md`/`TODO.md`. 13+4+2 Agenten in 3 Stufen. 2 neue echte technische Launch-Blocker gefunden (18+-Abfrage im Hell-Modus unsichtbar, keine Möglichkeit eine Gruppe zu verlassen), 10 weitere Funde mit echter Auswirkung, mehrere ursprüngliche Verdachtsfälle nach Gegenprüfung entkräftet. Keine neue Sicherheitslücke. Noch offen: Stufe 5 (Plan gemeinsam mit euch durchgehen) und Abschnitt 4 der Berater-Vorgabe (Grundsatzfragen → `GOALS.md`). |

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

- **Offen (zurückgesetzt nach Audit-Runde 2):** Der Audio-Interruption-Fix in `AppDelegate.swift` (Testanruf während einer Ansage) — committet, aber nie getestet.
- **Offen (zurückgesetzt nach Audit-Runde 2):** Der vollständige Loading/Empty/Error/Offline-Durchgang über alle ~20 Screens — nur stichprobenartig geprüft (siehe `DESIGN-SYSTEM.md`, `AUDIT-2.md`). Dabei wurde auch der Hell-Modus nie durchgeklickt — genau dort steckte der neue Fund.
- WCAG-Kontrast über alle 4 Looks × 2 Theme-Modi — nur teilweise/stichprobenartig geprüft (siehe `AUDIT-2.md`).

---

## Dateien, die jetzt existieren

`README.md`, `ARCHITECTURE.md`, `CONSULTING.md`, `CLAUDE.md`, `DATA-MODEL.md`, `INFRASTRUCTURE.md`, `DESIGN-SYSTEM.md`, `AUDIO.md`, `AUDIT.md`, `BRIEFING.md`, `SKILL-GAPS.md`, `AUDIT-2.md`, `PLAN.md`, `TODO.md`, `STATUS.md` (diese Datei), `audio/lines.json`, `.claude/` (6 Skills + `full-audit` + Hooks + Settings), `.github/workflows/` (`ci.yml`, `claude-code-review.yml`, `claude-mention.yml` — CD-Workflow fehlt noch, bewusst).

Noch nicht erstellt: `GOALS.md` (Abschnitt 4 der Audit-Runde-2-Vorgabe — Grundsatzfragen an euch beide, noch nicht gestellt).

## Empfohlene Reihenfolge für die nächsten Schritte

**Aktuell wichtiger als die Liste unten: `TODO.md` durchgehen, insbesondere Block C** (4 Entscheidungen, die mehrere technische Fixes blockieren). Danach:

1. GitHub-Repo-Einstellungen (10 Minuten, siehe oben) — damit die Pipeline überhaupt scharf ist.
2. Rechtsdokumente (Issue #1) anstoßen — das blockiert den Launch am längsten, je früher begonnen, desto besser. **Vorher Block C (`TODO.md`) klären**, sonst wird der Text später ein zweites Mal geschrieben.
3. Altersfreigabe-Frage (Issue #2) parallel beim Anwalt anfragen.
4. Supabase-Dashboard-Punkte (Backup-Test, Region, AVV, CLI verlinken) — einmalig, dann erledigt, siehe `TODO.md` Block B.
5. Error-Tracking einrichten lassen — größter technischer Hebel für "wir merken, wenn was kaputt ist".
6. Vor dem ersten echten Release: `.claude/skills/release-check/` durchgehen und `.claude/skills/full-audit/` erneut laufen lassen.
