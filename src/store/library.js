/* ============================================================
   NexWatch – Hybrid Library Store
   ============================================================
   • Turso configured  → SQLite in the cloud (cross-device)
   • Not configured    → localStorage  (offline / local)

   An in-memory cache mirrors the remote DB so that reads
   (isInLibrary, getEntry, getLibrary) are always synchronous.
   Writes go to the remote first, then update the cache.
============================================================ */
import {
  isTursoConfigured,
  initSchema,
  execute,
  rowToEntry,
} from '../services/turso.js';

// ── localStorage helpers ──────────────────────────────────
const LS_KEY = 'nexwatch_library';
function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
function lsSave(db) { localStorage.setItem(LS_KEY, JSON.stringify(db)); }

// ── In-memory cache ───────────────────────────────────────
let cache     = {};      // { [id]: entry }
let listeners = [];      // UI refresh callbacks
let ready     = false;   // true once initial load completes

function notify() { listeners.forEach(fn => fn()); }

/** Register a callback invoked whenever the library changes */
export function subscribeLibrary(fn) {
  listeners.push(fn);
  if (ready) fn();   // fire immediately if data already loaded
  return () => { listeners = listeners.filter(l => l !== fn); };
}

// ── Boot: load all data into cache ────────────────────────
async function boot() {
  if (isTursoConfigured) {
    try {
      await initSchema();
      const rows = await execute('SELECT * FROM library ORDER BY updated_at DESC');
      cache = {};
      rows.forEach(row => { cache[row.id] = rowToEntry(row); });

      // Migrate any existing localStorage entries that aren't yet in Turso
      const local = lsLoad();
      const toMigrate = Object.values(local).filter(e => !cache[e.id]);
      if (toMigrate.length) {
        await Promise.all(toMigrate.map(e => _remoteAdd(e, e.status)));
        console.info(`[NexWatch] Migrated ${toMigrate.length} local entries to Turso`);
      }
    } catch (err) {
      console.error('[NexWatch] Turso boot failed, falling back to localStorage:', err);
      cache = lsLoad();
    }
  } else {
    cache = lsLoad();
  }
  ready = true;
  notify();
}

boot();

// ── Synchronous reads (always use cache) ──────────────────
export function getLibrary() {
  return Object.values(cache);
}

export function getEntry(id) {
  return cache[id] || null;
}

export function isInLibrary(id) {
  return Boolean(cache[id]);
}

// ── Writes ────────────────────────────────────────────────
export async function addToLibrary(item, status = 'planned') {
  if (cache[item.id]) return cache[item.id];  // already present

  const entry = {
    id:        item.id,
    type:      item.type,
    title:     item.title,
    poster:    item.poster    || null,
    year:      item.year      || '—',
    score:     item.score     || null,
    tmdbId:    item.tmdbId    || null,
    anilistId: item.anilistId || null,
    status,
    progress: {
      currentSeason:  item.type === 'tv' ? 1 : null,
      currentEpisode: null,
      currentChapter: null,
    },
    addedAt:   Date.now(),
    updatedAt: Date.now(),
  };

  cache[item.id] = entry;
  notify();

  if (isTursoConfigured) {
    try { await _remoteAdd(entry, status); } catch (e) { console.error('Turso write error:', e); }
  } else {
    const local = lsLoad(); local[entry.id] = entry; lsSave(local);
  }
  return entry;
}

async function _remoteAdd(entry, status) {
  await execute(
    `INSERT OR REPLACE INTO library
       (id, type, title, poster, year, score, tmdb_id, anilist_id,
        status, current_season, current_episode, current_chapter,
        added_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      entry.id, entry.type, entry.title, entry.poster, entry.year,
      entry.score, entry.tmdbId, entry.anilistId,
      status,
      entry.progress?.currentSeason  ?? null,
      entry.progress?.currentEpisode ?? null,
      entry.progress?.currentChapter ?? null,
      entry.addedAt, entry.updatedAt,
    ]
  );
}

export async function removeFromLibrary(id) {
  delete cache[id];
  notify();

  if (isTursoConfigured) {
    try { await execute('DELETE FROM library WHERE id = ?', [id]); }
    catch (e) { console.error('Turso delete error:', e); }
  } else {
    const local = lsLoad(); delete local[id]; lsSave(local);
  }
}

export async function updateStatus(id, status) {
  if (!cache[id]) return;
  cache[id] = { ...cache[id], status, updatedAt: Date.now() };
  notify();

  if (isTursoConfigured) {
    try {
      await execute(
        'UPDATE library SET status = ?, updated_at = ? WHERE id = ?',
        [status, Date.now(), id]
      );
    } catch (e) { console.error('Turso update error:', e); }
  } else {
    const local = lsLoad();
    if (local[id]) { local[id].status = status; local[id].updatedAt = Date.now(); lsSave(local); }
  }
}

export async function updateProgress(id, progressPatch) {
  if (!cache[id]) return;
  cache[id].progress  = { ...cache[id].progress, ...progressPatch };
  cache[id].updatedAt = Date.now();
  notify();

  const p = cache[id].progress;
  if (isTursoConfigured) {
    try {
      await execute(
        `UPDATE library
         SET current_season = ?, current_episode = ?, current_chapter = ?, updated_at = ?
         WHERE id = ?`,
        [p.currentSeason, p.currentEpisode, p.currentChapter, Date.now(), id]
      );
    } catch (e) { console.error('Turso update error:', e); }
  } else {
    const local = lsLoad();
    if (local[id]) {
      local[id].progress  = p;
      local[id].updatedAt = Date.now();
      lsSave(local);
    }
  }
}

// ── Helpers ───────────────────────────────────────────────
export function getStats() {
  const entries = getLibrary();
  return {
    total:     entries.length,
    movies:    entries.filter(e => e.type === 'movie').length,
    tv:        entries.filter(e => e.type === 'tv').length,
    manga:     entries.filter(e => e.type === 'manga').length,
    webtoon:   entries.filter(e => e.type === 'webtoon').length,
    watching:  entries.filter(e => e.status === 'watching').length,
    completed: entries.filter(e => e.status === 'completed').length,
    planned:   entries.filter(e => e.status === 'planned').length,
    dropped:   entries.filter(e => e.status === 'dropped').length,
  };
}

export function filterLibrary({ type, status } = {}) {
  let entries = getLibrary();
  if (type   && type   !== 'all') entries = entries.filter(e => e.type   === type);
  if (status && status !== 'all') entries = entries.filter(e => e.status === status);
  return entries.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function formatProgress(entry) {
  if (!entry) return '';
  const p = entry.progress;
  if (entry.type === 'movie') return '';
  if (entry.type === 'tv') {
    const s = p?.currentSeason  ? `S${String(p.currentSeason).padStart(2, '0')}`  : '';
    const e = p?.currentEpisode ? `E${String(p.currentEpisode).padStart(2, '0')}` : '';
    return [s, e].filter(Boolean).join('') || 'Not started';
  }
  return p?.currentChapter ? `Chapter ${p.currentChapter}` : 'Not started';
}
