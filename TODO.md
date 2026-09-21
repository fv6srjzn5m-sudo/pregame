# TODO.md — Abhakbare Liste nach Audit-Runde 2

Begründung der Reihenfolge: siehe `PLAN.md`. Hier steht nur, **was** zu tun ist und **wer** es tut.

**Prioritäten:**
- **JETZT** = sollte diese Woche passieren, blockiert anderes oder richtet gerade laufend Schaden an
- **VOR LAUNCH** = muss erledigt sein, bevor die App in den Store geht
- **NACH LAUNCH** = wichtig, aber kein Grund, den Launch zu verschieben

**Alle Zeitangaben sind grobe Schätzungen** ohne Zugriff auf euer Supabase-Dashboard, App Store Connect oder ein echtes Gerät. Klickwege können in der Oberfläche anders heißen als hier beschrieben.

---

## Block A — Claude Code setzt um

Rein technische Arbeit, kein Entscheidungsbedarf. Wo die Eskalationsregel aus `CLAUDE.md` greift (Auth/Session, Zahlungen, Datenlöschung/-export, Altersabfrage), wird vorher **kurz nachgefragt** — auch bei winzigen Änderungen.

### A-1 · Unsichtbare Knöpfe im Hell-Modus reparieren (A1) — ✅ UMGESETZT (21.09.2026)
- **Priorität:** JETZT
- **Aufwand:** ca. 1–2 Stunden inkl. optischer Nachkontrolle
- **Was:** `color: white` ist hartcodiert und wird im Hell-Modus nirgends überschrieben. Betrifft den "Nein"-Knopf der 18+-Abfrage, "Abbrechen" beim Kontolöschen und beim Statistik-Zurücksetzen, "Ausloggen", "Meine Daten exportieren", die Würfelzahl bei allen Würfelspielen und den "OK"-Knopf nach dem Strafschluck.
- **Konsequenz, wenn es liegen bleibt:** Nutzer im Hell-Modus sehen bei der Altersabfrage nur den roten "Ja, 18+"-Knopf — das drückt systematisch Richtung Altersbestätigung. Würfelspiele sind praktisch unspielbar, die gesetzlich vorgeschriebenen Datenschutz-Knöpfe kaum auffindbar.
- **Hängt ab von:** nichts. Läuft **unabhängig** von der anwaltlichen Klärung zu Issue #2 — der Knopf muss sichtbar sein, egal wie die ausgeht.
- **Eskalationsregel:** ja (Altersabfrage) → kurze Rückfrage vor Umsetzung.
- **Danach:** von Bastian auf echtem Gerät gegenprüfen (→ B-9). Im Browser (Playwright, Light-Theme) bereits verifiziert: Altersabfrage, Bildschirmtitel, Spieler-Avatare lesbar. **Neuer Fund dabei:** Der Einstellungen-Screen hat eigene, bisher nicht erfasste Kontrastprobleme im Hell-Modus (dunkle Formularfelder mit kaum lesbarem Text) — separat zu bewerten, nicht Teil dieses Fixes.

### A-2 · Kniffel: Punkte addieren statt überschreiben (B1) — ✅ UMGESETZT (21.09.2026)
- **Priorität:** JETZT
- **Aufwand:** Minuten (ein Zeichen: `=` → `+=`), plus ein Testspiel
- **Was:** Kniffel ist das einzige von 17 Minispielen, das die Punktzahl überschreibt statt aufzuaddieren.
- **Konsequenz, wenn es liegen bleibt:** Bei jedem gespielten Abend entstehen falsche Ranking-Daten. Die ursprüngliche Entwarnung ("die serverseitige Deckelung fängt das ab") wurde in der Nachprüfung **widerlegt** — die Deckelung wirkt nur nach oben. Wer vorher schon Punkte hat und in Kniffel schwächer spielt, dessen Rundenergebnis wird teilweise oder ganz auf 0 heruntergerechnet. Falsche Einträge sind im Nachhinein nicht mehr von echten unterscheidbar.
- **Hängt ab von:** nichts.
- **Eskalationsregel:** ja (Community-Ranking/Scoring) → kurz absprechen, auch wenn es nur ein Zeichen ist.

