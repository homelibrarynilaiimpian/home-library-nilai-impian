HLNI PASSWORD RESET HOTFIX v1.0.0
===================================

Masalah:
Link "Reset your password" Supabase berjaya verify, tetapi user kembali ke website
tanpa sempat nampak borang "Tetapkan Password Baru".

Punca:
Supabase boleh consume/remove URL hash recovery sebelum app.js bootstrap sempat
membaca `type=recovery`.

Fail dalam ZIP:
1. family.html
   - Replacement untuk family.html semasa.
   - Hanya perubahan penting: load hlni-auth-recovery-fix.js sebelum app.js.

2. hlni-auth-recovery-fix.js
   - Tangkap flow `recovery` / `invite` lebih awal.
   - Paksa skrin "Tetapkan Password Baru" kekal visible sehingga update password berjaya.
   - Tidak ubah database, RLS, catalogue atau fungsi lain.

CARA PASANG DI GITHUB
---------------------
1. Buka repo:
   homelibrarynilaiimpian/home-library-nilai-impian

2. Upload DUA fail ini ke root repo:
   - family.html  (overwrite fail lama)
   - hlni-auth-recovery-fix.js  (fail baru)

3. Commit ke branch main.

4. Tunggu GitHub Pages deploy siap.

CARA TEST
---------
1. Buka Family Login.
2. Tekan "Lupa password?".
3. Masukkan email family.
4. GUNA EMAIL RESET YANG PALING BARU.
   Link lama yang sudah ditekan tidak boleh diguna semula kerana token Supabase one-time.
5. Tekan "Reset your password".
6. Sepatutnya keluar:
      Tetapkan Password Baru
      Password Baru
      Ulang Password
      Simpan Password Baru
7. Simpan password baru.
8. Selepas berjaya, app akan teruskan flow login biasa.

Nota:
Jika browser masih tunjuk versi lama, tutup tab dan buka semula website atau refresh.
