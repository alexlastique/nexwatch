/* ============================================================
   NexWatch – Client-side router (hash-based)
============================================================ */
import { setActiveNavLink, setNavbarSearch } from './components/navbar.js';

let pageContainer = null;
const routes = {};

export function registerRoute(name, handler) {
  routes[name] = handler;
}

export function setPageContainer(el) {
  pageContainer = el;
}

export function navigate(route, params = {}) {
  const query = params.q ? `?q=${encodeURIComponent(params.q)}` : '';
  window.location.hash = `#${route}${query}`;
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute(); // initial load
}

function handleRoute() {
  const raw     = window.location.hash.slice(1) || 'home';
  const [path, queryStr] = raw.split('?');
  const params  = {};
  if (queryStr) {
    queryStr.split('&').forEach(kv => {
      const [k, v] = kv.split('=');
      params[k] = decodeURIComponent(v || '');
    });
  }

  const route   = path || 'home';
  const handler = routes[route] || routes['home'];

  setActiveNavLink(route);
  setNavbarSearch(params.q || '');

  if (handler && pageContainer) {
    // Cleanup any subscriptions from the previous page
    if (typeof pageContainer._unsubscribeLibrary === 'function') {
      pageContainer._unsubscribeLibrary();
      pageContainer._unsubscribeLibrary = null;
    }
    handler(pageContainer, params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
