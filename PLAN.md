# PLAN.md — Arbeitsplan nach Audit-Runde 2

Dieser Plan bringt die Funde aus `AUDIT-2.md` (Abschnitte A und B) in eine sinnvolle **Bearbeitungsreihenfolge** und erklärt, **warum** diese Reihenfolge. Die abhakbare Liste dazu steht in `TODO.md` — dort steht *was* zu tun ist, hier steht *warum in dieser Reihenfolge*.

Geschrieben für Bastian und Noel: möglichst ohne unerklärte Fachbegriffe, mit den echten Konsequenzen statt mit Schweregrad-Etiketten.

---

## 1. Wo wir gerade stehen (Kurzfassung von `AUDIT-2.md`, Abschnitt F)

**Die App ist aktuell nicht launch-fähig — und zwar diesmal auch aus technischen Gründen, nicht nur aus rechtlichen.**

Bisher stand in `STATUS.md`, die Blocker seien "rein rechtlich, nicht technisch". Nach der zweiten Prüfrunde stimmt das nicht mehr uneingeschränkt. Es gibt zwei technische Punkte, die vor dem Launch weg müssen:

- **A1:** Im Hell-Modus sind mehrere Knöpfe unsichtbar — unter anderem der "Nein"-Knopf bei der 18+-Altersabfrage und die Datenschutz-Knöpfe ("Meine Daten exportieren", "Abbrechen" beim Kontolöschen).
- **A2:** Es gibt keine Möglichkeit, eine Community-Gruppe wieder zu verlassen. Wer versehentlich drin ist, kommt nur durch komplette Löschung des eigenen Kontos wieder raus.

**Die gute Nachricht, und die ist wichtig:** In dieser Runde wurde **keine neue Möglichkeit für einen Fremdzugriff, keine Kontoübernahme über das Internet und keine Datenpanne** gefunden. Die einzige echte Sicherheitslücke dieser Art (die XSS-/Session-Token-Kette) stammt aus Runde 1 und ist bereits behoben (`AUDIT.md`).

**Die schlechte Nachricht:** Die neuen Funde sind eine andere Fehlerklasse — Dinge, die **stillschweigend falsch laufen**. Falsche Punkte im Ranking, unsichtbare Knöpfe, fehlende Bestätigungen. Diese Fehler melden sich nicht. Sie fallen auch im Livebetrieb niemandem auf, solange es kein Error-Tracking gibt (das fehlt bis heute, siehe `INFRASTRUCTURE.md`). Deshalb ist der Reflex "das merken wir schon, wenn es passiert" hier gerade nicht tragfähig.

