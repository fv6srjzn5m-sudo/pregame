# Design-System

Phase 7 des Projekt-Setups. **Wichtig vorweg:** Die App hat bereits ein Token-System — das ist keine leere Baustelle. Diese Phase ist deshalb primär eine **Bestandsaufnahme mit konkreten Zahlen** (kein Bauchgefühl), plus ein paar klar abgegrenzte, risikoarme Fixes. Ein *vollständiger* Umbau der ~3.560 CSS-Zeilen auf 100 % Token-Konformität wäre ein eigenes, großes und riskantes Projekt (13.600 Zeilen Gesamtdatei, kein visuelles Test-Setup, um Regressionen automatisch zu erkennen) — das mache ich hier bewusst **nicht** ungefragt, sondern liste unten konkret, was übrig bleibt.

## 1. Design-Tokens (bereits vorhanden)

In `saufapp.html` (`:root`-Block, ab Zeile 29) existiert bereits ein semantisch benanntes Token-System:

- **Farben:** `--bg`, `--bg-secondary`, `--surface`, `--surface-2`, `--text`, `--text-2`, `--text-3`, `--border`, `--pink`, `--blue`, `--purple`, `--orange`, `--turquoise`, `--success`, `--danger` — semantisch benannt (nicht `--blau-hell`), genau wie gefordert.
- **4 "Looks"** (`html[data-look="arcade|clean|festival"]`, Default = Neon Party) überschreiben die Farb-Tokens komplett — ein durchdachtes Theming-System, kein Zufall.
- **Light Mode** (`:root[data-theme="light"]`) — vollständige Token-Umkehrung, nicht nur ein Helligkeitsfilter.
- **Spacing-Skala:** `--space-1` bis `--space-6` (4/8/12/16/24/32px) — **definiert**.
- **Motion-Tokens:** `--ease-out`, `--ease-soft`, `--dur-fast/med/slow/intro` — **definiert und werktig genutzt** (siehe unten).

**Entscheidung, die ich bewusst getroffen habe:** Die Tokens bleiben inline im `:root`-Block von `saufapp.html`, werden **nicht** in eine separate `tokens.css` ausgelagert. Begründung: Die App ist absichtlich eine einzige Datei (Capacitor-Bundling-Einfachheit, siehe `ARCHITECTURE.md`) — es gibt nur eine HTML-Datei, die diese Tokens nutzt. Eine separate Datei würde einen zusätzlichen Build-Kopierschritt brauchen und mehr Dateien zum Debuggen erzeugen, ohne einen Nutzen zu stiften (der Sinn einer eigenen Tokens-Datei ist Wiederverwendung über mehrere Dateien — die gibt es hier nicht). Wer anderer Meinung ist: sagt Bescheid, ist in 10 Minuten geändert.

## 2. Wie konsequent werden die Tokens genutzt? (mit echten Zahlen geprüft)

| Token-Kategorie | Definiert | Tatsächlich genutzt | Bewertung |
|---|---|---|---|
| Motion (`--dur-*`, `--ease-*`) | ✅ | **40 Verwendungen**, nur 24 rohe `ms`-Werte übrig | **Gut** — die Regel wird schon weitgehend gelebt. |
| `prefers-reduced-motion` | — | An **3 Stellen** explizit respektiert | Vorhanden, aber nicht systematisch für jede Animation geprüft (siehe Lücken unten). |
| Farb-Tokens | ✅ | **220 rohe Hex-Werte** außerhalb der Token-Definitionsblöcke gefunden | **Gemischt.** Viele davon sind bewusste, einmalige Atmosphären-Gradients für einzelne Screens (z. B. Flaggen-Stadion-Look) — das ist bei einer stark art-direkteten Party-App legitim, kein Bug. Ein Teil davon dürfte aber schlicht wiederholte Akzentfarben sein, die `var(--pink)` etc. nutzen könnten. Ohne Screen-für-Screen-Review nicht sauber trennbar. |
| Spacing-Skala (`--space-1..6`) | ✅ | **0 Verwendungen** — **282 rohe `px`-Werte** in margin/padding stattdessen | **Echte Lücke.** Die Skala existiert, wird aber nirgends benutzt. |

**Konsequenz:** Die Regel in `CLAUDE.md` ("keine hartcodierten Werte, nur Tokens") gilt ab jetzt für **neuen** Code. Der Spacing-Abgleich für **bestehenden** Code (282 Stellen) ist eine eigene, abgrenzbare Aufgabe — Empfehlung: als eigener PR, screenweise, mit visueller Kontrolle nach jedem Schritt, nicht als Mega-Diff. Nicht jetzt ungefragt gemacht.

## 3. Komponenten-Inventar: Buttons

Gefundene Klassen: `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-blue`, `.btn-purple`, `.btn-green`, `.btn-yellow`, `.btn-dark`, `.btn-sm`.

Das sind mehr als die vier empfohlenen Basis-Varianten (primary/secondary/ghost/danger). **Bewusst nicht eigenmächtig zusammengeführt** — die Farbvarianten (blue/purple/green/yellow) wirken wie Absicht (Akzentfarbe passend zum jeweiligen Spiel/Screen in einer Neon-Party-App), nicht wie zufällige Duplikate. Eine Konsolidierung würde bedeuten, für jede der ~10 Varianten den tatsächlichen Verwendungskontext zu prüfen — das ist eine Entwurfsentscheidung für euch/den Berater, keine, die ich technisch "richtig" raten sollte.

