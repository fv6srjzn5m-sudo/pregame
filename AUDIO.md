# Audio

Phase 7b des Projekt-Setups. **Wichtigster Fakt vorweg:** Der aktuelle Zustand entspricht bereits der für *jetzt* empfohlenen Lösung — kostenloses Geräte-TTS, offline, ohne Lizenzfragen. Das hier ist eine Bestandsaufnahme + Vorbereitung für einen späteren Qualitäts-Schritt (ElevenLabs), nicht ein "wir haben kein Audio-Konzept"-Fund.

## 1. Architekturentscheidung: Ist-Zustand

**Aktuell 100 % Laufzeit-TTS, keine vorproduzierten Audiodateien im Bundle** (geprüft: kein `.mp3`/`.m4a`/`.ogg`/`.wav` unter `assets/`). Zwei Wege, je nach Einstellung (`speakBuddyText()` in `saufapp.html`):

1. **Geräteeigenes TTS** (Standard, `speakNative()`) — läuft über `AVSpeechSynthesizer` via Capacitor-Plugin. Kostenlos, offline, sofort verfügbar — bereits mit einer eigenen Stimmen-Bewertung optimiert (bevorzugt Enhanced/Siri-Qualitätsstimmen, feste Sprechrate ~0.88).
2. **Google Cloud TTS** (optional, `speakWithGoogleTTS()`) — nur wenn Nutzer:in einen eigenen API-Key hinterlegt hat, mit automatischem Fallback auf (1) bei jedem Fehler. Siehe `DATA-MODEL.md` für die Datenschutz-Einordnung dieses Flusses.

**Einordnung gegen die Empfehlung aus der Setup-Vorgabe:** Genau das ist der empfohlene erste Schritt ("Für den nächsten Prototyp-Schritt genügt geräteeigenes TTS oder Piper — kostenlos, sofort, keine Lizenzfragen"). Der hybride Ansatz aus vorproduzierten Bundle-Dateien für feste Texte + Geräte-TTS nur für dynamische Teile (Spielernamen) ist als **künftiger Qualitäts-Schritt** vorbereitet (siehe Abschnitt 4), aber nicht umgesetzt — das lohnt sich laut Vorgabe erst, "sobald die Texte inhaltlich final sind".

## 2. Barrierefreiheit — geprüft, nicht nur behauptet

Die Kernregel ("keine Information nur über Audio") ist für den Hauptpfad bereits strukturell erzwungen: `buddySay()` (`saufapp.html:6660`) ist der zentrale Einstiegspunkt für praktisch jede Kumpel-Ansage und setzt **immer** `bubble.textContent = text` (sichtbare Sprechblase) **und** löst die Sprachausgabe aus — beides im selben Funktionsaufruf, nicht optional. Das war offenbar schon bewusst so gebaut, nicht zufällig richtig.

**Eine Stelle nicht abschließend geklärt:** Im Sprichwörter-Spiel wird beim Auflösen `speak(proverb.start + ' ' + proverb.end, ...)` aufgerufen — die sichtbare Box zeigt zu dem Zeitpunkt nur `proverb.start` plus "...?". Ob die vollständige Auflösung (inkl. Ende) an dieser Stelle auch visuell nachgezogen wird, habe ich nicht abschließend verifiziert (würde einen genaueren Blick in den Reveal-Ablauf brauchen). Kein Blocker, aber als offener Punkt vermerkt statt stillschweigend als "geprüft" abgehakt.

## 3. Audio-Session-Verhalten — Fund behoben

`ios/App/App/AppDelegate.swift` setzte bereits eine gemeinsame Audio-Session für TTS+STT mit `.duckOthers` (fremde Musik wird leiser, nicht gestoppt — Ducking war schon korrekt). **Was fehlte:** Unterbrechungsbehandlung (eingehender Anruf, Siri, eine andere App übernimmt Audio). Ohne das bleibt die Audio-Session nach einer Unterbrechung deaktiviert, bis die App neu gestartet wird — die nächste Ansage wäre dann stumm (gleiche Fehlerklasse wie der im Code bereits dokumentierte "leere AVAudioBuffer"-Bug, nur durch eine Unterbrechung statt eine STT/TTS-Kollision ausgelöst).

**Behoben:** Ein Observer auf `AVAudioSession.interruptionNotification` reaktiviert die Session, sobald iOS meldet, dass die Unterbrechung vorbei ist **und** ein Weitermachen erlaubt (`shouldResume`) — z. B. nicht der Fall, wenn eine andere App inzwischen selbst Audio übernommen hat.

**Ehrlicher Vorbehalt:** Das ist Swift-Code für iOS — in dieser Umgebung steht kein Xcode/Simulator zur Verfügung, um es tatsächlich zu kompilieren oder auf einem Gerät zu testen. Die Änderung folgt Standard-`AVFoundation`-Mustern (offizielle Apple-API), sollte aber vor dem nächsten Release einmal real getestet werden: Ansage laufen lassen, Anruf simulieren/annehmen, prüfen ob danach wieder Ton kommt.

