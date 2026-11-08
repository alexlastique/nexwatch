/* ============================================================
   NexWatch – TMDB API module
   ============================================================
   Replace TMDB_KEY with your free API key from:
   https://www.themoviedb.org/settings/api
*/

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY || '8ded280952d3df426972dda24f7d51be';
const BASE     = 'https://api.themoviedb.org/3';
export const IMG_BASE  = 'https://image.tmdb.org/t/p/w500';
export const BACK_BASE = 'https://image.tmdb.org/t/p/w1280';

async function get(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', 'en-US');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  return res.json();
}

// ── Movies ─────────────────────────────────────────────────
export async function searchMovies(query, page = 1) {
  const data = await get('/search/movie', { query, page });
  return data.results.map(normalizeMovie);
}

export async function getTrendingMovies() {
  const data = await get('/trending/movie/week');
  return data.results.map(normalizeMovie);
}

export async function getPopularMovies() {
  const data = await get('/movie/popular');
  return data.results.map(normalizeMovie);
}

export async function getMovieDetail(id) {
  const [detail, credits] = await Promise.all([
    get(`/movie/${id}`, { append_to_response: 'videos' }),
    get(`/movie/${id}/credits`)
  ]);
  return normalizeMovieDetail(detail, credits);
}

// ── TV Shows ───────────────────────────────────────────────
export async function searchTV(query, page = 1) {
  const data = await get('/search/tv', { query, page });
  return data.results.map(normalizeTV);
}

export async function getTrendingTV() {
  const data = await get('/trending/tv/week');
  return data.results.map(normalizeTV);
}

export async function getPopularTV() {
  const data = await get('/tv/popular');
  return data.results.map(normalizeTV);
}

export async function getTVDetail(id) {
  const [detail, credits] = await Promise.all([
    get(`/tv/${id}`, { append_to_response: 'videos' }),
    get(`/tv/${id}/credits`)
  ]);
  return normalizeTVDetail(detail, credits);
}

export async function getTVSeason(seriesId, seasonNumber) {
  return get(`/tv/${seriesId}/season/${seasonNumber}`);
}

// ── Normalizers ───────────────────────────────────────────
function normalizeMovie(m) {
  return {
    id:       `movie-${m.id}`,
    tmdbId:   m.id,
    type:     'movie',
    title:    m.title,
    year:     m.release_date ? m.release_date.slice(0, 4) : '—',
    poster:   m.poster_path ? `${IMG_BASE}${m.poster_path}` : null,
    backdrop: m.backdrop_path ? `${BACK_BASE}${m.backdrop_path}` : null,
    score:    m.vote_average ? Math.round(m.vote_average * 10) : null,
    overview: m.overview,
  };
}

function normalizeTV(t) {
  return {
    id:       `tv-${t.id}`,
    tmdbId:   t.id,
    type:     'tv',
    title:    t.name,
    year:     t.first_air_date ? t.first_air_date.slice(0, 4) : '—',
    poster:   t.poster_path ? `${IMG_BASE}${t.poster_path}` : null,
    backdrop: t.backdrop_path ? `${BACK_BASE}${t.backdrop_path}` : null,
    score:    t.vote_average ? Math.round(t.vote_average * 10) : null,
    overview: t.overview,
  };
}

function normalizeMovieDetail(d, credits) {
  return {
    ...normalizeMovie(d),
    genres:   (d.genres || []).map(g => g.name),
    runtime:  d.runtime,
    status:   d.status,
    tagline:  d.tagline,
    cast:     (credits.cast || []).slice(0, 8).map(c => ({ name: c.name, character: c.character, photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null })),
  };
}

function normalizeTVDetail(d, credits) {
  return {
    ...normalizeTV(d),
    genres:       (d.genres || []).map(g => g.name),
    status:       d.status,
    tagline:      d.tagline,
    seasons:      d.number_of_seasons,
    episodes:     d.number_of_episodes,
    seasonList:   (d.seasons || []).filter(s => s.season_number > 0),
    cast:         (credits.cast || []).slice(0, 8).map(c => ({ name: c.name, character: c.character, photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null })),
  };
}
