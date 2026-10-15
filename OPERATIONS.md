# Operasi MyKhairat

Kemaskini 12 Oktober 2026. Stack: Next.js App Router, TypeScript, Tailwind CSS, Turso SQLite, GitHub, Vercel.

## Aliran harian AJK

1. Wakil menghantar resit melalui WhatsApp seperti biasa. Portal wakil adalah pilihan.
2. AJK buka **Resit WhatsApp**, cari keluarga, pilih bulan, tarikh sebenar wang diterima, jumlah dan rujukan unik; upload imej resit.
3. Simpan sebagai Menunggu semakan. Pelulus atau pentadbir utama semak jumlah, penerima dan rujukan terhadap transaksi bank.
4. Hanya Approved payments dikira sebagai kutipan. Bayaran tunai memerlukan rujukan resit dan catatan sumber. Akaun yang mempunyai kuasa approve boleh menandakan wang telah disemak ketika memasukkan rekod.
5. Lebihan dibawa sebagai kredit kepada bulan tertunggak paling awal. Kredit asal turut menyelesaikan bulan untuk penentuan suspension. Keluarga Inactive tidak menerima submission baharu.

Tiada integrasi yang membaca WhatsApp secara automatik atau menghantar mesej bagi pihak AJK. Pautan WhatsApp membuka mesej untuk manusia hantar sendiri.

## Persediaan pertama selepas naik taraf

- **Persetujuan:** masukkan telefon bantuan AJK dan sahkan akaun bank/penerima sebenar. Arahan pembayaran bank/QR tidak dipaparkan kepada wakil sehingga pentadbir mengesahkannya.
- **Ledger & bank:** masukkan baki bank asal pada tarikh sebelum transaksi pertama yang direkodkan. Jangan menambah baki bank hari ini kepada semua kutipan sejarah. Jika memilih pendekatan cutover, sediakan jumlah sumber yang disahkan dan rekodkan pelarasan dengan alasan.
- **Keluarga → Caruman bulanan:** sahkan assessment sejarah berdasarkan spreadsheet, resit atau sumber bank. Snapshot lama yang tidak diketahui ditandakan Perlu semakan, bukan dipersembahkan sebagai sejarah tepat.
- **Polisi lama:** masukkan kadar/manfaat yang dipersetujui untuk tarikh tuntutan lama, dengan sumber persetujuan. Ini tidak menulis semula assessment yang sudah dijana.
- **Ahli → Tempoh keahlian asal:** masukkan bulan mula/berhenti apabila sejarah status diperlukan. Bulan berhenti tidak termasuk dalam tempoh caruman. Snapshot lama dilaraskan berasingan dengan rujukan.

## Caruman dan perubahan polisi

- Assessment menyimpan jumlah, bilangan ahli, kadar, due day dan pengesahan per bulan.
- Polisi baharu dijadualkan mulai bulan depan atau bulan yang dipilih selepas itu. Sejarah berbayar/belum bayar tidak dikira semula daripada kadar semasa.
- Penambahan/status ahli berkuat kuasa untuk caruman bulan depan selepas pendaftaran awal disahkan. Semasa keluarga baharu belum selesai disediakan, penambahan ahli mengemaskini jumlah provisional; pentadbir utama mesti sahkan jumlah awal.
- Keluarga baharu melalui borang biasa mempunyai wakil sebagai ahli sekali. Import turut memasukkan wakil sekali.
- Baki keluarga positif ialah hutang, negatif ialah kredit. Jika menggunakan baki cutover, bulan mula kiraan mesti selepas bulan yang sudah termasuk dalam baki asal supaya tidak mengira hutang dua kali.
- Rekod provisional tidak digunakan untuk menggantung keluarga secara automatik. Keputusan tuntutan memerlukan sejarah berkaitan disahkan.

## Import

