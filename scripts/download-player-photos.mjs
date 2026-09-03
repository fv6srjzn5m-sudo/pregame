#!/usr/bin/env node
/**
 * Lädt Spielerfotos über TheSportsDB (free test key "3") nach assets/players/
 * und patched PLAYER_PHOTOS in saufapp.html.
 *
 * Bevorzugt strCutout (PNG), sonst strThumb. Nur Sportart Soccer.
 * Bestehende Dateien / Manifest-Einträge werden behalten.
 *
 * Usage: node scripts/download-player-photos.mjs [--limit N]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const NAMES_FILE = path.join(__dirname, 'player-names.json');
const PRIORITY_FILE = path.join(__dirname, 'player-names-priority.json');
const OUT_DIR = path.join(ROOT, 'assets', 'players');
const MANIFEST_FILE = path.join(OUT_DIR, 'manifest.json');
const HTML_FILE = path.join(ROOT, 'saufapp.html');

const API_KEY = '3';
const SEARCH_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchplayers.php`;
const CONCURRENCY = 1;
const USER_AGENT = 'PreGameSaufApp/1.0 (offline player assets)';
const REQUEST_GAP_MS = 3200;

const limitArg = process.argv.find((a, i, arr) => arr[i - 1] === '--limit');
const LIMIT = limitArg ? Number(limitArg) : Infinity;

/** Namensvarianten / Tippfehler → bessere API-Treffer */
const SEARCH_ALIASES = {
  'Ronaldo Nazário': 'Ronaldo',
  'Abedi Pelé': 'Abedi Pele',
  'Kvicha Kvaratskhelia': 'Khvicha Kvaratskhelia',
  'N\'Golo Kanté': 'NGolo Kante',
  'İlkay Gündoğan': 'Ilkay Gundogan',
  'Gérson': 'Gerson de Oliveira Nunes',
  'Tostão': 'Tostao',
  'Pelé': 'Pele',
  'Kaká': 'Kaka',
  'Luís Figo': 'Luis Figo',
  'Zinedine Zidane': 'Zinedine Zidane',
  'Cristiano Ronaldo': 'Cristiano Ronaldo',
  'Deco': 'Deco',
  'Guti': 'Guti',
  'Koke': 'Koke',
  'Isco': 'Isco',
  'Dida': 'Dida',
  'Cafu': 'Cafu',
  'Marcos': 'Marcos Roberto Silveira Reis',
  'Miranda': 'Miranda Joao',
  'Pedro': 'Pedro Rodriguez Ledesma',
};

