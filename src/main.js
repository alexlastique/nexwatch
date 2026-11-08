/* ============================================================
   NexWatch – Application entry point
============================================================ */
import './style/main.css';
import './style/components.css';

import { createNavbar } from './components/navbar.js';
import { registerRoute, setPageContainer, initRouter, navigate } from './router.js';
import { renderHome }    from './pages/home.js';
import { renderSearch }  from './pages/search.js';
import { renderLibrary } from './pages/library.js';

// ── Bootstrap ─────────────────────────────────────────────
const app = document.getElementById('app');

// Navbar
const navbar = createNavbar((q) => navigate('search', { q }));
app.appendChild(navbar);

// Page container
const pageEl = document.createElement('div');
pageEl.id = 'page-container';
app.appendChild(pageEl);

// Register routes
setPageContainer(pageEl);
registerRoute('home',    renderHome);
registerRoute('search',  renderSearch);
registerRoute('library', renderLibrary);

// Start router
initRouter();

// Hide loading screen
const loadingScreen = document.getElementById('loading-screen');
if (loadingScreen) {
  setTimeout(() => {
    loadingScreen.style.opacity = '0';
    setTimeout(() => loadingScreen.remove(), 500);
  }, 400);
}
