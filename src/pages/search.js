/* ============================================================
   NexWatch – Search page
============================================================ */
import { searchMovies, searchTV, getTrendingMovies, getTrendingTV } from '../api/tmdb.js';
import { searchManga, searchWebtoons, getTrendingManga, getTrendingWebtoons } from '../api/anilist.js';
import { createMediaCard, createCardSkeleton } from '../components/card.js';

let currentTab = 'movie';
let lastQuery  = '';
let debounce;

/**
 * AniList renvoie { items, pageInfo: { total, currentPage, lastPage, hasNextPage, perPage } }.
 * On le convertit vers la forme attendue par la page :
 * { results, page, totalPages, totalResults, hasNextPage } (même forme que TMDB).
 */
function fromAniList({ items = [], pageInfo = {} }, requestedPage = 1) {
  return {
    results:      items,
    page:         pageInfo.currentPage || requestedPage,
    totalPages:   pageInfo.lastPage || 1,
    totalResults: pageInfo.total ?? items.length,
    hasNextPage:  !!pageInfo.hasNextPage,
  };
}

export function renderSearch(container, params = {}) {
  const initialQuery = params.q || '';
  const searchState = {
    page: 1,
    hasNextPage: false,
    totalPages: 0,
    totalResults: 0,
    requestId: 0,
  };

  container.innerHTML = `
    <div class="page">
      <div class="container">
        <div class="search-header">
          <h1>Discover</h1>
          <p>Search across movies, TV shows, manga and webtoons</p>
        </div>

        <div class="search-controls">
          <div class="search-input-wrap">
            <span class="search-icon-large">🔍</span>
            <input
              id="search-page-input"
              class="search-page-input"
              type="search"
              placeholder="Search for a title…"
              value="${escHtml(initialQuery)}"
              autocomplete="off"
              aria-label="Search titles"
            />
          </div>

          <div class="tab-bar" id="search-tabs" role="tablist">
            <div class="tab ${currentTab === 'movie' ? 'active' : ''}"   data-tab="movie"   role="tab" aria-selected="${currentTab === 'movie'}">🎬 Movies</div>
            <div class="tab ${currentTab === 'tv'    ? 'active' : ''}"   data-tab="tv"      role="tab" aria-selected="${currentTab === 'tv'}">📺 TV Shows</div>
            <div class="tab ${currentTab === 'manga' ? 'active' : ''}"   data-tab="manga"   role="tab" aria-selected="${currentTab === 'manga'}">📚 Manga</div>
            <div class="tab ${currentTab === 'webtoon' ? 'active' : ''}" data-tab="webtoon" role="tab" aria-selected="${currentTab === 'webtoon'}">📱 Webtoons</div>
          </div>
        </div>

        <div id="search-results-meta" class="search-results-meta"></div>
        <div id="search-grid" class="grid-auto" role="list" aria-live="polite"></div>
        <nav id="search-pagination" class="search-pagination" aria-label="Search result pages" hidden>
          <button type="button" class="search-page-button" data-page-action="previous">Previous</button>
          <span class="search-page-indicator" aria-live="polite"></span>
          <button type="button" class="search-page-button" data-page-action="next">Next</button>
        </nav>
      </div>
    </div>
  `;

  const input   = container.querySelector('#search-page-input');
  const tabBar  = container.querySelector('#search-tabs');
  const grid    = container.querySelector('#search-grid');
  const meta    = container.querySelector('#search-results-meta');
  const pagination = container.querySelector('#search-pagination');

  // Tab switching
  tabBar.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      tabBar.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentTab = tab.dataset.tab;
      searchState.page = 1;
      if (lastQuery) runSearch(lastQuery, grid, meta, pagination, searchState, 1);
      else renderDiscover(grid, meta, currentTab, pagination, searchState, 1);
    });
  });

  // Input
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const q = input.value.trim();
      lastQuery = q;
      searchState.page = 1;
      if (q.length >= 2) runSearch(q, grid, meta, pagination, searchState, 1);
      else renderDiscover(grid, meta, currentTab, pagination, searchState, 1);
    }, 350);
  });

  // Pagination : fonctionne en recherche ET en mode Discover (trending)
  pagination.addEventListener('click', event => {
    const button = event.target.closest('[data-page-action]');
    if (!button || button.disabled) return;
    const isNext = button.dataset.pageAction === 'next';
    const page = searchState.page + (isNext ? 1 : -1);
    if (page < 1 || (isNext && !searchState.hasNextPage)) return;
    if (lastQuery && lastQuery.length >= 2) runSearch(lastQuery, grid, meta, pagination, searchState, page);
    else renderDiscover(grid, meta, currentTab, pagination, searchState, page);
  });

  // Initial state
  if (initialQuery) {
    lastQuery = initialQuery;
    runSearch(initialQuery, grid, meta, pagination, searchState, 1);
  } else {
    renderDiscover(grid, meta, currentTab, pagination, searchState, 1);
  }
}

