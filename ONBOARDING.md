# Akaun wakil dan import keluarga

Admin terus boleh login dengan email dan password sedia ada. Google sign-in sudah dibuang.

## Akaun wakil

- Keluarga baharu mendapat akaun wakil secara automatik, termasuk keluarga yang dimasukkan melalui borang biasa.
- Username ialah perkataan pertama nama wakil, huruf kecil tanpa tanda baca. Nama pertama sama mendapat nombor tambahan (`siti`, `siti2`). Username dipaparkan pada halaman keluarga dan Accounts.
- Password awal ialah `mykhairat`. Wakil wajib menukar password sebelum mendapat akses kepada halaman atau API keluarga.
- Password baharu mesti sekurang-kurangnya 8 aksara dan berbeza daripada password awal.
- Lupa password: hubungi admin. Dalam Accounts, admin tekan **Reset password ke mykhairat**. Sesi lama dibatalkan dan wakil wajib menukar password sekali lagi.
- Akaun lama mendapat username tanpa menukar password sedia ada. Gunakan butang reset jika ingin menetapkan password default bagi akaun lama.
- Ahli keluarga tidak mendapat akaun login sendiri.

## Import Excel

Directory → Import Excel. Fail `.xlsx` atau `.csv`, maksimum 3MB, 2,000 baris setiap sheet dan 500 keluarga setiap import. Fail `.xls` perlu disimpan sebagai `.xlsx` dahulu.

Format satu ahli setiap baris: `Nama Wakil`, `Telefon`, `Nama Ahli`, `Hubungan`, `No IC`. Nama wakil kosong mengikuti wakil pada baris sebelumnya. Format lebar dengan `Ahli 1`, `Ahli 2` juga disokong. Sheet dan pemetaan kolum boleh dipilih dalam preview.

Semak setiap keluarga dan bulan mula caruman sebelum mengesahkan. Wakil dikira sekali sebagai ahli; akaun ahli tidak dicipta. Nama wakil yang sudah wujud ditolak untuk mengelakkan import pendua. Keseluruhan import dibatalkan jika satu keluarga gagal.

Simpan nombor telefon dan IC sebagai teks dalam Excel untuk mengekalkan angka sifar di hadapan. Preview memaparkan nilai yang dibaca; semak sebelum import.

Senarai username boleh dimuat turun sebagai CSV selepas import. Transaksi dan baki lama tidak diimport oleh fungsi senarai keluarga ini. Jika memilih bulan mula lama tanpa rekod bayaran, sistem akan mengira bulan tersebut sebagai tertunggak.

## Regression checks

`npm run test:rules` memeriksa pengiraan caruman, pengumpulan ahli dari baris/kolum Excel dan username pendua.

`npm run test:onboarding` memerlukan pelayan tempatan pada port 3001 dengan database ujian berasingan dan akaun demo. Ia menguji upload Excel, import, rollback import pendua, login default, tukar password wajib, reset admin dan pembatalan sesi lama. Jangan gunakan database rekod sebenar untuk ujian ini.

## Naik taraf12 Oktober2026

Akaun wakil baharu/reset kini memerlukan kod pengaktifan sah7 hari daripada AJK, selain password mykhairat. Kod dipaparkan sekali pada hasil import / Accounts dan boleh dijana semula. Family ID / ID Ahli, status dan bulan per keluarga boleh dipetakan. Import transaksi sejarah tersedia berasingan dengan preview jumlah dan pengesahan sumber. Wakil tidak wajib menggunakan portal; aliran resit WhatsApp kekal utama. Baca OPERATIONS.md sebelum mengesahkan sejarah atau cutover.
