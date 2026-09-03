## 0. Kontext, den Claude Code kennen muss

**Team:** Zwei Gründer, direkt nach dem Abitur. Bastian ist der technische Mitgründer, hat aber keine formale Entwickler-Ausbildung und arbeitet überwiegend AI-gestützt ("Vibe Coding"). Noel ist nicht-technisch. Das ist kein Problem, muss aber die Arbeitsweise prägen.

**Stack (Stand jetzt):** HTML/CSS/JavaScript, verpackt via Capacitor für iOS und Android. Entwicklung in Cursor, Build/Deployment über Xcode. Einzelne native iOS-Teile (z. B. Audio-Session) in Swift. Ein testbarer Prototyp existiert.

**Produkt:** PreGame — Party- und Trinkspiel-App mit digitalem Spielleiter, Schluck-Tracking und Rankings. Freemium: Werbung in der Gratis-Version, Premium-Abo entfernt Werbung und schaltet Spiele frei.

**Externer Berater:** Madalin Stanila. Rolle: Consultant, nicht Entwickler. Er bekommt Lesezugriff auf das Repository, damit er den Code einsehen und gezielt beraten kann. Er schreibt **keinen** Code, außer die Gründer bitten ihn ausdrücklich darum, weil sie an einer Stelle nicht weiterkommen. Das Setup muss so gebaut sein, dass ein Außenstehender den Code, die Struktur und den Zustand des Projekts schnell versteht — genau darauf zielen mehrere Phasen unten ab.

**Wie Claude Code arbeiten soll:**
- Erklärend, nicht nur ausführend. Bei jeder Änderung kurz sagen, *warum*.
- Keine Abkürzungen bei Sicherheit und Datenschutz, auch wenn es länger dauert.
- Bei Unklarheiten fragen statt annehmen — besonders bei allem, was Nutzerdaten, Zahlungen oder Login betrifft.
- Alles dokumentieren, was du einrichtest. Wenn ein Dritter (Madalin) draufschaut, muss er es ohne Rückfragen verstehen.

---

## Phase 1 — Repository- und Zusammenarbeits-Grundlagen

Ziel: Das Projekt ist von außen verständlich und niemand arbeitet mehr direkt auf `main`.

1. **Git-Hygiene prüfen und herstellen**
   - `.gitignore` prüfen: `node_modules/`, Build-Artefakte, `.env*`, Xcode-User-Daten (`*.xcuserdatad`), Keystores, Provisioning-Profiles, `*.p8`/`*.p12` — nichts davon darf im Repo liegen.
   - **Kritisch:** Prüfe die gesamte Git-History auf versehentlich eingecheckte Secrets (API-Keys, Passwörter, Tokens). Falls du welche findest: melden, den betroffenen Key als kompromittiert behandeln (rotieren lassen!) und erklären, dass Löschen der Datei allein nicht reicht, weil die History sie behält.

2. **Branch-Strategie einrichten**
   - `main` = immer deploybar. Kein direkter Push.
   - Feature-Branches nach Schema `feature/<kurzbeschreibung>`, `fix/<kurzbeschreibung>`.
   - Branch Protection auf `main`: Pull Request erforderlich, mindestens ein Review, Force-Push verboten, Statuschecks müssen grün sein.

3. **Repository lesbar machen**
   - `README.md` schreiben: Was ist PreGame, wie startet man das Projekt lokal, welche Befehle gibt es, wie baut man für iOS/Android, welche externen Dienste werden benutzt.
   - `ARCHITECTURE.md` schreiben: Ordnerstruktur, wo die Spiellogik liegt, wo der State verwaltet wird, wo Capacitor-Plugins angebunden sind, welche nativen Swift-Teile existieren und warum.
   - `.github/PULL_REQUEST_TEMPLATE.md` anlegen mit Checkliste: Was wurde geändert? Wurde Auth/Zahlung/Daten berührt? Wurde manuell getestet? Screenshots bei UI-Änderungen?

4. **Zugriff für den Berater vorbereiten**
   - Die Gründer laden Madalin als Collaborator mit **Read**-Rechten ein (nicht Write — er soll bewusst nicht committen können).
   - `CONSULTING.md` anlegen: Wie eine Frage an ihn gestellt wird — Link zum Branch/PR, konkrete Frage, was schon versucht wurde, Fehlermeldung im Wortlaut. Das spart beiden Seiten enorm Zeit.

---

## Phase 2 — AI-Code-Review in die Pull-Request-Pipeline

Ziel: Jeder PR wird automatisch geprüft, bevor ein Mensch draufschaut.

**Optionen (eine wählen, nicht alle):**

| Option | Charakter |
|---|---|
| **CodeRabbit** | Fertiges Produkt, GitHub-App, inline PR-Kommentare, wenig Konfiguration. Schnellster Einstieg. |
| **Sourcery** | Ähnlich, stärker auf Refactoring-Vorschläge ausgelegt. |
| **Claude Code GitHub Action** | Maximale Kontrolle über den Prüf-Prompt. Passt hier am besten, weil der Review-Fokus stark angepasst werden soll. |

**Empfehlung für PreGame:** Claude Code GitHub Action, weil der Review-Prompt genau auf die kritischen Bereiche zugeschnitten werden kann (siehe Phase 3).

**Einrichtung (aktueller Stand der offiziellen Doku):**

Der schnellste Weg ist `/install-github-app` direkt aus Claude Code heraus — das installiert die GitHub-App, legt das Auth-Secret an und erstellt die Workflow-Dateien als PR. Alternativ manuell.

**Authentifizierung: Abo, kein API-Key.** Das Team arbeitet mit einem Claude-Abo, nicht mit API-Guthaben. Deshalb ausschließlich der OAuth-Weg:

1. Lokal `claude setup-token` ausführen → erzeugt einen langlebigen Token, der über das bestehende Abo authentifiziert (verfügbar auf Pro, Max, Team und Enterprise).
2. Diesen Token als Repository-Secret unter dem Namen `CLAUDE_CODE_OAUTH_TOKEN` anlegen.
3. In allen Workflows `claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}` verwenden — **niemals** `anthropic_api_key`. Viele Beispiel-Workflows im Netz zeigen den API-Key-Weg; die entsprechende Zeile muss ersetzt werden, sonst laufen Kosten über API-Billing statt über das Abo.

Zu beachten: Der Token hängt an dem Abo der Person, die ihn erzeugt hat (also an Bastians Account, wenn er ihn anlegt). Läuft das Abo aus oder wird das Passwort geändert, muss der Token neu erzeugt werden. Den Token niemals in eine Datei im Repo schreiben — nur als GitHub-Secret.

Beispiel-Workflow für automatisches Review bei jedem PR (`.github/workflows/claude-code-review.yml`):

