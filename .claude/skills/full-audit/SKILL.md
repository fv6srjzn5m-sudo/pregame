---
name: full-audit
description: Vollständiges Sicherheits- und Datenschutz-Audit der PreGame-App, wie in AUDIT.md dokumentiert. Nutzen vor jedem größeren Release - nicht nur einmalig. Aktualisiert AUDIT.md mit dem aktuellen Stand.
---

# Volles Sicherheits- und Datenschutz-Audit

Wiederholt das Audit aus Phase 9 des Projekt-Setups (`PREGAME-SETUP-INSTRUCTIONS.md`). `AUDIT.md` ist das Ergebnis-Dokument — dieser Skill aktualisiert es, ersetzt es nicht durch etwas Neues.

## Ablauf

1. **`AUDIT.md` lesen** — das ist der letzte bekannte Stand. Nicht bei null anfangen.
2. **Secrets:** `git log --all -p | grep -inE "..."` (siehe Phase 1 in `PREGAME-SETUP-INSTRUCTIONS.md` für die genauen Muster) über alle Commits seit dem letzten Audit. `npm audit` erneut laufen lassen.
3. **RLS:** `supabase/migrations/` seit dem letzten Audit auf neue Tabellen/Policies durchsehen — hat jede neue Tabelle eine Policy, *bevor* sie Daten enthält?
4. **XSS:** Neue `innerHTML`-Zuweisungen seit dem letzten Audit (`git diff <letzter-Audit-Commit>...HEAD -- saufapp.html | grep innerHTML`) auf `escapeHtml()`-Absicherung prüfen — das gleiche Muster wie in `AUDIT.md` Abschnitt "Eingaben und Ausgaben" beschrieben (drei sichere Varianten: `.textContent`, Name vor `t()` escaped, `t()`-Ergebnis nachträglich escaped).
5. **Neue Datenflüsse:** Gab es seit dem letzten Audit neue externe Dienste/SDKs? Gegen `DATA-MODEL.md`/`INFRASTRUCTURE.md` (Auftragsverarbeiter-Übersicht) abgleichen, beide bei Bedarf aktualisieren.
6. **Abo/Zahlungen:** Falls seit dem letzten Audit IAP gebaut wurde — läuft die Validierung serverseitig? Das war beim letzten Audit "nicht anwendbar", jetzt ist es ein Pflicht-Check.
7. **Jeden Punkt aus `AUDIT.md`** (9.1 + 9.2) durchgehen: Hat sich der Status geändert? Neu bewerten, nicht einfach den alten Status kopieren.
8. **`AUDIT.md` aktualisieren** — Datum des Durchgangs vermerken, geänderte Status, neue Findings ergänzen, erledigte Findings als erledigt markieren (nicht löschen — Historie ist wertvoll).
9. **Neue `CRITICAL`-Findings als GitHub-Issues anlegen** (Labels `security`/`privacy`), wie beim ersten Audit.
10. **Launch-Fähigkeits-Aussage aktualisieren** (Abschnitt 9.3 in `AUDIT.md`) — explizit ja/nein mit Begründung, nicht nur die Einzelpunkte auflisten.

## Was dieser Skill NICHT ersetzt

- Einen echten Penetrationstest mit zwei realen Test-Accounts gegen die Live-Datenbank (das kann nur mit echtem Supabase-Zugriff passieren, nicht aus einer Code-Review heraus).
- Manuelles Testen auf einem echten Gerät (siehe `.claude/skills/release-check/`).
