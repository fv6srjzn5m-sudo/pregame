# GOALS.md — Grundsatzfragen an Bastian & Noel

Abschnitt 4 der Audit-Runde-2-Vorgabe (Berater Madalin Stanila). Beantwortet am 21.09.2026, direkt im Chat, in 4 Blöcken mit Mehrfachauswahl statt offener Fragen — jede Option mit ihrer Konsequenz. Dieses Dokument ist der Stand an diesem Tag; wenn sich etwas ändert, hier aktualisieren, nicht stillschweigend überholen lassen.

---

## Block 1 — Drei blockierende Entscheidungen

| Frage | Antwort |
|---|---|
| Zielgruppe Alter | **16+** (jüngere Zielgruppe wie ursprünglich angedacht) |
| Rechtsdokumente | **Generator-Dienst** (e-recht24.de, iubenda o. ä.) |
| Rechtsform | **Noch nicht entschieden** — braucht Beratung |

**Konsequenz für Issue #2 (Altersfreigabe):** Die 16+-Entscheidung ist ein Wunsch, keine rechtliche Klärung — Issue #2 bleibt offen und muss trotzdem anwaltlich geprüft werden. Wichtig: 16+ macht die Klärung tendenziell *dringlicher*, nicht überflüssiger, weil Schluck-Tracking bei potenziell Minderjährigen eine strengere rechtliche Prüfung braucht als bei einer reinen 18+-App. Das sollte der Anwalt als klare Vorgabe bekommen, nicht als Formalität.

**Konsequenz für Issue #1 (Rechtsdokumente):** Generator-Dienst ist die schnellere, günstigere Option. Wird unten unter "Reibungspunkte" noch einmal aufgegriffen — die internationale Ausrichtung (Block 3) verträgt sich nicht ohne Weiteres mit einem einzigen Generator-Text für eine Rechtsordnung.

**Rechtsform:** Gehört in denselben Anwaltstermin wie Issue #1/#2 — ein Termin, drei Fragen.

---

## Block 2 — Die nächsten 3 Monate

| Frage | Antwort |
|---|---|
| Hauptziel | **Öffentlicher App-Store-Launch (iOS)** |
| Erfolgsmessung | Installationen/Nutzerzahl **+** Bindung (wie oft/lange gespielt wird) |
| Zeitbudget | **Nebenberuflich, wenige Stunden/Woche** |
| Tempo vs. Sorgfalt | **Sorgfalt vor Tempo** |

**Konsequenz:** Diese vier Antworten zusammen sind ambitioniert — ein öffentlicher Launch bei wenigen Wochenstunden und dem Anspruch, WARNING-Punkte nicht einfach zu überspringen, braucht realistischerweise mehr als ein paar Wochen. Kein Grund, etwas zu überstürzen; aber die Zeitschätzungen in `TODO.md` sollten mit diesem Zeitbudget im Hinterkopf gelesen werden, nicht mit dem Tempo eines Vollzeit-Teams.

---

## Block 3 — Produkt-Umfang

| Frage | Antwort |
|---|---|
| MVP-Umfang kürzen? | **Nein**, aktueller Umfang (17 Minispiele + Community-Ranking) bleibt |
| Freundeslisten/erweitertes Ranking | Wäre schön, **keine Priorität** — offen für später |
| Monetarisierung-Reihenfolge | **Premium-Abo zuerst** |
| Marktreichweite | **International von Anfang an** (mind. DE + EN) |
| iOS/Android | **Beide Plattformen gleichzeitig** |

**Konsequenz Premium zuerst:** Braucht laut `CLAUDE.md` Regel 4 von Anfang an serverseitige Kaufvalidierung — das ist aktuell **nicht** gebaut (`AUDIT.md`: "Premium" ist bisher nur ein optisches Theme, kein echter Kauf-Mechanismus). Größerer technischer Aufwand als Werbung, sollte als eigener Planungsblock behandelt werden, wenn es losgeht — nicht nebenbei.

**Konsequenz International + iOS/Android gleichzeitig:** Beides zusammen ist der aufwendigste Teil dieses gesamten Fragebogens. Konkret:
- Ein Android-Projekt existiert bisher gar nicht (`npx cap add android` wurde nie ausgeführt).
- Android-spezifisches Testen ist von hier aus nicht möglich (kein Android-Gerät/Emulator in dieser Umgebung) — genau wie beim iOS-Audio-Fix bräuchte das echte Geräte bei euch.
- Play-Store-Datenschutzangaben kommen zusätzlich zu den Apple-Angaben dazu.
- Rechtsdokumente für mehrere Sprach-/Rechtsräume sind aufwendiger als ein einzelner Generator-Text (siehe Block 1) — hier lohnt sich eine gezielte Rückfrage beim gewählten Generator-Dienst, ob er mehrsprachige/internationale Abdeckung anbietet, bevor der ganze Text noch einmal neu gemacht werden muss.

