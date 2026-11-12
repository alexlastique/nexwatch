/* ============================================================
   NexWatch – Home page
============================================================ */
import { getTrendingMovies, getPopularMovies, getTrendingTV } from '../api/tmdb.js';
import { getTrendingManga, getTrendingWebtoons } from '../api/anilist.js';
import { createCarousel, hydrateCarousel } from '../components/carousel.js';
import { navigate } from '../router.js';

// AniList renvoie maintenant { items, pageInfo } : la home n'a besoin que de la 1re page d'items.
const firstPageItems = fn => async () => (await fn(1)).items;

export async function renderHome(container) {
  container.innerHTML = '';

  // ── Hero ─────────────────────────────────────────────────
  const hero = document.createElement('section');
  hero.className = 'hero';
  hero.innerHTML = `
    <div class="hero-bg">
      <div class="hero-orb hero-orb-1"></div>
      <div class="hero-orb hero-orb-2"></div>
    </div>
    <div class="container hero-content">
      <div class="hero-eyebrow">✨ Your media universe</div>
      <h1 class="heading-xl hero-title">Track Everything<br/>You Love</h1>
      <p class="hero-subtitle">
        Movies, TV shows, manga, webtoons — all in one beautiful place.
        Build your library, track your progress, discover what's trending.
      </p>
      <div class="hero-actions">
        <button class="btn btn-primary" id="hero-discover-btn" aria-label="Go to Discover page">
          🔍 Discover Titles
        </button>
        <button class="btn btn-secondary" id="hero-library-btn" aria-label="Go to My Library">
          📚 My Library
        </button>
      </div>
    </div>
  `;
  container.appendChild(hero);

  hero.querySelector('#hero-discover-btn').addEventListener('click', () => navigate('search'));
  hero.querySelector('#hero-library-btn').addEventListener('click', () => navigate('library'));

  // ── Carousels ─────────────────────────────────────────────
  const main = document.createElement('div');
  main.className = 'container';

  const carouselDefs = [
    { id: 'trending-movies',   title: '🎬 Trending Movies',    fetch: getTrendingMovies },
    { id: 'trending-tv',       title: '📺 Trending TV Shows',   fetch: getTrendingTV },
    { id: 'trending-manga',    title: '📚 Trending Manga',      fetch: firstPageItems(getTrendingManga) },
    { id: 'trending-webtoons', title: '📱 Trending Webtoons',   fetch: firstPageItems(getTrendingWebtoons) },
    { id: 'popular-movies',    title: '🔥 Popular Movies',      fetch: getPopularMovies },
  ];

  // Render all carousels immediately with skeletons
  const carouselEls = {};
  carouselDefs.forEach(def => {
    const carousel = createCarousel({ title: def.title, loading: true });
    carouselEls[def.id] = carousel;
    main.appendChild(carousel);
  });

  container.appendChild(main);

  // Fetch all data and hydrate
  carouselDefs.forEach(async def => {
    try {
      const items = await def.fetch();
      hydrateCarousel(carouselEls[def.id], items);
    } catch (err) {
      console.warn(`Failed to load ${def.id}:`, err);
      const track = carouselEls[def.id].querySelector('.carousel-track');
      if (track) track.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;padding:20px 0;">Could not load titles. Check your API key.</p>`;
    }
  });
}
