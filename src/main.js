/* ============================================================
   NexWatch – Application entry point
============================================================ */
import './style/main.css';
import './style/components.css';

import { isPasswordRequired, isAuthenticated } from './services/auth.js';
import { showLoginScreen } from './pages/login.js';
import { createNavbar } from './components/navbar.js';
import { registerRoute, setPageContainer, initRouter, navigate } from './router.js';
import { renderHome }    from './pages/home.js';
import { renderSearch }  from './pages/search.js';
import { renderLibrary } from './pages/library.js';

function mountApp() {
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
}

// ── Boot sequence ─────────────────────────────────────────
const loadingScreen = document.getElementById('loading-screen');

function hideLoadingScreen() {
  if (!loadingScreen) return;
  setTimeout(() => {
    loadingScreen.style.opacity = '0';
    setTimeout(() => loadingScreen.remove(), 500);
  }, 300);
}

if (isPasswordRequired() && !isAuthenticated()) {
  // Show password lock screen first, then mount the app on success
  hideLoadingScreen();
  showLoginScreen(() => mountApp());
} else {
  // No password required (or already authenticated) — mount directly
  mountApp();
  hideLoadingScreen();
}
