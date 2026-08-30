# Home Library Nilai Impian

**Koleksi Peribadi Zamri & Nor Azzah**

Family home library catalogue and management system.

## Round 1

- Family email/password login through Supabase Auth
- Family-only catalogue protected by Row Level Security
- Dashboard with title/copy/availability counts
- Searchable catalogue
- Manual book + physical-copy entry
- Book details
- Basic record editing
- Soft archive for physical copies
- Family activity / audit trail
- Profile display name
- Mobile-first layout
- Installable PWA shell

## Architecture

- **Frontend:** static HTML/CSS/JavaScript
- **Hosting:** GitHub Pages
- **Database/Auth:** Supabase (PostgreSQL + Auth + RLS)
- **Legacy source:** Microsoft Access 2015, to be migrated in a later round

The frontend contains only the Supabase **Project URL** and **publishable key**. Never commit database passwords, `service_role`, `sb_secret_*`, or other privileged credentials.

## Deploy to GitHub Pages

1. Upload the contents of this folder to the root of the repository.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/(root)**.
5. Save.
6. Open the Pages URL and log in with an approved family account.

## Supabase

This frontend assumes the Home Library Nilai Impian foundation SQL has already been run and the current user's `auth.users.id` is present in `public.family_members` with `active = true`.

## Next rounds

- ISBN/barcode scan + automatic metadata
- Book cover upload to Supabase Storage
- Reading tracker / Bookmory-style features
- Loan/borrowing workflow
- Shelf map / QR labels
- Family email allowlist + invitation workflow
- Microsoft Access 2015 migration
- Access ↔ cloud integration
