HLNI Password Reset Fix v2

Changed files only:
- app.js
- family.html

What this fixes:
1. Removes the old MutationObserver recovery hotfix that can fight the main UI.
2. Captures recovery/invite intent natively before Supabase consumes the URL hash.
3. Keeps reset state in sessionStorage for up to 2 hours.
4. Verifies a recovery session exists before updateUser(password).
5. Uses one password-update request only (no mutation retry).
6. Signs out the temporary recovery session after success and asks the user to login cleanly.
7. Uses https://www.homelibrarynilaiimpian.com/family.html as reset redirect.

IMPORTANT Supabase dashboard setting:
Authentication > URL Configuration
- Site URL: https://www.homelibrarynilaiimpian.com/family.html
- Add Redirect URL: https://www.homelibrarynilaiimpian.com/family.html
- Also keep the GitHub family fallback if desired:
  https://homelibrarynilaiimpian.github.io/home-library-nilai-impian/family.html

After deployment, request a NEW reset email. Old recovery links should not be reused.