### A-3 · Satz zu Mitspielernamen in `AUDIT.md` korrigieren (B9) — ✅ UMGESETZT (21.09.2026)
- **Priorität:** JETZT
- **Aufwand:** Minuten
- **Was:** `AUDIT.md:119` sagt "Mitspieler-Namen verlassen das Gerät nachweislich nicht". Als generelle Aussage ist das nicht mehr haltbar: Bei aktiv eingeschalteter Google-Stimme (eigener Google-Schlüssel, aktiv ausgewählt) werden Mitspielernamen an Google gesendet. Sinngemäß dieselbe Aussage steht auch in `STATUS.md` (Phase 5b) und wird mit korrigiert. In `DATA-MODEL.md` war es bereits korrekt dokumentiert.
- **Konsequenz, wenn es liegen bleibt:** Dieser Satz wird später die Grundlage für die Datenschutz-Angaben im App Store und für die Datenschutzerklärung. Eine falsche Angabe dort ist eine Falschangabe gegenüber Apple, kein Schönheitsfehler.
- **Hängt ab von:** nichts. Reine Dokumentenkorrektur, kein Code.
- **Kein Widerspruch zur Datenminimierungs-Regel:** Der Versand passiert nur bei aktivem Opt-in, nicht automatisch.

### A-4 · Doppelte Spielernamen beim Eintippen verhindern (B10) — ✅ UMGESETZT (21.09.2026)
- **Priorität:** JETZT
- **Aufwand:** Minuten (eine bereits vorhandene Codezeile kopieren)
- **Was:** Das manuelle Hinzufügen prüft nur auf leere Namen, nicht auf Doppelte. Die Schnellauswahl macht es bereits richtig.
- **Konsequenz, wenn es liegen bleibt:** Schlucke und Punkte zweier gleichnamiger Spieler vermischen sich in der lokalen Bestenliste, und im Community-Ranking kann die falsche Person getroffen werden.
- **Hängt ab von:** nichts.

### A-5 · Gruppe verlassen + stärkere Einladungscodes + Bremse (A2 + B6) — ✅ CODE FERTIG (21.09.2026), noch nicht eingespielt
- **Priorität:** VOR LAUNCH (technischer Launch-Blocker)
- **Aufwand:** ca. ein halber bis ganzer Tag (Datenbank-Funktion + Knopf in der App + Codelänge + Bremse), plus Einspielen durch Bastian (→ B-1)
- **Was:** Es gibt aktuell **keine** Möglichkeit, eine Community-Gruppe zu verlassen — weder in der App noch auf dem Server. Gleichzeitig hat der Einladungscode nur 65.536 mögliche Varianten (`PRE-` + 4 Zeichen), und auf dem Beitritt liegt keine Bremse. Alle Codes durchzuprobieren ist eine Sache von Minuten.
- **Konsequenz, wenn es liegen bleibt:** Wer versehentlich oder durch Erraten in einer fremden Gruppe landet, kommt nur durch **komplette Löschung des eigenen Kontos** wieder raus. Zusätzlich kann das Anlegen neuer Gruppen serverseitig in eine Endlosschleife laufen, wenn der Codevorrat ausgeschöpft ist.
- **Umfang:** neue Server-Funktion `leave_group` (entfernt nur den eigenen Zugang, serverseitig geprüft), Knopf in der Oberfläche, Codelänge auf 6–8 Zeichen, Bremse auf dem Beitritt nach dem Muster, das bei der Punkte-Einreichung schon existiert.
- **Hängt ab von:** nichts inhaltlich; zum Ausrollen aber von **B-1** (Supabase-CLI verlinkt).
- **Status:** Migration `supabase/migrations/20260921000001_leave_group_and_stronger_codes.sql`: Einladungscode auf 8 Hex-Zeichen verlängert (16^8 ≈ 4,3 Mrd. statt 65.536 Kombinationen, macht auch das Endlosschleifen-Risiko hinfällig), `join_group()` bekommt dasselbe Rate-Limit-Muster wie `submit_session_score()` (max. 20/Stunde), neue `leave_group(p_group_id)`-RPC (löscht bei letztem Mitglied gleich die ganze Gruppe mit, statt eine leere Karteileiche mit gültigem Code liegen zu lassen). Client: `leaveGroup()` in `src/ranking/index.js` + "Gruppe verlassen"-Knopf im Gruppen-Detail-Screen (mit Bestätigungsdialog). Browser-verifiziert (Playwright): Knopf erscheint, keine Fehler. **Noch nicht live gegen echte Datenbank getestet** — braucht B-1.