```yaml
name: Code Review
on:
  pull_request:
    types: [opened, synchronize, ready_for_review, reopened]
jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 1
      - uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          plugin_marketplaces: "https://github.com/anthropics/claude-code.git"
          plugins: "code-review@claude-code-plugins"
          prompt: "/code-review:code-review --comment ${{ github.repository }}/pull/${{ github.event.pull_request.number }}"
          claude_args: '--allowedTools "mcp__github_inline_comment__create_inline_comment"'
```

Wichtig zu verstehen:
- Ohne `--comment` schreibt Claude sein Review nur ins Workflow-Log statt in den PR.
- Die `claude_args`-Zeile mit `--allowedTools` muss dableiben, sonst startet der MCP-Server für Inline-Kommentare nicht.
- Draft-PRs und triviale PRs werden übersprungen.
- Secrets werden bei Fork-PRs von GitHub zurückgehalten — auf öffentlichen Repos läuft das Review nur für Branches im eigenen Repo.

**Zusätzlich einrichten:** Einen zweiten Workflow für `@claude`-Mentions in Issues und PR-Kommentaren, damit die Gründer direkt im PR nachfragen können ("@claude warum ist das unsicher?").

**Kostenkontrolle nicht vergessen** — jeder Lauf verbraucht GitHub-Actions-Minuten und Tokens. Setze `--max-turns`, ein Workflow-Timeout und GitHub-Concurrency-Limits, und halte `CLAUDE.md` knapp, weil sie bei jedem Lauf mitgelesen wird.

---

## Phase 3 — Den Review-Prompt auf Architektur trimmen, nicht auf Syntax

Standard-AI-Reviews meckern über Formatierung und Variablennamen. Das ist für dieses Projekt wertlos — dafür gibt es Linter.

Lege `.claude/review-guidelines.md` an und referenziere sie aus `CLAUDE.md`. Inhalt:

**Der Reviewer soll gezielt suchen nach:**
- Fehlern in der Geschäftslogik (Spielregeln, Punktevergabe, Rundenlogik, Abo-Status-Prüfung)
- Injection-Vektoren (SQL, NoSQL, Command, XSS über `innerHTML`)
- unbehandelten Edge Cases (leere Spielerliste, ein einzelner Spieler, App-Absturz mitten in der Runde, Netzwerkverlust, Wiedereinstieg nach Backgrounding)
- N+1-Queries und unnötigen Netzwerk-Roundtrips
- Race Conditions bei parallelen Spielaktionen
- fehlender serverseitiger Validierung (alles, was nur im Client geprüft wird, ist wirkungslos)
- Secrets im Client-Code

**Der Reviewer soll explizit ignorieren:**
- Stil- und Formatierungsfragen
- Namenskonventionen, außer sie machen den Code unverständlich
- Kommentar-Dichte

**Der Reviewer soll immer eskalieren, wenn ein PR berührt:**
- Login/Auth/Session
- Zahlungen, In-App-Käufe, Abo-Status
- Löschen oder Exportieren von Nutzerdaten
- Alterseinstufung/Altersabfrage
- Werbe-SDK-Integration (Datenweitergabe!)

**Severity-Schema festlegen:**
- `CRITICAL` — Sicherheitslücke, Datenverlust, Geschäftslogik kaputt → blockiert Merge
- `WARNING` — sollte gefixt werden, blockiert nicht
- `NIT` — optional, darf ignoriert werden

---

## Phase 4 — Vollständige CI/CD-Pipeline und Merge-Gates

Ziel: Kein Code kommt unkontrolliert nach `main`, und kein Build kommt unkontrolliert in einen Store.

### 4.1 Merge-Gates

1. **Required Status Checks** auf `main` aktivieren: PR kann nicht gemergt werden, solange Checks rot sind.
2. Der Review-Workflow muss so exiten, dass `CRITICAL`-Findings zu einem Fail führen, `WARNING` nicht.
3. Linear History erzwingen (Squash-Merge), damit die History für einen Außenstehenden lesbar bleibt.

### 4.2 CI-Stufe (läuft bei jedem Pull Request)

Als eigener Workflow `.github/workflows/ci.yml`, jeder Schritt ein eigener Statuscheck:

| Check | Zweck | Blockierend |
|---|---|---|
| **Install & Build** | Web-Build plus `npx cap sync` — fängt gebrochene Capacitor-Konfiguration früh | Ja |
| **Lint** (ESLint) | Offensichtliche Fehler, nicht Stil | Ja |
| **Typprüfung** | Falls TypeScript eingeführt wird — sehr empfehlenswert für ein AI-gestützt entwickeltes Projekt, weil es ganze Fehlerklassen automatisch abfängt | Ja, sobald vorhanden |
| **`npm audit --audit-level=high`** | Bekannte Sicherheitslücken in Abhängigkeiten | Ja |
| **Secret-Scan** (z. B. Gitleaks als Action) | Verhindert, dass Keys jemals eingecheckt werden — dauerhaft, nicht nur einmalig in Phase 1 | Ja |
| **Tests** | Solange keine Tests existieren: mindestens Smoke-Tests für die Kern-Spiellogik anlegen. Der Check darf nicht "0 Tests, alles grün" melden | Ja, sobald vorhanden |
| **AI-Review** (Phase 2/3) | Architektur, Logik, Sicherheit | Nur bei `CRITICAL` |

### 4.3 CD-Stufe (nach Merge auf `main`)

**Grundregel: niemals direkt vom Merge in den öffentlichen Store.** Die Kette muss sein:

```
Merge auf main
   → automatischer Build
   → interne Testspur (TestFlight / Google Play Internal Testing)
   → manuelle Freigabe durch die Gründer
   → Store-Release
```

Konkret einzurichten:
- **Automatischer Build und Upload in die Testspur** bei jedem Merge auf `main`. Für iOS/Android-Builds aus GitHub Actions heraus ist Fastlane der Standardweg; alternativ Expo EAS oder Codemagic, wenn Fastlane zu viel Konfigurationsaufwand ist.
- **Signing-Credentials ausschließlich als GitHub-Secrets** (Distribution-Zertifikat, Provisioning-Profile, Android-Keystore, App-Store-Connect-API-Key). Nie im Repo. Das ist derselbe Fehler wie Secrets im Client-Code, nur mit größerem Schaden.
- **Versionsnummer automatisch erhöhen** beim Build, damit keine Uploads wegen doppelter Build-Nummer abgelehnt werden.
- **Manueller Freigabe-Schritt** als GitHub Environment mit Required Reviewer — so kann kein Automatismus versehentlich veröffentlichen.
- **Getrennte Umgebungen**: Dev, Staging (interne Testspur), Production. Jede mit eigener Datenbank-Instanz und eigenen Keys. Auf keinen Fall mit Produktionsdaten testen.
- **Rollback-Plan dokumentieren**: Bei mobilen Apps gibt es kein echtes Rollback — ein fehlerhafter Release lässt sich nur durch einen neuen Release ersetzen, und der braucht Store-Review-Zeit. Deshalb: Feature-Flags einbauen, damit ein problematisches Feature serverseitig abgeschaltet werden kann, ohne einen neuen Store-Build zu brauchen. Für ein kleines Team ist das der wichtigste Sicherheitsmechanismus überhaupt.
- **Staged Rollout nutzen** (Google Play: prozentualer Rollout; iOS: Phased Release), damit ein Fehler nicht sofort alle Nutzer trifft.

