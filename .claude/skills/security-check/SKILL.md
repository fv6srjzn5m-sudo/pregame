---
name: security-check
description: Prüft den aktuellen Diff (oder einen genannten Branch/PR) gegen die Sicherheits-Checkliste aus .claude/review-guidelines.md - Secrets, Injection, fehlende serverseitige Validierung, RLS-Lücken, Race Conditions. Nutzen vor jedem Commit mit sicherheitsrelevanten Änderungen (Auth, Supabase-RPCs/RLS, Zahlungen), oder wenn unsicher, ob eine Änderung sicherheitsrelevant ist.
---

# Security-Check

Prüft eine Code-Änderung im PreGame-Projekt gezielt auf die Punkte aus `.claude/review-guidelines.md` — nicht auf Stil oder Formatierung, dafür gibt es ESLint.

## Ablauf

1. **Diff ermitteln.** Wenn kein spezifischer Branch/PR genannt wurde: `git diff` (uncommitted) und `git diff main...HEAD` (committed auf dem aktuellen Branch) ansehen.
2. **`.claude/review-guidelines.md` laden** und den Diff Punkt für Punkt dagegen prüfen:
   - Secrets im Client-Code (Ausnahme: Supabase-*Publishable*-Key, siehe `DATA-MODEL.md`)
   - Injection-Vektoren: `innerHTML` mit Nutzereingaben ohne `escapeHtml()` (Spielernamen sind der klassische Vektor hier), SQL in neuen/geänderten Postgres-Funktionen
   - Fehlende serverseitige Validierung: Wird irgendwas nur im Client geprüft (Punktegrenzen, Berechtigungen), das eigentlich eine Supabase-RPC mit `security definer` braucht?
   - RLS: Berührt der Diff `supabase/migrations/`? Wenn ja: hat jede neue/geänderte Tabelle eine Policy? (Keine Tabelle ohne RLS, siehe `DATA-MODEL.md`)
   - Race Conditions: Neue asynchrone Aktionen ohne Schutz vor Doppel-Ausführung (siehe den Loading-State-Fix in `DESIGN-SYSTEM.md` als Referenzmuster - `setBusy()`/Button sperren während einer laufenden Anfrage)
   - Eskalationsthemen aus `CLAUDE.md` (Auth/Zahlungen/Datenlöschung/Altersabfrage) — falls berührt: nachfragen statt weitermachen, nicht selbst entscheiden
3. **Jeden Fund einordnen** mit dem Severity-Schema aus `.claude/review-guidelines.md`: `CRITICAL` / `WARNING` / `NIT`.
4. **Ergebnis ausgeben** als kurze Liste: Datei, Zeile (falls zutreffend), Fund, Severity, Empfehlung. Kein Fund → das auch explizit sagen ("keine Findings in diesem Diff"), nicht einfach schweigen.

## Was dieser Skill NICHT tut

Kein Ersatz für das volle Audit aus `AUDIT.md`/`.claude/skills/full-audit/` — das ist eine punktuelle Prüfung eines einzelnen Diffs, kein vollständiger App-Durchgang.
