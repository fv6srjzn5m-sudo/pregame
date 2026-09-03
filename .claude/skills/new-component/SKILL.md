---
name: new-component
description: Erstellt eine neue UI-Komponente (Button, Karte, Screen-Element) für PreGame token-konform und mit allen vier Screen-Zuständen. Nutzen, wenn ein neues UI-Element in saufapp.html gebaut werden soll, statt frei Hand ein neues Stil-Muster zu erfinden.
---

# Neue Komponente anlegen

Baut eine neue UI-Komponente für `saufapp.html` nach den in `DESIGN-SYSTEM.md` dokumentierten Regeln - damit nicht jeder neue Button ein neuer, eigener Button wird.

## Vor dem Bauen prüfen

1. **Gibt es schon eine passende Komponente?** In `DESIGN-SYSTEM.md`, Abschnitt 3, stehen die existierenden Button-Varianten (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-blue`, `.btn-purple`, `.btn-green`, `.btn-yellow`, `.btn-dark`, `.btn-sm`). Erst prüfen, ob eine davon passt, bevor eine neue Variante entsteht.
2. **Falls wirklich neu:** Kurz begründen, warum keine bestehende Variante reicht (im Commit oder PR-Beschreibung, nicht nur im Kopf).

## Beim Bauen

1. **Nur Design-Tokens.** Keine hartcodierten Hex-Farben, `px`-Abstände oder Schriftgrößen - nur `var(--...)` aus dem `:root`-Block (`saufapp.html`, ab Zeile 29). Farben: `--pink`, `--blue`, `--purple`, `--orange`, `--turquoise`, `--success`, `--danger`, `--text`, `--text-2`, `--surface` etc. Spacing: `--space-1` bis `--space-6` (auch wenn der Bestandscode das noch nicht konsequent tut, siehe `DESIGN-SYSTEM.md` - neuer Code haelt sich daran, das ist der Punkt der Regel).
2. **Alle vier Screen-Zustände**, falls die Komponente einen asynchronen Vorgang darstellt (z.B. einen Netzwerk-Call):
   - **Loading:** Button/Element sperren waehrend der Vorgang laeuft (Referenzmuster: `setBusy()` in der `RankingUI`-Login-Flow, `saufapp.html`).
   - **Empty:** Was steht da, wenn (noch) nichts da ist? Mit Handlungsaufforderung, nicht nur "nichts da" (Referenz: `rk-empty`-Klasse in `RankingUI`).
   - **Error:** Verstaendliche Meldung, keine technischen Fehlermeldungen/Stacktraces (Referenz: `rk_err_generic` etc.).
   - **Offline:** Falls die Komponente Netzwerk braucht - was passiert ohne Verbindung? (Referenz: `reportSession()`-Offline-Queue in `src/ranking/index.js`).
3. **Touch-Targets:** mindestens 44×44pt (bestehende `.btn`-Groessen als Referenz nehmen, nicht kleiner gehen).
4. **Destruktive Aktionen** (Loeschen, Abbrechen, Zuruecksetzen) immer ueber `showConfirm()`, nie direkt ausfuehren.
5. **`prefers-reduced-motion`** respektieren, falls die Komponente eine Animation hat.

## Nach dem Bauen

- Kurz in `DESIGN-SYSTEM.md` nachtragen, falls eine neue Variante/ein neues Muster entstanden ist - sonst veraltet die Doku sofort wieder.
