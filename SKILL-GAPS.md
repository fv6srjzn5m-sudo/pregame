# Skill-Lücken (Audit-Runde 2, Stufe 0)

Für jeden der 20 Prüfbereiche aus der Vorgabe geprüft: Gibt es einen passenden Skill (die 6 Projekt-Skills oder einen der allgemeinen System-Skills)? Wenn ja, wird er benutzt. Wenn nicht, steht das hier — nicht stillschweigend improvisiert.

| # | Prüfbereich | Passender Skill? | Bewertung |
|---|---|---|---|
| 1 | XSS-/Token-Kette | `security-check` | ✅ Passt (Injection, Secrets) |
| 2 | RLS: Existenz pro Tabelle | `security-check` | ✅ Passt (nennt RLS-Lücken explizit) |
| 3 | RLS: Livetest mit 2. Konto | — | ❌ **Kein Skill kann das lösen** — das ist kein Skill-Gap, sondern ein Zugriffs-Gap: es braucht echte Supabase-Testkonten und Live-Datenbankzugriff, den ich in dieser Umgebung nicht habe. Auch ein neuer Skill würde daran nichts ändern. |
| 4 | Auth-Fluss (Session/Token/Ablauf/Logout) | `security-check` | 🟡 Passt teilweise — deckt Secrets/Session ab, nicht speziell "Token-Ablauf/Logout-Vollständigkeit" |
| 5 | Abo-/Premium-Manipulierbarkeit | `security-check` | ✅ Passt (nennt Abo-Status explizit) |
| 6 | IDOR | `security-check` | ✅ Passt |
| 7 | Nutzereingaben → UI | `security-check` | ✅ Passt |
| 8 | DB-Schema/Migrationen: Konsistenz | — | ❌ **Gap.** Kein Skill für "sind Schema/Migrationen in sich konsistent" (anders als RLS-Policy-Existenz, das ist `security-check`). Vorschlag: `db-schema-check`. |
| 9 | Art. 15/17 vollständig (inkl. Backups/Logs/Analytics) | `privacy-impact` | 🟡 Passt teilweise — ist auf *neue* Änderungen ausgelegt, nicht auf einen Vollständigkeits-Check einer *bestehenden* Funktion |
| 10 | Datenminimierung Mitspieler-Namen | `privacy-impact` | ✅ Passt |
| 11 | Werbe-SDK Datenabfluss | `privacy-impact` | 🟡 Passt teilweise (kein SDK vorhanden, siehe unten) |
| 12 | Consent/ATT/Store-Abgleich | `release-check` | ✅ Passt (nennt Privacy-Angaben-Abgleich explizit) |
| 13 | Secrets (Bundle/Repo/History/`service_role`) | `security-check` | ✅ Passt |
| 14 | Abhängigkeiten (veraltet/ungenutzt) | — | ❌ **Gap.** `npm audit` läuft automatisch in CI, aber kein Skill für "manuell auf veraltete/ungenutzte Pakete prüfen". Vorschlag: `dependency-audit`. |
| 15 | Berechtigungen `Info.plist`/`AndroidManifest.xml` | `release-check` | 🟡 Passt teilweise — Altersfreigabe ist drin, expliziter Berechtigungs-Check nicht |
| 16 | Spiellogik-Korrektheit (Regeln, Punkte, Rundenablauf) | — | ❌ **Größter Gap.** Kein Skill prüft fachliche Korrektheit der 17 Minispiel-Module. Vorschlag: `game-logic-check`. |
| 17 | Edge Cases (0/1 Spieler, Abbruch, Backgrounding, Netzverlust) | — | ❌ **Gap.** Vorschlag: `edge-case-check`. |
| 18 | Loading/Empty/Error/Offline über alle Screens | — | ❌ **Gap.** `new-component` ist fürs *Bauen* neuer Komponenten, nicht fürs *Auditieren* bestehender Screens. Vorschlag: `screen-state-audit`. |
| 19 | Design-System (Tokens/Buttons/Kontrast) | `new-component` (teilweise) | 🟡 Passt teilweise — Token-Regeln sind drin, ein systematischer Kontrast-/Konsistenz-Audit bestehender Screens nicht. Vorschlag: `design-audit`. |
| 20 | Fehlerbehandlung/Logging (PII) | `privacy-impact` | 🟡 Passt teilweise |

## Zusammenfassung

- **8 von 20** Bereichen haben einen gut passenden Skill.
- **6 von 20** passen nur teilweise (bestehender Skill ist auf *Änderungen* ausgelegt, nicht auf einen *Bestands-Audit*).
- **5 von 20** haben keinen passenden Skill — davon 1 kein Skill-Problem (Bereich 3, braucht Live-Zugriff), 4 echte Lücken.

## Vorgeschlagene neue Skills (nach Nutzen priorisiert)

1. **`game-logic-check`** — größter Gap, betrifft den Kern des Produkts (17 Minispiele). Würde Punkte 16+17 abdecken.
2. **`screen-state-audit`** — betrifft Nutzererlebnis auf jedem Screen. Würde Punkte 18+19 (teilweise) abdecken.
3. **`db-schema-check`** — betrifft Datenintegrität. Würde Punkt 8 abdecken.
4. **`dependency-audit`** — kleinerer Gap, `npm audit` deckt das Wichtigste schon automatisch ab. Würde Punkt 14 abdecken.

**Für diese Prüfrunde selbst:** Die Bereiche ohne passenden Skill werden trotzdem geprüft (über allgemeine Code-Review-Agenten statt eines Skills) — aber das wird unten so gekennzeichnet, nicht als "Skill X hat geprüft" ausgegeben, wenn keiner existierte.
