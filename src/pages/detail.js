/* ============================================================
   NexWatch – Detail Modal (movies, TV, manga, webtoon)
============================================================ */
import { getMovieDetail, getTVDetail } from '../api/tmdb.js';
import { getMangaDetail } from '../api/anilist.js';
import { addToLibrary, removeFromLibrary, isInLibrary, getEntry, updateStatus, updateProgress, formatProgress } from '../store/library.js';
import { showToast } from '../components/toast.js';

let activeModal = null;

export function openDetail(item) {
  closeDetail();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');

  backdrop.innerHTML = `
    <div class="modal" id="detail-modal">
      <div class="modal-backdrop-img" id="modal-backdrop-img">
        ${item.backdrop
          ? `<img src="${item.backdrop}" alt="${item.title} backdrop" />`
          : `<div style="height:100%;background:var(--gradient-soft);"></div>`
        }
        <div class="modal-backdrop-gradient"></div>
        <button class="modal-close" id="modal-close-btn" aria-label="Close">✕</button>
      </div>

      <div class="modal-poster-row">
        ${item.poster
          ? `<img class="modal-poster" src="${item.poster}" alt="${item.title} poster" />`
          : `<div class="modal-poster" style="background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;font-size:3rem;">${typeIcon(item.type)}</div>`
        }
        <div class="modal-header-info">
          <h1 class="modal-title">${item.title}</h1>
          <div class="modal-tags">
            <span class="badge badge-${item.type}">${typeLabel(item.type)}</span>
            ${item.year !== '—' ? `<span class="badge" style="background:rgba(255,255,255,0.07);color:var(--text-secondary);">${item.year}</span>` : ''}
            ${item.score ? `<span class="badge" style="background:rgba(79,195,247,0.15);color:var(--accent-2);">⭐ ${(item.score/10).toFixed(1)}</span>` : ''}
          </div>
          <div class="modal-stats" id="modal-stats-row">
            <span>⏳ Loading details…</span>
          </div>
        </div>
      </div>

      <div class="modal-body">
        <div class="modal-synopsis" id="modal-synopsis">${item.overview || 'No synopsis available.'}</div>

        <div id="modal-genres-section"></div>

        <div class="modal-add-section" id="modal-add-section">
          ${renderLibraryControls(item)}
        </div>

        <div id="modal-extra"></div>
      </div>
    </div>
  `;

  // Close handlers
  backdrop.querySelector('#modal-close-btn').addEventListener('click', closeDetail);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeDetail(); });
  document.addEventListener('keydown', handleEsc);

  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';
  activeModal = backdrop;

  // Bind library controls
  bindLibraryControls(backdrop, item);

  // Load full detail async
  loadFullDetail(backdrop, item);
}

export function closeDetail() {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleEsc);
  }
}

function handleEsc(e) { if (e.key === 'Escape') closeDetail(); }