**Was dieser Plan nicht kann:** Die beiden rechtlichen Blocker aus Runde 1 (Issue #1 Rechtsdokumente, Issue #2 Altersfreigabe) bleiben offen und blockieren den Launch unabhängig von allem Technischen. Kein Code-Fix in diesem Plan ändert daran etwas.

---

## 2. Das Grundprinzip dieser Reihenfolge

Die Reihenfolge folgt **nicht** dem Schweregrad-Etikett (CRITICAL vor WARNING). Sie folgt drei Fragen, in dieser Gewichtung:

1. **Entsteht gerade Schaden, den man später nicht mehr reparieren kann?** Falsche Punkte, die einmal in der Datenbank stehen, lassen sich im Nachhinein nicht sauber zurückrechnen — man weiß dann nicht mehr, welcher Eintrag echt und welcher falsch war. Ein unsichtbarer Knopf dagegen ist jederzeit und rückwirkend reparierbar.
2. **Wie steht Aufwand zu Wirkung?** Ein Fix, der eine Minute dauert und ein echtes Problem löst, kommt vor einem Fix, der einen halben Tag dauert und ein gleich großes Problem löst. Nicht weil er wichtiger ist, sondern weil er die Liste sofort kürzer macht und nichts blockiert.
3. **Blockiert der Punkt etwas anderes?** Manches muss zuerst entschieden werden, sonst baut man etwas, das man danach wieder wegwirft.

---

## 3. Die Reihenfolge, Stufe für Stufe

### Stufe 0 — Entscheidungen und ein Dokument-Satz (blockiert alles Weitere)

**Zuerst, obwohl dabei fast keine Zeile Code entsteht.**

`AUDIT-2.md`, Abschnitt D nennt vier Fragen, die ihr beide beantworten müsst. Drei davon blockieren direkt technische Arbeit: Solange nicht klar ist, was beim Ausloggen mit noch nicht übertragenen Punkten passieren soll (D4), kann man `logout()` nicht korrigieren, ohne zu raten. Solange nicht klar ist, wie bei Gleichstand der Sieger bestimmt wird (D2), kann man die Sieger-Ermittlung nicht korrigieren. Solange nicht klar ist, ob die optionalen Google-Dienste im Produkt bleiben (D3), kann niemand die Datenschutzerklärung schreiben.

**D3 ist dabei der wichtigste Zeitfresser**, und zwar wegen einer Reihenfolge, die man leicht falsch macht: `AUDIT-2.md`, Abschnitt E sagt ausdrücklich, dass diese Entscheidung **vor** der Beauftragung der Rechtsdokumente fallen muss, nicht danach. Sonst beschreibt die Datenschutzerklärung einen Stand, den ihr danach ändert — und der Text muss (und kostet) ein zweites Mal.

**Ebenfalls in Stufe 0, weil es fünf Minuten kostet und sonst weiterwirkt:** Der Satz in `AUDIT.md:119` ("Mitspieler-Namen verlassen das Gerät nachweislich nicht") ist als generelle Aussage nicht mehr haltbar (B9) — bei aktiv eingeschalteter Google-Stimme verlassen sie es eben doch. Dieser Satz wird später die Grundlage für die Datenschutz-Angaben im App Store. Eine falsche Angabe dort ist kein Schönheitsfehler, sondern eine Falschangabe gegenüber Apple. Deshalb: **korrigieren, bevor irgendjemand damit weiterarbeitet.**

### Stufe 1 — Die Minutenfixes mit echter Datenwirkung

Hierhin gehören **B1 (Kniffel), B10 (doppelte Spielernamen)** — und direkt danach **B5 (fehlende Punkte-Bestätigung)**.

**Warum kommt ein Ein-Zeichen-Fix vor dem "wichtiger klingenden" A2 (Gruppe verlassen)?**

Der Kniffel-Fehler ist ein einziges Zeichen: `=` statt `+=`. Die erste Einschätzung war, das sei folgenlos, weil die Punkte serverseitig sowieso gedeckelt werden — **diese Entwarnung wurde in der Nachprüfung widerlegt.** Die Deckelung wirkt nur nach oben. Wer vor der Kniffel-Runde schon Punkte hat und in Kniffel schwächer spielt, dem wird das Rundenergebnis teilweise oder komplett auf 0 heruntergerechnet. Das heißt: **Solange dieser Fehler drin ist, entstehen bei jedem gespielten Abend falsche Ranking-Daten** — und zwar dauerhaft, denn im Nachhinein ist nicht mehr unterscheidbar, welcher Eintrag falsch war.

Dasselbe Muster bei B10 (zwei Spieler mit demselben Namen vermischen ihre Schlucke und Punkte — der Fix ist das Kopieren einer Codezeile, die an anderer Stelle schon korrekt existiert).

A2 dagegen ist ein echter Launch-Blocker, aber der Schaden entsteht **erst, wenn jemand tatsächlich einer falschen Gruppe beitritt**. Zum jetzigen Zeitpunkt gibt es noch keine echten Nutzer (`AUDIT.md`), also entsteht dieser Schaden gerade nicht. Der Kniffel-Fehler dagegen wirkt bei jedem Testspiel mit.

Kurz: **Nicht "klein vor groß", sondern "was gerade blutet, vor dem, was noch nicht blutet"** — und der Kniffel-Fix ist zufällig auch noch der billigste der ganzen Liste.

**Einschränkung, die zur Ehrlichkeit gehört:** B1 und B2 berühren das Community-Ranking bzw. das Ausloggen. Beides fällt unter die Eskalationsregel aus `CLAUDE.md` (Scoring, Session). Auch ein Ein-Zeichen-Fix wird deshalb vorher kurz abgestimmt, nicht einfach gemacht.

### Stufe 2 — A1: die unsichtbaren Knöpfe

**Warum nicht ganz oben, obwohl es ein CRITICAL ist?** Weil der Aufwand zwar klein ist (eine zentrale Zeile plus ca. fünf Einzelstellen), aber die Änderung an einer zentralen Stelle im Aussehen der gesamten App wirkt. Das will man **einmal konzentriert und mit optischer Nachkontrolle** machen, nicht zwischen zwei Ein-Zeichen-Fixes durchreichen.

Fachlich ist A1 aber der unangenehmste Fund dieser Runde, und das sollte man klar aussprechen: Bei eingeschaltetem Hell-Modus sieht man bei der 18+-Abfrage nur den deutlichen roten "Ja, 18+"-Knopf. Die "Nein"-Option ist praktisch unsichtbar. **Das drückt Nutzer systematisch Richtung Altersbestätigung** — bei genau der Frage, die laut Issue #2 ohnehin anwaltlich geklärt werden muss. Unabhängig davon, wie diese Klärung ausgeht: Der Knopf muss sichtbar sein.

Zusätzlich betroffen: die Würfelzahl bei allen Würfelspielen (im Hell-Modus praktisch unspielbar) und die gesetzlich vorgeschriebenen Datenschutz-Knöpfe.

**Eskalationsregel:** A1 berührt die Altersabfrage — kurze Rückfrage vor Umsetzung, auch wenn es "nur" eine Farbe ist.

### Stufe 3 — A2 + B6 gemeinsam: Gruppen verlassen und Einladungscodes

Diese beiden gehören **in einen Arbeitsgang**, weil sie sich gegenseitig verstärken:

- Der Einladungscode besteht aus `PRE-` plus vier Zeichen — das sind nur **65.536 mögliche Codes**, nicht Millionen. Ein automatisches Durchprobieren aller Codes ist eine Sache von Minuten, und auf dem Beitritts-Aufruf liegt bisher keine Bremse (anders als bei der Punkte-Einreichung, wo so eine Bremse schon existiert und als Vorlage dienen kann).
- Wer so in einer fremden Gruppe landet, **kommt nicht mehr raus** — es gibt weder in der App noch auf dem Server eine Funktion dafür. Der einzige Ausweg wäre, das ganze eigene Konto zu löschen.

Es gibt noch einen zweiten, technischen Grund, den Code zu verlängern: Wenn der 65.536er-Vorrat irgendwann ausgeschöpft ist, kann das Anlegen einer neuen Gruppe serverseitig in eine Endlosschleife laufen.

Beides zusammen: eine neue Server-Funktion zum Verlassen (mit Prüfung, dass man nur sich selbst entfernen kann), ein Knopf in der Oberfläche, ein längerer Code (6–8 Zeichen) und eine Bremse auf dem Beitritt.

### Stufe 4 — Die Punkte, die auf eine Entscheidung warten

Erst wenn Stufe 0 beantwortet ist, sind diese sinnvoll machbar:

- **B2 (Ausloggen leert die Punkte-Warteschlange nicht)** braucht D4. Der Fall ist real und genau das Nutzungsmuster dieser App: geteiltes Gerät, Person A loggt sich aus, Person B loggt sich ein — noch nicht übertragene Punkte von A landen bei B. Zur Einordnung: Es entstehen dadurch **keine zusätzlichen** Punkte, nur eine Fehlzuordnung, und die serverseitige Bremse (max. 20 Einreichungen pro Stunde) begrenzt das Ausmaß. Der Fix selbst ist eine Zeile — an anderer Stelle (`deleteAccount()`) wird es schon richtig gemacht.
- **B3 (Sieger bei Gleichstand)** braucht D2. Bei fünf Spielen im Trink-Modus verändern sich die Punkte nie, alle stehen auf 0 — und dann gewinnt **immer** der zuerst eingetragene Spieler, nicht zufällig. Das ist nicht nur Kosmetik: Dieser "Sieger" löst im Community-Ranking einen echten **+20-Punkte-Bonus** aus. Betrifft nachweislich auch den Punkte-Modus, wenn Strafpunkte mehrere Spieler auf 0 drücken.
- **B8 (Vokabelspiel ignoriert den Google-Schalter)** braucht D3. Wer die Google-Stimme wieder ausschaltet, bei dem bleibt der Schlüssel gespeichert, und das Vokabel-Minispiel schickt die Rateversuche der Mitspieler weiterhin an Google. Der Nutzer glaubt, es sei aus. Ausdrückliche Entwarnung aus der Prüfung: Das ist **kein** versehentlich eingebauter Geheimschlüssel — der Schlüssel kommt nachweislich aus den Einstellungen des Nutzers selbst, kein Verstoß gegen die Secrets-Regel.
- **B4 + B7 (Monats-Tabellen)** gehören in **eine** Datenbank-Änderung, haben aber einen Teil, der *nicht* auf eine Entscheidung wartet: Zwei Tabellen (`month_closures`, `month_close_runs`) sind für **jeden Besucher lesbar, auch ohne Login** — inklusive interner Fehlerprotokolle. Das sollte unabhängig von allem anderen eingeschränkt werden. Der zweite Teil (bleibt der Nickname eines Monatssiegers nach dessen Kontolöschung stehen?) wartet auf D1. Wichtige Präzisierung aus der Gegenprüfung: Die fehlende Datenbank-Verknüpfung allein ist **nicht** der Kern — auch mit korrekter Verknüpfung bliebe der Nickname im Klartext stehen. Das ist eine Produktentscheidung, kein technischer Fehler.
- **B7** bedeutet zusätzlich: Die Datenauskunft nach DSGVO deckt die drei Monats-Tabellen nicht ab. Das hat direkte Folgen für die Rechtsdokumente (siehe unten).

### Stufe 5 — Nach dem Launch (teilweise vorgezogen)

`AUDIT-2.md`, Abschnitt C hat mehrere ursprünglich als CRITICAL gemeldete Punkte nach kritischer Gegenprüfung heruntergestuft. Am relevantesten war: **Der Spielstand geht verloren, wenn das Betriebssystem die App im Hintergrund beendet.** Auf ausdrücklichen Wunsch wurde davon am 21.09.2026 ein risikoärmerer Teil vorgezogen und umgesetzt: faire, uhrzeitbasierte Timer in allen 6 Zeitlimit-Spielen sowie das Merken von Spielerliste und zuletzt offenem Screen (Details: `TODO.md`, A-14). Die vollständige Wiederherstellung des Rundenstands *innerhalb* eines laufenden Minispiels bleibt bewusst zurückgestellt — das wäre die groß angelegte Variante mit Architekturarbeit über alle 17 Minispiele und echtem Risiko für halb wiederhergestellte Zustände gewesen.

Ebenfalls heruntergestuft und damit *keine* offenen Aufgaben mehr: der eingefrorene Timer beim App-Wechsel (für ein Partyspiel eher die freundlichere Variante), der Gleichstands-Fall beim Busfahrer isoliert betrachtet, das Versions-Pinning von `@capacitor/core` (das Lockfile ist eingecheckt), und Stadt-Land-Fluss ohne Wörterbuchprüfung (entspricht dem Papierspiel).

---

## 4. Was diese Reihenfolge mit den Rechtsdokumenten zu tun hat

`AUDIT-2.md`, Abschnitt E verknüpft die neuen Funde mit den beiden bekannten offenen CRITICAL-Punkten. Das ist der Teil, der am leichtesten in der falschen Reihenfolge gemacht wird:

- **Issue #1 (Rechtsdokumente):** Die Entscheidung D3 (bleiben die Google-Dienste?) muss **vor** der Beauftragung fallen. B8 und B9 müssen inhaltlich in die Datenschutzerklärung. Und: **Eine Datenschutzerklärung, die vollständige Löschung verspricht, wäre aktuell nicht zutreffend** (B4/B7) — also entweder die Technik vorher nachziehen oder den Text entsprechend formulieren. Nicht einfach "wird gelöscht" hinschreiben.
- **Issue #2 (Altersfreigabe):** A1 ist die direkte technische Berührung. Der "Nein"-Knopf gehört sichtbar gemacht, **egal wie die anwaltliche Klärung ausgeht.** Der Fix wartet also nicht auf den Anwalt.

---

## 5. Was dieser Plan bewusst offen lässt

Damit hier keine falsche Sicherheit entsteht:

- **Kein Live-Test der Datenbank-Berechtigungen.** Alle Regeln wurden gelesen und logisch nachvollzogen, aber nicht mit zwei echten Testkonten gegen die laufende Datenbank geprüft (`AUDIT.md`). Der eine Prüfbereich, der in Runde 2 vorgesehen war und **nicht durchgeführt werden konnte**, ist genau dieser Live-Test.
- **Löschfunktion und Datenauskunft sind nie live getestet worden** — nur die Logik wurde gelesen.
- **Der Audio-Fix aus Phase 7b ist ungetestet** (kein Xcode verfügbar).
- Alle Aufwandsschätzungen in `TODO.md` sind **Schätzungen ohne Live-Zugriff** auf Supabase-Dashboard, App Store Connect oder ein echtes Gerät. Die Klickwege können in der Oberfläche leicht anders heißen als hier beschrieben.

---

## 6. Konkrete Liste

Siehe `TODO.md` — vier Blöcke: was Claude Code umsetzt, was Bastian im Browser klicken muss, was ihr beide entscheiden müsst, und was wirklich einen Anwalt braucht.