### A-6 · Eigenes Anzeigefeld für "Punkte gespeichert/offline" (B5) — ✅ UMGESETZT (21.09.2026)
- **Priorität:** VOR LAUNCH
- **Aufwand:** ca. 1 Stunde
- **Was:** Der Verlierer-Spruch und die Punkte-Bestätigung teilen sich dasselbe Textfeld. Ab 2 Spielern steht der Spruch schon drin, also erscheint die Bestätigung nie.
- **Konsequenz, wenn es liegen bleibt:** Nutzer sehen nie, ob ihre Punkte angekommen sind. **Entwarnung aus der Nachprüfung:** Die Punkte kommen technisch an — der befürchtete "lautlose, dauerhafte Punkteverlust" ist über normale Nutzung praktisch nicht erreichbar. Es fehlt nur die Rückmeldung.
- **Hängt ab von:** nichts.
- **Status:** Neues Element `#community-points-status` im Ergebnis-Screen, unabhängig vom Verlierer-Spruch. `renderResults()` setzt es bei jeder neuen Runde zurück, `reportCommunitySession()` schreibt die Punkte-Meldung jetzt dorthin statt in `#loser-comment`. Browser-verifiziert (Playwright): Verlierer-Spruch bleibt unangetastet, Punkte-Meldung erscheint zusätzlich und sichtbar.

### A-7 · Monats-Tabellen nicht mehr für Nicht-Eingeloggte lesbar machen (Teil von B4) — ✅ CODE FERTIG (21.09.2026), noch nicht eingespielt
- **Priorität:** VOR LAUNCH
- **Aufwand:** ca. 1 Stunde (Datenbank-Änderung), plus Einspielen durch Bastian (→ B-1)
- **Was:** `month_closures` und `month_close_runs` sind aktuell für **jeden Besucher lesbar, auch ohne Login** — inklusive interner Fehlerprotokolle. Wird auf einen engeren Kreis eingeschränkt.
- **Hängt ab von:** nichts. Dieser Teil ist **unabhängig** von der Nickname-Frage (C-1) und sollte nicht darauf warten.
- **Status:** Migration `supabase/migrations/20260921000000_audit_runde_2_dsgvo_fixes.sql` geschrieben und committet (zusammen mit A-8 und A-12, wie hier vorgesehen). **Noch nicht live getestet** — braucht B-1 (Supabase-CLI verlinken), dann `supabase db push`.

### A-8 · Datenauskunft um die drei Monats-Tabellen ergänzen (B7) — ✅ CODE FERTIG (21.09.2026), noch nicht eingespielt
- **Priorität:** VOR LAUNCH
- **Aufwand:** ca. 1–2 Stunden, gehört technisch in dieselbe Datenbank-Änderung wie A-7 und A-12
- **Was:** Der DSGVO-Auskunftsexport deckt `month_winners`, `month_closures` und `month_close_runs` nicht ab — auch für Nutzer mit bestehendem Konto.
- **Konsequenz, wenn es liegen bleibt:** Die gesetzlich vorgeschriebene Datenauskunft ist unvollständig. Und: Eine Datenschutzerklärung, die vollständige Löschung/Auskunft verspricht, wäre so aktuell **nicht zutreffend** (siehe D-3).
- **Eskalationsregel:** ja (Exportieren von Nutzerdaten) → kurze Rückfrage vor Umsetzung.
- **Status:** Gleiche Migration wie A-7/A-12. `export_my_data()` erweitert um `month_winners`, `month_closures_won`, `month_close_runs_won`. **Noch nicht live getestet.**

### A-9 · Ausloggen leert die Punkte-Warteschlange (B2) — ✅ UMGESETZT (21.09.2026)
- **Priorität:** VOR LAUNCH
- **Aufwand:** Minuten (eine Zeile), sobald die Entscheidung steht
- **Was:** Beim Ausloggen bleiben noch nicht übertragene Punkte liegen und werden beim nächsten Login der **nächsten** Person gutgeschrieben. Auf einem geteilten Party-Gerät ist genau das der Normalfall. An anderer Stelle (Kontolöschung) wird es bereits richtig gemacht.
- **Einordnung:** Es entstehen **keine zusätzlichen** Punkte, nur eine Fehlzuordnung, und die serverseitige Bremse (max. 20 Einreichungen pro Stunde) begrenzt das Ausmaß.
- **Hängt ab von:** **C-4** (was soll mit den Punkten passieren?)
- **Eskalationsregel:** ja (Login/Session) → Rückfrage vor Umsetzung.

