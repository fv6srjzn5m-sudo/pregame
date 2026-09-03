# Architektur

Ziel dieses Dokuments: Jemand, der den Code noch nie gesehen hat (z. B. der externe Berater Madalin), soll sich hier schnell orientieren können — ohne im Code suchen zu müssen, wo etwas liegt.

## Der wichtigste Fakt zuerst

**Fast die gesamte App ist eine einzige Datei: [`saufapp.html`](./saufapp.html)** (Stand: ca. 13.600 Zeilen). HTML, CSS (`<style>`) und JavaScript (`<script>`) liegen zusammen in dieser Datei. Das ist bewusst so gewachsen (schnelles, AI-gestütztes Prototyping) und funktioniert für den aktuellen Umfang, sollte aber bei weiterem Wachstum in Module aufgeteilt werden — siehe `INFRASTRUCTURE.md`, Schicht 1.

## Ordnerstruktur

```
saufapp.html              Die App: Markup + Styles + gesamte Client-Logik
manifest.json              PWA-Manifest (Icon, Name, Start-URL)
capacitor.config.json      Capacitor-Konfiguration (App-ID, webDir)
package.json               Build-Skripte + Dependencies

src/ranking/
  config.js                Supabase-URL + Publishable Key (siehe Hinweis unten)
  index.js                 Supabase-Client: Auth, Score-Submit, Ranking-Abruf, Offline-Queue

supabase/
  schema.sql                Datenbank-Schema + RLS-Policies + RPCs (Quelle der Wahrheit für die DB)
  cron_close_month.sql       pg_cron-Job, der am Monatsende den Sieger/die Siegerin ermittelt

scripts/
  download-player-photos.mjs  Lädt Spielerfotos für das "Aufstellung"-Spiel
  player-names*.json          Namenslisten dafür

assets/
  players/                  Spielerfotos (für Fussball/Aufstellung-Minigames)
  fonts/                    Selbst gehostete Web-Fonts

ios/
  App/App/AppDelegate.swift  Einziger nativer Swift-Code: Audio-Session-Setup (siehe unten)
  App/App/Info.plist         iOS-Berechtigungen, Bundle-Konfiguration
  App/Podfile[.lock]         CocoaPods-Dependencies der Capacitor-Plugins
  .gitignore                 ignoriert Pods/, build/, xcuserdata (Xcode-generiert)

www/                        NICHT im Repo (gitignored) — wird von `npm run prepare-www`
                             aus saufapp.html + assets/ + manifest.json neu erzeugt.
                             Das ist der Ordner, den Capacitor tatsächlich in die native App packt.
```

## State-Management

Es gibt **keine** Frontend-Framework (kein React/Vue) und **keinen** zentralen Store. Stattdessen:

- Ein einfaches globales Objekt `let state = { players, currentScreen, currentGame, mode }` (`saufapp.html:6847`) hält den App-weiten Zustand (Spielerliste, aktueller Screen, aktuelles Spiel, Drink-vs-Points-Modus).
- Jedes Minispiel ist ein **eigenes IIFE-Modul** (`const Xyz = (() => { ... })();`), das seinen Rundenzustand selbst hält und über `.init()` gestartet wird. Beispiele: `Categories`, `Maexchen`, `SevenEleven`, `HochTief`, `Busfahrer`, `Farbenrausch`, `SagOderTrink`, `Sprichwoerter`, `StadtLandFluss`, `Kniffel`, `Flaggen`, `Koffer`, `Wbi`, `Quiz`, `Fussball`, `Aufstellung`, `Vokabel`.
- UI-Wechsel passieren direkt per DOM-Manipulation (`innerHTML` auf Screen-Container), nicht über ein Rendering-Framework. **Sicherheitsrelevant:** Jede Stelle, die Nutzereingaben (Spielernamen!) per `innerHTML` einsetzt, muss durch `escapeHtml()` (`saufapp.html:6854`) laufen — siehe `.claude/review-guidelines.md`.
- `RankingUI` (`saufapp.html:13112`) ist das UI-Modul für Community/Account/Ranking und spricht mit `src/ranking/index.js`.

## Wo Capacitor-Plugins angebunden sind

