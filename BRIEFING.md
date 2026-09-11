# Briefing für Noel & Bastian

Ehrliche Standortbestimmung, ohne Fachbegriffe wo vermeidbar. Wo ein Fachbegriff nötig ist, wird er in Klammern erklärt. Jeder Punkt mit Dringlichkeit.

---

## 1. Was gut ist (nicht mehr anfassen)

- **Login läuft über einen fertigen, geprüften Dienst (Supabase), nicht selbst gebaut.** Selbstgebautes Login ist der häufigste Fehler bei Erstprojekten — den habt ihr vermieden. *Dringlichkeit: keine, so lassen.*
- **Jede Datenbank-Tabelle hat eine eigene Zugriffsregel** ("wer darf was sehen/ändern"), einzeln geprüft. Ohne das könnte jeder Nutzer die Daten aller anderen lesen — bei euch ist das nicht der Fall. *Ein echter Test mit zwei Konten steht noch aus, siehe Abschnitt 5.*
- **Namen von Mitspielern, die die App gar nicht installiert haben, verlassen nachweislich nie das Handy.** Das wäre datenschutzrechtlich der heikelste Punkt der ganzen App gewesen — er ist es nicht, weil es schon richtig gebaut ist. *Dringlichkeit: keine.*
- **Automatische Prüfungen bei jeder Code-Änderung** (Rechtschreibfehler im Code, bekannte Sicherheitslücken in benutzten Bausteinen, versehentlich eingecheckte Passwörter) laufen bereits. *Dringlichkeit: keine.*
- **Die App fragt am Handy nur nach dem Nötigsten** (Mikrofon + Spracherkennung, beide klar begründet für die Minispiele) — keine unnötige Kamera-, Standort- oder Tracking-Berechtigung. *Dringlichkeit: keine.*
- **Kein Werbe-Baustein im Code gefunden** (frisch nachgeprüft, nicht nur behauptet) — was bedeutet: Es gibt aktuell auch keine Werbe-bedingte Datenschutz-Lücke, weil es die Werbung technisch noch gar nicht gibt. *Wichtig für später, siehe Abschnitt 2.*

## 2. Was fehlt und jetzt gebraucht wird

- **Es gibt keine echten Nutzungsbedingungen/Datenschutzerklärung.** Die Registrierung verlangt schon heute Zustimmung dazu, aber ein Klick zeigt nur "folgt in Kürze". *Dringlichkeit: JETZT — wird in Abschnitt 2 dieser Prüfrunde nochmal genauer eingeordnet.*
- **Es gibt kein System, das euch informiert, wenn die App bei echten Nutzer:innen abstürzt.** Ohne das merkt ihr Probleme nur, wenn euch jemand von sich aus schreibt. *Dringlichkeit: hoch, vor dem ersten echten Nutzerkreis.*
- **Es gibt nur eine einzige Datenbank für alles** — Entwickeln/Testen und "echter Betrieb" laufen auf demselben System. Ein Testfehler könnte echte Nutzerdaten treffen. *Dringlichkeit: hoch.*
- **Backups der Datenbank wurden nie tatsächlich zurückgespielt/getestet.** Ein Backup, das nie getestet wurde, ist im Ernstfall eine Vermutung, kein Sicherheitsnetz. *Dringlichkeit: mittel.*

## 3. Was schlecht bzw. riskant ist

- **Zwei einzeln harmlose Kleinigkeiten könnten zusammen ein ernstes Problem sein:** Wo eingeloggte Nutzer:innen "erkannt" werden (der Session-Ausweis) liegt an einer weniger geschützten Stelle im Speicher, und an einer Code-Stelle fehlt eine automatische Absicherung gegen eingeschleusten fremden Code. Einzeln ist beides moderat. Zusammen: im schlimmsten Fall könnte jemand fremden Code einschleusen (z. B. über einen bösartig benannten Mitspieler-Namen) und darüber den Session-Ausweis eines anderen Kontos stehlen — das wäre eine Kontoübernahme. *Wird jetzt in Abschnitt 2 gezielt nachgeprüft, mit Freigabe zum direkten Beheben. Dringlichkeit: wird gerade neu bewertet, siehe nächster Abschnitt.*

## 4. Was geändert werden muss

- **Zehn verschiedene Button-Varianten im Design** — sollten auf vier reduziert werden (Haupt-Button, Neben-Button, unauffälliger Button, Warn-Button). Erst eine Zuordnungstabelle zur Freigabe, dann der Umbau. *Dringlichkeit: nach dem Launch — reine Aufräumarbeit, kein Sicherheits-/Nutzerproblem.*
- **Abstände im Design (Zwischenräume zwischen Elementen)** sind an 282 Stellen fest eincodiert statt aus einem einheitlichen System zu kommen. Sichtbar wird das nur bei Inkonsistenzen, nicht als Fehler. *Dringlichkeit: nach dem Launch, wegen Risiko für versehentliche optische Fehler ohne automatische Prüfung dagegen.*

## 5. Was noch offen ist und eine Entscheidung von euch braucht

- **Zielgruppe 18+ oder eine entschärfte Version für 16-17-Jährige?** Das Kernfeature (Schlucke tracken) passt eigentlich nur zu 18+, die ursprünglich genannte Zielgruppe war aber jünger. Beeinflusst Store-Eintrag, Werbung, Nutzungsbedingungen, ob eine Altersabfrage in die App muss. *Braucht einen Anwalt, nicht uns.*
- **Wie sollen die Rechtsdokumente entstehen** — selbst mit einem Online-Generator, oder über eine Kanzlei? Unterschied ist Kosten vs. rechtliche Absicherung. *Eure Entscheidung.*
- **Gibt es schon eine Firma/Rechtsform, oder startet ihr als Privatpersonen?** Bestimmt, was ins Impressum muss und wer haftet. *Eure Entscheidung, Voraussetzung für die fehlenden Rechtsdokumente.*
- **Wie weit sollt ihr in 3 Monaten sein** (öffentlicher Launch, geschlossener Test, oder erst fertig bauen)? Bestimmt, wie dringend alles andere hier wirklich ist. *Eure Entscheidung — Fragebogen folgt in dieser Prüfrunde.*

---

*Diese Datei ist der Startpunkt der zweiten, unabhängigen Prüfrunde (Auftrag von Madalin Stanila). Die Einzelpunkte werden in den nächsten Abschnitten vertieft, gegengeprüft und in einen konkreten Plan überführt.*