**Zustände geprüft:**
- `:active` ist für `.btn`/`.btn-primary` definiert (Scale-Down-Feedback bei Tap).
- `:disabled`/generisches `.btn.disabled` **existiert nicht** — nur zwei spielspezifische `.disabled`-Klassen (Flaggen-/Fußball-"Lifeline"-Buttons), kein wiederverwendbarer Button-Zustand.
- `:focus`/`:focus-visible` ist nirgends gestylt — für eine reine Touch-App (Party, ein Gerät wird herumgegeben) niedrige Priorität, aber relevant für Screenreader/externe Tastatur-Nutzung. Als Finding vermerkt, nicht behoben (kleine, aber breite Änderung über alle Buttons).
- **Loading-Zustand fehlte komplett** bei den Auth-Buttons (Login/Registrieren/Nickname speichern) — **das habe ich gefixt** (siehe unten).

## 4. Die vier Screen-Zustände: Loading / Empty / Error / Offline

**Bereits gut umgesetzt (Community/Ranking-Modul, `RankingUI`):**
- **Empty:** `rk-empty`-Klasse an 8 Stellen, z. B. "Noch keine Gruppen. Erstelle eine oder tritt mit Code bei." — mit Handlungsaufforderung, nicht nur "nichts da".
- **Error:** `rk_err_generic`/`rk_err_auth`/`rk_err_rate` — verständliche Meldungen, keine technischen Stacktraces an Nutzer:innen.
- **Offline:** Die Score-Übermittlung nach einer Spielrunde ist bereits offline-fest (`reportSession()` in `src/ranking/index.js` puffert lokal und syncet später) — Nutzer:innen sehen "+{n} Punkte offline gespeichert – Sync bei Netz". Gut durchdacht.

**Fund und Fix — Loading fehlte:** Login/Registrieren/Nickname-speichern zeigten während der laufenden Supabase-Anfrage **keinen Ladezustand** — ein zweiter Tap auf "Einloggen" hätte eine zweite, parallele Anfrage abgeschickt (Doppel-Submit-Risiko, passt auch zu den Race-Condition-Punkten aus `.claude/review-guidelines.md`). **Behoben:** Die drei Buttons übergeben sich jetzt selbst (`this`) an ihre Handler, die den Button während der Anfrage per `is-busy`-Klasse (reduzierte Opazität, `pointer-events: none`) sperren und danach (auch im Fehlerfall) wieder freigeben.

**Nicht geprüft:** Die einzelnen Minispiele (Kniffel, Mäxchen, Quiz, …) laufen fast vollständig offline/lokal auf dem Gerät — dort ist "Offline" kaum ein Thema, weil kein Netzwerk gebraucht wird. Eine screenweise Prüfung aller ~20 Screens auf alle vier Zustände habe ich nicht gemacht (das wäre für sich ein eigener, mehrstündiger Durchgang) — die zwei konkret gefundenen und behobenen/dokumentierten Lücken oben sind das Ergebnis einer gezielten Stichprobe, keine erschöpfende Prüfung.

## 5. UI-Platzierung & Ergonomie

Stichprobenartig geprüft, nicht erschöpfend:

- **Safe Areas:** Bereits korrekt gehandhabt — `env(safe-area-inset-top/bottom)` wird in `#app` und im Keyboard-Aware-Layout verwendet. Der "klassische Capacitor-Fehler" aus der Vorgabe ist hier nicht passiert.
- **Touch-Targets:** `.btn` hat `padding: 18px 24px` bei 16px Schrift → deutlich über 44×44pt. In Ordnung.
- **Destruktive Aktionen mit Bestätigung:** Bereits systematisch über `showConfirm()` gelöst (genutzt für Rundenabbruch, Statistik-Reset, Konto-Löschung aus Phase 5, u. a.) — gutes, konsistentes Muster.
- **WCAG-Kontrast:** Nicht programmatisch geprüft (bräuchte ein Kontrast-Tool gegen die tatsächlich gerenderten Farbkombinationen über alle 4 Looks × 2 Theme-Modi = 8 Kombinationen). Als offener Punkt für `AUDIT.md` vermerkt.

## 6. Animation & Icons

- **SVG statt PNG:** Bereits korrekt umgesetzt für echte Icons (`ICO`-Objekt, inline SVG). Die ~500 PNG/JPG-Dateien im Repo sind **keine Icons**, sondern reale Spielerfotos fürs Fußball-Minispiel — dafür ist SVG nicht sinnvoll (kein Vektor-Content). Kein Fund, nur zur Klarheit hier festgehalten, damit niemand die Zahl falsch liest.
- **`prefers-reduced-motion`:** an 3 Stellen vorhanden (u. a. Sprachwellen-Animation), nicht für jede der zahlreichen Spiel-Animationen einzeln verifiziert.

## Zusammenfassung: was jetzt konkret zu tun bleibt

| Punkt | Status |
|---|---|
| Token-Regel für neuen Code | ✅ In `CLAUDE.md` verbindlich |
| Loading-State bei Auth-Aktionen | ✅ Gefixt (dieser Durchgang) |
| Spacing-Tokens auf Bestandscode anwenden (282 Stellen) | 🟡 Offen, empfohlen als eigener, screenweiser PR |
| Button-Varianten konsolidieren (10 → ggf. weniger) | 🟡 Offen, braucht eure/Beraters Design-Entscheidung |
| `:focus-visible` für Tastatur/Screenreader | 🟡 Offen, niedrige Priorität für Party-App |
| WCAG-Kontrastprüfung über alle Look×Theme-Kombinationen | 🟡 Offen, wird in `AUDIT.md` vermerkt |
| Screenweise Loading/Empty/Error/Offline-Prüfung aller ~20 Screens | 🟡 Offen, nicht erschöpfend gemacht |
