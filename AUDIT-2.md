# Audit-Runde 2 — Konsolidiertes Ergebnis

Zweite, unabhängige Prüfung, angestoßen von Berater Madalin Stanila (`PREGAME-AUDIT-RUNDE-2.md`). Ablauf: Stufe 1 (13 unabhängige Prüf-Agenten in 3 Wellen, alle 20 vorgegebenen Prüfbereiche außer dem nicht durchführbaren RLS-Livetest) → Stufe 2 (3 unabhängige Bewertungs-Agenten + 1 bewusst kritischer "Advocatus Diaboli", die jeden Fund gegeneinander geprüft haben) → Stufe 3 (gezielte Nachverifikation der strittigsten Einzelbehauptungen durch frische Agenten ohne Kenntnis der Vorbewertungen).

Rohfunde vor Bewertung: siehe Arbeitsprotokoll im Chat-Verlauf dieser Session. Dieses Dokument enthält nur das **Endergebnis nach allen drei Stufen** — nicht jeden Zwischenschritt.

**Wichtig für die Einordnung:** Es wurde in dieser Runde **keine neue Möglichkeit für einen Fremdzugriff, keine Kontoübernahme über das Internet und keine Datenpanne** gefunden (die einzige echte Sicherheitslücke dieser Art — die XSS/Session-Token-Kette — stammt aus Welle 1 und ist bereits behoben, siehe `AUDIT.md`). Was diese Runde gefunden hat, ist überwiegend eine andere Fehlerklasse: Dinge, die **stillschweigend falsch laufen** (falsche Punkte, unsichtbare Buttons, fehlende Bestätigungen), die aber ohne Error-Tracking im Livebetrieb niemand bemerken würde.

---

## A. Bestätigt als echtes CRITICAL (Konsens nach allen 3 Stufen)

### A1. Hell-Modus macht mehrere UI-Elemente unsichtbar — inklusive der 18+-Altersabfrage

**Was:** `.btn-ghost` (`saufapp.html:412`) hat `color: white` hartcodiert. Der Light-Theme-Block (`saufapp.html:199-232`) überschreibt diese Farbe nirgends. Betroffen sind alle Stellen, die diese Klasse nutzen — u. a.:
- Die **echte 18+-Alterskontrolle** vor "Sag oder Trink"/"Mach oder Trink" (`AGE_RESTRICTED_GAMES`, `saufapp.html:7068`, Dialog über `showConfirm()` bei `saufapp.html:7198-7204`): "Ja, 18+" ist rot und deutlich sichtbar (`btn-danger`), "Nein/Abbrechen" ist im Hell-Modus praktisch unsichtbar (`btn-ghost`).
- Die Abbrechen-Knöpfe bei "Konto löschen" (`saufapp.html:13526-13529`) und "Statistik zurücksetzen" (`:7405`).
- "Ausloggen" und "Meine Daten exportieren" (DSGVO-Art.-15-Button) in den Konto-Einstellungen.
- Würfelzahl bei allen Würfelspielen (`.die`, `:1408`) und der "OK"-Button nach Strafschluck (`.penalty-ok-btn`, `:2647`).

**Schlimmster Fall:** Bei aktiviertem Hell-Modus (echtes, anwählbares Setting) sieht ein Nutzer bei der Altersabfrage nur den deutlichen "Ja"-Knopf, die "Nein"-Option ist kaum erkennbar — das drückt systematisch Richtung Altersbestätigung. Zusätzlich: Würfelspiele sind im Hell-Modus praktisch unspielbar, und die gesetzlich vorgeschriebenen Datenschutz-Buttons sind kaum auffindbar.

**Fix-Aufwand:** Klein — eine zentrale Zeile (`color: white` → `color: var(--text)` in der Body-Grundregel `saufapp.html:237`) behebt die meisten geerbten Fälle, plus ca. 5 Einzelstellen mit eigener `color`-Angabe (u. a. `.btn-ghost`, `.die`, `.penalty-ok-btn`).

**Entscheidung nötig:** Keine — rein technischer Fix, keine Produktentscheidung.

### A2. Es gibt keine Möglichkeit, eine Community-Gruppe zu verlassen

**Was:** Vollständig durchsucht (alle 4 Migrationsdateien + kompletter Client-Code) — es existiert weder serverseitig noch in der App-Oberfläche ein `leave_group`/`remove_member`-Mechanismus. `deleteGroup()` (`saufapp.html:7313`) betrifft nur lokale, rein clientseitige Spielergruppen, nicht die Supabase-Gruppen. Kombiniert mit dem schwachen 4-stelligen Einladungscode (`'PRE-' || 4 Hex-Zeichen`, `supabase/migrations/20260101000000_initial_schema.sql:493` → nur **65.536** mögliche Codes, nicht Millionen) heißt das: Wer versehentlich oder durch Erraten einer fremden Gruppe beitritt, ist dauerhaft drin — der einzige Ausweg wäre die komplette Löschung des eigenen Kontos.

