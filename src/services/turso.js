/* ============================================================
   NexWatch – Turso (cloud SQLite) client via HTTP API
   ============================================================
   No npm package needed — uses the browser's built-in fetch.
   Turso is a cloud-hosted SQLite database that works from any
   static site including GitHub Pages.

   Free tier: 500 MB · 1 B reads/month · 25 M writes/month
   Sign up at: https://turso.tech/

   Required env vars (create a .env file):
     VITE_TURSO_URL   = libsql://your-db-name.turso.io
     VITE_TURSO_TOKEN = your-auth-token
============================================================ */

const RAW_URL     = import.meta.env.VITE_TURSO_URL   || '';
const TURSO_TOKEN = import.meta.env.VITE_TURSO_TOKEN || '';

// Turso URLs start with libsql:// — convert to https:// for the HTTP API
const TURSO_URL = RAW_URL.replace(/^libsql:\/\//, 'https://');

export const isTursoConfigured = Boolean(TURSO_URL && TURSO_TOKEN);

if (!isTursoConfigured) {
  console.warn(
    '[NexWatch] Turso not configured — running in localStorage-only mode.\n' +
    'Add VITE_TURSO_URL and VITE_TURSO_TOKEN to your .env file to enable cloud sync.'
  );
}

// ── Value serialisers (Turso's typed-value format) ────────
function toArg(v) {
  if (v === null || v === undefined) return { type: 'null' };
  if (typeof v === 'number')         return { type: 'integer', value: String(Math.round(v)) };
  return                                    { type: 'text',    value: String(v) };
}

// ── Response parser: columnar → row objects ───────────────
function parseRows(result) {
  const cols = result.cols.map(c => c.name);
  return result.rows.map(row => {
    const obj = {};
    cols.forEach((col, i) => {
      const cell = row[i];
      obj[col] = (cell?.type === 'null' || cell === null) ? null : cell?.value ?? null;
    });
    return obj;
  });
}

// ── Core execute ──────────────────────────────────────────
export async function execute(query, args = []) {
  if (!isTursoConfigured) throw new Error('Turso not configured');

  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${TURSO_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql: query, args: args.map(toArg) } },
        { type: 'close' },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Turso HTTP ${res.status}: ${text}`);
  }

  const json = await res.json();
  const first = json.results?.[0];

  if (first?.type === 'error') {
    throw new Error(`Turso SQL error: ${first.error?.message}`);
  }

  const result = first?.response?.result;
  if (!result) return [];
  return parseRows(result);
}

// ── Batch execute (multiple statements in one round-trip) ─
export async function batch(statements) {
  if (!isTursoConfigured) throw new Error('Turso not configured');

  const requests = [
    ...statements.map(([sql, args = []]) => ({
      type: 'execute',
      stmt: { sql, args: args.map(toArg) },
    })),
    { type: 'close' },
  ];

  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${TURSO_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) throw new Error(`Turso HTTP ${res.status}`);
  return res.json();
}

// ── Schema bootstrap ──────────────────────────────────────
export async function initSchema() {
  await execute(`
    CREATE TABLE IF NOT EXISTS library (
      id               TEXT    PRIMARY KEY,
      type             TEXT    NOT NULL,
      title            TEXT    NOT NULL,
      poster           TEXT,
      year             TEXT,
      score            INTEGER,
      tmdb_id          TEXT,
      anilist_id       TEXT,
      status           TEXT    NOT NULL DEFAULT 'planned',
      current_season   INTEGER,
      current_episode  INTEGER,
      current_chapter  INTEGER,
      added_at         INTEGER NOT NULL,
      updated_at       INTEGER NOT NULL
    )
  `);
}

// ── Row ↔ Entry converters ────────────────────────────────
export function rowToEntry(row) {
  return {
    id:        row.id,
    type:      row.type,
    title:     row.title,
    poster:    row.poster     || null,
    year:      row.year       || '—',
    score:     row.score      ? Number(row.score) : null,
    tmdbId:    row.tmdb_id    || null,
    anilistId: row.anilist_id || null,
    status:    row.status     || 'planned',
    progress: {
      currentSeason:  row.current_season  ? Number(row.current_season)  : null,
      currentEpisode: row.current_episode ? Number(row.current_episode) : null,
      currentChapter: row.current_chapter ? Number(row.current_chapter) : null,
    },
    addedAt:   row.added_at   ? Number(row.added_at)   : Date.now(),
    updatedAt: row.updated_at ? Number(row.updated_at) : Date.now(),
  };
}
