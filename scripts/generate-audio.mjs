#!/usr/bin/env node
// Erzeugt vorproduzierte Audiodateien aus audio/lines.json ueber ein austauschbares
// TTS-Backend (Piper lokal ODER ElevenLabs) - siehe AUDIO.md fuer die Architektur-
// Entscheidung dahinter.
//
// Nutzung:
//   node scripts/generate-audio.mjs --provider=piper --lang=de
//   node scripts/generate-audio.mjs --provider=elevenlabs --lang=de --voice=<voice_id>
//
// ELEVENLABS_API_KEY kommt aus der Umgebung (z.B. lokale .env, NIE committen - siehe
// .gitignore) und wird nur zur Generierungszeit gebraucht, nie zur Laufzeit in der App.
//
// Piper muss lokal installiert sein (https://github.com/rhasspy/piper). PIPER_BIN zeigt
// auf das Binary (Default: "piper" im PATH), PIPER_MODEL auf die .onnx-Sprachdatei.
//
// WICHTIG (ehrlich, nicht nur pro forma): Dieses Skript wurde NICHT gegen ein echtes
// Piper-Binary oder einen echten ElevenLabs-Key getestet - beides ist in der Umgebung,
// in der dieses Skript geschrieben wurde, nicht verfuegbar. Vor dem ersten produktiven
// Einsatz einmal mit einer einzelnen Zeile durchtesten, bevor das ganze Manifest
// generiert wird.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (const raw of argv) {
    const eq = raw.replace(/^--/, '');
    const idx = eq.indexOf('=');
    if (idx === -1) { out[eq] = true; continue; }
    out[eq.slice(0, idx)] = eq.slice(idx + 1);
  }
  return out;
}

function generateWithPiper(text, outPath) {
  const bin = process.env.PIPER_BIN || 'piper';
  const model = process.env.PIPER_MODEL;
  if (!model) throw new Error('PIPER_MODEL nicht gesetzt (Pfad zur .onnx-Sprachdatei)');
  const result = spawnSync(bin, ['--model', model, '--output_file', outPath], {
    input: text,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`piper fehlgeschlagen (exit ${result.status}): ${result.stderr}`);
  }
}

async function generateWithElevenLabs(text, outPath, voiceId) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY nicht gesetzt');
  if (!voiceId) throw new Error('--voice=<voice_id> fehlt');
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
  });
  if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status}: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outPath, buf);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const provider = args.provider || 'piper';
  const lang = args.lang || 'de';
  const outDir = args.out || path.join('assets', 'audio', lang);

  const manifest = JSON.parse(readFileSync('audio/lines.json', 'utf8'));
  mkdirSync(outDir, { recursive: true });

  for (const line of manifest.lines) {
    const text = line[lang];
    if (!text) {
      console.warn(`Ueberspringe ${line.id}: kein Text fuer Sprache "${lang}"`);
      continue;
    }
    const ext = provider === 'elevenlabs' ? 'mp3' : 'wav';
    const outPath = path.join(outDir, `${line.id}.${ext}`);
    console.log(`Generiere ${outPath} ...`);
    if (provider === 'piper') {
      generateWithPiper(text, outPath);
    } else if (provider === 'elevenlabs') {
      await generateWithElevenLabs(text, outPath, args.voice);
    } else {
      throw new Error(`Unbekannter provider: "${provider}" (piper|elevenlabs)`);
    }
  }
  console.log('Fertig.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
