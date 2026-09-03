# Zusammenarbeit mit dem externen Berater

**Berater:** Madalin Stanila
**Rolle:** Consultant, nicht Entwickler. Er hat **Read**-Zugriff auf dieses Repository, damit er Code, Struktur und Projektzustand selbst einsehen kann, um gezielt zu beraten.

## Was er tut — und was er nicht tut

- Er liest Code, PRs, Issues und die Dokumentation in diesem Repo.
- Er schreibt **keinen** Code und erstellt **keine** PRs — er hat bewusst keine Write-Rechte.
- Er wird nur dann um konkrete Umsetzung gebeten, wenn die Gründer an einer Stelle nicht weiterkommen und ihn ausdrücklich darum bitten.

## Zugriff einrichten (einmalig, durch die Gründer)

1. GitHub → Repository → **Settings → Collaborators and teams**
2. Madalin als Collaborator einladen, Rolle **Read**.
3. Nicht mehr als Read vergeben — das ist Absicht, kein Versehen.

## Wie eine Frage an ihn gestellt wird

Eine gute Frage spart beiden Seiten Zeit. Immer diese vier Punkte mitliefern:

1. **Link zum Branch oder PR**, um den es geht (nicht nur "das Ranking-Feature", sondern der konkrete Link).
2. **Konkrete Frage** — möglichst so präzise, dass sie mit einem Vorschlag beantwortbar ist, nicht nur mit "kommt drauf an".
3. **Was schon versucht wurde** — damit er nicht Zeit mit Dingen verbringt, die schon ausprobiert und verworfen wurden.
4. **Fehlermeldung im Wortlaut**, falls vorhanden — kein Paraphrasieren, exakter Text/Screenshot.

### Beispiel

> **Branch:** `feature/subscription-server-check`
> **Frage:** Ist es korrekt, den Apple-Receipt bei jedem App-Start server-seitig gegen die App-Store-Server-API zu validieren, oder reicht ein gecachtes Ergebnis mit TTL?
> **Schon versucht:** Client-seitige Prüfung über `StoreKit` — funktioniert, aber laut `AUDIT.md` manipulierbar (CRITICAL-Finding).
> **Fehlermeldung:** —

## Wo Fragen landen

- Am besten als Kommentar direkt im betreffenden PR (Kontext ist dann automatisch da).
- Für allgemeinere Architektur-Fragen: eigenes Issue mit Label `question-for-consultant`.

## Wenn er Code vorschlägt

Er schreibt in der Regel keinen fertigen Code, sondern Empfehlungen/Snippets als Kommentar. Diese werden von einer der Gründer (Bastian) als eigener Commit/PR umgesetzt und normal reviewt — nicht direkt übernommen, ohne sie zu verstehen.
