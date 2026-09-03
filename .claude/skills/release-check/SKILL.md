---
name: release-check
description: Pre-Launch-Checkliste vor einem Store-Release - Build, Store-Metadaten, Privacy-Angaben synchron mit der Datenschutzerklärung, Löschfunktion getestet, Altersfreigabe korrekt. Nutzen vor jedem TestFlight-/Play-Store-Upload, nicht nur vor dem allerersten Launch.
---

# Release-Check

Checkliste vor jedem Store-Release (nicht nur dem ersten). Jeden Punkt wirklich prüfen, nicht nur durchlesen — wo etwas nicht geprüft werden kann (z.B. Store-Dashboard-Zugriff fehlt), das explizit sagen statt stillschweigend zu überspringen.

## Build

- [ ] `npm run lint` und `npm test` laufen grün (lokal oder CI-Status auf dem Ziel-Branch prüfen)
- [ ] `npm run cap:sync` fehlerfrei durchgelaufen
- [ ] Auf einem echten Gerät (nicht nur Simulator) eine vollständige Spielrunde von Anfang bis Ende getestet — inklusive Abo-Kauf im Sandbox-Modus, sobald IAP existiert (siehe `INFRASTRUCTURE.md`, Punkt 2)
- [ ] Versionsnummer erhöht (verhindert Ablehnung wegen doppelter Build-Nummer)

## Datenschutz-Konsistenz (der häufigste Store-Ablehnungsgrund)

- [ ] Datenschutzerklärung, Apple Privacy Nutrition Labels und Google Play Data Safety Form stimmen **exakt** mit dem überein, was der Code tatsächlich sammelt/sendet — Abgleich gegen die Datenbestandsaufnahme in `DATA-MODEL.md`
- [ ] Neue Datenflüsse seit dem letzten Release erfasst? (z.B. ein neues SDK, ein neuer externer Dienst — siehe `INFRASTRUCTURE.md`, Auftragsverarbeiter-Übersicht)
- [ ] Löschfunktion (`RankingUI.deleteAccount()`, siehe `DATA-MODEL.md`/Phase 5) einmal real durchgeklickt und geprüft, ob die Daten danach tatsächlich weg sind — nicht nur "Funktion existiert"
- [ ] Datenauskunft (`RankingUI.exportData()`) liefert vollständige, korrekte Daten

## Alterseinstufung

- [ ] Store-Alterseinstufung passt zum tatsächlichen Inhalt (Schluck-Tracking als Kernfeature — siehe die Einordnung in `PREGAME-SETUP-INSTRUCTIONS.md`, Phase 5.3). Falls die 18+/16+-Entscheidung noch nicht final getroffen wurde: **das ist ein Blocker für den Launch, kein Nice-to-have** — vor dem Release mit Anwalt klären, nicht selbst entscheiden.

## Rechtliches

- [ ] Impressum erreichbar und aktuell
- [ ] Falls die AGB/Datenschutzrichtlinie-Lücke aus Phase 5 (siehe `AUDIT.md`) noch offen ist: vor dem Release lösen, nicht mit "folgt in Kürze" live gehen

## Infrastruktur

- [ ] Läuft der Build gegen die richtige Umgebung (Prod-Supabase-Projekt, nicht das Dev/Staging-Projekt aus `INFRASTRUCTURE.md`)?
- [ ] Backup/Restore seit dem letzten Check noch getestet? (siehe `DATA-MODEL.md`)

## Ergebnis

Am Ende klar sagen: **launch-fähig oder nicht**, und wenn nicht, was konkret fehlt — nicht nur eine abgehakte Liste ohne Fazit.
