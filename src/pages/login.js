/* ============================================================
   NexWatch – Login / lock screen
============================================================ */
import { login } from '../services/auth.js';

/**
 * Shows a fullscreen login overlay.
 * Calls onSuccess() when the correct password is entered.
 */
export function showLoginScreen(onSuccess) {
  // Remove any existing screen
  document.getElementById('login-screen')?.remove();

  const screen = document.createElement('div');
  screen.id = 'login-screen';
  screen.innerHTML = `
    <div class="login-bg">
      <div class="login-orb login-orb-1"></div>
      <div class="login-orb login-orb-2"></div>
    </div>

    <div class="login-card glass">
      <div class="login-logo">NexWatch</div>
      <p class="login-subtitle">Your personal media tracker</p>

      <form class="login-form" id="login-form" autocomplete="on" novalidate>
        <div class="login-field">
          <label for="login-password" class="login-label">Password</label>
          <div class="login-input-wrap">
            <input
              id="login-password"
              name="password"
              type="password"
              class="login-input"
              placeholder="Enter your password…"
              autocomplete="current-password"
              required
              autofocus
            />
            <button type="button" class="login-eye" id="login-eye" aria-label="Toggle password visibility">
              👁
            </button>
          </div>
          <div class="login-error" id="login-error" role="alert" aria-live="polite"></div>
        </div>

        <button type="submit" class="btn btn-primary login-submit" id="login-submit">
          Unlock
        </button>
      </form>

      <p class="login-hint">Set <code>VITE_APP_PASSWORD</code> in your <code>.env</code> to change the password.</p>
    </div>
  `;

  document.body.appendChild(screen);

  const form      = screen.querySelector('#login-form');
  const input     = screen.querySelector('#login-password');
  const errorEl   = screen.querySelector('#login-error');
  const eyeBtn    = screen.querySelector('#login-eye');
  const submitBtn = screen.querySelector('#login-submit');

  // Toggle password visibility
  eyeBtn.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    input.type     = isHidden ? 'text' : 'password';
    eyeBtn.textContent = isHidden ? '🙈' : '👁';
  });

  // Clear error on typing
  input.addEventListener('input', () => {
    errorEl.textContent = '';
    input.classList.remove('login-input--error');
  });

  // Submit
  form.addEventListener('submit', e => {
    e.preventDefault();
    const password = input.value;

    if (!password) {
      errorEl.textContent = 'Please enter a password.';
      input.classList.add('login-input--error');
      input.focus();
      return;
    }

    if (login(password)) {
      // Success — animate out then show app
      screen.classList.add('login-screen--exit');
      setTimeout(() => {
        screen.remove();
        onSuccess();
      }, 350);
    } else {
      // Wrong password
      input.value = '';
      input.classList.add('login-input--error');
      errorEl.textContent = 'Incorrect password. Please try again.';
      screen.classList.add('login-card--shake');
      setTimeout(() => screen.querySelector('.login-card')?.classList.remove('login-card--shake'), 500);
      input.focus();
    }
  });

  // Allow pressing Enter
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') form.requestSubmit();
  });
}