### 4.4 Was CI/CD nicht ersetzt

Ein AI-Review und eine grüne Pipeline ersetzen kein manuelles Testen auf echten Geräten. Für PreGame explizit vor jedem Release manuell prüfen: eine vollständige Spielrunde von Anfang bis Ende, auf einem echten iPhone und einem echten Android-Gerät, inklusive Abo-Kauf im Sandbox-Modus.

---

## Phase 5 — Rechtliche und Datenschutz-Schicht

**Wichtige Einordnung vorweg, die Claude Code den Gründern so weitergeben soll:** Generatoren wie Termly oder privacypolicies.com liefern die Basisdokumente in kurzer Zeit. Sie machen ein Projekt aber **nicht** "vollständig rechtlich abgesichert" — sie sind das Minimum, nicht die Absicherung. Bei PreGame kommen zwei Dinge dazu, die kein Generator löst (siehe unten).

### 5.1 Pflichtdokumente

| Dokument | Status | Quelle |
|---|---|---|
| **Impressum** | In Deutschland gesetzlich vorgeschrieben (DDG). Fehlt es → Abmahnrisiko. Wird von internationalen Generatoren oft gar nicht erzeugt. | e-recht24.de (kostenlos) |
| **Datenschutzerklärung** | DSGVO-Pflicht. Muss exakt zu Apples Privacy-Angaben und Googles Data-Safety-Formular passen — Abweichungen sind ein häufiger Store-Ablehnungsgrund. | iubenda (App-Vorlagen), e-recht24, Termly |
| **AGB / Nutzungsbedingungen** | Haftungsbegrenzung, Nutzungsregeln, Abo- und Kündigungsbedingungen, Altersgrenze, Streitbeilegung. | Generator + Anpassung |
| **AVV (Auftragsverarbeitungsverträge)** | Mit jedem Dienst, der in eurem Auftrag Daten verarbeitet: Hosting, Analytics, Werbenetzwerk, Auth-Anbieter. | Beim jeweiligen Anbieter abschließen |

### 5.2 Technisch umzusetzen (nicht nur zu dokumentieren)

- **"Meine Daten löschen"-Funktion in der App** — DSGVO Art. 17. Muss vollständig löschen, nicht nur das Konto deaktivieren. Apple verlangt für Apps mit Kontoerstellung ohnehin eine In-App-Kontolöschung.
- **Datenauskunft/Export** — DSGVO Art. 15.
- **Einwilligungs-Banner für Werbe-Tracking** — sobald ein Werbe-SDK eingebunden wird, ist das nicht optional. Auf iOS zusätzlich App Tracking Transparency (ATT).
- **Consent-Zustand persistent speichern und respektieren** — nicht bei jedem App-Start neu fragen und nicht ignorieren.
- **Datenminimierung prüfen:** Laut Frage 17 des Readiness-Checks sollen Nickname, E-Mail, Abo-, Spiel- und Ranking-Daten erhoben werden, bei Mitspielern Namen und Spielwerte. Claude Code soll jedes Feld einzeln hinterfragen: *Braucht die App das wirklich für eine Funktion?* Namen von Mitspielern, die die App gar nicht installiert haben, sind besonders heikel — prüfen, ob die rein lokal auf dem Host-Gerät bleiben können, statt auf einen Server zu wandern.
- **CCPA nur relevant, wenn kalifornische Nutzer bedient werden.** Für einen Launch mit Fokus DACH zunächst DSGVO priorisieren, CCPA-Opt-out später ergänzen, wenn US-Launch kommt.

### 5.3 Der Punkt, den kein Generator löst

PreGame hat **Schluck-Tracking als Kernfeature** — also häufigen, aktiven Alkoholbezug, nicht bloß eine Erwähnung. Vergleichbare Apps mit dieser Intensität sind im App Store mit **18+** eingestuft. Die im Readiness-Check genannte Zielgruppe von **16–30 Jahren** kollidiert damit direkt, und die DSGVO-Einwilligungsgrenze liegt in Deutschland bei 16 Jahren.

**Claude Code soll hier keine Rechtsauskunft erfinden.** Stattdessen: die Gründer darauf hinweisen, dass dies vor dem Launch anwaltlich geklärt werden muss (Jugendschutz, Haftung, Store-Einstufung), und dass die Entscheidung 18+ vs. entschärfte 16+-Variante Auswirkungen auf Store-Listing, Marketing, AGB und Altersabfrage in der App hat. Bis diese Entscheidung getroffen ist, keine Altersabfrage-Logik hart verdrahten.

---

## Phase 5b — Datenbank-Entscheidung

Diese Entscheidung fällt vor der Infrastruktur-Arbeit, weil sie Auth, Sicherheitsmodell und Datenschutz-Posture gleichzeitig festlegt.

### Der wichtigste Punkt zuerst: Wie viel muss überhaupt in eine Datenbank?

PreGame ist im Kern ein Pass-the-Phone-Spiel — eine Gruppe, ein Gerät. Das bedeutet: **der größte Teil der Spieldaten muss die Cloud nie sehen.** Claude Code soll die Datenhaltung nach diesem Prinzip aufteilen:

| Datenkategorie | Wo | Begründung |
|---|---|---|
| Namen der Mitspieler, laufende Runde, Schluckzähler der aktuellen Session | **Nur lokal auf dem Gerät** (Capacitor Preferences für Kleinigkeiten, SQLite-Plugin für strukturierte Daten) | Mitspieler haben die App nicht installiert und nie eingewilligt. Ihre Namen auf einen Server zu schicken wäre DSGVO-rechtlich der heikelste Teil der ganzen App. Bleibt es lokal, entfällt das Problem vollständig. |
| Spielinhalte, Kartendecks, Regeln | **Im App-Bundle** oder als versioniertes Asset-Download | Kein Nutzerbezug, keine DB nötig |
| Account (Nickname, E-Mail), Abo-Status, eigene Langzeit-Statistik | **Cloud-DB** | Muss geräteübergreifend und wiederherstellbar sein |
| Globale Rankings, Freundeslisten | **Cloud-DB**, aber laut eigener Antwort auf Frage 11 erst nach dem Launch | Nicht MVP |

