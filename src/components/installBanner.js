/* ============================================================
   NexWatch – Install banner component
   Shows an "Install App" banner on Android (intercepts the
   browser's beforeinstallprompt event) and a soft hint for
   iOS Safari users.
============================================================ */

let deferredPrompt = null;  // holds the Android install event

export function initInstallPrompt() {
  // ── Android / Chrome: intercept install prompt ────────
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Only show if not already installed
    if (!isAppInstalled()) {
      showAndroidBanner();
    }
  });

  // Hide banner once successfully installed
  window.addEventListener('appinstalled', () => {
    hideBanner();
    deferredPrompt = null;
  });

  // ── iOS Safari: show hint after a short delay ─────────
  if (isIOS() && !isAppInstalled() && !hasSeenIOSHint()) {
    setTimeout(showIOSHint, 3000);
  }
}

// ── Helpers ───────────────────────────────────────────────
function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    && !/crios/i.test(navigator.userAgent);  // exclude Chrome on iOS
}

function hasSeenIOSHint() {
  return sessionStorage.getItem('nw_ios_hint_shown') === '1';
}

function hideBanner() {
  document.getElementById('install-banner')?.remove();
}

// ── Android install banner ────────────────────────────────
function showAndroidBanner() {
  if (document.getElementById('install-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.className = 'install-banner';
  banner.setAttribute('role', 'complementary');
  banner.setAttribute('aria-label', 'Install NexWatch app');
  banner.innerHTML = `
    <div class="install-banner-icon">🎬</div>
    <div class="install-banner-text">
      <strong>Install NexWatch</strong>
      <span>Add to your home screen for the best experience</span>
    </div>
    <button class="btn btn-primary install-banner-btn" id="install-confirm-btn">
      Install
    </button>
    <button class="install-banner-dismiss" id="install-dismiss-btn" aria-label="Dismiss">✕</button>
  `;

  document.body.appendChild(banner);

  // Trigger slide-in animation
  requestAnimationFrame(() => banner.classList.add('install-banner--visible'));

  document.getElementById('install-confirm-btn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    hideBanner();
  });

  document.getElementById('install-dismiss-btn').addEventListener('click', () => {
    hideBanner();
    // Don't show again this session
    sessionStorage.setItem('nw_install_dismissed', '1');
  });
}

// ── iOS hint toast ────────────────────────────────────────
function showIOSHint() {
  sessionStorage.setItem('nw_ios_hint_shown', '1');
  if (document.getElementById('install-banner')) return;

  const hint = document.createElement('div');
  hint.id = 'install-banner';
  hint.className = 'install-banner install-banner--ios';
  hint.innerHTML = `
    <div class="install-banner-icon">📲</div>
    <div class="install-banner-text">
      <strong>Add to Home Screen</strong>
      <span>Tap <strong>Share ⬆</strong> then <strong>"Add to Home Screen"</strong></span>
    </div>
    <button class="install-banner-dismiss" id="install-dismiss-btn" aria-label="Dismiss">✕</button>
  `;

  document.body.appendChild(hint);
  requestAnimationFrame(() => hint.classList.add('install-banner--visible'));

  document.getElementById('install-dismiss-btn').addEventListener('click', hideBanner);

  // Auto-dismiss after 10 s
  setTimeout(hideBanner, 10000);
}
