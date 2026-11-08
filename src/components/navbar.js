/* ============================================================
   NexWatch – Navbar component
============================================================ */
import { navigate }             from '../router.js';
import { isTursoConfigured }   from '../services/turso.js';
import { showToast }            from './toast.js';

export function createNavbar(onSearch) {
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.id = 'navbar';

  nav.innerHTML = `
    <div class="navbar-inner">
      <div class="navbar-logo" id="nav-logo">NexWatch</div>

      <div class="navbar-search">
        <span class="search-icon">🔍</span>
        <input
          id="navbar-search-input"
          type="search"
          placeholder="Search movies, TV, manga…"
          autocomplete="off"
          aria-label="Search"
        />
      </div>

      <div class="navbar-links">
        <div class="navbar-link" data-route="home">Home</div>
        <div class="navbar-link" data-route="search">Discover</div>
        <div class="navbar-link" data-route="library">My Library</div>
      </div>

      <div class="navbar-sync-badge ${isTursoConfigured ? 'synced' : 'local'}"
           title="${isTursoConfigured ? 'Cloud sync active (Turso SQLite)' : 'Running in local mode – set up Turso to sync across devices'}">
        ${isTursoConfigured
          ? '<span class="sync-dot"></span> Cloud sync'
          : '💾 Local only'}
      </div>
    </div>
  `;

  // Logo
  nav.querySelector('#nav-logo').addEventListener('click', () => navigate('home'));

  // Nav links
  nav.querySelectorAll('.navbar-link').forEach(link => {
    link.addEventListener('click', () => navigate(link.dataset.route));
  });

  // Search
  let debounce;
  const input = nav.querySelector('#navbar-search-input');
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const q = input.value.trim();
      if (q.length >= 2) { navigate('search', { q }); onSearch?.(q); }
    }, 350);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      clearTimeout(debounce);
      const q = input.value.trim();
      if (q) { navigate('search', { q }); onSearch?.(q); }
    }
  });

  return nav;
}

export function setActiveNavLink(route) {
  document.querySelectorAll('.navbar-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`.navbar-link[data-route="${route}"]`)?.classList.add('active');
}

export function setNavbarSearch(value) {
  const input = document.getElementById('navbar-search-input');
  if (input) input.value = value || '';
}