Für den MVP heißt das konkret: Es ist möglich, dass **fast nichts** in die Cloud muss, solange es kein Konto-System und keine Cross-Device-Statistik gibt. Claude Code soll das explizit prüfen und den Gründern sagen, wenn die einfachste korrekte Antwort lautet: *"Für v1 brauchst du noch gar keine Datenbank, nur lokalen Speicher."* Das spart Geld, Zeit und den gesamten DSGVO-Aufwand für Server-Daten.

### Empfehlung, sobald eine Cloud-DB gebraucht wird

**Supabase, Region EU (Frankfurt, `eu-central-1`).**

Begründung für genau dieses Projekt:
- **Postgres mit Row Level Security** — RLS ist der zentrale Schutz aus Layer 8. Bei Supabase ist das eingebaut und deklarativ; bei einer selbst aufgesetzten DB müsste das Team das Berechtigungsmodell selbst korrekt bauen, was realistisch schiefgeht.
- **Auth ist mitgeliefert** — deckt die Regel "keine selbstgebaute Auth" ab, ohne einen weiteren Anbieter dazuzunehmen.
- **Data Residency in Frankfurt** ist wählbar, und Supabase stellt einen Auftragsverarbeitungsvertrag (DPA/AVV) bereit — beides brauchen die Gründer für Phase 5.
- Kostenloser Tier reicht für Prototyp und Launch; Pro liegt bei ca. 25 $/Projekt/Monat, wenn es wächst.
- Gute JavaScript-Client-Bibliothek, passt direkt zum Capacitor-Stack.

**Wichtig bei der Regionswahl:** Nicht die allgemeine Region "Europe" wählen, sondern explizit Frankfurt. Die allgemeine Gruppierung kann in London oder Zürich landen — beide nicht in der EU, was die Transfer-Bewertung unnötig verkompliziert.

**Ehrlicher Vorbehalt, den Claude Code weitergeben soll:** Supabase ist ein US-Unternehmen (Delaware). Die Frankfurt-Region löst *Data Residency*, aber nicht *Data Sovereignty* — unter dem US CLOUD Act bleibt theoretisch ein Zugriffsrisiko, das sich vertraglich nicht wegverhandeln lässt. Für eine Party-App mit Nickname, E-Mail und Spielstatistiken ist dieses Risiko vertretbar; für Gesundheits- oder Finanzdaten wäre es das nicht. Diese Einschätzung soll bewusst dokumentiert werden, nicht stillschweigend getroffen.

### Alternativen, falls Supabase nicht passt

| Option | Wann sinnvoll | Vorbehalt |
|---|---|---|
| **Firebase (Firestore)** | Wenn extrem schnelles Prototyping und Realtime im Vordergrund stehen | Google, US-zentrisch; Sicherheitsregeln statt RLS und in der Praxis fehleranfälliger; DSGVO-Posture für DACH schwächer |
| **Appwrite / Nhost / PocketBase** | Wenn EU-Souveränität hohe Priorität bekommt | Kleinere Ökosysteme, mehr Eigenarbeit |
| **Self-hosted Postgres (z. B. bei Hetzner)** | Maximale Kontrolle und EU-Souveränität | Das Team muss Betrieb, Updates, Backups und Sicherheit selbst übernehmen — für zwei Nicht-Admins **nicht empfohlen** |
| **Nur lokaler Speicher (SQLite via Capacitor)** | Für den MVP realistisch die beste Antwort | Keine Cross-Device-Synchronisation, kein globales Ranking |

### Was Claude Code in dieser Phase konkret liefern soll

1. Analyse: Welche Daten braucht die App **heute** wirklich serverseitig? Ergebnis als Tabelle in `DATA-MODEL.md`.
2. Falls Cloud-DB nötig: Schema-Entwurf mit RLS-Policies **von Anfang an** — nicht "erst Tabellen, RLS später". Jede Tabelle bekommt eine Policy, bevor sie Daten enthält.
3. Migrations-Setup, damit Schema-Änderungen versioniert und nachvollziehbar sind (nicht per Klick im Web-UI).
4. Abo-Status **niemals** nur im Client speichern. Die Prüfung, ob Premium aktiv ist, muss serverseitig gegen den Store-Receipt validiert werden — sonst ist Premium mit minimalem Aufwand freischaltbar.
5. Backup-Strategie festlegen und **einmal einen Restore testen**. Ein ungetestetes Backup zählt nicht.
6. AVV mit dem gewählten Anbieter abschließen und in `INFRASTRUCTURE.md` vermerken.

---

## Phase 6 — Die fehlenden Infrastruktur-Schichten

Ein Frontend plus (teilweise) eine Datenbank ist ein Prototyp. Für ein echtes Produkt fehlen die meisten der folgenden Schichten. Claude Code soll für **jede** Schicht den Ist-Zustand feststellen, in `INFRASTRUCTURE.md` dokumentieren und einen konkreten nächsten Schritt vorschlagen — nach Priorität, nicht alle gleichzeitig.

| # | Schicht | Was für PreGame konkret zu klären ist |
|---|---|---|
| 1 | **Frontend-Foundations** | Struktur, State-Management, Routing, Build-Pipeline |
| 2 | **APIs & Backend-Logik** | Gibt es überhaupt ein Backend? Wo läuft Abo-Validierung? (Muss serverseitig!) |
| 3 | **Datenbank & Storage** | Schema, Migrationen, Backups |
| 4 | **Auth & Permissions** | **Nicht selbst bauen.** Fertigen Dienst nutzen (Firebase Auth, Supabase Auth, Clerk). Selbstgebaute Auth ist die häufigste Sicherheitslücke bei Erstprojekten. |
| 5 | **Hosting & Deployment** | Wo liegt das Backend? Getrennte Umgebungen für Dev/Staging/Prod? |
| 6 | **Cloud & Compute** | Serverless vs. Container — für dieses Team eher Managed/Serverless |
| 7 | **CI/CD & Versionskontrolle** | Phasen 1–4 dieses Dokuments |
| 8 | **Security & Row Level Security** | Bei Supabase/Firebase: RLS-Policies sind *das* zentrale Schutzschild. Ohne RLS kann jeder Nutzer die Daten aller anderen lesen. Hohe Priorität. |
| 9 | **Rate Limiting** | Auf Login, Registrierung, Passwort-Reset — gegen automatisierten Missbrauch |
| 10 | **Caching & CDN** | Für statische Assets und Spielinhalte |
| 11 | **Load Balancing & Scaling** | Später relevant, jetzt nur Architektur nicht dagegen bauen |
| 12 | **Error Tracking & Logs** | **Früh einrichten** (z. B. Sentry). Ohne das merkt man Abstürze bei Nutzern nie. Wichtig: keine personenbezogenen Daten in Logs. |
| 13 | **Availability & Recovery** | Backups, die getestet wurden. Ein ungetestetes Backup ist kein Backup. |