**Fix-Aufwand:** Klein-mittel — eine neue `leave_group(p_group_id)`-RPC (DELETE auf `group_members` mit `auth.uid()`-Check) plus ein UI-Button.

**Entscheidung nötig:** Keine — rein technisch. Sollte mit einer Verlängerung des Einladungscodes (z. B. 6-8 Zeichen) zusammen erledigt werden, da `create_group()` bei erschöpftem 65.536er-Code-Vorrat sonst in eine Endlosschleife laufen kann.

---

## B. Bestätigt als WARNING mit echter Auswirkung — vor Launch beheben, aber kein Sicherheits-/Rechtsnotfall

### B1. Kniffel überschreibt statt zu addieren (bestätigt: REALE Ranking-Auswirkung, nicht folgenlos)

`Kniffel.finishGame()` (`saufapp.html:10567-10570`) macht `p.score = ...` statt `p.score += ...` — als einziges von 17 Minispielen. Ursprünglich vermutet, die serverseitige 40-Punkte-Deckelung mache das folgenlos — **das wurde durch gezielte Nachprüfung widerlegt**: Die Deckelung wirkt nur nach oben. Hat ein Spieler vor der Kniffel-Runde bereits Punkte aus anderen Spielen und die Kniffel-Runde läuft schwächer, wird das reguläre Ranking-Ergebnis der Runde teilweise oder komplett auf 0 herunterkorrigiert. Fix: ein Zeichen (`=` → `+=`). **Eskalationsregel beachten** (betrifft Community-Ranking/Scoring) — kurz absprechen vor Umsetzung.

### B2. `logout()` leert die lokale Punkte-Warteschlange nicht (aus drei unabhängigen Quellen bestätigt)

Auf einem geteilten Gerät (Party-Standardnutzung!) können noch nicht übertragene Punkte von Person A beim nächsten Login von Person B fälschlich Person B gutgeschrieben werden. Es gibt bereits eine serverseitige Bremse (max. 20 Einreichungen/Stunde), die das Ausmaß begrenzt, und es entstehen keine *zusätzlichen* Punkte — nur eine Fehlzuordnung. Fix: eine Zeile (`saveQueue([])` in `logout()`, analog zu `deleteAccount()`, das es bereits richtig macht).

### B3. Sieger-Ermittlung ist in mehreren Spielen ohne Punkte-Mechanik bedeutungslos

Bei Mäxchen, Busfahrer, 7-11-Paar, Hoch-oder-Tief und Koffer verändert der Trink-Modus `.score` nie. `renderResults()` sortiert aber ausschließlich nach `.score` — bei durchgehendem 0:0:0:0-Gleichstand gewinnt durch JavaScripts stabile Sortierung **immer** der zuerst in die Namensliste eingetragene Spieler, nicht zufällig. Das ist kein reines Kosmetikproblem: Der ermittelte "Sieger" löst im Community-Ranking einen echten **+20-Punkte-Bonus** aus (`computeSessionPoints()`) und einen Sieg-Zähler in der lokalen Bestenliste. Betrifft nachweislich auch den Punkte-Modus (nicht nur Trink-Modus), wenn Strafpunkte mehrere Spieler auf 0 drücken. Verwandter Fund: Busfahrer-Finale bestimmt den "Busfahrer" bei Gleichstand ebenfalls nicht zufällig (`saufapp.html:8841-8845`, `>` statt `>=`).

**Entscheidung nötig:** Ja — wie soll bei Gleichstand entschieden werden (nach Schlucken werten? zufällig bei echtem Gleichstand?), und soll der Ranking-Bonus in diesen Spielen überhaupt an den "Pokal-Sieger" gekoppelt sein?

### B4. Fehlende Verknüpfung bei den Monats-Tabellen (`month_closures`/`month_close_runs`)

`winner_user_id` hat in beiden Tabellen keinen Foreign Key auf `auth.users` (im Gegensatz zu `month_winners`, wo es korrekt ist). Wichtige Präzisierung aus der Gegenprüfung: **Der fehlende Foreign Key allein ist nicht der Kern des Problems** — selbst mit korrektem FK (`on delete set null`) bliebe der Klartext-Nickname stehen, genau wie es bei `month_winners` schon heute der Fall ist. Die eigentliche offene Frage ist eine Produktentscheidung (siehe unten). Technisch zusätzlich zu beheben: Beide Tabellen sind per `using (true)` auch für nicht eingeloggte Besucher lesbar (inkl. interner Fehlerprotokolle in `month_close_runs`) — sollte unabhängig von der Nickname-Frage auf einen engeren Policy-Kreis eingeschränkt werden.