### A-10 · Sieger-Ermittlung bei Gleichstand korrigieren (B3) — ✅ UMGESETZT (21.09.2026)
- **Priorität:** VOR LAUNCH
- **Aufwand:** ca. 2–4 Stunden, je nachdem, welche Option in C-2 gewählt wird
- **Was:** Bei Mäxchen, Busfahrer, 7-11-Paar, Hoch-oder-Tief und Koffer ändert sich die Punktzahl im Trink-Modus nie. Bei 0:0:0:0 gewinnt deshalb **immer** der zuerst eingetragene Spieler, nicht zufällig. Betrifft nachweislich auch den Punkte-Modus, wenn Strafpunkte mehrere auf 0 drücken.
- **Konsequenz, wenn es liegen bleibt:** Dieser "Sieger" löst einen echten **+20-Punkte-Bonus** im Community-Ranking aus und einen Sieg-Zähler in der lokalen Bestenliste. Wer immer zuerst eingetippt wird, sammelt dauerhaft unverdiente Punkte.
- **Mit erledigen:** Das Busfahrer-Finale bestimmt den "Busfahrer" bei Gleichstand ebenfalls nicht zufällig (`>` statt `>=`). Isoliert nur ein Schönheitsfehler, aber im selben Arbeitsgang mitzunehmen.
- **Hängt ab von:** **C-2**
- **Eskalationsregel:** ja (Community-Ranking/Scoring).

### A-11 · Vokabelspiel muss den Google-Schalter beachten (B8) — ✅ UMGESETZT (21.09.2026)
- **Priorität:** VOR LAUNCH
- **Aufwand:** ca. 1–2 Stunden, je nach Ausgang von C-3
- **Was:** Wird die Google-Stimme in den Einstellungen wieder ausgeschaltet, bleibt der Schlüssel gespeichert — und das Vokabel-Minispiel sendet die Rateversuche der Mitspieler weiterhin an Google.
- **Konsequenz, wenn es liegen bleibt:** Nutzer glauben, sie hätten den Datenversand abgeschaltet, und das stimmt nicht. Das ist der unangenehmste Teil daran — nicht der Versand selbst (der ist Opt-in), sondern der falsche Eindruck.
- **Entwarnung:** Das ist **kein** versehentlich eingebauter Geheimschlüssel. Der Schlüssel kommt nachweislich aus den Einstellungen des Nutzers selbst — kein Verstoß gegen die Secrets-Regel aus `CLAUDE.md`.
- **Hängt ab von:** **C-3**

### A-12 · Nickname von Monatssiegern nach Kontolöschung behandeln (Rest von B4)
- **Priorität:** VOR LAUNCH
- **Aufwand:** ca. 2–3 Stunden, gehört in dieselbe Datenbank-Änderung wie A-7/A-8
- **Was:** Der Nickname eines Monatssiegers bleibt heute nach der Kontolöschung im Klartext in der Rekordliste stehen.
- **Wichtige Präzisierung aus der Gegenprüfung:** Die fehlende Datenbank-Verknüpfung ist **nicht** der Kern des Problems — auch mit korrekter Verknüpfung bliebe der Nickname stehen. Das ist eine Produktentscheidung, kein technischer Fehler. Die Verknüpfung wird trotzdem sauber nachgezogen.
- **Hängt ab von:** **C-1** — ✅ entschieden (Anonymisieren), Code fertig
- **Eskalationsregel:** ja (Löschen von Nutzerdaten).
- **Status (21.09.2026):** `delete_my_account()` setzt `nickname`/`winner_nickname` jetzt in allen drei Tabellen (`month_winners`, `month_closures`, `month_close_runs`) vor der Löschung auf "Ehemaliges Mitglied", **bevor** `auth.users` gelöscht wird (sonst wäre die Zeile über `user_id` nicht mehr auffindbar). Gleiche Migration wie A-7/A-8. **Noch nicht live getestet** — braucht B-1 + B-4 (Löschfunktion einmal echt testen).

### A-13 · Error-Tracking einrichten
- **Priorität:** VOR LAUNCH
- **Aufwand:** ca. ein halber Tag, plus Konto-Anlage durch Bastian (→ B-11)
- **Warum hier:** `AUDIT-2.md` sagt es deutlich — die Funde dieser Runde sind Fehler, die **stillschweigend** falsch laufen. Ohne Error-Tracking merkt im Livebetrieb niemand, wenn so etwas erneut passiert. Das ist laut `INFRASTRUCTURE.md` die größte technische Infrastruktur-Lücke.
- **Bedingung:** Muss **von Anfang an** mit Filterung personenbezogener Daten konfiguriert werden, nicht nachträglich (`AUDIT.md`).
- **Hängt ab von:** nichts inhaltlich.