**Realistische Priorisierung für dieses Team:** 4 (Auth) → 8 (RLS) → 12 (Error Tracking) → 2 (serverseitige Abo-Validierung) → 3 (Backups) → 9 (Rate Limiting). Der Rest folgt, wenn es Nutzer gibt.

---

## Phase 7 — Design-System und UI-Grundlagen

Ohne Design-System entsteht bei AI-gestützter Entwicklung zwangsläufig Chaos: jeder neue Button ist ein neuer Button. Das muss vor der nächsten größeren UI-Arbeit stehen.

### 7.1 Design-Tokens definieren

Claude Code soll eine einzige Quelle der Wahrheit anlegen (CSS Custom Properties in einer `tokens.css`) mit:
- **Farben** — semantisch benannt, nicht nach Aussehen: `--color-surface`, `--color-text-primary`, `--color-danger`, nicht `--blau-hell`
- **Typografie-Skala** — feste Stufen, keine willkürlichen `px`-Werte
- **Spacing-Skala** — z. B. 4/8/12/16/24/32/48
- **Radien, Schatten, Border-Widths**
- **Motion-Tokens** — Dauer und Easing als Variablen

**Regel für alle künftigen Arbeiten:** Keine hartcodierten Farb-, Abstands- oder Schriftwerte im Komponenten-Code. Nur Tokens. Das in `CLAUDE.md` als verbindliche Regel eintragen.

### 7.2 Komponenten-Inventar

Bestehende UI durchgehen und in `DESIGN-SYSTEM.md` dokumentieren: Welche Buttons existieren? Welche Varianten braucht es wirklich (`primary`, `secondary`, `ghost`, `danger`)? Welche Größen? Danach: doppelte/abweichende Varianten zusammenführen, sodass es pro Zweck genau **eine** Komponente gibt.

Für jede Komponente alle Zustände definieren: `default`, `hover`, `active`, `focus`, `disabled`, `loading`. Fehlende Zustände sind der häufigste Grund, warum eine App "unfertig" wirkt.

### 7.3 Die Zustände, die Prototypen immer fehlen

Für **jeden** Screen müssen vier Zustände existieren:
- **Loading** — Skeleton oder Spinner, kein weißer Bildschirm. Bei Aktionen: Button in Ladezustand, damit nicht doppelt getappt wird.
- **Empty** — was steht da, wenn noch keine Spiele gespielt wurden, keine Freunde hinzugefügt sind, kein Ranking existiert? Empty States sind Onboarding-Chancen, kein Fehlerfall: erklären, was hier später steht, und eine Aktion anbieten.
- **Error** — verständliche Meldung plus Wiederholen-Möglichkeit. Keine technischen Fehlermeldungen an Nutzer durchreichen.
- **Offline** — besonders relevant: Partys finden oft ohne gutes Netz statt. Was passiert mitten in der Runde bei Verbindungsverlust?

### 7.4 UI-Platzierung und Ergonomie

Die App wird in Gruppen, oft einhändig, in schlechtem Licht und von angetrunkenen Menschen benutzt. Daraus folgen harte Anforderungen:
- Primäraktionen im unteren Bildschirmdrittel (Daumenreichweite), nicht oben
- Touch-Targets mindestens 44×44 pt
- Große, kontrastreiche Schrift — Kontrast nach WCAG AA prüfen
- Destruktive Aktionen (Runde beenden, Konto löschen) weit weg von häufigen Aktionen und mit Bestätigung
- Safe Areas respektieren (Notch, Home-Indicator) — bei Capacitor ein klassischer Fehler
- Kein Text, der bei Systemschriftvergrößerung abgeschnitten wird

### 7.5 Animation, Ambiance, SVG

Zurückhaltend und konsistent einsetzen, aus den Motion-Tokens:
- Übergänge zwischen Spielphasen — kurz (150–250 ms), gleiche Easing-Kurve überall
- Feedback-Animationen bei Aktionen (Karte gezogen, Schluck gezählt)
- SVG statt PNG für Icons und Illustrationen — skaliert scharf, kleiner, per CSS färbbar
- **`prefers-reduced-motion` respektieren** — Nutzer mit dieser Einstellung dürfen keine großen Bewegungen bekommen
- Animationen dürfen nie Interaktion blockieren

---

## Phase 7b — Audio (offene Aufgabe der Gründer)

Die Gründer wollen besseren Sound. Das ist bei einer Partyspiel-App mit digitalem Spielleiter kein Kosmetikthema — die Stimme *ist* ein Kernstück des Produkterlebnisses. Claude Code soll hier aktiv mitbauen, aber zuerst die Architekturentscheidung erzwingen, weil sie über Kosten, Offline-Fähigkeit und Rechtssicherheit gleichzeitig entscheidet.

### 7b.1 Die Grundsatzentscheidung: vorproduziert oder zur Laufzeit?

| Ansatz | Bewertung für PreGame |
|---|---|
| **Vorproduzierte Audiodateien im App-Bundle** | **Empfohlen.** Funktioniert offline (Partys haben oft schlechtes Netz), keine Latenz, keine Kosten pro Nutzung, kein API-Key im Client, Lizenz einmalig geklärt. |
| **Text-to-Speech zur Laufzeit über eine Cloud-API** | Nur nötig, wenn Texte dynamisch aus Nutzereingaben entstehen (z. B. Spielernamen vorlesen). Braucht dann zwingend ein Backend als Proxy — der API-Key darf **nie** in die App, weil das Capacitor-Bundle lesbar ist. Kostet pro Aufruf, braucht Netz, hat Latenz. |
| **Geräteeigenes TTS zur Laufzeit** | Kostenlos, offline, sofort verfügbar. Klingt aber deutlich synthetischer. Guter Kompromiss genau für den Fall "Spielername vorlesen". |

**Praktische Empfehlung:** Hybrid. Alle festen Texte (Regeln, Ansagen, Übergänge, Spielleiter-Sprüche) vorproduziert im Bundle. Dynamische Teile wie Spielernamen über das geräteeigene TTS. Damit braucht es für Audio **kein** Backend und keine laufenden Kosten.

### 7b.2 Kostenlose Optionen für jetzt