**Entscheidung nötig:** Ja — siehe Abschnitt D.

### B5. "Punkte gespeichert/offline"-Bestätigung wird praktisch nie angezeigt

`renderResults()` (`saufapp.html:7467`) schreibt sofort den Verlierer-Spruch in dasselbe Textfeld, in das später die Punkte-Bestätigung geschrieben werden soll (`:7536-7537`, Bedingung "nur wenn noch leer"). Bei 2+ Spielern ist das Feld nie leer. **Wichtige Entwarnung aus der Nachprüfung:** Der ursprünglich befürchtete "lautlose, dauerhafte Punkteverlust" ist praktisch nicht erreichbar — die Punkte kommen technisch an, nur die Bestätigung fehlt. Fix: eigenes Anzeige-Element statt geteiltes Textfeld.

### B6. `join_group` ohne Rate-Limit, schwacher Einladungscode

Nur 65.536 mögliche Codes (siehe A2), kein Rate-Limit auf `join_group` (im Gegensatz zu `submit_session_score`, das ein Vorbild-Muster bereits hat). Ein vollständiger Durchlauf des Schlüsselraums ist eine Sache von Minuten. Zusammen mit A2 (keine Möglichkeit zu verlassen) verstärkt sich das gegenseitig. Gemeinsamer Fix mit A2: längerer Code + Rate-Limit.

### B7. Datenauskunft (`export_my_data()`) deckt die drei Monats-Tabellen nicht ab

Auch für Nutzer mit weiterhin bestehendem Konto fehlen `month_winners`, `month_closures`, `month_close_runs` im Art.-15-Export. Gehört technisch zur selben Migration wie B4.

### B8. Gemini-Vokabelspiel ignoriert den Google-TTS-Schalter

Wird die "Google-Stimme" in den Einstellungen wieder ausgeschaltet, bleibt der eingetragene Schlüssel gespeichert — und das Vokabel-Minispiel (`judgeGuesses()`, `saufapp.html:13096`) sendet weiterhin die Rateversuche der Mitspieler an Google, unabhängig vom TTS-Schalter. Nutzer, die glauben "ausgeschaltet" zu haben, wissen das nicht. Kein hartcodiertes Secret (siehe Entwarnung unten) — der Schlüssel kommt nachweislich aus den Nutzer-eigenen Einstellungen.

### B9. Google Cloud TTS sendet Mitspielernamen bei aktivem Opt-in

Bestätigt aus zwei unabhängigen Quellen (Welle 1 + Welle 2). Erfordert aktives Opt-in (eigener Google-Cloud-Schlüssel, aktiv in den Einstellungen ausgewählt) — kein automatisches Verhalten. War bereits in `DATA-MODEL.md` korrekt dokumentiert. Der eigentliche Fund ist redaktionell: **`AUDIT.md:119` ("Mitspieler-Namen verlassen das Gerät nachweislich nicht") ist als generelle Aussage nicht mehr haltbar** und sollte präzisiert werden, weil dieser Satz später Grundlage für die App-Store-Datenschutzangaben wird.

### B10. Doppelte Spielernamen beim manuellen Eintippen nicht verhindert

`addPlayer()` (`saufapp.html:7265`) prüft nur auf leere Namen, nicht auf Duplikate — anders als `quickAddPlayer()` (`:7276`), das bereits die richtige Prüfung hat. Führt zu Vermischung von Schlucken/Punkten in der lokalen Bestenliste und kann im Community-Ranking die falsche Person treffen. Fix: eine bereits vorhandene Codezeile kopieren.

---

## C. Entwarnt / kein Fund (nach kritischer Gegenprüfung gestrichen oder stark relativiert)

- **Vokabel-Gemini-API-Key als Secret-Leck:** Entwarnt. Nachweislich derselbe nutzereigene Schlüssel wie bei Google-TTS, kein hartcodierter Wert, kein Verstoß gegen CLAUDE.md Regel 2.
- **Stadt-Land-Fluss ohne Wörterbuchprüfung:** Kein Bug. Entspricht dem Ehrlichkeitsprinzip des Original-Papierspiels — alle Antworten werden für die Runde sichtbar gemacht, die Mitspieler korrigieren selbst.
- **"Lautloser, dauerhafter Punkteverlust" bei fehlgeschlagenen Übertragungen:** Entwarnt durch gezielte Nachprüfung. Die Bedingungen, die zum stillen Verwerfen führen würden, sind über normale Nutzung praktisch nicht erreichbar.
- **App-Backgrounding, Teil "Timer frieren ein":** Von CRITICAL auf einen kleinen NIT/Diskussionspunkt herabgestuft — ein eingefrorener Timer bei App-Wechsel ist für ein Partyspiel eher die freundlichere Variante als ein hart ablaufender Timer während eines Anrufs. Kein eindeutiger Bug.
- **App-Backgrounding, Teil "Spielstand geht bei App-Kill verloren":** Real, aber von CRITICAL auf WARNING (kann warten) herabgestuft. Größere Architekturarbeit (State-Persistenz über 17 Minispiele), Kosten/Nutzen sprechen für "nach dem Launch".
- **Busfahrer-Tiebreak (isoliert betrachtet):** Von CRITICAL auf NIT herabgestuft, da er isoliert keine Punkte-/Datenauswirkung hat (anders als der verwandte, ernstere Fund B3).
- **`@capacitor/core`-Versions-Pinning:** Von WARNING auf NIT herabgestuft — `package-lock.json` ist eingecheckt, das Risiko besteht nur bei einer Installation ohne Lockfile.
- **`get_group_ranking` fehlender Tiebreak, 9× `create policy` ohne `drop if exists`, wirkungsloses `select` in Migration 2, rohe STT-Fehlermeldungen:** Alle auf NIT herabgestuft bzw. als bereits im Code dokumentierte Einschränkung erkannt (keine neue Erkenntnis).

