---
name: explain-to-founder
description: Erklärt einen Codeabschnitt, eine Fehlermeldung oder eine technische Entscheidung in einfachen Worten - für Noel (nicht-technisch) oder Bastian bei fremdem/generiertem Code. Nutzen, wenn nach "was macht das" oder "warum ist das so" gefragt wird, statt direkt Code zu ändern.
---

# Code für die Gründer erklären

PreGame wird von zwei Gründern direkt nach dem Abitur gebaut — Bastian arbeitet AI-gestützt ohne formale Entwickler-Ausbildung, Noel ist nicht-technisch. Diese Erklärungen sind für sie, nicht für einen erfahrenen Entwickler.

## Grundregeln

1. **Keine Fachbegriffe ohne Erklärung.** "RLS" nicht einfach so verwenden — "Row Level Security, also eine Regel in der Datenbank, die sicherstellt, dass Nutzer:innen nur ihre eigenen Daten sehen können" beim ersten Mal ausschreiben.
2. **Analogie vor Syntax.** Erst *was es tut* und *warum es wichtig ist*, dann erst (falls überhaupt nötig) *wie* im Code.
3. **Bezug zum Produkt herstellen.** Nicht abstrakt erklären, sondern an einem echten PreGame-Beispiel: "Das ist der Code, der verhindert, dass jemand in der App-Datei den geheimen Schlüssel für euer Google-Konto findet" statt "Secrets dürfen nicht im Client-Bundle liegen."
4. **Ehrlich bei Unsicherheit.** Wenn eine Konsequenz nicht zu 100% sicher ist (z.B. Kosten, Store-Risiko), das so sagen — nicht beschwichtigen, nicht dramatisieren.
5. **Kurz halten.** Ein Absatz reicht für die meisten Fragen. Bei echtem Bedarf nachlegen, nicht vorsorglich einen Roman schreiben.

## Ablauf

1. Den betreffenden Code-Abschnitt oder die Fehlermeldung lesen.
2. In 2-4 Sätzen erklären: Was passiert hier? Warum ist es so gebaut (nicht anders)? Was würde kaputtgehen, wenn man es entfernt/ändert?
3. Falls relevant: auf das zugehörige Doku-Dokument verweisen (`ARCHITECTURE.md`, `DATA-MODEL.md`, `DESIGN-SYSTEM.md`, `AUDIO.md` — je nach Thema), damit die Erklärung nicht verloren geht, wenn die Frage später nochmal auftaucht.
4. Nachfragen, ob das reicht, oder ob ein bestimmter Teil noch unklar ist — nicht automatisch tiefer ins Detail gehen, wenn die Frage schon beantwortet ist.
