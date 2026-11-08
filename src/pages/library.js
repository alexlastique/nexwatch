/* ============================================================
   NexWatch – Library page
============================================================ */
import { filterLibrary, getStats, removeFromLibrary, updateStatus, updateProgress, formatProgress } from '../store/library.js';
import { openDetail } from './detail.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';

let activeTypeFilter   = 'all';
let activeStatusFilter = 'all';

export function renderLibrary(container) {
  container.innerHTML = `
    <div class="page">
      <div class="container">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px;">
          <div>
            <h1 class="heading-lg">My Library</h1>
            <p style="color:var(--text-secondary);font-size:.9rem;margin-top:4px;">Your personal media tracker</p>
          </div>
          <button class="btn btn-primary" id="lib-discover-btn" aria-label="Discover new titles">+ Discover Titles</button>
        </div>

        <div id="lib-stats" class="library-stats"></div>

        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;align-items:center;">
          <div>
            <span class="label" style="margin-bottom:6px;display:block;">Type</span>
            <div class="filter-bar" id="type-filter" role="group" aria-label="Filter by type">
              <div class="filter-chip active" data-type="all">All</div>
              <div class="filter-chip" data-type="movie">🎬 Movies</div>
              <div class="filter-chip" data-type="tv">📺 TV</div>
              <div class="filter-chip" data-type="manga">📚 Manga</div>
              <div class="filter-chip" data-type="webtoon">📱 Webtoons</div>
            </div>
          </div>
          <div>
            <span class="label" style="margin-bottom:6px;display:block;">Status</span>
            <div class="filter-bar" id="status-filter" role="group" aria-label="Filter by status">
              <div class="filter-chip active" data-status="all">All</div>
              <div class="filter-chip" data-status="planned">🕐 Planned</div>
              <div class="filter-chip" data-status="watching">▶️ Watching</div>
              <div class="filter-chip" data-status="completed">✅ Completed</div>
              <div class="filter-chip" data-status="dropped">❌ Dropped</div>
            </div>
          </div>
        </div>

        <div id="lib-list" role="list" aria-label="Library entries"></div>
      </div>
    </div>
  `;

  container.querySelector('#lib-discover-btn').addEventListener('click', () => navigate('search'));

  // Stats
  renderStats(container.querySelector('#lib-stats'));

  // Filters
  container.querySelector('#type-filter').addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    container.querySelector('#type-filter').querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeTypeFilter = chip.dataset.type;
    renderList(container.querySelector('#lib-list'));
  });

  container.querySelector('#status-filter').addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    container.querySelector('#status-filter').querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeStatusFilter = chip.dataset.status;
    renderList(container.querySelector('#lib-list'));
  });

  // Initial list
  renderList(container.querySelector('#lib-list'));
}

function renderStats(statsContainer) {
  const s = getStats();
  statsContainer.innerHTML = `
    <div class="stat-card"><div class="stat-number">${s.total}</div><div class="stat-label">Total</div></div>
    <div class="stat-card"><div class="stat-number">${s.watching}</div><div class="stat-label">Watching</div></div>
    <div class="stat-card"><div class="stat-number">${s.completed}</div><div class="stat-label">Completed</div></div>
    <div class="stat-card"><div class="stat-number">${s.planned}</div><div class="stat-label">Planned</div></div>
    <div class="stat-card"><div class="stat-number">${s.movies}</div><div class="stat-label">Movies</div></div>
    <div class="stat-card"><div class="stat-number">${s.manga + s.webtoon}</div><div class="stat-label">Manga</div></div>
  `;
}