### A-14 · Spielstand überlebt das Beenden der App im Hintergrund
- **Priorität:** NACH LAUNCH
- **Aufwand:** mehrere Tage (betrifft alle 17 Minispiele)
- **Was:** Beendet das Betriebssystem die App im Hintergrund, ist der laufende Spielstand weg.
- **Einordnung:** In der Gegenprüfung bewusst von CRITICAL auf "kann warten" heruntergestuft. Real, aber Kosten/Nutzen sprechen klar für nach dem Launch.
- **Hängt ab von:** nichts.

---

## Block B — Bastian muss etwas tun (Klickweg im Browser)

Diese Punkte brauchen Zugriff auf Konten, die Claude Code nicht hat. Klickwege so genau wie ohne Live-Zugriff möglich — die Beschriftungen können sich geändert haben.

### B-1 · Supabase-CLI verlinken und die offenen Migrationen einspielen
- **Priorität:** JETZT (blockiert A-5, A-7, A-8, A-12)
- **Aufwand:** ca. 20–30 Minuten
- **Klickweg / Befehle:**
  1. Lokal im Terminal: `supabase login` (öffnet den Browser zur Anmeldung)
  2. `supabase link --project-ref uhsidpjaikqtfcohvwcl`
  3. `migration repair` für die zwei Alt-Migrationen, danach `supabase db push` — die genaue Befehlsfolge steht in `DATA-MODEL.md`
- **Warum:** Ohne verlinkte CLI kann keine der geplanten Datenbank-Änderungen ausgerollt werden. Alles, was Claude Code an der Datenbank baut, bleibt bis dahin eine Datei im Repo und wirkt nicht.

### B-2 · GitHub-Repo scharf schalten
- **Priorität:** JETZT
- **Aufwand:** ca. 10–15 Minuten
- **Klickweg:**
  1. Lokal `claude setup-token` ausführen → Repo → **Settings → Secrets and variables → Actions → New repository secret** → Name `CLAUDE_CODE_OAUTH_TOKEN`. **Ohne das laufen die Review-Workflows rot.**
  2. **Settings → Branches → Add branch protection rule** für `main`: Pflicht-PR, mindestens 1 Review, kein Force-Push
  3. **Settings → Branches**: Required Status Checks aktivieren, sobald die CI-Workflows einmal grün gelaufen sind
  4. **Settings → General**: Squash-Merge / Linear History erzwingen
  5. **Settings → Collaborators**: Madalin als Read-Collaborator einladen
- **Warum:** Steht seit Phase 1 offen (`STATUS.md`). Solange das fehlt, prüft niemand automatisch, was in `main` landet — und genau diese Runde hat gezeigt, wie leicht kleine Fehler durchrutschen.

### B-3 · Zugriffsrechte der Datenbank mit zwei echten Testkonten prüfen
- **Priorität:** VOR LAUNCH
- **Aufwand:** ca. 1 Stunde
- **Klickweg:** Zwei Testkonten in der App anlegen (verschiedene E-Mails), mit Konto A eine Gruppe anlegen, dann mit Konto B versuchen, deren Daten zu sehen. Ergänzend im Supabase-Dashboard: **Table Editor** → Daten beider Konten gegenprüfen.
- **Warum:** Alle Berechtigungsregeln wurden gelesen und logisch nachvollzogen — **aber nie live geprüft.** Genau dieser Live-Test war der einzige der 20 vorgesehenen Prüfbereiche aus Runde 2, der nicht durchgeführt werden konnte. Wir wissen also *nicht* sicher, dass die Regeln in der laufenden Datenbank wirklich so greifen wie im Code.

### B-4 · Löschfunktion und Datenauskunft einmal wirklich testen
- **Priorität:** VOR LAUNCH (sinnvollerweise **nach** A-8/A-12)
- **Aufwand:** ca. 30–45 Minuten
- **Klickweg:** Mit einem Testkonto Punkte sammeln, Gruppe beitreten, dann in der App "Meine Daten exportieren" und danach "Konto löschen". Anschließend im Supabase-Dashboard unter **Table Editor** jede Tabelle einzeln durchsehen: Ist wirklich nichts mehr da?
- **Warum:** Beides wurde bisher nur als Code gelesen, nie ausgeführt (`AUDIT.md`). Solange das nicht getestet ist, darf in der Datenschutzerklärung nichts stehen, was mehr verspricht.

