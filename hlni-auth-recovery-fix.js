/*
 * Home Library Nilai Impian
 * Password Reset / Invite Recovery Hotfix v1.0.0
 *
 * Purpose:
 * Supabase may consume and remove the #...type=recovery hash before app.js
 * bootstrap checks location.hash. This hotfix captures the auth flow before
 * app.js runs, and keeps the "Tetapkan Password Baru" form visible until the
 * password update succeeds.
 */
(() => {
  const STORAGE_KEY = 'hlni-password-setup-pending-v1';
  const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

  function readAuthTypeFromUrl() {
    const rawHash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;

    const hashParams = new URLSearchParams(rawHash);
    const searchParams = new URLSearchParams(window.location.search);

    return hashParams.get('type') || searchParams.get('type') || '';
  }

  const initialType = readAuthTypeFromUrl();

  if (initialType === 'recovery' || initialType === 'invite') {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ type: initialType, startedAt: Date.now() })
    );
  }

  let pending = null;
  try {
    pending = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  if (!pending) return;

  if (!pending.startedAt || (Date.now() - pending.startedAt) > MAX_AGE_MS) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }

  const authScreen = document.querySelector('#auth-screen');
  const appShell = document.querySelector('#app-shell');
  const loginForm = document.querySelector('#login-form');
  const forgotForm = document.querySelector('#forgot-form');
  const resetForm = document.querySelector('#reset-password-form');
  const toast = document.querySelector('#toast');

  if (!authScreen || !appShell || !loginForm || !forgotForm || !resetForm) return;

  let completed = false;
  let submitted = false;

  function forcePasswordSetupScreen() {
    if (completed) return;

    authScreen.classList.remove('hidden');
    appShell.classList.add('hidden');
    loginForm.classList.add('hidden');
    forgotForm.classList.add('hidden');
    resetForm.classList.remove('hidden');
  }

  function clearPending() {
    completed = true;
    sessionStorage.removeItem(STORAGE_KEY);
    uiObserver.disconnect();
    toastObserver?.disconnect();
  }

  // Run immediately, before app.js module bootstrap.
  forcePasswordSetupScreen();

  // If app.js bootstrap tries to show the normal app, put the user back on
  // the password setup screen while the recovery flow is still pending.
  const uiObserver = new MutationObserver(() => {
    queueMicrotask(forcePasswordSetupScreen);
  });

  [authScreen, appShell, loginForm, forgotForm, resetForm].forEach((el) => {
    uiObserver.observe(el, {
      attributes: true,
      attributeFilter: ['class']
    });
  });

  resetForm.addEventListener(
    'submit',
    () => {
      submitted = true;
    },
    true
  );

  // app.js already shows this success message after updateUser() succeeds.
  // Clear the hotfix flag only then, so bootstrap can continue into the app.
  let toastObserver = null;
  if (toast) {
    toastObserver = new MutationObserver(() => {
      const message = (toast.textContent || '').trim();
      if (submitted && /Password baru berjaya disimpan/i.test(message)) {
        clearPending();
      }
    });

    toastObserver.observe(toast, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // Optional escape hatch for a future app.js native fix.
  window.addEventListener('hlni:password-reset-complete', clearPending);
})();