function renderList(listContainer) {
  const entries = filterLibrary({ type: activeTypeFilter, status: activeStatusFilter });
  listContainer.innerHTML = '';

  if (!entries.length) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>${activeTypeFilter === 'all' && activeStatusFilter === 'all' ? 'Your library is empty' : 'No entries match your filters'}</h3>
        <p>${activeTypeFilter === 'all' && activeStatusFilter === 'all'
          ? 'Start discovering movies, TV shows and manga to add them here.'
          : 'Try changing your filter selection.'
        }</p>
        <button class="btn btn-primary" onclick="document.querySelector('#lib-discover-btn').click()">Discover Titles</button>
      </div>
    `;
    return;
  }

  entries.forEach(entry => {
    const item = createLibraryItem(entry, listContainer);
    listContainer.appendChild(item);
  });
}

function createLibraryItem(entry, listContainer) {
  const statusClass = { planned: 'status-planned', watching: 'status-watching', completed: 'status-completed', dropped: 'status-dropped' }[entry.status] || '';
  const statusLabel = { planned: '🕐 Planned', watching: '▶️ Watching', completed: '✅ Completed', dropped: '❌ Dropped' }[entry.status] || entry.status;
  const progress    = formatProgress(entry);
  const typeIcon    = { movie: '🎬', tv: '📺', manga: '📚', webtoon: '📱' }[entry.type] || '🎭';

  const el = document.createElement('div');
  el.className = 'library-item';
  el.setAttribute('role', 'listitem');
  el.setAttribute('data-id', entry.id);
  el.innerHTML = `
    ${entry.poster
      ? `<img class="library-item-poster" src="${entry.poster}" alt="${entry.title} poster" loading="lazy" />`
      : `<div class="library-item-poster-placeholder">${typeIcon}</div>`
    }
    <div class="library-item-body">
      <div class="library-item-title" title="${entry.title}">${entry.title}</div>
      <div class="library-item-meta">
        <span class="badge badge-${entry.type}">${entry.type}</span>
        <span class="status-badge ${statusClass}">${statusLabel}</span>
        ${entry.year ? `<span style="font-size:.78rem;color:var(--text-muted);">${entry.year}</span>` : ''}
      </div>
      ${progress ? `<div class="library-item-progress">📍 ${progress}</div>` : ''}
      ${renderInlineProgress(entry)}
      <div class="library-item-actions" style="margin-top:10px;">
        <button class="library-item-edit" data-action="open" aria-label="View details for ${entry.title}">View Details</button>
        <button class="library-item-remove" data-action="remove" aria-label="Remove ${entry.title} from library">Remove</button>
      </div>
    </div>
  `;

  // Progress inputs
  bindProgressInputs(el, entry, listContainer);

  // Actions
  el.querySelector('[data-action="open"]').addEventListener('click', (e) => {
    e.stopPropagation();
    openDetail(entry);
  });
  el.querySelector('[data-action="remove"]').addEventListener('click', (e) => {
    e.stopPropagation();
    removeFromLibrary(entry.id);
    el.remove();
    showToast(`"${entry.title}" removed`, 'info');
    // re-render stats
    const statsContainer = document.querySelector('.library-stats');
    if (statsContainer) renderStats(statsContainer);
  });

  // Click whole item → open detail
  el.addEventListener('click', (e) => {
    if (!e.target.closest('button, input, select')) openDetail(entry);
  });

  return el;
}

function renderInlineProgress(entry) {
  if (entry.type === 'movie') {
    return `
      <div style="margin-top:8px;">
        <select class="status-select" data-field="status" aria-label="Update status for ${entry.title}" style="font-size:.78rem;padding:5px 10px;">
          ${[['planned','🕐 Want to Watch'],['watching','▶️ Watching'],['completed','✅ Watched'],['dropped','❌ Dropped']].map(([v,l]) =>
            `<option value="${v}" ${entry.status === v ? 'selected':''}>${l}</option>`
          ).join('')}
        </select>
      </div>
    `;
  }
  if (entry.type === 'tv') {
    return `
      <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap;">
        <select class="status-select" data-field="status" aria-label="Status" style="font-size:.78rem;padding:5px 10px;">
          ${[['planned','🕐 Plan to Watch'],['watching','▶️ Watching'],['completed','✅ Completed'],['dropped','❌ Dropped']].map(([v,l]) =>
            `<option value="${v}" ${entry.status === v ? 'selected':''}>${l}</option>`
          ).join('')}
        </select>
        <div style="display:flex;gap:6px;align-items:center;">
          <span style="font-size:.72rem;color:var(--text-muted);">S</span>
          <input class="progress-input" data-field="currentSeason" type="number" min="1" value="${entry.progress?.currentSeason || ''}" placeholder="–" style="width:52px;font-size:.78rem;" aria-label="Season number" />
          <span style="font-size:.72rem;color:var(--text-muted);">E</span>
          <input class="progress-input" data-field="currentEpisode" type="number" min="1" value="${entry.progress?.currentEpisode || ''}" placeholder="–" style="width:52px;font-size:.78rem;" aria-label="Episode number" />
        </div>
        <button class="btn btn-secondary" data-action="save-progress" style="padding:5px 12px;font-size:.75rem;" aria-label="Save progress">Save</button>
      </div>
    `;
  }
  // manga / webtoon
  return `
    <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap;">
      <select class="status-select" data-field="status" aria-label="Status" style="font-size:.78rem;padding:5px 10px;">
        ${[['planned','🕐 Plan to Read'],['watching','📖 Reading'],['completed','✅ Completed'],['dropped','❌ Dropped']].map(([v,l]) =>
          `<option value="${v}" ${entry.status === v ? 'selected':''}>${l}</option>`
        ).join('')}
      </select>
      <div style="display:flex;gap:6px;align-items:center;">
        <span style="font-size:.72rem;color:var(--text-muted);">Ch.</span>
        <input class="progress-input" data-field="currentChapter" type="number" min="1" value="${entry.progress?.currentChapter || ''}" placeholder="–" style="width:64px;font-size:.78rem;" aria-label="Chapter number" />
      </div>
      <button class="btn btn-secondary" data-action="save-progress" style="padding:5px 12px;font-size:.75rem;" aria-label="Save progress">Save</button>
    </div>
  `;
}

function bindProgressInputs(el, entry, listContainer) {
  const statusSel = el.querySelector('[data-field="status"]');
  const saveBtn   = el.querySelector('[data-action="save-progress"]');

  if (statusSel) {
    statusSel.addEventListener('change', (e) => {
      e.stopPropagation();
      updateStatus(entry.id, statusSel.value);
      entry.status = statusSel.value;
      showToast('Status updated', 'success');
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const patch = {};
      const seasonIn  = el.querySelector('[data-field="currentSeason"]');
      const episodeIn = el.querySelector('[data-field="currentEpisode"]');
      const chapterIn = el.querySelector('[data-field="currentChapter"]');
      if (seasonIn)  patch.currentSeason   = parseInt(seasonIn.value)   || null;
      if (episodeIn) patch.currentEpisode  = parseInt(episodeIn.value)  || null;
      if (chapterIn) patch.currentChapter  = parseInt(chapterIn.value)  || null;
      updateProgress(entry.id, patch);
      Object.assign(entry.progress, patch);
      // Update progress display
      const progDisplay = el.querySelector('.library-item-progress');
      if (progDisplay) progDisplay.textContent = `📍 ${formatProgress(entry)}`;
      showToast('Progress saved!', 'success');
    });
  }
}
