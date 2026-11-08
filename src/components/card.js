/* ============================================================
   NexWatch – Media Card component
============================================================ */
import { isInLibrary, addToLibrary, removeFromLibrary } from '../store/library.js';
import { showToast } from './toast.js';
import { openDetail } from '../pages/detail.js';

export function createMediaCard(item, opts = {}) {
  const inLib = isInLibrary(item.id);
  const typeLabel = { movie: 'Movie', tv: 'TV Show', manga: 'Manga', webtoon: 'Webtoon' }[item.type] || item.type;
  const badgeClass = `badge-${item.type}`;
  const scoreDisplay = item.score ? `⭐ ${(item.score / 10).toFixed(1)}` : '';

  const card = document.createElement('div');
  card.className = 'media-card';
  card.setAttribute('data-id', item.id);
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${item.title} – ${typeLabel}`);

  card.innerHTML = `
    ${item.poster
      ? `<img class="media-card-poster" src="${item.poster}" alt="${item.title} poster" loading="lazy" />`
      : `<div class="media-card-poster-placeholder">${typeIcon(item.type)}</div>`
    }
    <div class="media-card-overlay">
      <div class="media-card-actions">
        <button class="media-card-action-btn ${inLib ? 'added-btn' : 'add-btn'}" id="card-add-${item.id}" aria-label="${inLib ? 'Remove from library' : 'Add to library'}">
          ${inLib ? '✓ In Library' : '+ Add'}
        </button>
      </div>
    </div>
    <div class="media-card-info">
      <div class="media-card-title" title="${item.title}">${item.title}</div>
      <div class="media-card-meta">
        <span class="media-card-year">${item.year}</span>
        ${scoreDisplay ? `<span class="media-card-score">${scoreDisplay}</span>` : ''}
      </div>
    </div>
  `;

  // Click card → open detail
  card.addEventListener('click', (e) => {
    if (!e.target.closest('.media-card-action-btn')) {
      openDetail(item);
    }
  });

  // Add/remove button
  const btn = card.querySelector(`#card-add-${item.id}`);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isInLibrary(item.id)) {
      removeFromLibrary(item.id);
      btn.className = 'media-card-action-btn add-btn';
      btn.textContent = '+ Add';
      showToast(`"${item.title}" removed from library`, 'info');
    } else {
      addToLibrary(item);
      btn.className = 'media-card-action-btn added-btn';
      btn.textContent = '✓ In Library';
      showToast(`"${item.title}" added to library!`, 'success');
    }
  });

  // Keyboard support
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(item); }
  });

  return card;
}

export function createCardSkeleton() {
  const el = document.createElement('div');
  el.className = 'card-skeleton';
  el.innerHTML = `
    <div class="skeleton card-skeleton-poster"></div>
    <div class="card-skeleton-info">
      <div class="skeleton card-skeleton-title"></div>
      <div class="skeleton card-skeleton-year"></div>
    </div>
  `;
  return el;
}

function typeIcon(type) {
  return { movie: '🎬', tv: '📺', manga: '📚', webtoon: '📱' }[type] || '🎭';
}
