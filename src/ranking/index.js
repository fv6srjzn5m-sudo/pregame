import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config.js';

const QUEUE_KEY = 'saufapp_ranking_queue_v1';
const MAX_QUEUE = 40;

/* Sicherheits-Fix (Audit-Runde 2, Abschnitt 2.1, mit Freigabe umgesetzt): Supabase-
   Session-Tokens lagen bisher in window.localStorage statt im sicheren Gerätespeicher
   (Keychain auf iOS via Capacitor SecureStorage) - genau das gleiche Muster, das schon
   fuer den Google-API-Key in saufapp.html (getSecureStoragePlugin()) verwendet wird.
   Faellt auf localStorage zurueck, wenn das Plugin fehlt (Browser/PWA, oder falls die
   native Keychain-Anbindung selbst scheitert) - Fallback ist bewusst, kein Bug.
   WICHTIG: Bereits eingeloggte Personen werden beim Umstieg einmalig ausgeloggt, weil
   der alte Token unter dem neuen Storage-Backend nicht mehr gefunden wird - akzeptierte
   einmalige Nebenwirkung, kein laufendes Risiko. */
function getSecureStoragePlugin() {
  try {
    return (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins
      && window.Capacitor.Plugins.SecureStorage) || null;
  } catch (_) {
    return null;
  }
}

const secureSessionStorage = {
  async getItem(key) {
    const SS = getSecureStoragePlugin();
    if (SS) {
      try {
        const value = await SS.get(key);
        return typeof value === 'string' ? value : (value == null ? null : String(value));
      } catch (_) { /* Fallback unten */ }
    }
    try { return window.localStorage.getItem(key); } catch (_) { return null; }
  },
  async setItem(key, value) {
    const SS = getSecureStoragePlugin();
    if (SS) {
      try { await SS.set(key, value); return; } catch (_) { /* Fallback unten */ }
    }
    try { window.localStorage.setItem(key, value); } catch (_) {}
  },
  async removeItem(key) {
    const SS = getSecureStoragePlugin();
    if (SS) {
      try { await SS.remove(key); return; } catch (_) { /* Fallback unten */ }
    }
    try { window.localStorage.removeItem(key); } catch (_) {}
  },
};

function configFromStorage() {
  try {
    const url = localStorage.getItem('saufapp_supabase_url') || '';
    const anonKey = localStorage.getItem('saufapp_supabase_anon_key') || '';
    if (url && anonKey) return { url, anonKey };
  } catch (_) {}
  return null;
}

function resolveConfig() {
  const fromLs = configFromStorage();
  if (fromLs) return fromLs;
  if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) return SUPABASE_CONFIG;
  return null;
}

let client = null;
let profileCache = null;
let authReady = null;

function getClient() {
  const cfg = resolveConfig();
  if (!cfg) return null;
  if (!client || client.supabaseUrl !== cfg.url) {
    client = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: secureSessionStorage,
      },
    });
  }
  return client;
}

function isConfigured() {
  return !!resolveConfig();
}

function yearMonthBerlin(d = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit',
    }).formatToParts(d);
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    return `${y}-${m}`;
  } catch (_) {
    return d.toISOString().slice(0, 7);
  }
}

function loadQueue() {
  try {
    const raw = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (_) {
    return [];
  }
}

function saveQueue(items) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
}

function enqueue(event) {
  const q = loadQueue();
  if (q.some(e => e.client_event_id === event.client_event_id)) return;
  q.push(event);
  saveQueue(q);
}

