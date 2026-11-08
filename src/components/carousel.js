/* ============================================================
   NexWatch – Carousel component
============================================================ */
import { createMediaCard, createCardSkeleton } from './card.js';

export function createCarousel({ title, items, loading, viewAllRoute, onViewAll }) {
  const section = document.createElement('section');
  section.className = 'carousel-section';

  const header = document.createElement('div');
  header.className = 'carousel-header';
  header.innerHTML = `
    <h2>${title}</h2>
    ${viewAllRoute || onViewAll ? `<button class="btn btn-ghost carousel-view-all" aria-label="View all ${title}">View all →</button>` : ''}
  `;
  if (onViewAll) header.querySelector('.carousel-view-all')?.addEventListener('click', onViewAll);

  const wrap = document.createElement('div');
  wrap.className = 'carousel-track-wrap';

  const track = document.createElement('div');
  track.className = 'carousel-track';
  track.setAttribute('role', 'list');

  if (loading) {
    for (let i = 0; i < 8; i++) track.appendChild(createCardSkeleton());
  } else if (items && items.length) {
    items.forEach(item => {
      const li = document.createElement('div');
      li.setAttribute('role', 'listitem');
      li.appendChild(createMediaCard(item));
      track.appendChild(li);
    });
  } else {
    track.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;padding:20px 0;">No titles found.</p>`;
  }

  // Scroll buttons
  const prevBtn = document.createElement('button');
  prevBtn.className = 'carousel-btn prev';
  prevBtn.setAttribute('aria-label', 'Scroll left');
  prevBtn.textContent = '‹';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'carousel-btn next';
  nextBtn.setAttribute('aria-label', 'Scroll right');
  nextBtn.textContent = '›';

  const SCROLL_AMT = 600;
  prevBtn.addEventListener('click', () => track.scrollBy({ left: -SCROLL_AMT, behavior: 'smooth' }));
  nextBtn.addEventListener('click', () => track.scrollBy({ left:  SCROLL_AMT, behavior: 'smooth' }));

  wrap.appendChild(prevBtn);
  wrap.appendChild(track);
  wrap.appendChild(nextBtn);

  section.appendChild(header);
  section.appendChild(wrap);
  return section;
}

/** Replace skeletons with real cards */
export function hydrateCarousel(section, items) {
  const track = section.querySelector('.carousel-track');
  if (!track) return;
  track.innerHTML = '';
  items.forEach(item => {
    const li = document.createElement('div');
    li.setAttribute('role', 'listitem');
    li.appendChild(createMediaCard(item));
    track.appendChild(li);
  });
}
