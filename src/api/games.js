/* ============================================================
   NexWatch – Video Games API module (RAWG + Zero-Key Fallback)
   ============================================================
   • Primary: RAWG Video Games Database API (850,000+ games)
     Get a free API key at: https://rawg.io/apidocs
     Add VITE_RAWG_KEY=your_key to your .env file.
   • Fallback (when VITE_RAWG_KEY is not set):
     Uses Steam Store Search + curated trending catalog with
     official Steam 2:3 vertical box art so the Games tab works
     immediately out of the box with zero configuration.
============================================================ */

const RAWG_KEY  = import.meta.env.VITE_RAWG_KEY || '';
const RAWG_BASE = 'https://api.rawg.io/api';

export const isRawgConfigured = Boolean(RAWG_KEY);

// Official Steam 2:3 vertical poster & 16:9 hero banner helpers
const steamPoster   = (appId) => `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`;
const steamBackdrop = (appId) => `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;

// Curated trending/popular games (used when VITE_RAWG_KEY is not configured or offline)
const FALLBACK_GAMES = [
  {
    steamId: 1245620,
    title: 'Elden Ring',
    year: '2022',
    score: 96,
    genres: ['Action', 'RPG', 'Open World'],
    platforms: ['PC', 'PS5', 'Xbox Series X/S', 'PS4'],
    playtime: 85,
    developer: 'FromSoftware',
    status: 'Released',
    overview: 'THE NEW FANTASY ACTION RPG. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.',
  },
  {
    steamId: 1086940,
    title: "Baldur's Gate 3",
    year: '2023',
    score: 96,
    genres: ['RPG', 'Strategy', 'Adventure'],
    platforms: ['PC', 'PS5', 'Xbox Series X/S', 'Mac'],
    playtime: 110,
    developer: 'Larian Studios',
    status: 'Released',
    overview: 'Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal, sacrifice and survival, and the lure of absolute power.',
  },
  {
    steamId: 1091500,
    title: 'Cyberpunk 2077',
    year: '2020',
    score: 86,
    genres: ['Action', 'RPG', 'Sci-Fi'],
    platforms: ['PC', 'PS5', 'Xbox Series X/S'],
    playtime: 65,
    developer: 'CD PROJEKT RED',
    status: 'Released',
    overview: 'Cyberpunk 2077 is an open-world, action-adventure RPG set in the megalopolis of Night City, where you play as a cyberpunk mercenary wrapped up in a do-or-die fight for survival.',
  },
  {
    steamId: 292030,
    title: 'The Witcher 3: Wild Hunt',
    year: '2015',
    score: 93,
    genres: ['RPG', 'Open World', 'Fantasy'],
    platforms: ['PC', 'PS5', 'Xbox Series X/S', 'Switch'],
    playtime: 70,
    developer: 'CD PROJEKT RED',
    status: 'Released',
    overview: 'You are Geralt of Rivia, mercenary monster slayer. Before you stands a war-torn, monster-infested continent you can explore at will.',
  },
  {
    steamId: 1174180,
    title: 'Red Dead Redemption 2',
    year: '2018',
    score: 97,
    genres: ['Action', 'Adventure', 'Open World'],
    platforms: ['PC', 'PS4', 'Xbox One'],
    playtime: 80,
    developer: 'Rockstar Games',
    status: 'Released',
    overview: 'Arthur Morgan and the Van der Linde gang are outlaws on the run. With federal agents and the best bounty hunters in the nation massing on their heels, the gang must rob, steal and fight their way across the rugged heartland of America.',
  },
  {
    steamId: 2358720,
    title: 'Black Myth: Wukong',
    year: '2024',
    score: 82,
    genres: ['Action', 'RPG', 'Mythology'],
    platforms: ['PC', 'PS5'],
    playtime: 40,
    developer: 'Game Science',
    status: 'Released',
    overview: 'Black Myth: Wukong is an action RPG rooted in Chinese mythology. You shall set out as the Destined One to venture into the challenges and marvels ahead.',
  },
  {
    steamId: 367520,
    title: 'Hollow Knight',
    year: '2017',
    score: 90,
    genres: ['Metroidvania', 'Indie', 'Platformer'],
    platforms: ['PC', 'Switch', 'PS4', 'Xbox One'],
    playtime: 35,
    developer: 'Team Cherry',
    status: 'Released',
    overview: 'Forge your own path in Hollow Knight! An epic action adventure through a vast ruined kingdom of insects and heroes.',
  },
  {
    steamId: 1145360,
    title: 'Hades',
    year: '2020',
    score: 93,
    genres: ['Roguelike', 'Action', 'Indie'],
    platforms: ['PC', 'Switch', 'PS5', 'Xbox'],
    playtime: 45,
    developer: 'Supergiant Games',
    status: 'Released',
    overview: 'Defy the god of the dead as you hack and slash out of the Underworld in this rogue-like dungeon crawler from the creators of Bastion and Transistor.',
  },
  {
    steamId: 1145350,
    title: 'Hades II',
    year: '2024',
    score: 90,
    genres: ['Roguelike', 'Action', 'Indie'],
    platforms: ['PC'],
    playtime: 40,
    developer: 'Supergiant Games',
    status: 'Early Access',
    overview: 'Battle beyond the Underworld using dark sorcery to take on the Titan of Time in this bewitching sequel to the award-winning rogue-like dungeon crawler.',
  },
  {
    steamId: 553850,
    title: 'HELLDIVERS 2',
    year: '2024',
    score: 83,
    genres: ['Shooter', 'Co-op', 'Sci-Fi'],
    platforms: ['PC', 'PS5'],
    playtime: 50,
    developer: 'Arrowhead Game Studios',
    status: 'Released',
    overview: 'The Galaxy’s Last Line of Offence. Enlist in the Helldivers and join the fight for freedom across a hostile galaxy in a fast, frantic, and ferocious third-person shooter.',
  },
  {
    steamId: 1593500,
    title: 'God of War',
    year: '2018',
    score: 94,
    genres: ['Action', 'Adventure'],
    platforms: ['PC', 'PS5', 'PS4'],
    playtime: 32,
    developer: 'Santa Monica Studio',
    status: 'Released',
    overview: 'His vengeance against the Gods of Olympus years behind him, Kratos now lives as a man in the realm of Norse Gods and monsters.',
  },
  {
    steamId: 2322010,
    title: 'God of War Ragnarök',
    year: '2022',
    score: 94,
    genres: ['Action', 'Adventure'],
    platforms: ['PC', 'PS5', 'PS4'],
    playtime: 40,
    developer: 'Santa Monica Studio',
    status: 'Released',
    overview: 'Kratos and Atreus must journey to each of the Nine Realms in search of answers as Asgardian forces prepare for a prophesied battle that will end the world.',
  },
  {
    steamId: 1687950,
    title: 'Persona 5 Royal',
    year: '2020',
    score: 95,
    genres: ['JRPG', 'Turn-Based', 'Anime'],
    platforms: ['PC', 'PS5', 'Switch', 'Xbox'],
    playtime: 105,
    developer: 'ATLUS',
    status: 'Released',
    overview: 'Don the mask and join the Phantom Thieves of Hearts as they stage grand heists, infiltrate the minds of the corrupt, and make them change their ways!',
  },
  {
    steamId: 2679460,
    title: 'Metaphor: ReFantazio',
    year: '2024',
    score: 94,
    genres: ['JRPG', 'Fantasy', 'Turn-Based'],
    platforms: ['PC', 'PS5', 'Xbox Series X/S'],
    playtime: 80,
    developer: 'Studio Zero / ATLUS',
    status: 'Released',
    overview: 'From the creative minds behind Persona 3, 4, and 5 comes Metaphor: ReFantazio, a unique fantasy world where your protagonist will journey alongside his fairy companion, Gallica.',
  },
  {
    steamId: 2050650,
    title: 'Resident Evil 4',
    year: '2023',
    score: 93,
    genres: ['Survival Horror', 'Action'],
    platforms: ['PC', 'PS5', 'Xbox Series X/S'],
    playtime: 22,
    developer: 'CAPCOM',
    status: 'Released',
    overview: 'Survival is just the beginning. Six years have passed since the biological disaster in Raccoon City. Leon S. Kennedy tracks the president\'s kidnapped daughter to a secluded European village.',
  },
  {
    steamId: 413150,
    title: 'Stardew Valley',
    year: '2016',
    score: 89,
    genres: ['Simulation', 'Indie', 'RPG'],
    platforms: ['PC', 'Switch', 'PS4', 'Xbox', 'Mobile'],
    playtime: 95,
    developer: 'ConcernedApe',
    status: 'Released',
    overview: 'You\'ve inherited your grandfather\'s old farm plot in Stardew Valley. Armed with hand-me-down tools and a few coins, you set out to begin your new life.',
  },
].map(g => ({
  id:        `game-steam-${g.steamId}`,
  rawgId:    null,
  steamId:   g.steamId,
  type:      'game',
  title:     g.title,
  year:      g.year,
  poster:    steamPoster(g.steamId),
  backdrop:  steamBackdrop(g.steamId),
  score:     g.score,
  overview:  g.overview,
  genres:    g.genres,
  platforms: g.platforms,
  playtime:  g.playtime,
  developer: g.developer,
  status:    g.status,
}));

// ── RAWG fetch helper ─────────────────────────────────────
async function rawgGet(path, params = {}) {
  const url = new URL(`${RAWG_BASE}${path}`);
  url.searchParams.set('key', RAWG_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RAWG ${res.status}: ${path}`);
  return res.json();
}

