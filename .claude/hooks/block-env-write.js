#!/usr/bin/env node
/**
 * PreToolUse-Hook (Write|Edit): blockiert Schreibzugriffe auf .env-Dateien und Aenderungen,
 * die offensichtliche Secret-Muster einfuehren wuerden - siehe CLAUDE.md Regel 2
 * ("keine Secrets im Client") und AUDIT.md/Phase 9.
 *
 * .env.example ist ausdruecklich erlaubt (das ist die Vorlage ohne echte Werte, siehe
 * .env.example im Repo-Root).
 *
 * Bewusst nur ein Basisschutz, kein vollstaendiger Secret-Scanner (das macht Gitleaks in
 * der CI-Pipeline, siehe .github/workflows/ci.yml) - dieser Hook soll ein versehentliches
 * "oh, ich committe gleich meinen API-Key" in letzter Sekunde abfangen, nicht jeden
 * denkbaren Secret-Typ erkennen.
 */
import path from 'node:path';

const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/,                          // AWS Access Key
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9]{20,}/,                 // GitHub Token
  /xox[baprs]-[A-Za-z0-9-]{10,}/,               // Slack Token
  /sk-[A-Za-z0-9]{20,}/,                        // OpenAI-artige Secret Keys
  /sk_live_[A-Za-z0-9]{10,}/,                   // Stripe Live Secret Key
];

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

async function main() {
  let payload;
  try {
    payload = JSON.parse(await readStdin());
  } catch {
    return; // kaputtes/fehlendes JSON -> nichts blockieren, lieber durchlassen
  }

  const filePath = payload?.tool_input?.file_path || '';
  const basename = path.basename(filePath);

  if (/^\.env(\..+)?$/.test(basename) && basename !== '.env.example') {
    deny(`"${basename}" ist eine .env-Datei und darf nicht von Claude Code beschrieben werden - Secrets gehoeren nur lokal, nie ins Repo oder in Chat-Kontext. Siehe .env.example fuer die Vorlage.`);
    return;
  }

  const content = payload?.tool_input?.content ?? payload?.tool_input?.new_string ?? '';
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      deny(`Die Aenderung an "${filePath}" enthaelt ein Muster, das wie ein echtes Secret aussieht (${pattern}). Falls das ein Fehlalarm ist (z.B. ein Beispielwert), bitte kurz pruefen und ggf. den Hook in .claude/settings.json anpassen.`);
      return;
    }
  }
}

main();
