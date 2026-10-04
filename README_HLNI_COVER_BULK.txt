HLNI EXISTING COVER BULK OPTIMIZER
=================================
Prepared: 4 October 2026

SUPABASE BACKEND STATUS
- Edge Function: hlni-cover-optimizer
- Status: ACTIVE
- Version: 2
- JWT verification: ON
- Only active family accounts can use it.
- Existing storage object paths are preserved.
- A file is overwritten only when the optimized output is smaller.

PRE-CHECK COMPLETED
- Current book-covers objects checked: 672
- Google Drive backup coverage checked: 672 / 672
- Missing backups: 0
- Current book-covers storage before maintenance: 273,079,324 bytes
- Existing files > 450 KB before maintenance: 141
- Of these: 138 JPEG + 3 PNG

HOW TO APPLY
1. In the HLNI website source, replace the current hlni-v8-6-5-recovery.js with the patched file in this ZIP.
   IMPORTANT: This patched file is based on the HLNI recovery module saved on 12 September 2026.
   The original source used for this patch is included as hlni-v8-6-5-recovery.ORIGINAL.js.
2. Deploy/publish the website as usual.
3. Hard refresh the Family page and log in with an active family account.
4. Open the Backup dialog. A new section called "Optimize Existing Book Covers" will appear.
5. Click "Refresh Status". It will ask Supabase for the current list of covers still above 450 KB.
6. Click "Optimize Existing Covers".
7. Keep that tab open while the progress bar is running.
8. If the browser closes, internet drops, or the process stops, reopen the page and run it again. It is resume-safe: already-small files are skipped.

SAFETY / ROLLBACK
- All 672 current cover objects were verified to have a Google Drive backup before this patch was prepared.
- The process does not change books.cover_url.
- The Edge Function uses the Supabase service role internally only after validating the caller's family JWT.
- The browser never receives the service-role key.
- Original recovery JS is included in this ZIP for code rollback.

AFTER RUNNING
Ask ChatGPT to "check HLNI cover storage after compression". The Supabase project can then be audited for:
- total storage bytes
- number of files still >450 KB
- any failed objects
- whether the project remains safely below Free-plan quotas