// ── Search Video Games ────────────────────────────────────
export async function searchGames(query, page = 1) {
  if (isRawgConfigured) {
    const data = await rawgGet('/games', {
      search: query,
      page,
      page_size: 20,
    });
    const totalResults = data.count || 0;
    const totalPages   = Math.max(1, Math.ceil(totalResults / 20));
    return {
      results:      (data.results || []).map(normalizeRawgGame),
      page,
      totalPages,
      totalResults,
      hasNextPage:  Boolean(data.next),
    };
  }

  // Zero-Key Fallback:
  // 1) Try Steam Store search via CORS-friendly proxy + local catalog match
  const qLower = query.toLowerCase();
  const localMatches = FALLBACK_GAMES.filter(g =>
    g.title.toLowerCase().includes(qLower) ||
    g.genres.some(genre => genre.toLowerCase().includes(qLower))
  );

  try {
    const steamUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(steamUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const data = await res.json();
      const steamItems = (data.items || []).map(item => ({
        id:        `game-steam-${item.id}`,
        steamId:   item.id,
        type:      'game',
        title:     item.name,
        year:      '—',
        poster:    steamPoster(item.id),
        backdrop:  steamBackdrop(item.id),
        score:     item.metascore ? Number(item.metascore) : null,
        overview:  'Available on Steam. Click to track your progress, hours played, and completion status.',
        genres:    ['Video Game'],
        platforms: [
          item.platforms?.windows ? 'PC' : null,
          item.platforms?.mac     ? 'Mac' : null,
          item.platforms?.linux   ? 'Linux' : null,
        ].filter(Boolean),
      }));

      // Deduplicate with local matches (prefer local matches for richer metadata)
      const seen = new Set(localMatches.map(g => g.id));
      const merged = [...localMatches, ...steamItems.filter(g => !seen.has(g.id))];
      return {
        results:      merged,
        page:         1,
        totalPages:   1,
        totalResults: merged.length,
        hasNextPage:  false,
      };
    }
  } catch (err) {
    console.warn('[NexWatch] Steam proxy fallback failed, using built-in catalog:', err);
  }

  return {
    results:      localMatches,
    page:         1,
    totalPages:   1,
    totalResults: localMatches.length,
    hasNextPage:  false,
  };
}

