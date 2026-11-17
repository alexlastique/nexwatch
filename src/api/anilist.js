/* ============================================================
   NexWatch – AniList GraphQL API module (manga & webtoons)
   No API key required. Pagination supportée sur tous les endpoints.
   Retour des fonctions de liste : { items: [...], pageInfo: {...} }
============================================================ */

const ANILIST_URL = 'https://graphql.anilist.co';
const MAX_PER_PAGE = 50; // limite imposée par AniList

async function query(gql, variables = {}) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: gql, variables }),
  });
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

const MANGA_FRAGMENT = `
  id title { romaji english native } coverImage { large } bannerImage
  status chapters volumes format countryOfOrigin startDate { year }
  averageScore genres description(asHtml: false)
  meanScore popularity isAdult
`;

const PAGE_INFO = `pageInfo { total currentPage lastPage hasNextPage perPage }`;

// ── Helpers de pagination ──────────────────────────────────
function sanitizePage(page) {
  const p = Number.parseInt(page, 10);
  return Number.isFinite(p) && p >= 1 ? p : 1;
}

function sanitizePerPage(perPage, fallback) {
  const n = Number.parseInt(perPage, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, MAX_PER_PAGE);
}

/**
 * Requête paginée générique sur Page.media.
 * - `search` n'est envoyé que s'il est défini (sort SEARCH_MATCH uniquement dans ce cas)
 * - `country` : "JP" | "KR" | "CN"
 */
async function fetchMediaPage({ search, sort, country, page, perPage }) {
  const variables = { page, perPage, sort: [sort], country };
  if (search) variables.search = search;

  const data = await query(`
    query($page: Int, $perPage: Int, $search: String, $sort: [MediaSort], $country: CountryCode) {
      Page(page: $page, perPage: $perPage) {
        ${PAGE_INFO}
        media(type: MANGA, search: $search, sort: $sort, countryOfOrigin: $country) { ${MANGA_FRAGMENT} }
      }
    }
  `, variables);

  return {
    items: (data.Page.media || []).map(normalizeManga),
    pageInfo: data.Page.pageInfo,
  };
}

/**
 * Webtoons = KR (manhwa) + CN (manhua). AniList n'accepte qu'UN seul pays par requête,
 * donc on fait 2 requêtes avec le même index de page et on fusionne les pageInfo :
 *  - hasNextPage : vrai si l'un des deux a encore des pages
 *  - lastPage    : le max des deux
 *  - total       : la somme
 * Une page au-delà de lastPage renvoie simplement une liste vide côté AniList.
 */
async function fetchWebtoonPage({ search, sort, page, perPage }) {
  const krPer = Math.max(1, Math.round(perPage * 0.75));
  const cnPer = Math.max(1, perPage - krPer);

  const [kr, cn] = await Promise.all([
    fetchMediaPage({ search, sort, country: 'KR', page, perPage: krPer }),
    fetchMediaPage({ search, sort, country: 'CN', page, perPage: cnPer }),
  ]);

  return {
    items: [...kr.items, ...cn.items],
    pageInfo: {
      total:       (kr.pageInfo.total || 0) + (cn.pageInfo.total || 0),
      currentPage: page,
      lastPage:    Math.max(kr.pageInfo.lastPage || 1, cn.pageInfo.lastPage || 1),
      hasNextPage: !!(kr.pageInfo.hasNextPage || cn.pageInfo.hasNextPage),
      perPage,
    },
  };
}

// ── Search ─────────────────────────────────────────────────
export function searchManga(search, page = 1, perPage = 20) {
  return fetchMediaPage({
    search, sort: 'SEARCH_MATCH', country: 'JP',
    page: sanitizePage(page), perPage: sanitizePerPage(perPage, 20),
  });
}

export function searchWebtoons(search, page = 1, perPage = 20) {
  return fetchWebtoonPage({
    search, sort: 'SEARCH_MATCH',
    page: sanitizePage(page), perPage: sanitizePerPage(perPage, 20),
  });
}

// ── Trending & Popular ─────────────────────────────────────
export function getTrendingManga(page = 1, perPage = 20) {
  return fetchMediaPage({
    sort: 'TRENDING_DESC', country: 'JP',
    page: sanitizePage(page), perPage: sanitizePerPage(perPage, 20),
  });
}

export function getTrendingWebtoons(page = 1, perPage = 20) {
  return fetchWebtoonPage({
    sort: 'TRENDING_DESC',
    page: sanitizePage(page), perPage: sanitizePerPage(perPage, 20),
  });
}

export function getPopularManga(page = 1, perPage = 20) {
  return fetchMediaPage({
    sort: 'POPULARITY_DESC', country: 'JP',
    page: sanitizePage(page), perPage: sanitizePerPage(perPage, 20),
  });
}

// Nouvel endpoint cohérent avec getPopularManga
export function getPopularWebtoons(page = 1, perPage = 20) {
  return fetchWebtoonPage({
    sort: 'POPULARITY_DESC',
    page: sanitizePage(page), perPage: sanitizePerPage(perPage, 20),
  });
}

// ── Detail ────────────────────────────────────────────────
// Les relations ne sont pas paginables dans AniList (liste complète, tronquée à 6 ici).
// Les personnages le sont via charactersPage.
export async function getMangaDetail(anilistId, charactersPage = 1, charactersPerPage = 8) {
  const data = await query(`
    query($id: Int, $cPage: Int, $cPerPage: Int) {
      Media(id: $id, type: MANGA) {
        ${MANGA_FRAGMENT}
        relations {
          edges {
            relationType
            node { id title { romaji } coverImage { medium } type format countryOfOrigin }
          }
        }
        characters(sort: ROLE, page: $cPage, perPage: $cPerPage) {
          pageInfo { total currentPage lastPage hasNextPage perPage }
          edges { node { name { full } image { medium } } role }
        }
      }
    }
  `, {
    id: anilistId,
    cPage: sanitizePage(charactersPage),
    cPerPage: sanitizePerPage(charactersPerPage, 8),
  });
  return normalizeMangaDetail(data.Media);
}

// ── Normalizers ───────────────────────────────────────────
export function normalizeManga(m) {
  const fmt     = m.format || 'MANGA';
  const origin  = m.countryOfOrigin || 'JP';
  // Webtoons = Korean manhwa (KR) or Chinese manhua (CN)
  const isWebtoon = origin === 'KR' || origin === 'CN';
  return {
    id:        `manga-${m.id}`,
    anilistId: m.id,
    type:      isWebtoon ? 'webtoon' : 'manga',
    title:     m.title.english || m.title.romaji || m.title.native,
    year:      m.startDate?.year ? String(m.startDate.year) : '—',
    poster:    m.coverImage?.large || null,
    backdrop:  m.bannerImage || null,
    score:     m.averageScore || null,
    overview:  m.description ? m.description.replace(/<[^>]*>/g, '').slice(0, 600) : '',
    chapters:  m.chapters,
    volumes:   m.volumes,
    status:    m.status,
    genres:    m.genres || [],
    format:    fmt,
    origin,
  };
}

function normalizeMangaDetail(m) {
  const base = normalizeManga(m);
  return {
    ...base,
    relations: (m.relations?.edges || []).slice(0, 6).map(e => ({
      type: e.relationType,
      id:   e.node.id,
      title: e.node.title.romaji,
      poster: e.node.coverImage?.medium,
      mediaType: e.node.type,
    })),
    characters: (m.characters?.edges || []).map(e => ({
      name: e.node.name.full,
      photo: e.node.image?.medium,
      role: e.role,
    })),
    charactersPageInfo: m.characters?.pageInfo || null,
  };
}