Alle Plugin-Aufrufe laufen zentral über `window.Capacitor.Plugins.<Name>` direkt in `saufapp.html` (keine separate Wrapper-Schicht):

| Plugin | Wofür | Wichtige Stellen |
|---|---|---|
| `TextToSpeech` | Spielleiter-Ansagen vorlesen | `saufapp.html:5232`, `:5311`, `:5706`, `:5749/5754` |
| `SpeechRecognition` | Mikrofon-Eingabe (Koffer, Kategorien, Sprichwörter) | geteilte Helper `startNativeSTTSession`/`stopNativeSTTSession` (`saufapp.html:5265`, `:5298`), genutzt von mehreren Spielen |
| `SecureStorage` | Sicherer Schlüssel-Wert-Speicher auf dem Gerät | `saufapp.html:5476` |

Fällt `window.Capacitor` weg (Browser/PWA statt native App), degradieren TTS/STT auf die Web-APIs (`window.speechSynthesis`, `window.SpeechRecognition`/`webkitSpeechRecognition`) — die App bleibt im Browser nutzbar, nur ohne native Feinheiten.

## Native Swift-Teile

Aktuell existiert genau eine bewusste native Ergänzung: **`ios/App/App/AppDelegate.swift`**.

Grund: `AVSpeechSynthesizer` (TTS) und Speech Recognition (STT) kollidieren auf iOS ohne eine gemeinsam konfigurierte Audio-Session — es entstehen leere Audio-Buffer bzw. stumme Sprachausgabe (beobachtet u. a. beim Sprichwörter-Spiel). Der `AppDelegate` setzt beim App-Start einmalig eine `AVAudioSession` mit Kategorie `.playAndRecord`, Modus `.spokenAudio` und Optionen `.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP, .duckOthers`.

**Offener Punkt für Phase 7b (Audio):** `.duckOthers` ist bereits gesetzt (fremde Musik wird leiser, nicht gestoppt), aber Unterbrechungsbehandlung (Anruf, Kopfhörer abziehen, Sperrbildschirm) ist in `AppDelegate.swift` noch nicht implementiert — dafür bräuchte es `AVAudioSession.interruptionNotification`-Handling. Wird in Phase 7b behandelt.

## Backend / Community-Ranking

Es gibt **kein eigenes Backend** im klassischen Sinn (kein Node/Express-Server o. ä.). Die einzige serverseitige Logik liegt direkt in Supabase:

- **Auth:** Supabase Auth (E-Mail/Passwort), Client-seitig über `@supabase/supabase-js` in `src/ranking/index.js`.
- **Geschäftslogik als Postgres-Funktionen (RPC):** `ensure_profile`, `submit_session_score`, `get_de_ranking`, `get_my_month_stats`, `get_previous_month_winner`, `close_month`, `create_group`, `join_group`, `list_my_groups`, `get_group_ranking` — alle in `supabase/schema.sql`, alle `security definer` mit serverseitiger Validierung (z. B. Punkte-Clamp 0–80, Rate-Limit 20 Submits/Stunde).
- **Zugriffsschutz:** Row Level Security auf allen Tabellen — Details in `supabase/schema.sql`, Bewertung in `AUDIT.md` (Phase 9).
- **Offline-Fähigkeit:** `src/ranking/index.js` puffert Score-Events lokal (`saufapp_ranking_queue_v1` in `localStorage`) und sendet sie, wenn wieder eine Verbindung besteht.

**Was noch lokal/gerätegebunden ist (bewusst, siehe `DATA-MODEL.md`):** Spielernamen der aktuellen Runde, laufender Rundenzustand, Schluckzähler — diese verlassen das Gerät nicht.

## Build-Pipeline

`saufapp.html` ist die Quelle. `npm run prepare-www` kopiert sie 1:1 nach `www/index.html`, kopiert Assets/Manifest/Plugin-JS dazu und baut `src/ranking/index.js` per esbuild zu `www/ranking.js`. `npm run cap:sync` führt das aus und synchronisiert danach die native iOS-Shell (`npx cap sync ios`). `www/` selbst ist nicht im Repo — es ist reines Build-Output.
