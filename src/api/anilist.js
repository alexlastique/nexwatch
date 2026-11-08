/* ============================================================
   NexWatch – AniList GraphQL API module (manga & webtoons)
   No API key required.
============================================================ */

const ANILIST_URL = 'https://graphql.anilist.co';

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

// ── Search ─────────────────────────────────────────────────
export async function searchManga(search, page = 1) {
  const data = await query(`
    query($search: String, $page: Int) {
      Page(page: $page, perPage: 20) {
        media(search: $search, type: MANGA, sort: SEARCH_MATCH, countryOfOrigin: "JP") { ${MANGA_FRAGMENT} }
      }
    }
  `, { search, page });
  return (data.Page.media || []).map(normalizeManga);
}

export async function searchWebtoons(search, page = 1) {
  // Korean manhwa (KR) and Chinese manhua (CN) are the main webtoon origins
  const [kr, cn] = await Promise.all([
    query(`
      query($search: String, $page: Int) {
        Page(page: $page, perPage: 15) {
          media(search: $search, type: MANGA, sort: SEARCH_MATCH, countryOfOrigin: "KR") { ${MANGA_FRAGMENT} }
        }
      }
    `, { search, page }),
    query(`
      query($search: String, $page: Int) {
        Page(page: $page, perPage: 5) {
          media(search: $search, type: MANGA, sort: SEARCH_MATCH, countryOfOrigin: "CN") { ${MANGA_FRAGMENT} }
        }
      }
    `, { search, page }),
  ]);
  const combined = [
    ...(kr.Page.media || []),
    ...(cn.Page.media || []),
  ];
  return combined.map(normalizeManga);
}

// ── Trending & Popular ─────────────────────────────────────
export async function getTrendingManga() {
  const data = await query(`
    query {
      Page(page: 1, perPage: 20) {
        media(type: MANGA, sort: TRENDING_DESC, countryOfOrigin: "JP") { ${MANGA_FRAGMENT} }
      }
    }
  `);
  return (data.Page.media || []).map(normalizeManga);
}

export async function getTrendingWebtoons() {
  // Fetch Korean manhwa (the dominant webtoon origin) and Chinese manhua
  const [kr, cn] = await Promise.all([
    query(`
      query {
        Page(page: 1, perPage: 16) {
          media(type: MANGA, sort: TRENDING_DESC, countryOfOrigin: "KR") { ${MANGA_FRAGMENT} }
        }
      }
    `),
    query(`
      query {
        Page(page: 1, perPage: 4) {
          media(type: MANGA, sort: TRENDING_DESC, countryOfOrigin: "CN") { ${MANGA_FRAGMENT} }
        }
      }
    `),
  ]);
  const combined = [
    ...(kr.Page.media || []),
    ...(cn.Page.media || []),
  ];
  return combined.map(normalizeManga);
}

export async function getPopularManga() {
  const data = await query(`
    query {
      Page(page: 1, perPage: 20) {
        media(type: MANGA, sort: POPULARITY_DESC, countryOfOrigin: "JP") { ${MANGA_FRAGMENT} }
      }
    }
  `);
  return (data.Page.media || []).map(normalizeManga);
}

// ── Detail ────────────────────────────────────────────────
export async function getMangaDetail(anilistId) {
  const data = await query(`
    query($id: Int) {
      Media(id: $id, type: MANGA) {
        ${MANGA_FRAGMENT}
        relations {
          edges {
            relationType
            node { id title { romaji } coverImage { medium } type format countryOfOrigin }
          }
        }
        characters(sort: ROLE, perPage: 8) {
          edges { node { name { full } image { medium } } role }
        }
      }
    }
  `, { id: anilistId });
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
  };
}