**Senarai keluarga:** .xlsx/CSV bawah3MB; maksimum2,000 baris/sheet dan500 keluarga/batch. Header bilingual dikenali dan boleh dipetakan. Gunakan Family ID / ID Ahli asal atau IC untuk nama sama. Nama ahli berulang tanpa identiti yang mencukupi perlu dibetulkan. Telefon/IC perlu format teks dalam Excel untuk mengekalkan sifar hadapan. Status dan bulan mula per keluarga boleh dipetakan.

**Bayaran sejarah:** .xlsx/CSV bawah3MB, maksimum500 baris. Kolum: Family ID, Tarikh, Bulan, Jumlah, Rujukan. Format tarikh YYYY-MM-DD dan bulan YYYY-MM. Pilihan Caruman Sebenar + Bilangan Ahli mengesahkan assessment bulan berkenaan. Preview jumlah mesti dipadankan dengan sumber asal. Rujukan pendua membatalkan keseluruhan batch. Transaksi tidak boleh dikira sekali lagi jika sudah termasuk dalam baki bank cutover.

Rujukan transaksi kini dikenali sebagai satu transaksi unik. Bayaran lump sum boleh menjadi kredit bagi bulan lain; jangan mengulang satu rujukan sebagai beberapa transaksi tunai. Alokasi kredit tidak menggandakan wang masuk.

## Tuntutan

Permohonan → Reviewed → Approved → Paid; boleh ditolak dengan alasan sebelum Paid.

- Bukti kejadian (imej), tarikh kejadian, penerima, akaun/kaedah payout dan jenis bantuan diperlukan.
- Warded memerlukan rujukan episod kemasukan supaya kejadian sama tidak direkod dua kali. Had ulang tuntutan/kriteria perubatan masih berdasarkan persetujuan dan semakan AJK; sistem tidak mencipta polisi tersebut sendiri.
- Jumlah mengikuti polisi pada tarikh kejadian. Pengecualian jumlah memerlukan alasan.
- Tarikh masa depan atau sebelum menyertai ditolak. Status/assessment dan pembayaran sebelum tarikh kejadian digunakan untuk semakan; tempoh ahli lama yang tidak diketahui perlu disahkan.
- Death claim diluluskan menandakan ahli Tidak Aktif, dengan caruman berhenti bulan depan. Snapshot bulan lama kekal.
- Bukti transfer, tarikh dibayar dan rujukan payout unik diperlukan untuk Paid. Hanya Paid mengurangkan cash book. Claim lama sebelum naik taraf dikekalkan sebagai Paid kerana sebelumnya direkod sebagai payout; semak tarikh/buktinya dengan sumber asal.

## Kuasa dan akaun

- **Owner:** pentadbir utama, semua operasi termasuk settings, sejarah, ledger, accounts dan backup.
- **Treasurer:** keluarga dan memasukkan resit untuk semakan; tidak boleh meluluskan bayaran, mengubah ledger bank atau akaun.
- **Approver:** semakan bayaran dan aliran tuntutan.
- **Auditor:** bacaan rekod kewangan/audit; tiada mutasi.
- Wakil/ganti: hanya keluarga yang dipautkan. Ahli biasa tidak mempunyai akaun sendiri.

Username ialah nama pertama lowercase, dengan suffix jika sama. Password awal/reset wakil kekal `mykhairat`; kod pengaktifan rawak sah7 hari diperlukan pada login pertama/reset. Kod diberikan secara peribadi kepada wakil sebenar. Password baharu minimum8 aksara dan tidak boleh sama dengan default. Reset, penukaran password, perubahan kuasa dan aktif/nonaktif membatalkan sesi lama. Login mempunyai had percubaan dalam Turso (per account + IP).

AJK boleh mencipta akses wakil ganti, menjana semula kod dan reset tanpa meminta wakil menggunakan portal untuk setiap urusan. Password dan kod tidak dimasukkan dalam audit log.

## Privasi dan kunci

IC disimpan AES-256-GCM dan dipaparkan tersamar. Reveal memerlukan kuasa keluarga dan direkod dalam audit. Login menggunakan scrypt, cookie HttpOnly/Secure/Lax, JWT HS256 dan session version DB.

