HLNI PASSWORD RESET HOTFIX v2.0.0
===================================

PUNCA SEBENAR YANG DIKESAN
--------------------------
Reset email memang berjaya dan Supabase verify link dengan status berjaya.
Tetapi redirect selepas verify jatuh ke root website / Site URL, iaitu KATALOG AWAM.

Sebab itu hotfix v1 tak sempat jalan:
v1 hanya berada di family.html, tetapi browser tak sampai ke family.html.

APA V2 BUAT
-----------
1. index.html dan public.html kini load `hlni-auth-recovery-router.js`
   SEBELUM public.js.
2. Jika URL yang sampai ke katalog awam mengandungi `type=recovery`
   atau `type=invite`, ia terus dihantar ke family.html sambil mengekalkan
   semua token/query/hash Supabase.
3. family.html + hlni-auth-recovery-fix.js (v1) kemudian memaksa skrin
   "Tetapkan Password Baru" kekal terbuka sehingga password berjaya disimpan.

FAIL YANG PERLU UPLOAD KE ROOT REPO
-----------------------------------
Upload SEMUA fail ini:
- index.html                         (overwrite)
- public.html                        (overwrite)
- family.html                        (overwrite / kekalkan versi patch)
- hlni-auth-recovery-router.js       (NEW)
- hlni-auth-recovery-fix.js          (kekalkan / overwrite versi patch)

Repo:
homelibrarynilaiimpian/home-library-nilai-impian

Selepas commit:
1. Tunggu GitHub Pages deploy siap.
2. Tutup tab website lama di telefon Mama.
3. Buka Family Login semula.
4. Tekan Lupa password.
5. Minta email reset BARU.
6. Buka email yang PALING BARU sahaja.
7. Tekan Reset your password.
8. Ia sepatutnya tidak lagi berhenti di Katalog Awam.
9. Ia akan pergi ke Family page -> Tetapkan Password Baru.
10. Simpan password baru.

PENTING
-------
Jangan test guna email reset lama. Recovery link Supabase ialah one-time token.
