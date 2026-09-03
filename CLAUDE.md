# CLAUDE.md — Projektregeln für PreGame

Wird bei jeder Claude-Code-Session automatisch geladen. Bewusst knapp gehalten (kostet bei jedem Lauf Tokens) — Details stehen in den referenzierten Dateien, nicht hier.

## Projekt & Team

PreGame ist eine Party-/Trinkspiel-App mit digitalem Spielleiter, Schluck-Tracking und Community-Ranking. Freemium (Werbung gratis, Premium-Abo schaltet frei).

Zwei Gründer direkt nach dem Abitur, keiner mit formaler Entwickler-Ausbildung. Bastian arbeitet überwiegend AI-gestützt ("Vibe Coding"), Noel ist nicht-technisch. Ein externer Berater (Madalin, Read-only) berät, schreibt aber keinen Code — siehe `CONSULTING.md`.

**Stack:** HTML/CSS/JS in einer Datei (`saufapp.html`) + Capacitor (iOS, später Android) + Supabase (Postgres/Auth/RLS) für Community-Ranking. Details: `ARCHITECTURE.md`.

## Wie du arbeiten sollst

- **Erklärend, nicht nur ausführend.** Bei jeder Änderung kurz sagen, *warum* — das Team lernt aus deinen Erklärungen mit.
- **Keine Abkürzungen bei Sicherheit und Datenschutz**, auch wenn es länger dauert.
- **Bei Unklarheiten fragen statt annehmen** — besonders bei allem, was Nutzerdaten, Zahlungen oder Login betrifft.
- Deutsch antworten, direkt im Code iterieren.
- Nach Web-Änderungen an `saufapp.html`, die auf iOS getestet werden sollen: `npm run cap:sync`.

## Verbindliche Regeln

1. **Keine hartcodierten Farb-, Abstands- oder Schriftwerte im UI-Code.** Nur Design-Tokens (siehe `DESIGN-SYSTEM.md`, sobald angelegt). Diese Regel gilt ab Phase 7, unabhängig davon, wann sie im Code durchgängig umgesetzt ist.
2. **Keine Secrets im Client.** Ein Capacitor-Bundle lässt sich entpacken — alles in `saufapp.html`/`src/` ist öffentlich lesbar. API-Keys, die geheim bleiben müssen, gehören ausschließlich in ein Backend/GitHub Secret, nie in Client-Code (Ausnahme: der Supabase *Publishable*-Key, der ist laut Design öffentlich und durch RLS geschützt).
3. **Keine selbstgebaute Auth.** Auth läuft über Supabase Auth. Kein eigenes Passwort-Hashing, keine eigene Session-/Token-Logik bauen.
4. **Serverseitige Validierung für alles Sicherheitsrelevante.** Eine Prüfung, die nur im Client passiert (z. B. Abo-Status, Punktegrenzen), ist wirkungslos — muss serverseitig (Supabase RPC/RLS) erfolgen.
5. **Jeder Screen braucht die vier Zustände** Loading / Empty / Error / Offline (siehe `DESIGN-SYSTEM.md`, Phase 7).
6. **Datenminimierung:** Neue Datenfelder immer hinterfragen — wird das wirklich serverseitig gebraucht, oder reicht lokaler Gerätespeicher? Siehe `DATA-MODEL.md`. Namen von Mitspielern (die die App nicht installiert haben) dürfen das Gerät grundsätzlich nicht verlassen.

## Eskalationsregel

Bei Änderungen, die eines der folgenden Themen berühren: **Auth/Login/Session, Zahlungen/Abo-Status, Löschen oder Exportieren von Nutzerdaten, Altersabfrage/Alterseinstufung** — zuerst nachfragen (`AskUserQuestion` oder direkt im Chat), nicht einfach umsetzen. Diese Bereiche werden auch im automatischen PR-Review eskaliert (`.claude/review-guidelines.md`).

## Weiterführende Dokumente

- `ARCHITECTURE.md` — Ordnerstruktur, State-Management, Plugin-Anbindung
- `CONSULTING.md` — wie eine Frage an den Berater gestellt wird
- `DATA-MODEL.md`, `INFRASTRUCTURE.md`, `DESIGN-SYSTEM.md`, `AUDIO.md`, `AUDIT.md`, `STATUS.md` — entstehen in den folgenden Setup-Phasen (`PREGAME-SETUP-INSTRUCTIONS.md`)
- `.claude/review-guidelines.md` — Fokus für automatisierte PR-Reviews: Severity-Schema (`CRITICAL`/`WARNING`/`NIT`), was gesucht und was ignoriert wird