function makeEventId() {
  return 'ev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

/**
 * PreGame-Score aus einer beendeten Session.
 * Nur der eingeloggte Gerätenutzer bekommt Punkte.
 */
function computeSessionPoints({ gameKey, players, winner, startSnapshot, durationSec }, nicknameOverride) {
  // nicknameOverride ist ein Test-Seam (siehe index.test.js) - im Normalbetrieb ungenutzt,
  // dann zaehlt wie bisher ausschliesslich der eingeloggte Nickname aus profileCache.
  const nick = (nicknameOverride ?? profileCache?.nickname ?? '').trim().toLowerCase();
  let matched = null;
  if (nick) {
    matched = (players || []).find(p => (p.name || '').trim().toLowerCase() === nick) || null;
  }

  let points = 5; // Teilnahme
  let won = false;

  if (matched) {
    const start = (startSnapshot || []).find(s => s.id === matched.id);
    const scoreGain = start ? Math.max(0, (matched.score || 0) - (start.score || 0)) : Math.max(0, matched.score || 0);
    points += Math.min(40, Math.round(scoreGain));
    if (winner && matched.id === winner.id) {
      points += 20;
      won = true;
    }
  }

  points = Math.max(0, Math.min(80, points));
  return {
    client_event_id: makeEventId(),
    game_key: gameKey || 'unknown',
    points,
    won,
    duration_sec: durationSec == null ? null : Math.max(0, Math.round(durationSec)),
    created_at: Date.now(),
  };
}

async function ensureAuthReady() {
  const sb = getClient();
  if (!sb) return null;
  if (!authReady) {
    authReady = sb.auth.getSession().then(async ({ data }) => {
      if (data.session) await refreshProfile();
      return data.session;
    });
  }
  return authReady;
}

async function refreshProfile() {
  const sb = getClient();
  if (!sb) {
    profileCache = null;
    return null;
  }
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    profileCache = null;
    return null;
  }
  const { data, error } = await sb
    .from('profiles')
    .select('id, nickname, nickname_normalized, created_at')
    .eq('id', user.id)
    .maybeSingle();
  if (error) {
    profileCache = { id: user.id, email: user.email, nickname: null };
    return profileCache;
  }
  profileCache = { ...data, email: user.email };
  return profileCache;
}

async function getSessionUser() {
  await ensureAuthReady();
  const sb = getClient();
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  return session?.user || null;
}

async function register({ email, password, nickname }) {
  const sb = getClient();
  if (!sb) throw new Error('not_configured');
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.session) {
    try { localStorage.setItem('saufapp_pending_nickname', nickname || ''); } catch (_) {}
    return { needsEmailConfirm: true, user: data.user };
  }
  await sb.rpc('ensure_profile', { p_nickname: nickname });
  await refreshProfile();
  return { needsEmailConfirm: false, user: data.user };
}

async function login({ email, password }) {
  const sb = getClient();
  if (!sb) throw new Error('not_configured');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await refreshProfile();
  try {
    const pending = localStorage.getItem('saufapp_pending_nickname');
    if (pending && !profileCache?.nickname) {
      await setNickname(pending);
      localStorage.removeItem('saufapp_pending_nickname');
    }
  } catch (_) {}
  flushQueue().catch(() => {});
  return data.user;
}

async function logout() {
  const sb = getClient();
  if (!sb) return;
  // Entscheidung C-4 (Audit-Runde 2, 21.09.2026): noch nicht uebertragene Punkte
  // beim Ausloggen verwerfen statt behalten -- sonst koennten sie beim naechsten
  // Login (z.B. einer anderen Person auf einem geteilten Geraet) der falschen
  // Person gutgeschrieben werden. Gleiche Zeile wie in deleteAccount().
  try { saveQueue([]); } catch (_) {}
  await sb.auth.signOut();
  profileCache = null;
}

async function setNickname(nickname) {
  const sb = getClient();
  if (!sb) throw new Error('not_configured');
  const { data, error } = await sb.rpc('ensure_profile', { p_nickname: nickname });
  if (error) throw error;
  await refreshProfile();
  return data;
}

async function submitEvent(event) {
  const sb = getClient();
  if (!sb) throw new Error('not_configured');
  const user = await getSessionUser();
  if (!user) throw new Error('not_authenticated');

  const { data, error } = await sb.rpc('submit_session_score', {
    p_client_event_id: event.client_event_id,
    p_game_key: event.game_key,
    p_points: event.points,
    p_won: !!event.won,
    p_duration_sec: event.duration_sec,
  });
  if (error) throw error;
  return data;
}

async function flushQueue() {
  const sb = getClient();
  if (!sb) return { flushed: 0 };
  const user = await getSessionUser();
  if (!user) return { flushed: 0 };

  const q = loadQueue();
  if (!q.length) return { flushed: 0 };

  const remaining = [];
  let flushed = 0;
  for (const ev of q) {
    try {
      await submitEvent(ev);
      flushed += 1;
    } catch (err) {
      const msg = String(err?.message || err);
      if (/rate limit/i.test(msg)) {
        remaining.push(ev, ...q.slice(q.indexOf(ev) + 1));
        break;
      }
      // Duplikate / permanente Fehler verwerfen; Netzfehler behalten
      if (/Failed to fetch|NetworkError|fetch/i.test(msg) || err?.status === 0) {
        remaining.push(ev);
      }
      // sonst drop (invalid etc.)
    }
  }
  saveQueue(remaining);
  return { flushed, remaining: remaining.length };
}