- **Geräteeigenes TTS** über das Capacitor Text-to-Speech Plugin (nutzt `AVSpeechSynthesizer` auf iOS, `TextToSpeech` auf Android). Kostenlos, offline, keine Lizenzfragen. Qualität mittelmäßig, für den Prototyp aber völlig ausreichend.
- **Piper** — lokal laufendes Open-Source-TTS, deutlich natürlicher als System-TTS, läuft auf dem eigenen Rechner zum Vorproduzieren der Dateien. Kostenlos, keine Nutzungsbeschränkung. Guter Mittelweg.
- **Coqui TTS** — ebenfalls lokal und offen, mehr Aufwand beim Setup.

Für Soundeffekte und Musik: Freesound, Pixabay Audio oder ähnliche Quellen — aber **bei jeder einzelnen Datei die Lizenz prüfen und dokumentieren**. Manche verlangen Namensnennung, manche verbieten kommerzielle Nutzung. Niemals kommerzielle Musik verwenden, auch nicht kurz.

### 7b.3 ElevenLabs — mit einem entscheidenden Lizenz-Detail

Qualitativ ist ElevenLabs die deutlich stärkere Option, gerade für einen charaktervollen Spielleiter. Aber:

**Der kostenlose Tarif ist für PreGame nicht nutzbar.** Er umfasst keine kommerziellen Nutzungsrechte, und veröffentlichte Inhalte erfordern eine Namensnennung. PreGame ist durch Werbung und Premium-Abo monetarisiert — damit fällt die Gratis-Nutzung eindeutig unter „kommerziell". Audio aus dem Free-Tier in der App auszuliefern wäre ein Verstoß gegen die Nutzungsbedingungen, auch wenn es zunächst niemandem auffällt.

Kommerzielle Rechte beginnen beim **Starter-Tarif, ca. 5 $/Monat**.

**Das nützliche Detail:** Audio, das während eines bezahlten Abos generiert wurde, behält seine kommerziellen Rechte dauerhaft — auch nach einer Kündigung. Für einen vorproduzierten Ansatz heißt das konkret: **Einen Monat Starter buchen, in dieser Zeit alle Sprachdateien in einem Durchgang generieren, danach kündigen.** Die Dateien dürfen dauerhaft in der App bleiben. Bei ~30.000 Credits im Starter-Tarif (grob 30 Minuten Sprache) reicht das für sehr viele Ansagen. Nachproduktionen später brauchen dann wieder ein aktives Abo.

Wichtig dabei: Die generierten Dateien und das dazugehörige Text-Manifest sauber archivieren, inklusive Datum und Tarif zum Zeitpunkt der Generierung. Wenn später jemand nach der Lizenz fragt, muss das belegbar sein.

**Voice Cloning:** Nicht die Stimme einer real existierenden Person klonen ohne deren schriftliche Einwilligung — und auf keinen Fall Stimmen von Prominenten. Das ist zusätzlich zum Vertragsrecht ein Persönlichkeitsrechtsproblem.

### 7b.4 Audio-Verhalten im echten Einsatz — der meistübersehene Teil

Auf einer Party läuft Musik. Wenn PreGame diese Musik stoppt, ist die App nach zwei Runden deinstalliert. Claude Code soll die Audio-Session explizit dafür konfigurieren (dafür ist der bereits vorhandene Swift-Teil zuständig):

- **Ducking statt Unterbrechen:** Fremde Musik (Spotify, Apple Music) leiser regeln während einer Ansage, danach wieder hochfahren — nicht pausieren.
- **Mix-Verhalten** korrekt setzen, damit die App als sekundäre Audioquelle läuft.
- **Unterbrechungen behandeln:** eingehender Anruf, andere App übernimmt Audio, Kopfhörer werden abgezogen. Danach saubere Wiederaufnahme.
- **Bluetooth-Lautsprecher:** Häufigster Fall auf Partys. Ausgabe-Routing und Latenz testen.
- **Stummschalter:** Klären, was passieren soll, wenn das Gerät auf stumm steht — bei einer Spielansage ist Stille vermutlich falsch, aber es muss eine bewusste Entscheidung sein.
- **Hintergrund/Sperrbildschirm:** Was passiert mit laufender Audio, wenn das Gerät gesperrt wird?
- **Lautstärke in laute Umgebung:** Normalisierung der Dateien auf ein einheitliches Level. Nichts ist schlimmer als eine Ansage, die dreimal lauter ist als die vorige.

### 7b.5 Barrierefreiheit — nicht optional

**Keine Information darf ausschließlich über Audio transportiert werden.** Jede gesprochene Ansage muss parallel als Text auf dem Bildschirm stehen. Das ist gleichzeitig Barrierefreiheit *und* die praktische Lösung für den Normalfall, dass in einer lauten Runde niemand die Ansage versteht.

### 7b.6 Asset-Pipeline, die Claude Code aufbauen soll

1. **Text-Manifest als Quelle der Wahrheit:** Alle Sprachtexte in einer versionierten Datei (`audio/lines.json`) mit ID, Text, Kontext. Dateien werden daraus generiert, nicht umgekehrt. Vorteil: reproduzierbar, diff-bar, und später übersetzbar, wenn eine englische Version kommt.
2. **Generierungs-Skript** (`scripts/generate-audio.*`), das aus dem Manifest die Dateien erzeugt — austauschbar zwischen Piper und ElevenLabs, damit ein Wechsel des Anbieters kein Umbau ist. Der API-Key liegt dabei lokal in `.env`, wird **nie** committed und ist nur zur Generierungszeit nötig, nicht zur Laufzeit.
3. **Format und Größe:** komprimiert (AAC/m4a oder OGG), mono reicht für Sprache. Bundle-Größe im Auge behalten — über bestimmte Größen laden Nutzer die App im Mobilnetz nicht mehr. Falls es viel wird: Basis-Set im Bundle, zusätzliche Spielpakete als Nachladeinhalt.
4. **Preloading:** Dateien der aktuellen Spielphase vorab laden, damit keine Verzögerung mitten in der Runde entsteht.
5. **`AUDIO.md`** anlegen: Welche Stimme/welches Tool, welcher Tarif zum Generierungszeitpunkt, Lizenzstatus je Asset-Gruppe, Quelle und Lizenz jedes Soundeffekts. Dieses Dokument ist bei einem späteren Store- oder Rechtsproblem die Grundlage.

**Einordnung für die Gründer:** Für den nächsten Prototyp-Schritt genügt geräteeigenes TTS oder Piper — kostenlos, sofort, keine Lizenzfragen. Der Wechsel auf ElevenLabs lohnt sich, sobald die Texte inhaltlich final sind, weil dann ein einziger bezahlter Monat ausreicht. Vorher wäre es Geld für Dateien, die noch geändert werden.

---

## Phase 8 — Claude-Code-Umgebung im Projekt einrichten

Damit die Gründer nicht bei jedem Chat alles neu erklären müssen.