Siehe "Reibungspunkte" unten — das steht in einem echten Spannungsverhältnis zum Zeitbudget aus Block 2.

---

## Block 4 — Langfristig

| Frage | Antwort |
|---|---|
| Android/iOS-Frage | (siehe Block 3) |
| Berater-Rolle | **Wie bisher** — read-only, berät, schreibt keinen Code |
| 12-Monats-Vision | **Etabliertes Nischenprodukt mit treuer, kleinerer Community** + **konkretes Monetarisierungs-/Umsatzziel** |
| Entscheidungshoheit bei Uneinigkeit | **Bastian** |

**Konsequenz 12-Monats-Vision:** Beide gewählten Antworten passen zusammen (eine kleine, treue Community *mit* einem klaren Umsatzziel ist kein Widerspruch), aber das konkrete Umsatzziel selbst wurde hier noch nicht beziffert — das braucht ein eigenes, kurzes Gespräch, sobald Premium (Block 3) technisch ansteht.

**Konsequenz Entscheidungshoheit:** Gilt ab jetzt als Faustregel für technisch geprägte Streitfragen. Bei reinen Produkt-/Geschäftsfragen kann das im Einzelfall unpassend sein — dann bitte explizit sagen, dass diese Regel hier nicht gelten soll, statt sie automatisch anzuwenden.

---

## Reibungspunkte — ehrlich benannt, nicht stillschweigend geglättet

Diese Antworten sind alle in sich sinnvoll, aber in Kombination entsteht eine reale Spannung, die besser jetzt sichtbar ist als erst beim Launch-Termin:

**Ambitionierter Umfang vs. begrenzte Zeit.** Öffentlicher Launch + international (DE+EN) + iOS **und** Android gleichzeitig + "Sorgfalt vor Tempo" + nur wenige Wochenstunden — das ist eine deutlich größere Liste an Vorbereitungsarbeit, als das aktuelle `TODO.md`/`PLAN.md` abbildet (die gingen von "iOS zuerst, DACH zuerst" aus, wie es der bisherige Stand nahelegte). Das ist kein Grund, jetzt in Panik etwas zu streichen — aber es lohnt sich, `PLAN.md` in einer der nächsten Sitzungen gezielt gegen diese vier neuen Antworten zu prüfen und ehrlich zu schauen, ob "öffentlicher Launch in den nächsten paar Monaten" bei ein paar Wochenstunden realistisch ist, oder ob eines der Kriterien (Zeitrahmen, Plattform-Gleichzeitigkeit, oder Marktreichweite) nachjustiert werden sollte.

**16+ und die Google-Datenflüsse.** Die optionalen Google-Dienste (TTS-Stimme, Vokabel-KI — Entscheidung C-3, bleiben im Produkt) senden bei aktivem Opt-in Mitspielernamen bzw. Rateversuche an Google. Bei einer 16+-Zielgruppe ist das eine strengere Frage als bei 18+ (Daten Minderjähriger). Das sollte explizit Teil der Anwaltsfrage zu Issue #2 sein, nicht nebenbei mitlaufen.

**Ein Generator-Text für einen internationalen Start.** Generator-Dienste wie e-recht24/iubenda sind in erster Linie auf deutsches/EU-Recht ausgelegt. Für "international von Anfang an" (Block 3) lohnt sich vor der Beauftragung eine kurze Prüfung, ob der gewählte Dienst das wirklich sauber abdeckt — sonst entsteht genau die Situation, vor der `PLAN.md` an anderer Stelle warnt: ein Text, der ein zweites Mal geschrieben (und bezahlt) werden muss.

---

## Was als Nächstes damit passiert

- `PLAN.md`/`TODO.md` sollten bei Gelegenheit gegen diese Antworten gegengeprüft werden (insbesondere die Reihenfolge-Annahmen "iOS zuerst"/"DACH zuerst", die durch Block 3 überholt sind).
- Die drei Themen aus Block 1 gehen so in den nächsten Anwaltstermin (Issue #1, Issue #2, Rechtsform).
- Das konkrete Umsatzziel aus Block 4 wird nachgeholt, sobald Premium (Block 3) technisch geplant wird.
