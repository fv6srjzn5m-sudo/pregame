# Review-Guidelines für PreGame

Gilt für jedes automatisierte PR-Review (`.github/workflows/claude-code-review.yml`) und für `@claude`-Nachfragen in PRs/Issues. Ziel: Architektur, Geschäftslogik und Sicherheit — **nicht** Formatierung. Dafür gibt es Linter.

## Gezielt suchen nach

- **Fehlern in der Geschäftslogik:** Spielregeln, Punktevergabe, Rundenlogik, Abo-Status-Prüfung (siehe die IIFE-Spielmodule in `saufapp.html`, z. B. `Kniffel`, `Maexchen`, `Quiz` — jedes hat eigene Rundenzustands-Logik, die leicht kaputtgehen kann).
- **Injection-Vektoren:** SQL/NoSQL (v. a. in `supabase/schema.sql`-Änderungen), Command-Injection, XSS über `innerHTML` — Spielernamen sind Nutzereingaben und landen direkt im UI, das ist der klassische Vektor hier. Prüfen, ob `escapeHtml()` genutzt wird.
- **Unbehandelte Edge Cases:** leere Spielerliste, ein einzelner Spieler, App-Absturz mitten in der Runde, Netzwerkverlust, Wiedereinstieg nach Backgrounding.
- **N+1-Queries und unnötige Netzwerk-Roundtrips**, besonders in `src/ranking/index.js` und neuen Supabase-RPCs.
- **Race Conditions** bei parallelen Spielaktionen (mehrere schnelle Taps, gleichzeitige Score-Submits).
- **Fehlende serverseitige Validierung:** Alles, was nur im Client geprüft wird (Abo-Status, Punktegrenzen, Altersangabe), ist wirkungslos. Muss serverseitig (Supabase RPC mit `security definer`, RLS) erfolgen.
- **Secrets im Client-Code:** API-Keys, Tokens, Passwörter direkt in `saufapp.html` oder `src/`. Ausnahme: der Supabase *Publishable*-Key (öffentlich by design, RLS-geschützt).

## Explizit ignorieren

- Stil- und Formatierungsfragen (Einrückung, Anführungszeichen, Zeilenlänge).
- Namenskonventionen — außer sie machen den Code für Dritte unverständlich.
- Kommentar-Dichte.

## Immer eskalieren, wenn ein PR berührt

- Login / Auth / Session
- Zahlungen, In-App-Käufe, Abo-Status
- Löschen oder Exportieren von Nutzerdaten
- Alterseinstufung / Altersabfrage
- Werbe-SDK-Integration (Datenweitergabe an Dritte)

"Eskalieren" heißt: im Review explizit benennen und als `CRITICAL` markieren, selbst wenn der Code auf den ersten Blick korrekt wirkt — diese Bereiche brauchen laut `CLAUDE.md` ohnehin menschliche Rückfrage vor der Umsetzung, und ein Review, das das übersieht, ist nutzlos.

## Severity-Schema

| Stufe | Bedeutung | Konsequenz |
|---|---|---|
| `CRITICAL` | Sicherheitslücke, Datenverlust, Geschäftslogik kaputt | Blockiert den Merge (siehe CI-Gate in Phase 4) |
| `WARNING` | Sollte gefixt werden, ist aber kein Launch-Blocker | Blockiert nicht, sollte aber nicht ignoriert werden |
| `NIT` | Optional, darf ignoriert werden | Kein Handlungsdruck |

Jeder Finding im Review muss genau eine dieser drei Stufen tragen — kein Finding ohne Einstufung.
