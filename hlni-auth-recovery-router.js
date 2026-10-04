/*
 * HLNI Password Recovery Router v2.0.0
 *
 * Supabase may fall back to the project's Site URL after verifying a recovery
 * email. HLNI's Site URL currently lands on the public catalogue (index.html).
 *
 * This script runs BEFORE public.js. If a recovery/invite auth fragment lands
 * on the public catalogue, forward it to family.html while preserving the
 * complete query string + hash so Supabase can finish the auth flow there.
 */
(() => {
  const hash = window.location.hash || '';
  const search = window.location.search || '';

  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const searchParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  const type = hashParams.get('type') || searchParams.get('type') || '';

  const isPasswordSetup =
    type === 'recovery' ||
    type === 'invite';

  if (!isPasswordSetup) return;

  const target = new URL('./family.html', window.location.href);
  target.search = search;
  target.hash = hash;

  window.location.replace(target.href);
})();
