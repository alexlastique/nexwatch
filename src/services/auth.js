/* ============================================================
   NexWatch – Simple password authentication
   ============================================================
   Set VITE_APP_PASSWORD in your .env to enable the lock screen.
   Leave it empty to skip authentication entirely.

   The session is stored in localStorage so the user stays
   logged in across page reloads and new browser tabs.
============================================================ */

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || '';
const LS_AUTH_KEY  = 'nexwatch_auth_token';

/** True if a password has been configured via env */
export function isPasswordRequired() {
  return APP_PASSWORD.length > 0;
}

/** True if the user is currently authenticated */
export function isAuthenticated() {
  if (!isPasswordRequired()) return true;
  return localStorage.getItem(LS_AUTH_KEY) === APP_PASSWORD;
}

/** Attempt login. Returns true on success, false on wrong password. */
export function login(password) {
  if (password === APP_PASSWORD) {
    localStorage.setItem(LS_AUTH_KEY, APP_PASSWORD);
    return true;
  }
  return false;
}

/** Log out and clear the stored session */
export function logout() {
  localStorage.removeItem(LS_AUTH_KEY);
  window.location.reload();
}