// ── Trending / Popular Video Games ────────────────────────
export async function getTrendingGames(page = 1) {
  if (isRawgConfigured) {
    const data = await rawgGet('/games', {
      ordering: '-added',
      page,
      page_size: 20,
    });
    const totalResults = data.count || 0;
    const totalPages   = Math.min(500, Math.max(1, Math.ceil(totalResults / 20)));
    return {
      results:      (data.results || []).map(normalizeRawgGame),
      page,
      totalPages,
      totalResults,
      hasNextPage:  Boolean(data.next),
    };
  }

  return {
    results:      FALLBACK_GAMES,
    page:         1,
    totalPages:   1,
    totalResults: FALLBACK_GAMES.length,
    hasNextPage:  false,
  };
}

// ── Game Detail ───────────────────────────────────────────
export async function getGameDetail(item) {
  const rawgId  = typeof item === 'object' ? item.rawgId  : item;
  const steamId = typeof item === 'object' ? item.steamId : null;

  if (isRawgConfigured && rawgId) {
    const d = await rawgGet(`/games/${rawgId}`);
    return normalizeRawgDetail(d);
  }

  // Check curated catalog first
  const id = typeof item === 'object' ? item.id : `game-steam-${item}`;
  const found = FALLBACK_GAMES.find(g => g.id === id);
  if (found) return found;

  // If it's a Steam game from zero-key search, try fetching live Steam appdetails
  const appId = steamId || (typeof id === 'string' && id.startsWith('game-steam-') ? id.replace('game-steam-', '') : null);
  if (appId) {
    try {
      const steamDetailUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(steamDetailUrl)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const json = await res.json();
        const data = json?.[appId]?.data;
        if (data) {
          return {
            ...(typeof item === 'object' ? item : {}),
            id:        `game-steam-${appId}`,
            steamId:   Number(appId),
            type:      'game',
            title:     data.name || item?.title || 'Video Game',
            year:      data.release_date?.date ? (data.release_date.date.match(/\d{4}/)?.[0] || '—') : (item?.year || '—'),
            poster:    steamPoster(appId),
            backdrop:  data.screenshots?.[0]?.path_full || steamBackdrop(appId),
            score:     data.metacritic?.score || item?.score || null,
            overview:  data.short_description || (data.detailed_description ? data.detailed_description.replace(/<[^>]*>/g, '').slice(0, 600) : ''),
            genres:    (data.genres || []).map(g => g.description),
            developer: (data.developers || []).join(', ') || null,
            publisher: (data.publishers || []).join(', ') || null,
            platforms: [
              data.platforms?.windows ? 'PC' : null,
              data.platforms?.mac     ? 'Mac' : null,
              data.platforms?.linux   ? 'Linux' : null,
            ].filter(Boolean),
            status:    data.release_date?.coming_soon ? 'Coming Soon' : 'Released',
          };
        }
      }
    } catch (err) {
      console.warn('[NexWatch] Steam detail fallback failed:', err);
    }
  }

  if (typeof item === 'object') return item;
  return {
    id,
    type: 'game',
    title: 'Video Game',
    year: '—',
    genres: ['Video Game'],
    overview: 'No additional details available.',
  };
}

// ── Normalizers ───────────────────────────────────────────
function normalizeRawgGame(g) {
  const score = g.metacritic
    ? g.metacritic
    : g.rating
      ? Math.round(g.rating * 20)
      : null;

  return {
    id:        `game-${g.id}`,
    rawgId:    g.id,
    type:      'game',
    title:     g.name,
    year:      g.released ? g.released.slice(0, 4) : '—',
    poster:    g.background_image || null,
    backdrop:  g.background_image || null,
    score,
    overview:  '',
    genres:    (g.genres || []).map(x => x.name),
    platforms: (g.parent_platforms || []).map(p => p.platform?.name).filter(Boolean),
    playtime:  g.playtime || null,
  };
}

function normalizeRawgDetail(d) {
  const base = normalizeRawgGame(d);
  return {
    ...base,
    backdrop:  d.background_image_additional || d.background_image || null,
    overview:  d.description_raw || (d.description ? d.description.replace(/<[^>]*>/g, '') : ''),
    developer: (d.developers || []).map(x => x.name).join(', ') || null,
    publisher: (d.publishers || []).map(x => x.name).join(', ') || null,
    status:    d.tba ? 'TBA' : 'Released',
    website:   d.website || null,
  };
}