// ── Library controls ──────────────────────────────────────
function renderLibraryControls(item) {
  const inLib = isInLibrary(item.id);
  const entry  = getEntry(item.id);
  const statuses = getStatuses(item.type);

  return `
    <div style="flex:1;min-width:200px;">
      <div style="font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px;">STATUS</div>
      <select class="status-select" id="modal-status-select" aria-label="Set status">
        <option value="">— Select status —</option>
        ${statuses.map(s => `<option value="${s.value}" ${entry?.status === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
      </select>
    </div>
    ${renderProgressFields(item, entry)}
    <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start;">
      <button class="btn ${inLib ? 'btn-secondary' : 'btn-primary'}" id="modal-lib-btn">
        ${inLib ? '✓ In Library' : '+ Add to Library'}
      </button>
      ${inLib ? `<button class="btn btn-ghost" id="modal-remove-btn" style="color:var(--status-dropped);font-size:.75rem;">Remove</button>` : ''}
    </div>
  `;
}

function renderProgressFields(item, entry) {
  if (item.type === 'movie') return '';
  if (item.type === 'tv') {
    return `
      <div>
        <div style="font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px;">PROGRESS</div>
        <div style="display:flex;gap:8px;">
          <div>
            <label style="font-size:.7rem;color:var(--text-muted);display:block;margin-bottom:3px;">Season</label>
            <input class="progress-input" id="prog-season" type="number" min="1" value="${entry?.progress?.currentSeason || 1}" placeholder="S" aria-label="Current season" />
          </div>
          <div>
            <label style="font-size:.7rem;color:var(--text-muted);display:block;margin-bottom:3px;">Episode</label>
            <input class="progress-input" id="prog-episode" type="number" min="1" value="${entry?.progress?.currentEpisode || ''}" placeholder="Ep" aria-label="Current episode" />
          </div>
        </div>
      </div>
    `;
  }
  // manga / webtoon
  return `
    <div>
      <div style="font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px;">PROGRESS</div>
      <div>
        <label style="font-size:.7rem;color:var(--text-muted);display:block;margin-bottom:3px;">Chapter</label>
        <input class="progress-input" id="prog-chapter" type="number" min="1" value="${entry?.progress?.currentChapter || ''}" placeholder="Ch" style="width:90px;" aria-label="Current chapter" />
      </div>
    </div>
  `;
}

function bindLibraryControls(root, item) {
  const addBtn    = root.querySelector('#modal-lib-btn');
  const removeBtn = root.querySelector('#modal-remove-btn');
  const statusSel = root.querySelector('#modal-status-select');

  function saveProgress() {
    const season  = root.querySelector('#prog-season');
    const episode = root.querySelector('#prog-episode');
    const chapter = root.querySelector('#prog-chapter');
    const patch = {};
    if (season)  patch.currentSeason   = parseInt(season.value)   || null;
    if (episode) patch.currentEpisode  = parseInt(episode.value)  || null;
    if (chapter) patch.currentChapter  = parseInt(chapter.value)  || null;
    if (Object.keys(patch).length && isInLibrary(item.id)) updateProgress(item.id, patch);
  }

  if (statusSel) {
    statusSel.addEventListener('change', () => {
      if (!isInLibrary(item.id)) {
        addToLibrary(item, statusSel.value || 'planned');
        refreshControls(root, item);
        showToast(`"${item.title}" added to library!`, 'success');
      } else {
        updateStatus(item.id, statusSel.value);
        showToast('Status updated', 'success');
      }
    });
  }

  ['#prog-season','#prog-episode','#prog-chapter'].forEach(sel => {
    root.querySelector(sel)?.addEventListener('change', saveProgress);
  });

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (isInLibrary(item.id)) {
        saveProgress();
        showToast('Progress saved!', 'success');
      } else {
        const status = statusSel?.value || 'planned';
        addToLibrary(item, status);
        saveProgress();
        refreshControls(root, item);
        showToast(`"${item.title}" added to library!`, 'success');
      }
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      removeFromLibrary(item.id);
      refreshControls(root, item);
      showToast(`"${item.title}" removed from library`, 'info');
    });
  }
}

function refreshControls(root, item) {
  const section = root.querySelector('#modal-add-section');
  if (section) {
    section.innerHTML = renderLibraryControls(item);
    bindLibraryControls(root, item);
  }
}

// ── Full detail fetch ─────────────────────────────────────
async function loadFullDetail(root, item) {
  try {
    let detail;
    if (item.type === 'movie')   detail = await getMovieDetail(item.tmdbId);
    else if (item.type === 'tv') detail = await getTVDetail(item.tmdbId);
    else                         detail = await getMangaDetail(item.anilistId);

    // Update backdrop if better one available
    if (detail.backdrop && !item.backdrop) {
      const img = root.querySelector('.modal-backdrop-img img');
      if (img) img.src = detail.backdrop;
    }

    // Stats row
    const statsRow = root.querySelector('#modal-stats-row');
    if (statsRow) statsRow.innerHTML = buildStats(detail);

    // Synopsis
    const synopsis = root.querySelector('#modal-synopsis');
    if (synopsis && detail.overview) synopsis.textContent = detail.overview;

    // Genres
    const genresSection = root.querySelector('#modal-genres-section');
    if (genresSection && detail.genres?.length) {
      genresSection.innerHTML = `
        <p class="modal-section-title" style="margin-bottom:10px;">Genres</p>
        <div class="modal-genres" style="margin-bottom:20px;">
          ${detail.genres.map(g => `<span class="genre-tag">${g}</span>`).join('')}
        </div>
      `;
    }

    // Extra: cast / relations
    const extra = root.querySelector('#modal-extra');
    if (extra) extra.innerHTML = buildExtra(detail);

  } catch (err) {
    console.warn('Detail fetch failed:', err);
    const statsRow = root.querySelector('#modal-stats-row');
    if (statsRow) statsRow.innerHTML = `<span style="color:var(--text-muted);font-size:.8rem;">Could not load full details</span>`;
  }
}

function buildStats(d) {
  const parts = [];
  if (d.runtime)   parts.push(`🕐 ${d.runtime} min`);
  if (d.seasons)   parts.push(`📺 ${d.seasons} Season${d.seasons > 1 ? 's' : ''}`);
  if (d.episodes)  parts.push(`🎞 ${d.episodes} Episodes`);
  if (d.chapters)  parts.push(`📖 ${d.chapters} Chapters`);
  if (d.volumes)   parts.push(`📚 ${d.volumes} Volumes`);
  if (d.status)    parts.push(`🔖 ${d.status}`);
  if (d.tagline)   parts.push(`💬 ${d.tagline}`);
  return parts.map(p => `<span>${p}</span>`).join('') || '<span style="color:var(--text-muted)">No details available</span>';
}

function buildExtra(d) {
  let html = '';
  if (d.cast?.length) {
    html += `
      <p class="modal-section-title" style="margin-top:20px;margin-bottom:12px;">Cast</p>
      <div style="display:flex;gap:14px;overflow-x:auto;padding-bottom:8px;">
        ${d.cast.map(c => `
          <div style="text-align:center;min-width:72px;">
            ${c.photo
              ? `<img src="${c.photo}" alt="${c.name}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;margin:0 auto 6px;" />`
              : `<div style="width:56px;height:56px;border-radius:50%;background:var(--bg-elevated);margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;">👤</div>`
            }
            <div style="font-size:.68rem;font-weight:600;color:var(--text-primary);">${c.name}</div>
            <div style="font-size:.62rem;color:var(--text-muted);">${c.character || c.role || ''}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
  if (d.characters?.length) {
    html += `
      <p class="modal-section-title" style="margin-top:20px;margin-bottom:12px;">Characters</p>
      <div style="display:flex;gap:14px;overflow-x:auto;padding-bottom:8px;">
        ${d.characters.map(c => `
          <div style="text-align:center;min-width:72px;">
            ${c.photo
              ? `<img src="${c.photo}" alt="${c.name}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;margin:0 auto 6px;" />`
              : `<div style="width:56px;height:56px;border-radius:50%;background:var(--bg-elevated);margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;">🧑</div>`
            }
            <div style="font-size:.68rem;font-weight:600;color:var(--text-primary);">${c.name}</div>
            <div style="font-size:.62rem;color:var(--text-muted);">${c.role}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
  return html;
}

// ── Helpers ───────────────────────────────────────────────
function typeLabel(t) { return { movie: 'Movie', tv: 'TV Show', manga: 'Manga', webtoon: 'Webtoon' }[t] || t; }
function typeIcon(t)  { return { movie: '🎬', tv: '📺', manga: '📚', webtoon: '📱' }[t] || '🎭'; }

function getStatuses(type) {
  if (type === 'movie')   return [{ value: 'planned', label: '🕐 Want to Watch' }, { value: 'watching', label: '▶️ Watching' }, { value: 'completed', label: '✅ Watched' }, { value: 'dropped', label: '❌ Dropped' }];
  if (type === 'tv')      return [{ value: 'planned', label: '🕐 Plan to Watch' }, { value: 'watching', label: '▶️ Watching' }, { value: 'completed', label: '✅ Completed' }, { value: 'dropped', label: '❌ Dropped' }];
  return [{ value: 'planned', label: '🕐 Plan to Read' }, { value: 'watching', label: '📖 Reading' }, { value: 'completed', label: '✅ Completed' }, { value: 'dropped', label: '❌ Dropped' }];
}