async function reportSession(summary) {
  if (!isConfigured()) return { skipped: true, reason: 'not_configured' };
  const user = await getSessionUser();
  if (!user) return { skipped: true, reason: 'not_authenticated' };
  if (!profileCache?.nickname) await refreshProfile();
  if (!profileCache?.nickname) return { skipped: true, reason: 'no_nickname' };

  const event = computeSessionPoints(summary);
  enqueue(event);

  if (!navigator.onLine) {
    return { queued: true, event };
  }

  try {
    const result = await flushQueue();
    return { ok: true, ...result, awarded: event.points, won: event.won };
  } catch (err) {
    return { queued: true, event, error: String(err?.message || err) };
  }
}

async function getDeRanking(limit = 50) {
  const sb = getClient();
  if (!sb) throw new Error('not_configured');
  const { data, error } = await sb.rpc('get_de_ranking', { p_limit: limit });
  if (error) throw error;
  return data || [];
}

async function getMyMonthStats() {
  const sb = getClient();
  if (!sb) throw new Error('not_configured');
  const { data, error } = await sb.rpc('get_my_month_stats');
  if (error) throw error;
  return data;
}

async function getPreviousMonthWinner() {
  const sb = getClient();
  if (!sb) throw new Error('not_configured');
  const { data, error } = await sb.rpc('get_previous_month_winner');
  if (error) throw error;
  return data;
}

async function createGroup(name) {
  const sb = getClient();
  if (!sb) throw new Error('not_configured');
  const { data, error } = await sb.rpc('create_group', { p_name: name });
  if (error) throw error;
  return data;
}

async function joinGroup(code) {
  const sb = getClient();
  if (!sb) throw new Error('not_configured');
  const { data, error } = await sb.rpc('join_group', { p_code: code });
  if (error) throw error;
  return data;
}

async function listMyGroups() {
  const sb = getClient();
  if (!sb) throw new Error('not_configured');
  const { data, error } = await sb.rpc('list_my_groups');
  if (error) throw error;
  return data || [];
}

async function getGroupRanking(groupId, limit = 50) {
  const sb = getClient();
  if (!sb) throw new Error('not_configured');
  const { data, error } = await sb.rpc('get_group_ranking', {
    p_group_id: groupId,
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

function getProfile() {
  return profileCache;
}

/** DSGVO Art. 15: alle serverseitig gespeicherten Daten der eingeloggten Person. */
async function exportMyData() {
  const sb = getClient();
  if (!sb) throw new Error('not_configured');
  const { data, error } = await sb.rpc('export_my_data');
  if (error) throw error;
  return data;
}

/**
 * DSGVO Art. 17: loescht das Konto vollstaendig (Server) und alle lokalen Spuren
 * davon (Session, Profil-Cache, Warteschlange). Danach ist die Person ausgeloggt.
 */
async function deleteAccount() {
  const sb = getClient();
  if (!sb) throw new Error('not_configured');
  const { error } = await sb.rpc('delete_my_account');
  if (error) throw error;
  try { saveQueue([]); } catch (_) {}
  try { localStorage.removeItem('saufapp_pending_nickname'); } catch (_) {}
  await sb.auth.signOut();
  profileCache = null;
}

function saveLocalConfig({ url, anonKey }) {
  localStorage.setItem('saufapp_supabase_url', (url || '').trim());
  localStorage.setItem('saufapp_supabase_anon_key', (anonKey || '').trim());
  client = null;
  authReady = null;
}

async function init() {
  if (!isConfigured()) return { configured: false };
  await ensureAuthReady();
  window.addEventListener('online', () => { flushQueue().catch(() => {}); });
  flushQueue().catch(() => {});
  return { configured: true, profile: profileCache };
}

const api = {
  isConfigured,
  init,
  register,
  login,
  logout,
  setNickname,
  getProfile,
  getSessionUser,
  reportSession,
  flushQueue,
  getDeRanking,
  getMyMonthStats,
  getPreviousMonthWinner,
  createGroup,
  joinGroup,
  listMyGroups,
  getGroupRanking,
  saveLocalConfig,
  yearMonthBerlin,
  computeSessionPoints,
  exportMyData,
  deleteAccount,
};

export default api;

// IIFE-Build: auch als global verfügbar
if (typeof window !== 'undefined') {
  window.PreGameRanking = api;
}