---

## D. Entscheidungen, die vor jeder weiteren Umsetzung von euch (Bastian/Noel) getroffen werden müssen

Diese Punkte kann kein Code allein lösen — eine falsche Annahme hier wäre teurer als gar nichts zu tun. Eskalationsregel aus `CLAUDE.md` gilt, wo zutreffend.

1. **Soll der Nickname eines Monatssiegers nach dessen Kontolöschung in der Rekordliste bleiben, oder auf "Ehemaliges Mitglied" anonymisiert werden?** (betrifft B4, `month_winners.nickname` bleibt schon heute bestehen, technisch bereits so). Fällt unter die Eskalationsregel "Löschen von Nutzerdaten".
2. **Wie soll bei echtem Punktegleichstand der Sieger/Pokal in Trink-Modus-Spielen bestimmt werden** (B3)? Nach Schlucken werten? Zufällig? Gar kein Pokal in diesen Spielen?
3. **Bleiben die optionalen Google-Dienste (TTS-Stimme, Vokabel-KI) im Produkt, und wenn ja, mit welchem Warnhinweis?** (B8, B9) — beeinflusst direkt den Text der noch zu schreibenden Datenschutzerklärung (Issue #1).
4. **Was passiert mit nicht übertragenen Punkten beim Ausloggen** (B2)? Empfehlung dieser Prüfung: verwerfen (einfacher, datensparsamer) statt versuchen aufzubewahren — aber eure Entscheidung.

---

## E. Berührungspunkte mit den bereits bekannten offenen CRITICAL-Punkten (Issue #1, #2)

- **Issue #1 (Rechtsdokumente):** B9 (Google-TTS-Namensversand) und B8 (Gemini-Rateversuche) müssen in die noch zu schreibende Datenschutzerklärung einfließen — die Entscheidung aus D3 sollte **vor** dem Anwalts-/Textbeauftragung fallen, nicht danach. B4/B7 (Löschung/Auskunft unvollständig bei Monats-Tabellen) bedeuten: Eine Datenschutzerklärung, die vollständige Löschung verspricht, wäre aktuell nicht zutreffend — sollte zusammen mit der technischen Behebung erledigt werden.
- **Issue #2 (Altersfreigabe):** A1 (unsichtbarer "Nein"-Knopf bei der 18+-Abfrage) ist eine direkte, technische Berührung mit diesem Thema — unabhängig vom Ausgang der anwaltlichen Klärung sollte der Knopf sichtbar sein. Fällt zusätzlich unter die Eskalationsregel "Altersabfrage".

---

## F. Ist die App aus heutiger Sicht (Code, nicht rechtlich) launch-fähig?

**Nein, mehr als in `STATUS.md` bisher stand.** Bislang hieß es dort, die Blocker seien "rein rechtlich, nicht technisch". Nach dieser Runde stimmt das nicht mehr uneingeschränkt: A1 (Altersabfrage im Hell-Modus unsichtbar) und A2 (keine Möglichkeit, eine Gruppe zu verlassen) sind echte, wenn auch klein zu behebende, technische Launch-Blocker. Die B-Punkte sollten ebenfalls vor Launch erledigt werden, sind aber keine Sicherheits- oder Rechtsnotfälle im engeren Sinn.

**Wichtig gegenüber Runde 1:** Es wurde **keine neue Möglichkeit für Fremdzugriff/Kontoübernahme/Datenpanne** gefunden — die Codebasis bleibt in dieser Hinsicht solide. Die neuen Funde sind überwiegend Korrektheits- und Sichtbarkeitsfehler, keine Sicherheitslücken im klassischen Sinn.

Konkreter Plan mit Priorisierung: siehe `PLAN.md`/`TODO.md`.