function slugify(name) {
  return String(name)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'player';
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function normalize(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scorePlayer(wanted, player) {
  if (!player || (player.strSport && player.strSport !== 'Soccer')) return -1;
  const w = normalize(wanted);
  const n = normalize(player.strPlayer);
  if (!n) return -1;
  if (n === w) return 100;
  if (n.includes(w) || w.includes(n)) return 80;
  const wParts = w.split(' ').filter(Boolean);
  const nParts = n.split(' ').filter(Boolean);
  const overlap = wParts.filter(p => nParts.includes(p)).length;
  if (overlap === 0) return 0;
  return 40 + overlap * 10;
}

async function searchPlayer(name) {
  const q = SEARCH_ALIASES[name] || name;
  const url = `${SEARCH_URL}?p=${encodeURIComponent(q)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (res.status === 429 || res.status === 503) {
      if (attempt === 0) {
        console.log(`rate-limit on ${name}, wait 60s`);
        await sleep(60000);
        continue;
      }
      return null; // skip after one long wait – don't burn minutes per obscure name
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { return null; }
    const list = data.player || [];
    let best = null;
    let bestScore = 0;
    for (const p of list) {
      const s = scorePlayer(name, p);
      if (s > bestScore) {
        bestScore = s;
        best = p;
      }
    }
    if (best && bestScore >= 40) return best;
    return null;
  }
  return null;
}

async function downloadImage(url, destBase) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`img HTTP ${res.status}`);
  const ctype = (res.headers.get('content-type') || '').toLowerCase();
  let ext = '.jpg';
  if (ctype.includes('png') || url.toLowerCase().includes('.png')) ext = '.png';
  else if (ctype.includes('webp') || url.toLowerCase().includes('.webp')) ext = '.webp';
  else if (ctype.includes('gif')) ext = '.gif';
  else {
    const m = url.match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i);
    if (m) ext = '.' + m[1].toLowerCase().replace('jpeg', 'jpg');
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 800) throw new Error('image too small');
  const dest = destBase + ext;
  fs.writeFileSync(dest, buf);
  return path.basename(dest);
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
      await sleep(REQUEST_GAP_MS);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function patchHtmlManifest(map) {
  const start = '/* PLAYER_PHOTOS_START */';
  const end = '/* PLAYER_PHOTOS_END */';
  let html = fs.readFileSync(HTML_FILE, 'utf8');
  const block = `${start}\nconst PLAYER_PHOTOS = ${JSON.stringify(map)};\n${end}`;
  if (!html.includes(start) || !html.includes(end)) {
    throw new Error('PLAYER_PHOTOS markers missing in saufapp.html');
  }
  html = html.replace(new RegExp(`${start}[\\s\\S]*?${end}`), () => block);
  fs.writeFileSync(HTML_FILE, html);
}

function loadNames() {
  const all = JSON.parse(fs.readFileSync(NAMES_FILE, 'utf8'));
  let priority = [];
  if (fs.existsSync(PRIORITY_FILE)) {
    priority = JSON.parse(fs.readFileSync(PRIORITY_FILE, 'utf8'));
  }
  const seen = new Set();
  const ordered = [];
  for (const n of [...priority, ...all]) {
    if (seen.has(n)) continue;
    seen.add(n);
    ordered.push(n);
  }
  return ordered.slice(0, Number.isFinite(LIMIT) ? LIMIT : ordered.length);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const names = loadNames();
  let manifest = {};
  if (fs.existsSync(MANIFEST_FILE)) {
    try { manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8')); } catch {}
  }

  const onDisk = new Map();
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f === 'manifest.json') continue;
    onDisk.set(f.replace(/\.(jpe?g|png|webp|gif)$/i, ''), f);
  }

  // Sync slug→name for existing files
  for (const name of names) {
    const slug = slugify(name);
    if (!manifest[name] && onDisk.has(slug)) {
      manifest[name] = onDisk.get(slug);
    }
  }

  console.log(`TheSportsDB queue=${names.length} already=${Object.keys(manifest).filter(n => fs.existsSync(path.join(OUT_DIR, manifest[n]))).length}`);

  let ok = 0, skip = 0, fail = 0;

  await mapPool(names, CONCURRENCY, async (name, idx) => {
    if (manifest[name] && fs.existsSync(path.join(OUT_DIR, manifest[name]))) {
      skip++;
      return;
    }
    const slug = slugify(name);
    if (onDisk.has(slug)) {
      manifest[name] = onDisk.get(slug);
      skip++;
      return;
    }

    try {
      const player = await searchPlayer(name);
      const imgUrl = (player && (player.strCutout || player.strThumb)) || null;
      if (!imgUrl) {
        fail++;
        if (fail <= 40 || fail % 40 === 0) console.log(`MISS ${name}`);
        return;
      }
      const fileName = await downloadImage(imgUrl, path.join(OUT_DIR, slug));
      onDisk.set(slug, fileName);
      manifest[name] = fileName;
      ok++;
      if ((ok + fail) % 20 === 0) {
        console.log(`… ${idx + 1}/${names.length} new=${ok} skip=${skip} miss=${fail} last=${name}`);
        fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
        patchHtmlManifest(manifest);
      }
    } catch (e) {
      fail++;
      if (fail <= 25) console.log(`ERR ${name}: ${e.message}`);
    }
  });

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  patchHtmlManifest(manifest);
  console.log(`Done. new=${ok} skip=${skip} miss=${fail}. Total mapped=${Object.keys(manifest).length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