`AUTH_SECRET` ialah kunci sesi. `DATA_ENCRYPTION_KEY` ialah kunci data yang stabil dan **mesti sama** untuk deployment/local yang membaca database sama. Ia dikonfigurasi dalam Vercel Production/Preview dan .env.local. Jangan menukar/memadam kunci data tanpa migrasi decrypt/re-encrypt; simpan salinan selamat di luar database. Tukar AUTH_SECRET tidak menggantikan DATA_ENCRYPTION_KEY.

`CRON_SECRET` melindungi job backup. `BACKUP_PASSPHRASE` menyulitkan backup harian. Semua nilai ialah secret, bukan public environment variables.

## Sandaran dan pemulihan

- Vercel cron `0 18 * * *` bersamaan sekitar2 pagi Malaysia; masa pada Hobby boleh dalam window sejam. Handler dilindungi Bearer CRON_SECRET dan idempotent per hari Malaysia. Ia mengekalkan7 snapshot compressed/encrypted di Turso dan jejak audit. [Dokumen Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing).
- **Sandaran data** menunjukkan snapshot yang berjaya direkod. Owner boleh memuat turun snapshot harian dengan passphrase eksport yang dipilih sendiri, atau membuat backup manual semasa. Fail mempunyai version1, AES-256-GCM dan gzip; decoder juga menerima fail versi1 lama tanpa gzip.
- Snapshot dalam database melindungi beberapa kes kesilapan rekod, bukan kehilangan keseluruhan database/akaun. Muat turun salinan berkala ke simpanan organisasi di luar Turso/Vercel. Polisi backup/PITR akaun Turso tidak diubah melalui token SQL aplikasi dan perlu disahkan oleh pemilik akaun.
- Backup mengandungi data keluarga, hash akaun dan bukti. Simpan passphrase berasingan. Jangan commit backup atau kunci ke Git.
- Sebelum deployment naik taraf, snapshot production terenkripsi disimpan pada `backups/pre-upgrade-2026-10-12.json` dalam workspace dan diabaikan Git/Vercel. Passphrase snapshot ini ialah DATA_ENCRYPTION_KEY yang disimpan dalam .env.local; backup yang dibuat melalui UI menggunakan passphrase pilihan pengguna.

Pemulihan ialah operasi offline ke database **berasingan yang kosong**:

```powershell
$env:RESTORE_DATABASE_URL = 'libsql://database-baharu.turso.io'
$env:RESTORE_AUTH_TOKEN = '<token sasaran>'
$env:BACKUP_PASSPHRASE = '<passphrase fail>'
npm run db:restore -- '<fail-backup.json>'
```

Skrip menolak sasaran sama dengan TURSO_DATABASE_URL dan database berisi data. Ia melakukan insert dalam satu transaksi dengan semakan foreign keys; kegagalan rollback. Copy DATA_ENCRYPTION_KEY asal ke deployment pemulihan sebelum membuka IC. Sahkan jumlah, record IDs, login dan bukti; kemudian barulah tukar sambungan production. Restore drill telah dilakukan pada database ujian berasingan.

## UI dan akses

Bahasa Melayu, tema biru gelap/hijau, input16px, kawalan besar, sidebar desktop, nav mobile, safe areas, scroll drawer, fokus keyboard dan Escape. Ilustrasi keluarga ialah SVG berlapis dengan CSS3D/pointer parallax; tiada runtime WebGL atau muat turun model berat. Pilihan Teks besar disimpan per browser. Animasi berjalan automatik tanpa butang pause/play; tetapan animasi lama tidak lagi digunakan.

Tiada ujian visual browser/screen-reader semua viewport dijalankan dalam sesi ini. Buat semakan pengguna sebenar pada320/375/768/1440px, landscape dan zoom200% sebelum mengisytiharkan pematuhan accessibility penuh.

## Semakan release