### B-5 · Supabase-Region wirklich verifizieren
- **Priorität:** VOR LAUNCH
- **Aufwand:** ca. 5 Minuten
- **Klickweg:** Supabase-Dashboard → Projekt → **Settings → General** → Region. Es muss konkret Frankfurt (`eu-central-1`) dastehen, nicht nur eine allgemeine "Europe"-Angabe.
- **Warum:** Die Region gehört später in die Datenschutzerklärung. Eine ungeprüfte Annahme darf dort nicht landen.

### B-6 · Auth-Schutz gegen Passwort-Durchprobieren prüfen
- **Priorität:** VOR LAUNCH
- **Aufwand:** ca. 10 Minuten
- **Klickweg:** Supabase-Dashboard → **Authentication → Policies** (bzw. Rate Limits) → prüfen, dass die Standard-Begrenzungen für Login, Registrierung und Passwort-Reset aktiv sind.
- **Warum:** Läuft über Supabase-Standardeinstellungen, konnte von außen nicht verifiziert werden (`AUDIT.md`).

### B-7 · Backup prüfen und einmal echt zurückspielen
- **Priorität:** VOR LAUNCH
- **Aufwand:** ca. 1 Stunde
- **Klickweg:** Supabase-Dashboard → **Database → Backups**: Welcher Tarif, wie oft, wie weit zurück? Dann einen Restore tatsächlich einmal durchführen (idealerweise in ein Testprojekt, nicht über die Produktivdaten).
- **Warum:** Ein Backup, das nie zurückgespielt wurde, ist kein Backup — man weiß erst im Ernstfall, ob es funktioniert.

### B-8 · Auftragsverarbeitungsvertrag (AVV) mit Supabase abschließen
- **Priorität:** VOR LAUNCH
- **Aufwand:** ca. 15–30 Minuten
- **Klickweg:** Supabase-Dashboard → **Settings → Legal / Compliance** (bzw. Organization Settings) → DPA/AVV anfordern bzw. akzeptieren und die Bestätigung ablegen.
- **Warum:** Supabase verarbeitet eure Nutzerdaten im Auftrag — dafür ist dieser Vertrag gesetzlich vorgeschrieben. **Das ist ein Klick-/Ablagevorgang, keine Anwaltsarbeit.**

### B-9 · Hell-Modus auf echtem Gerät gegenprüfen
- **Priorität:** VOR LAUNCH (direkt nach A-1)
- **Aufwand:** ca. 20 Minuten
- **Klickweg:** App im Hell-Modus starten → "Sag oder Trink" öffnen (dort kommt die 18+-Abfrage): Sind **beide** Knöpfe gut lesbar? → Einstellungen → Konto: Sind "Ausloggen" und "Meine Daten exportieren" sichtbar? → ein Würfelspiel starten: Ist die Würfelzahl lesbar?
- **Warum:** Der Fehler entstand genau dadurch, dass niemand die App im Hell-Modus durchgeklickt hat. Dieselbe Lücke soll nicht ein zweites Mal entstehen.

### B-10 · Apple-Datenschutzangaben ausfüllen
- **Priorität:** VOR LAUNCH (erst **nach** C-3 und D-1)
- **Aufwand:** ca. 1 Stunde
- **Klickweg:** App Store Connect → App → **App Privacy** → "Data Collection" Schritt für Schritt durchgehen und mit `DATA-MODEL.md` und der fertigen Datenschutzerklärung abgleichen.
- **Warum:** Diese Angaben müssen zur Datenschutzerklärung passen und zur Entscheidung über die Google-Dienste (C-3). Falsche Angaben sind ein Ablehnungsgrund bei der Prüfung.
- **Hängt ab von:** **C-3**, **D-1**, und inhaltlich von **A-3**.

### B-11 · Konto für Error-Tracking anlegen
- **Priorität:** VOR LAUNCH
- **Aufwand:** ca. 15 Minuten
- **Klickweg:** Bei Sentry (oder einem gleichwertigen Dienst) ein Konto/Projekt anlegen und den Projekt-Schlüssel an Claude Code geben — **als GitHub-Secret, nicht in den App-Code** (Regel 2 in `CLAUDE.md`).
- **Warum:** Voraussetzung für A-13. Serverstandort mitprüfen — der Dienst gehört später in die Datenschutzerklärung.

---

## Block C — Noel und Bastian müssen gemeinsam entscheiden

Das sind die vier Punkte aus `AUDIT-2.md`, Abschnitt D. **Alle vier sind inzwischen entschieden** (21.09.2026, direkt im Chat mit Bastian). Optionen/Folgen bleiben unten stehen, damit die Begründung nachvollziehbar bleibt.