**Nicht angefasst:** Kopfhörer-Abzug-Verhalten (`AVAudioSession.routeChangeNotification`) — bei einer Musik-App sollte man dann pausieren, bei einem Party-Ansage-Feature ist "einfach über Lautsprecher weiterlaufen" vermutlich das gewünschte Verhalten (kein Blocker wie bei Musik-Apps). Bewusst nicht spekulativ implementiert, ohne das auf einem echten Gerät zu verifizieren.

## 4. Kostenlose Optionen (Referenz)

- **Geräteeigenes TTS** — bereits im Einsatz (siehe oben).
- **Piper** (lokal, Open-Source, natürlicher als System-TTS) — als Backend im neuen `scripts/generate-audio.mjs` vorbereitet (siehe unten), aber nicht installiert/getestet.
- **Coqui TTS** — nicht vorbereitet, mehr Setup-Aufwand, aktuell keine Priorität.

## 5. ElevenLabs — Lizenz-Hinweis (für später, aber jetzt dokumentiert)

**Der kostenlose ElevenLabs-Tarif ist für PreGame nicht nutzbar** — keine kommerziellen Nutzungsrechte, Namensnennungspflicht. PreGame ist durch Werbung/Premium-Abo monetarisiert, damit zählt jede Nutzung als kommerziell.

**Der nützliche Trick:** Audio, das während eines bezahlten Abos (Starter, ca. 5 $/Monat) generiert wurde, behält seine kommerziellen Rechte dauerhaft — auch nach Kündigung. Praktisch heißt das: **einen Monat Starter buchen, alle Sprachdateien in einem Durchgang generieren, danach kündigen.** ~30.000 Credits im Starter-Tarif reichen für sehr viele Ansagen.

**Wichtig beim tatsächlichen Generieren (noch nicht passiert):** Generierte Dateien + das Text-Manifest (`audio/lines.json`) archivieren, inkl. Datum und Tarif zum Generierungszeitpunkt — das ist der Lizenznachweis, falls später jemand fragt. Kein Voice-Cloning einer realen Person ohne deren schriftliche Einwilligung, keine Promi-Stimmen.

**Timing-Empfehlung (unverändert von der Setup-Vorgabe):** Erst wechseln, wenn die Ansage-Texte inhaltlich final sind — vorher wäre es bezahlte Generierung für Texte, die noch geändert werden.

## 6. Asset-Pipeline (heute als Gerüst angelegt, nicht befüllt)

Für den Tag, an dem vorproduzierte Audiodateien gebraucht werden, jetzt schon aufgebaut:

- **`audio/lines.json`** — Text-Manifest, Quelle der Wahrheit. Aktuell **3 Beispiel-Zeilen** (aus `COMMENTS.round_start` in `saufapp.html` übernommen, DE+EN), nicht das komplette Set. Das vollständige Befüllen aus allen `COMMENTS`-Blöcken und den 17 Spielmodulen ist eine eigene, größere Aufgabe (ähnlich der Spacing-Token-Migration aus `DESIGN-SYSTEM.md`) — bewusst nicht in diesem Durchgang gemacht, weil es Hunderte Zeilen Ansagetext sind und jede einzeln auf "hat sie einen Platzhalter wie `{playerName}`?" geprüft werden muss (nur platzhalterfreie Zeilen gehören ins Manifest).
- **`scripts/generate-audio.mjs`** — Generierungsskript, austauschbar zwischen Piper (`--provider=piper`) und ElevenLabs (`--provider=elevenlabs --voice=<id>`). API-Key kommt aus der lokalen Umgebung (`.env`, siehe `.env.example`), wird nie committed, nur zur Generierungszeit gebraucht.
- **Ehrlicher Vorbehalt:** Das Skript ist **nicht gegen ein echtes Piper-Binary oder einen echten ElevenLabs-Key getestet** — beides stand in dieser Umgebung nicht zur Verfügung. Syntax ist geprüft (`node --check`), die tatsächliche Audio-Generierung nicht. Vor dem produktiven Einsatz einmal mit einer einzelnen Zeile durchtesten.

**Noch nicht entschieden/gebaut:** Format/Komprimierung (AAC/m4a vs. OGG, mono), Preloading-Strategie, ob Basis-Set im Bundle + Nachladeinhalt für größere Pakete. Das entscheidet sich erst, wenn wirklich vorproduziertes Audio kommt — vorher wäre das spekulative Arbeit ohne echten Inhalt zum Testen.

## 7. Soundeffekte/Musik

Keine im Repo gefunden (nur Sprachausgabe + ein kleiner synthetischer Web-Audio-Sound-Effekt in `saufapp.html`, kein lizenzpflichtiges Fremdmaterial). Falls künftig welche dazukommen: bei jeder Datei Lizenz einzeln prüfen und dokumentieren (Freesound/Pixabay Audio o. ä.), niemals kommerzielle Musik.
