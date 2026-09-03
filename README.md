# PreGame 🎉

Party- und Trinkspiel-App mit digitalem Spielleiter, Schluck-Tracking und Community-Ranking.
Freemium: Werbung in der Gratis-Version, Premium-Abo entfernt Werbung und schaltet zusätzliche Spiele frei.

Zielgruppe/Store-Einstufung sind zum Zeitpunkt dieses Dokuments **noch nicht final entschieden** (siehe `STATUS.md`) — das betrifft insbesondere die Altersfreigabe.

## Stack

| Bereich | Technologie |
|---|---|
| UI/Logik | Ein einziges HTML/CSS/JS-Dokument: [`saufapp.html`](./saufapp.html) |
| App-Verpackung | [Capacitor](https://capacitorjs.com/) 8 → native Shell für iOS (und später Android) |
| Native Zusatzteile | Swift, aktuell nur `ios/App/App/AppDelegate.swift` (Audio-Session für TTS + Spracherkennung, siehe [`ARCHITECTURE.md`](./ARCHITECTURE.md)) |
| Sprachausgabe (TTS) | Capacitor [Text-to-Speech Plugin](https://github.com/capacitor-community/text-to-speech) (Geräte-Stimme), optional Google Cloud TTS über nutzereigenen API-Key |
| Spracherkennung (STT) | Capacitor [Speech Recognition Plugin](https://github.com/capacitor-community/speech-recognition) |
| Sicherer Gerätespeicher | [`@aparajita/capacitor-secure-storage`](https://github.com/aparajita/capacitor-secure-storage) |
| Community/Ranking | [Supabase](https://supabase.com) (Postgres + Auth + Row Level Security), Client-Code in [`src/ranking/`](./src/ranking/) |
| Entwicklung | Cursor (Editor), Xcode (iOS-Build/Deployment) |

Externe Dienste, die die App aktuell kontaktiert:
- **Supabase** (`https://uhsidpjaikqtfcohvwcl.supabase.co`) — Community-Ranking, siehe [`supabase/schema.sql`](./supabase/schema.sql)
- **Google Cloud Text-to-Speech** — nur falls die Nutzerin/der Nutzer freiwillig einen eigenen API-Key in den Einstellungen hinterlegt (wird lokal auf dem Gerät gespeichert, nicht an PreGame-Server übertragen)

## Projekt lokal starten

Kein Build-Schritt nötig, um die Web-Version anzusehen:

```bash
# Einfachster Weg: Datei direkt im Browser öffnen
open saufapp.html

# Oder über einen lokalen Server (nötig, wenn Service-Worker/Manifest-Verhalten getestet werden soll)
npx serve .
```

## Befehle

```bash
npm install          # Dependencies installieren (Capacitor, Supabase-Client, esbuild, ...)
npm run build:ranking # Bündelt src/ranking/index.js -> www/ranking.js (esbuild)
npm run prepare-www   # Kopiert saufapp.html, manifest.json, assets/ und die Capacitor-Plugin-JS-Dateien nach www/, baut das Ranking-Bundle
npm run cap:sync      # prepare-www + npx cap sync ios (aktualisiert die native iOS-Shell)
```

## Für iOS bauen

```bash
npm install
npm run cap:sync
open ios/App/App.xcworkspace   # in Xcode öffnen
```

In Xcode: Signing-Team wählen, Gerät/Simulator auswählen, Run. Die App-ID ist `com.bastianmeissner.pregame`.

**Wichtig:** `www/` wird bei jedem `cap:sync` neu aus `saufapp.html` generiert und ist in `.gitignore` — Änderungen direkt in `www/` gehen beim nächsten Sync verloren. Immer in `saufapp.html` (bzw. `src/ranking/`) editieren.

## Für Android bauen

Noch nicht eingerichtet — es existiert aktuell keine `android/`-Platform. Wenn das gebraucht wird: `npx cap add android`, danach analog zu iOS über `npm run cap:sync` synchronisieren.

## Mehr lesen

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Ordnerstruktur, State-Management, wo welche Logik liegt
- [`CONSULTING.md`](./CONSULTING.md) — wie eine Frage an den externen Berater gestellt wird
- [`DATA-MODEL.md`](./DATA-MODEL.md), [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md), [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md), [`AUDIO.md`](./AUDIO.md), [`AUDIT.md`](./AUDIT.md), [`STATUS.md`](./STATUS.md) — entstehen in den folgenden Phasen des Projekt-Setups (siehe `PREGAME-SETUP-INSTRUCTIONS.md`)
- [`CLAUDE.md`](./CLAUDE.md) — verbindliche Regeln für KI-gestützte Änderungen an diesem Projekt

## Mitarbeiten

- `main` ist immer deploybar — kein direkter Push.
- Neue Arbeit auf einem Branch `feature/<kurzbeschreibung>` oder `fix/<kurzbeschreibung>`, dann Pull Request.
- PR-Checkliste: siehe [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md).