### C-1 · Was passiert mit dem Nickname eines Monatssiegers, wenn er sein Konto löscht? — ✅ ENTSCHIEDEN
- **Entscheidung: Option 2 — auf "Ehemaliges Mitglied" anonymisieren.** Sauberes, uneingeschränktes Löschversprechen. Entsperrt **A-12**.
- **Lage heute:** Der Nickname bleibt in der Rekordliste stehen, im Klartext — auch nach der Löschung.
- Option 1 (so lassen) wäre die Alternative gewesen, hätte aber ein eingeschränktes Löschversprechen in der Datenschutzerklärung erfordert.
- **Fällt unter die Eskalationsregel** "Löschen von Nutzerdaten" (`CLAUDE.md`).

### C-2 · Wie wird bei echtem Punktegleichstand der Sieger bestimmt? — ✅ ENTSCHIEDEN
- **Entscheidung: Option 3 — in diesen fünf Spielen (Mäxchen, Busfahrer, 7-11-Paar, Hoch-oder-Tief, Koffer) gar keinen Pokal und keinen +20-Bonus vergeben.** Ehrlichste Variante, kein zusätzlicher Aufwand für Schluck-basierte Wertung. Entsperrt **A-10**.
- **Lage heute:** Bei Gleichstand gewinnt immer der Spieler, der zuerst in die Namensliste eingetragen wurde — und bekommt dafür +20 Punkte im Community-Ranking.
- Optionen 1 (nach Schlucken werten) und 2 (zufällig bei Gleichstand) waren die Alternativen.

### C-3 · Bleiben die optionalen Google-Dienste im Produkt? — ✅ ENTSCHIEDEN
- **Entscheidung: Option 1 — beide behalten (Google-Vorlesestimme + Vokabel-KI), mit deutlichem Warnhinweis vor der Aktivierung.** Entsperrt **A-11**, fließt in **B-10** (Apple-Datenschutzangaben) und **D-1** (Datenschutzerklärung) ein.
- **Worum es geht:** Zwei Funktionen, die nur laufen, wenn ein Nutzer aktiv einen eigenen Google-Schlüssel einträgt und einschaltet: die Google-Vorlesestimme (sendet Mitspielernamen an Google) und die Vokabel-KI (sendet die Rateversuche der Mitspieler an Google).
- **Folge:** Beide Datenflüsse müssen in der Datenschutzerklärung stehen, die Apple-Datenschutzangaben werden entsprechend ausführlicher, und D-3 (Frage zum Umgang mit Google als Dienstleister) wird beim Anwalt relevant, nicht mehr übersprungen. Der Warnhinweis muss vor der Aktivierung erscheinen, nicht versteckt in den Einstellungen. A-11 muss gebaut werden (Vokabelspiel soll den TTS-Schalter respektieren, sonst bleibt der Schlüssel aktiv, obwohl der Nutzer glaubt, er hätte ihn deaktiviert).
- Optionen 2 (beide entfernen) und 3 (nur eine behalten) waren die Alternativen.

### C-4 · Was passiert beim Ausloggen mit noch nicht übertragenen Punkten? — ✅ ENTSCHIEDEN
- **Entscheidung: Option 1 — verwerfen.** Einfach, datensparsam, keine Fehlzuordnung mehr möglich. Entsperrt **A-9**.
- **Lage heute:** Sie bleiben liegen und landen beim nächsten eingeloggten Nutzer. Auf einem geteilten Party-Gerät ist genau das der Normalfall.
- Option 2 (pro Nutzer aufbewahren) wäre die Alternative gewesen, hätte aber der Datenminimierungs-Regel (Regel 6, `CLAUDE.md`) entgegengelaufen.
- **Fällt unter die Eskalationsregel** "Login/Session".

---

## Block D — Braucht wirklich einen Anwalt

Bewusst kurz gehalten. **Nicht** hier drin: der AVV mit Supabase (B-8, ein Klick- und Ablagevorgang), das Einschränken der Datenbank-Rechte (A-7), das Sichtbarmachen von Knöpfen (A-1) und die Vervollständigung der Datenauskunft (A-8). Das sind technische oder organisatorische Aufgaben, kein Rechtsrat.

