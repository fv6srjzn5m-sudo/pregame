#!/usr/bin/env node
/**
 * SessionStart-Hook: laedt einen kurzen Projektstatus als Kontext, damit nicht jede neue
 * Session bei null anfaengt - aktueller Branch, offene Aenderungen, Verweis auf CLAUDE.md
 * (verbindliche Regeln) und STATUS.md (Gesamtstatus, entsteht am Ende des Setups, siehe
 * PREGAME-SETUP-INSTRUCTIONS.md).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function safe(cmd) {
  try {
    return execSync(cmd, { cwd: process.cwd() }).toString().trim();
  } catch {
    return null;
  }
}

function main() {
  const branch = safe('git branch --show-current');
  const statusRaw = safe('git status --short');
  const statusLines = statusRaw ? statusRaw.split('\n').length : 0;
  const lastCommit = safe('git log -1 --format=%s');

  const lines = [];
  if (branch) lines.push(`Aktueller Branch: ${branch}`);
  if (lastCommit) lines.push(`Letzter Commit: ${lastCommit}`);
  lines.push(statusLines > 0
    ? `${statusLines} Datei(en) mit uncommitteten Aenderungen (git status --short vor destruktiven Git-Befehlen pruefen).`
    : 'Working Tree sauber, keine uncommitteten Aenderungen.');

  const statusMdExists = fs.existsSync(path.join(process.cwd(), 'STATUS.md'));
  lines.push(statusMdExists
    ? 'STATUS.md vorhanden - dort steht der Gesamtstatus aller Setup-Phasen.'
    : 'STATUS.md existiert noch nicht (entsteht am Ende des Setups aus PREGAME-SETUP-INSTRUCTIONS.md).');
  lines.push('CLAUDE.md enthaelt die verbindlichen Projektregeln (keine Secrets im Client, keine selbstgebaute Auth, Eskalationsregel fuer Auth/Zahlungen/Datenloeschung/Alter).');

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: lines.join('\n'),
    },
  }));
}

main();
