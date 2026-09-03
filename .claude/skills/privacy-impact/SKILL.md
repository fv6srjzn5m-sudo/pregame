---
name: privacy-impact
description: Prüft eine Änderung, die Nutzerdaten berührt (neues Feld, neue Tabelle, neuer Datenfluss zu einem Dienst) gegen DATA-MODEL.md - welches Feld, welcher Zweck, welche Rechtsgrundlage, wird die Datenbestandsaufnahme dadurch ungenau. Nutzen bei jeder Änderung, die Daten sammelt, speichert oder an einen externen Dienst schickt.
---

# Privacy-Impact-Check

Für jede Änderung, die Nutzerdaten betrifft — ein neues Datenfeld, eine neue Supabase-Tabelle/-Spalte, ein neuer Aufruf an einen externen Dienst (wie die bereits dokumentierten Google-TTS/Gemini-Flüsse).

## Fragen, die beantwortet werden müssen (nicht überspringen)

1. **Welches Feld/welche Daten genau?** Konkret benennen, nicht "Nutzerdaten" allgemein.
2. **Wozu wird es gebraucht?** Eine echte, existierende Funktion — nicht "könnte später nützlich sein". Wenn kein klarer Zweck: das Feld nicht einführen (Datenminimierung, siehe `CLAUDE.md` Regel 6).
3. **Muss das wirklich in die Cloud, oder reicht lokaler Gerätespeicher?** Referenz: die Tabelle in `DATA-MODEL.md` ("Datenbestandsaufnahme") — Mitspieler-Namen dürfen das Gerät grundsätzlich nicht verlassen.
4. **Wo wird es gespeichert** (Supabase-Tabelle, `localStorage`, `SecureStorage`, Drittanbieter) **und wie lange?**
5. **Verlässt es das Gerät an einen Dritten** (Google, ein neues SDK, …)? Wenn ja: gehört das in die Auftragsverarbeiter-Übersicht in `INFRASTRUCTURE.md` und in die (noch ausstehende) Datenschutzerklärung.
6. **Wird `DATA-MODEL.md` durch diese Änderung ungenau?** Wenn ja: die Tabelle dort in derselben Änderung aktualisieren, nicht als Folgeaufgabe verschieben — sonst driftet die Doku vom echten Code weg, genau das Problem, das die ganze Dokumentation lösen soll.

## Bei RLS-relevanten Änderungen

Neue/geänderte Supabase-Tabelle → hat sie eine RLS-Policy, *bevor* sie Daten enthält? Nicht "Tabelle jetzt, Policy später" (siehe `DATA-MODEL.md`, Abschnitt "Row Level Security").

## Eskalieren, nicht selbst entscheiden

Bei Unsicherheit, ob ein Feld wirklich gebraucht wird, oder bei allem, was Auth/Zahlungen/Löschung/Altersabfrage berührt: nachfragen (siehe Eskalationsregel in `CLAUDE.md`), nicht auf eigene Faust entscheiden.