function applyPageState(state, response) {
  state.page         = response.page;
  state.hasNextPage  = response.hasNextPage;
  state.totalPages   = response.totalPages;
  state.totalResults = response.totalResults;
}

async function runSearch(query, grid, meta, pagination, state, page) {
  const requestId = ++state.requestId;
  state.page = page;
  pagination.hidden = true;
  showSkeletons(grid, 12);
  meta.textContent = `Searching for "${query}"…`;
  try {
    const tab = currentTab;
    let response;
    if (tab === 'movie')        response = await searchMovies(query, page);
    else if (tab === 'tv')      response = await searchTV(query, page);
    else if (tab === 'webtoon') response = fromAniList(await searchWebtoons(query, page), page);
    else                        response = fromAniList(await searchManga(query, page), page);
    if (requestId !== state.requestId) return;

    applyPageState(state, response);
    meta.textContent = response.totalResults
      ? `${response.totalResults} result${response.totalResults !== 1 ? 's' : ''} for "${query}"`
      : '';
    renderGrid(grid, response.results, query);
    renderPagination(pagination, state);
  } catch {
    if (requestId !== state.requestId) return;
    meta.textContent = '';
    pagination.hidden = true;
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">⚠️</div>
        <h3>Search failed</h3>
        <p>Check your internet connection and try again.</p>
      </div>
    `;
  }
}

function renderPagination(pagination, state) {
  pagination.hidden = state.totalPages <= 1;
  pagination.querySelector('[data-page-action="previous"]').disabled = state.page <= 1;
  pagination.querySelector('[data-page-action="next"]').disabled = !state.hasNextPage;
  pagination.querySelector('.search-page-indicator').textContent =
    `Page ${state.page}${state.totalPages ? ` of ${state.totalPages}` : ''}`;
}

async function renderDiscover(grid, meta, tab, pagination, state, page = 1) {
  const requestId = ++state.requestId;
  state.page = page;
  pagination.hidden = true;
  meta.textContent = '';
  showSkeletons(grid, 12);
  try {
    let items = [];
    if (tab === 'movie')        items = await getTrendingMovies();
    else if (tab === 'tv')      items = await getTrendingTV();
    else if (tab === 'manga' || tab === 'webtoon') {
      // Trending AniList : paginé, on réutilise la même barre de pagination
      const fetchTrending = tab === 'manga' ? getTrendingManga : getTrendingWebtoons;
      const response = fromAniList(await fetchTrending(page), page);
      if (requestId !== state.requestId) return;
      applyPageState(state, response);
      meta.textContent = `Trending ${tabName(tab)}`;
      renderGrid(grid, response.results, null);
      renderPagination(pagination, state);
      return;
    }

    if (requestId !== state.requestId) return;
    state.hasNextPage = false;
    state.totalPages = 0;
    meta.textContent = `Trending ${tabName(tab)}`;
    renderGrid(grid, items, null);
  } catch (err) {
    if (requestId !== state.requestId) return;
    console.error('Discover failed:', err);
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">⚠️</div>
        <h3>Could not load titles</h3>
        <p>Check your TMDB API key or internet connection.</p>
      </div>
    `;
  }
}

function renderGrid(grid, items, query) {
  grid.innerHTML = '';
  if (!items.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">🔍</div>
        <h3>No results found</h3>
        <p>${query ? `No matches for "${query}". Try a different search term.` : 'Nothing to show.'}</p>
      </div>
    `;
    return;
  }
  items.forEach(item => {
    const wrap = document.createElement('div');
    wrap.setAttribute('role', 'listitem');
    wrap.appendChild(createMediaCard(item));
    grid.appendChild(wrap);
  });
}

function showSkeletons(grid, count) {
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const wrap = document.createElement('div');
    wrap.appendChild(createCardSkeleton());
    grid.appendChild(wrap);
  }
}

function tabName(tab) {
  return { movie: 'Movies', tv: 'TV Shows', manga: 'Manga', webtoon: 'Webtoons' }[tab] || tab;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