### 8.1 `CLAUDE.md` im Projekt-Root

Wird bei jeder Session automatisch geladen. Knapp halten (sie kostet bei jedem Lauf Tokens), aber verbindlich. Inhalt:
- Projektkontext und Stack (siehe Abschnitt 0)
- Verbindliche Regeln: nur Design-Tokens, keine Secrets im Client, keine selbstgebaute Auth, serverseitige Validierung für alles Sicherheitsrelevante, jeder Screen braucht Loading/Empty/Error/Offline
- Eskalationsregel: bei Änderungen an Auth, Zahlungen, Datenlöschung oder Altersabfrage erst nachfragen, nicht einfach umsetzen
- Verweise auf `ARCHITECTURE.md`, `DESIGN-SYSTEM.md`, `INFRASTRUCTURE.md`, `.claude/review-guidelines.md`

### 8.2 Projekt-Skills in `.claude/skills/`

Skills sind wiederverwendbare Arbeitsanweisungen. Sinnvoll für PreGame:

| Skill | Zweck |
|---|---|
| `security-check` | Prüft einen Diff gegen die Liste aus Phase 3 — Secrets, Injection, fehlende serverseitige Prüfung, RLS-Lücken |
| `new-component` | Erstellt eine neue UI-Komponente token-konform, mit allen Zuständen aus 7.2 und 7.3 |
| `privacy-impact` | Prüft bei jeder Änderung, die Daten berührt: Welches Feld, welcher Zweck, welche Rechtsgrundlage, wird die Datenschutzerklärung dadurch ungenau? |
| `release-check` | Pre-Launch-Checkliste: Build, Store-Metadaten, Privacy-Angaben synchron mit Datenschutzerklärung, Löschfunktion getestet, Altersfreigabe korrekt |
| `explain-to-founder` | Erklärt einen Codeabschnitt in einfachen Worten — für Noel und für Bastian bei fremdem Code |

Skills können auch als GitHub-Action-Prompt aufgerufen werden (`prompt: "/skill-name"` nach einem `actions/checkout`-Schritt).

### 8.3 Plugins

Plugins bündeln Slash-Commands, Agents, Skills, Hooks und MCP-Server. Für dieses Projekt relevant:
- **`code-review@claude-code-plugins`** aus dem offiziellen Marketplace (`https://github.com/anthropics/claude-code.git`) — wird in Phase 2 im Workflow schon installiert
- Weitere Plugins über `/plugin` prüfen; nur installieren, was wirklich benutzt wird. Jedes Plugin kostet Kontext.

### 8.4 Hooks in `.claude/settings.json`

Hooks sind deterministische Automatisierungen an Events (`PreToolUse`, `PostToolUse`, `SessionStart` u. a.). Sinnvoll hier:
- **`PreToolUse`** — blockiert Schreibzugriffe auf `.env`-Dateien und Änderungen, die Secrets einführen würden
- **`PostToolUse`** — führt nach Dateiänderungen automatisch Linter/Formatter aus
- **`SessionStart`** — lädt den aktuellen Projektstatus als Kontext

### 8.5 `.mcp.json`

MCP-Server verbinden Claude Code mit externen Tools. Erst einrichten, wenn wirklich gebraucht (z. B. GitHub-Server für Issue-Handling). Datei ins Repo committen, damit beide Gründer die gleiche Konfiguration haben.

---

## Phase 9 — Vollständiges Sicherheits- und Datenschutz-Audit

Dies ist kein Nebenschritt, sondern das Gate vor dem Launch. Claude Code soll die gesamte Anwendung systematisch prüfen und die Ergebnisse in **`AUDIT.md`** dokumentieren — jeder Punkt mit Status (`OK` / `Finding` / `Nicht anwendbar`), Schweregrad und konkreter Empfehlung. Keine Punkte stillschweigend überspringen; wenn etwas nicht prüfbar ist, das ebenfalls vermerken.

### 9.1 Sicherheits-Audit

**Secrets und Credentials**
- Gesamter Client-Code und das gebaute Capacitor-Bundle auf Keys, Tokens, Passwörter, Endpunkte mit eingebetteten Credentials durchsuchen. **Wichtig zu verstehen:** Ein Capacitor-Bundle lässt sich entpacken — der JavaScript-Code ist für jeden lesbar, der die App-Datei öffnet. Alles, was im Client steht, ist öffentlich.
- Gesamte Git-History prüfen (nicht nur der aktuelle Stand).
- Prüfen, ob gefundene Keys rotiert werden müssen.

**Authentifizierung und Session**
- Ist Auth über einen etablierten Dienst gelöst oder selbstgebaut? Selbstgebaut → `CRITICAL`.
- Passwort-Anforderungen, Rate Limiting auf Login/Registrierung/Passwort-Reset.
- Wie lange sind Sessions gültig, wie werden Tokens gespeichert? Tokens gehören in sicheren Gerätespeicher, nicht in `localStorage`.
- Kann ein Nutzer durch Manipulation von IDs auf Daten anderer zugreifen (IDOR)?

**Autorisierung und Datenzugriff**
- Für jede Tabelle: existiert eine RLS-Policy, und ist sie korrekt? Fehlende RLS → `CRITICAL`.
- Testen, nicht nur lesen: Mit einem zweiten Testnutzer versuchen, Daten des ersten zu lesen und zu ändern.
- Prüfen, ob irgendein Endpunkt ohne Authentifizierung erreichbar ist, der es nicht sein sollte.

**Eingaben und Ausgaben**
- Injection-Prüfung (SQL, NoSQL, Command).
- XSS: Jede Verwendung von `innerHTML`, `document.write` oder ähnlichem prüfen — Spielernamen sind Nutzereingaben und landen direkt in der UI. Klassischer Vektor genau hier.
- Serverseitige Validierung aller Eingaben, nicht nur im Client.

**Transport und Speicherung**
- HTTPS ausnahmslos, auch in Test-Builds. Prüfen, ob irgendwo `http://` verwendet wird.
- Verschlüsselung sensibler Daten im lokalen Gerätespeicher.
- Passwörter serverseitig gehasht (bcrypt/argon2), nie im Klartext gespeichert oder geloggt.

**Zahlungen und Abo**
- Wird der Abo-Status serverseitig gegen den Store-Receipt validiert oder nur lokal geprüft? Nur lokal → `CRITICAL` (Premium wäre trivial freischaltbar).
- Kann der Client den Abo-Status manipulieren?

**Abhängigkeiten und Plattform**
- `npm audit`, veraltete Pakete, ungenutzte Pakete entfernen.
- Prüfen, ob eingebundene Werbe- und Analytics-SDKs mehr Daten sammeln als deklariert — SDKs sind die häufigste Ursache für Abweichungen zwischen Datenschutzerklärung und Realität.
- Berechtigungen in `Info.plist` und `AndroidManifest.xml`: Wird eine Berechtigung angefragt, die die App nicht braucht? Jede unnötige Berechtigung ist ein Store-Review-Risiko und ein Datenschutzproblem.

