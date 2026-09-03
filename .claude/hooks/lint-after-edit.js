#!/usr/bin/env node
/**
 * PostToolUse-Hook (Write|Edit): laeuft nach jeder Datei-Aenderung, prueft ob die Datei im
 * ESLint-Scope liegt (src/**​/*.js, scripts/**​/*.mjs - siehe eslint.config.js, das grosse
 * Inline-<script> in saufapp.html ist bewusst NICHT im Lint-Scope, siehe DESIGN-SYSTEM.md/
 * ARCHITECTURE.md) und fuehrt dann "npm run lint" aus. Bei Lint-Fehlern wird das Ergebnis
 * als Kontext zurueckgegeben, ohne den Turn hart abzubrechen - Claude bekommt die Chance,
 * es direkt zu fixen.
 */
import path from 'node:path';
import { execSync } from 'node:child_process';

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

function inLintScope(relPath) {
  const normalized = relPath.split(path.sep).join('/');
  return /^src\/.*\.js$/.test(normalized) || /^scripts\/.*\.mjs$/.test(normalized);
}

async function main() {
  let payload;
  try {
    payload = JSON.parse(await readStdin());
  } catch {
    return;
  }

  const filePath = payload?.tool_response?.filePath || payload?.tool_input?.file_path || '';
  if (!filePath) return;

  const relPath = path.relative(process.cwd(), filePath);
  if (!inLintScope(relPath)) return;

  try {
    execSync('npm run lint', { cwd: process.cwd(), stdio: 'pipe' });
    // Lint sauber -> keine Ausgabe, kein Rauschen fuer jede erfolgreiche Aenderung.
  } catch (err) {
    const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: `ESLint hat bei "${relPath}" Probleme gefunden - bitte beheben:\n\n${output.slice(0, 4000)}`,
    }));
  }
}

main();