### D-1 · Rechtsdokumente erstellen lassen (Issue #1 — bekannt, offen, CRITICAL)
- **Priorität:** JETZT (längste Vorlaufzeit von allem, blockiert den Launch am längsten)
- **Aufwand:** Wochen an Durchlaufzeit, wenig eigene Arbeitszeit
- **Was fehlt:** Nutzungsbedingungen, Datenschutzerklärung, Impressum. Die Registrierung verlangt heute Zustimmung zu Dokumenten, die nur "folgt in Kürze" anzeigen.
- **Was der Anwalt (oder ein Dienst wie e-recht24.de / iubenda, siehe `AUDIT.md`) von euch braucht:**
  - echte Firmendaten für das Impressum (kann nicht erfunden werden)
  - die Antwort auf **C-3** — welche Google-Datenflüsse es künftig gibt
  - den Hinweis, dass Mitspielernamen bei aktivierter Google-Stimme das Gerät verlassen (A-3 / B9)
  - den Hinweis, dass die Rateversuche der Mitspieler bei aktiver Vokabel-KI an Google gehen (B8)
  - die Entscheidung aus **C-1** — bleibt der Nickname eines Monatssiegers nach der Löschung stehen?
  - den ehrlichen Hinweis: **Solange A-8/A-12 nicht umgesetzt sind, wäre ein uneingeschränktes Löschversprechen im Text nicht zutreffend.** Entweder die Technik vorher nachziehen oder den Text entsprechend einschränken.
  - eine Festlegung zu Löschfristen für inaktive Konten (`AUDIT.md`: bisher keine, z. B. "2 Jahre keine Aktivität → Hinweis, dann Löschung")
- **Hängt ab von:** **C-3** und **C-1** — beide **vorher** klären, sonst wird der Text zweimal geschrieben.

### D-2 · Altersfreigabe klären (Issue #2 — bekannt, offen, CRITICAL)
- **Priorität:** JETZT (parallel zu D-1 anfragen)
- **Aufwand:** Wochen Durchlaufzeit, wenig eigene Arbeitszeit
- **Was:** Schluck-Tracking als Kernfeature kollidiert mit der genannten Zielgruppe 16–30. Betrifft Store-Listing, Marketing, AGB und die Altersabfrage in der App.
- **Warum Anwalt und nicht ihr:** Das ist keine Produkt-, sondern eine Rechtsfrage (Jugendschutz, Altersfreigabe-Einstufung). Deshalb wurde bewusst **keine** harte Altersabfrage vorgebaut, bevor das geklärt ist.
- **Zusatzfrage, die aus dieser Runde neu dazukommt:** Fragt mit, ob eine Altersabfrage, bei der die "Nein"-Option schlecht sichtbar ist, für sich genommen bereits ein Problem darstellt — sie war es im Hell-Modus (A1). **Der technische Fix (A-1) wartet aber nicht auf diese Antwort**, er passiert sofort.

### D-3 · Frage zum Umgang mit Google als Dienstleister — nur falls C-3 "behalten" ergibt
- **Priorität:** VOR LAUNCH
- **Aufwand:** eine Frage im selben Anwaltstermin wie D-1
- **Was:** Falls die Google-Dienste bleiben, ist offen, wie das Verhältnis zu Google datenschutzrechtlich zu behandeln ist, wenn der Nutzer seinen **eigenen** Schlüssel einträgt (der AVV mit Google ist laut `AUDIT.md` offen, Serverstandort variabel).
- **Warum Anwalt:** Ob in dieser Konstellation ihr oder der Nutzer verantwortlich seid, ist eine Rechtsfrage — und die Antwort bestimmt, was in der Datenschutzerklärung stehen muss.
- **Hängt ab von:** **C-3**. Bei "entfernen" entfällt dieser Punkt vollständig.

---

## Ehrlichkeitshinweis zum Schluss

Diese Liste ist vollständig **gegenüber dem, was geprüft wurde** — sie ist keine Garantie, dass nichts anderes im Code steckt. Insbesondere gilt weiterhin:

- Die Zugriffsrechte der Datenbank wurden **gelesen, nicht live getestet** (→ B-3).
- Löschfunktion und Datenauskunft wurden **gelesen, nie ausgeführt** (→ B-4).
- Der Audio-Fix aus Phase 7b ist **ungetestet** (kein Xcode verfügbar).
- Der komplette Durchgang aller Screens durch die vier Zustände (Laden / Leer / Fehler / Offline) wurde bisher nur stichprobenartig geprüft (`DESIGN-SYSTEM.md`).
- Vor jedem Store-Upload: `.claude/skills/release-check/` durchgehen und `.claude/skills/full-audit/` erneut laufen lassen — nicht nur einmalig.