- `npm run lint` dan `npx tsc --noEmit`.
- `npm run test:rules` dan `npm run test:onboarding` pada server port3001 dengan database disposable **file:** sahaja. Set AUTH_SECRET/DATA_ENCRYPTION_KEY kepada kunci ujian sama, SEED_DEMO=true; jangan gunakan Turso production. Onboarding memerlukan akaun demo admin dan tidak dijalankan pada production.
- `npm run build` sebelum release; secrets hanya dalam Vercel/local env.
- `npm audit --omit=dev`:0 advisory semasa pembaikan. Full development tree masih menunjukkan7 entri high yang berpunca daripada braces, dengan tiada patched release ketika semakan. App tidak menerima glob pengguna; patterns build/lint ialah sumber repositori. [Advisory upstream](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). esbuild dan selector-parser dev telah dipatch. Jangan gunakan npm audit fix --force sebagai pengganti semakan major upgrade.

FPX/payment gateway dan notifikasi WhatsApp automatik bukan sebahagian aliran harian ini; ia memerlukan akaun provider, webhook/verification serta persetujuan operasi berasingan. Rekod dan angka sejarah sebenar hanya boleh disahkan AJK daripada dokumen asal, bukan dijana oleh sistem.

## Migrasi workbook lama

### Pengasingan database

MyKhairat menggunakan database Turso khusus `mykhairat-ariezaziera`. Database `kagumone-app-ariezaziera` bukan sasaran aplikasi ini. Semasa pengasingan, 19 jadual milik MyKhairat disalin bersama skema, indeks dan data; jadual organisasi KagumOne tidak dibawa. Eksport terenkripsi dan laporan pengesahan disimpan dalam `backups/` (diabaikan Git/Vercel). Data sumber tidak dipadam. Kekalkan AUTH_SECRET, DATA_ENCRYPTION_KEY dan BACKUP_PASSPHRASE MyKhairat ketika menukar sambungan. Aplikasi menolak hostname KagumOne dan jadual aplikasi lain sebelum menjalankan migrasi skema.

`npx tsx scripts/import-legacy.ts <fail.xlsx>` hanya menghasilkan preview. Adapter ini khusus untuk struktur workbook yang telah diaudit; jumlah / baris yang berubah akan ditolak. `--apply --local` menggunakan `backups/legacy-rehearsal.db`; `--apply` tanpa `--local` menggunakan database dalam `.env.local`. Deploy kod semakan import dahulu sebelum import production.

Sebelum perubahan, skrip menyimpan dan menguji backup terenkripsi dengan BACKUP_PASSPHRASE. Semua insert dan pembuangan keluarga ujian yang dibenarkan dibuat dalam satu transaksi. Hash sumber mencegah import berulang. Fail asal dan kod pengaktifan tidak masuk Git; salinan sumber terenkripsi juga disimpan dalam `legacy_imports`.

Pentadbir utama menggunakan `/admin/import-review` untuk muat turun sumber dan menyelesaikan isu dengan alasan. Agihan baki 2025 berstatus Pending dan `is_opening_allocation=1`; ia bukan penerimaan tunai baharu. Baki asal berstatus `confirmed=0`. Pengesahan berkumpulan mengesahkan agihan dan satu baki asal secara atomik. Bayaran kemungkinan pendua gabungan juga mesti diputuskan bersama. Semakan resit biasa menolak perubahan rekod import.

`npx tsx scripts/check-legacy.ts` memeriksa sumber persendirian dan database rehearsal, termasuk jumlah, idempotensi melalui arahan import semula, kiraan ahli, akaun, hubungan rekod dan kiraan tunggal baki asal. Jangan ubah source workbook untuk meluluskan semakan yang gagal; audit perubahan sumber dahulu.

## Fail contoh upload

Setiap input upload menyediakan pautan muat turun contoh. Import keluarga dan transaksi mempunyai template Excel/CSV dalam `public/samples`, dengan tajuk kolum sepadan parser. Tukar semua data CONTOH sebelum import; Family ID transaksi mesti ID sebenar dalam sistem. Contoh resit, bukti tuntutan dan panduan QR ialah PNG berlabel CONTOH, bukan bukti atau QR bayaran sebenar. Had: 3 MB untuk import, 2 MB untuk imej PNG/JPG/WebP.