**Fehlerbehandlung und Logging**
- Werden technische Fehlermeldungen oder Stacktraces an Nutzer durchgereicht?
- Landen personenbezogene Daten in Logs oder im Error-Tracking? Das ist ein häufiger, leicht übersehener DSGVO-Verstoß.

### 9.2 Datenschutz-Audit

**Datenbestandsaufnahme (Verzeichnis von Verarbeitungstätigkeiten)**
Claude Code soll eine vollständige Tabelle erstellen: Welches Datenfeld, wo erhoben, wozu, auf welcher Rechtsgrundlage, wo gespeichert, wie lange, an wen weitergegeben. Das ist nach DSGVO Art. 30 ohnehin verlangt und deckt gleichzeitig die Lücke aus Frage 17 des Readiness-Checks.

**Datenminimierung**
- Jedes Feld einzeln hinterfragen: Wird es für eine tatsächlich existierende Funktion gebraucht? Wenn nicht → entfernen.
- **Besonders prüfen:** Verlassen Namen von Mitspielern das Gerät? Wenn ja → `CRITICAL`, weil diese Personen die App nicht installiert und nie eingewilligt haben (siehe Phase 5b).

**Betroffenenrechte technisch verifizieren**
- Löschfunktion **testen**, nicht nur vorhanden haben: Nach dem Löschen prüfen, ob Daten tatsächlich weg sind — auch in Backups, Logs, Analytics und beim Werbe-SDK.
- Datenauskunft/Export funktioniert und liefert vollständige Daten.
- Löschfristen definiert und automatisiert (Daten inaktiver Konten nicht unbegrenzt behalten).

**Einwilligungen**
- Consent-Banner für Werbe-Tracking vorhanden, vor dem ersten Tracking-Aufruf, und Ablehnung wird technisch respektiert (nicht nur gespeichert).
- iOS App Tracking Transparency korrekt implementiert.
- Consent-Zustand wird persistiert und bei jedem Start beachtet.

**Konsistenz der Angaben**
- Datenschutzerklärung, Apple Privacy Nutrition Labels und Google Play Data Safety Form müssen **genau übereinstimmen** mit dem, was der Code tatsächlich macht. Abweichungen sind einer der häufigsten Store-Ablehnungsgründe. Claude Code soll die drei gegen die Bestandsaufnahme aus 9.2 abgleichen.
- Impressum vorhanden und erreichbar.

**Auftragsverarbeiter**
- Liste aller externen Dienste, die Daten verarbeiten (Hosting, DB, Auth, Analytics, Error-Tracking, Werbung, Zahlungen). Für jeden: AVV abgeschlossen? Wo liegt der Server? Erfolgt ein Drittlandtransfer, und ist er abgedeckt?

**Minderjährige**
- Altersabfrage vorhanden und konsistent mit der Store-Alterseinstufung?
- Da die DSGVO-Einwilligungsgrenze in Deutschland bei 16 liegt: Was passiert, wenn ein Nutzer unter 16 angibt? Diese Logik erst bauen, wenn die Zielgruppen-Entscheidung aus Phase 5.3 getroffen ist.

### 9.3 Ergebnis

`AUDIT.md` mit:
1. Zusammenfassung: Wie viele Findings je Schweregrad.
2. Alle `CRITICAL`-Punkte als GitHub-Issues anlegen, mit Label `security` bzw. `privacy`.
3. Klare Aussage: Ist die App aus technischer Sicht launch-fähig, oder nicht — und was muss dafür zwingend erledigt sein.
4. Liste der Punkte, die **nicht** technisch lösbar sind und an die Gründer oder einen Anwalt gehen.

**Das Audit soll wiederholbar sein.** Als Skill `.claude/skills/full-audit/` ablegen, damit es vor jedem größeren Release erneut laufen kann, statt eine Einmalaktion zu bleiben.

---

## Reihenfolge und Abschluss

Claude Code soll die Phasen in dieser Reihenfolge abarbeiten und nach jeder Phase anhalten:

1. **Phase 1** (Repo-Grundlagen) — zuerst, weil die Secret-Prüfung in der History nicht warten darf
2. **Phase 8.1** (`CLAUDE.md`) — früh, damit alle folgenden Arbeiten den Regeln folgen
3. **Phase 2 + 3** (AI-Review und Review-Fokus)
4. **Phase 4** (CI/CD-Pipeline und Merge-Gates) — CI-Stufe zuerst, CD-Stufe kann warten, bis ein Release näher rückt
5. **Phase 5b** (Datenbank-Entscheidung) — vor der Infrastruktur-Arbeit, weil sie Auth und Sicherheitsmodell festlegt. Ergebnis kann sein: für v1 gar keine Cloud-DB.
6. **Phase 6** (Infrastruktur-Bestandsaufnahme) — nur analysieren und dokumentieren, noch nicht alles umbauen
7. **Phase 5** (Recht & Datenschutz) — technische Teile umsetzen, rechtliche Klärung an die Gründer eskalieren
8. **Phase 7** (Design-System)
9. **Phase 7b** (Audio) — kann parallel laufen; Entscheidung "Piper/System-TTS jetzt, ElevenLabs wenn Texte final" gleich festhalten
10. **Phase 8.2–8.5** (Skills, Plugins, Hooks) — inklusive `full-audit`-Skill
11. **Phase 9** (Sicherheits- und Datenschutz-Audit) — zum Abschluss, und danach vor jedem Release erneut

**Abschluss-Deliverable:** Eine `STATUS.md` mit dem Zustand jeder Phase, offenen Punkten und den Fragen, die die Gründer entweder selbst entscheiden oder mit dem Berater bzw. einem Anwalt klären müssen.

**Dateien, die am Ende existieren sollen:** `README.md`, `ARCHITECTURE.md`, `CONSULTING.md`, `CLAUDE.md`, `DATA-MODEL.md`, `INFRASTRUCTURE.md`, `DESIGN-SYSTEM.md`, `AUDIO.md`, `AUDIT.md`, `STATUS.md`, dazu `audio/lines.json`, `.claude/` (Skills, Settings, Review-Guidelines) und `.github/workflows/` (CI, AI-Review, `@claude`-Mentions, CD).

---

*Erstellt als Setup-Vorgabe für das PreGame-Projekt. Der Abschnitt zu Recht und Jugendschutz ersetzt keine Rechtsberatung — insbesondere die Altersfreigabe-Frage muss vor dem Launch anwaltlich geklärt werden.*
