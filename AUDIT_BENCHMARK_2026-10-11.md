# MyKhairat — benchmark dan audit

Tarikh: 11 Oktober 2026 · Kod: commit `7d883a2` · Sasaran: dana khairat keluarga yang berjalan sejak 2025.

## Keputusan

MyKhairat mempunyai asas pengurusan keluarga, caruman, DuitNow dan portal wakil. Ia belum sesuai dianggap sebagai rekod kewangan muktamad sehingga kiraan sejarah, baki dana asal, pengagihan kredit dan kawalan tuntutan diperbetulkan.

Penilaian ini mengenal pasti **16 dapatan: 6 P1, 8 P2, 2 P3**. P1 perlu didahulukan kerana boleh mempengaruhi wang, kelayakan atau akses akaun. P2 ialah kelemahan operasi/kawalan. P3 ialah penambahbaikan kebolehselenggaraan dan kapasiti. Ini keutamaan untuk konteks keluarga kita, bukan skor keselamatan industri.

## Skop dan kaedah

- Membaca PROMPT_SYSTEM.md, skema/migrasi, logik caruman, tuntutan, import, authentication, API, borang dan navigasi.
- Keperluan terkini dalam perbualan mengatasi dokumen lama: Next.js/Turso/Vercel, tiada Google sign-in, RM5 seorang, tuntutan kematian/warded, akaun wakil automatik dan rekod sejak 2025.
- Benchmark berdasarkan laman rasmi vendor yang dibaca pada tarikh audit. Ciri ialah dakwaan vendor; tiada akaun demo atau audit dalaman vendor dilakukan. “Tidak dinyatakan” tidak bermaksud tiada.
- Menjalankan `npm audit --omit=dev --json`: 5 entri pakej terjejas, 2 high dan 3 moderate. Entiti induk/transitif boleh merujuk isu sama; bukan 5 eksploit berasingan.
- Semakan HTTP production tanpa login: /login = 200; /api/users, /api/dashboard, /api/reports/financial = 401.
- Tiada ujian baharu, perubahan data production atau pembaikan aplikasi dilakukan dalam audit ini. Contoh angka di bawah ialah analisis logik kod, bukan keputusan eksperimen production.
- Tidak menyemak baki sebenar bank, keseluruhan data Turso, tetapan WAF Vercel, polisi sandaran Turso atau pengalaman visual setiap saiz skrin. Jurang ini dilabel sebagai belum disahkan.

## Benchmark pasaran

### e-Khairat

Laman rasmi menyenaraikan ahli/tanggungan, penjanaan yuran, pemantauan bayaran, eksport Excel dan notis peringatan. Ahli mempunyai semakan yuran, resit digital, upload dokumen serta pilihan manual, pindahan bank dan FPX. Pengajaran untuk kita: eksport rekod lengkap dan notis mudah dihantar oleh AJK. Polisi caruman bulanan per kepala serta bantuan warded tidak dinyatakan pada halaman tersebut. [Sumber](https://e-khairat.com/).

### Digital Khairat

Vendor menyatakan import Excel, pengurusan ahli/tanggungan, tuntutan, laporan, aplikasi Android/iOS dan bayaran melalui Billplz. Turut menyatakan notifikasi, akses lihat sahaja bagi pasangan/anak, IC tersamar/enkripsi dan audit capaian sensitif. Pengajaran untuk keluarga kita: wakil ganti, import yang boleh dijejak serta perlindungan data. Dakwaan keselamatan vendor tidak diverifikasi secara bebas. [Sumber](https://digitalkhairat.my/).

### KariahKu

Vendor menyatakan pendaftaran/lulusan ahli, pengurusan tuntutan, FPX, notifikasi WhatsApp/e-mel, semakan awam dan eksport data. Pengajaran: status tuntutan yang jelas dan makluman selepas pembayaran. Semakan awam bukan keperluan automatik untuk keluarga kita; akses mesti menjaga privasi. Kadar bulanan per kepala dan bantuan warded tidak dinyatakan pada laman utama. [Sumber](https://www.kariahku.my/).

### Kedudukan MyKhairat

**Sudah ada dalam kod:** dua role login (admin/wakil), ahli tanpa akaun, direktori keluarga, caruman semasa per kepala, semakan resit, payment Pending/Approved/Rejected, manual payment, tuntutan Death/Warded, DuitNow QR, PDF, tunggakan, pautan WhatsApp manual, import .xlsx/CSV, username wakil, password visibility, forced change dan reset yang membatalkan sesi.

**Sebahagian:** sejarah caruman, aliran tuntutan, import sejarah, audit log, baki dana, akses untuk warga emas dan pembahagian tugas AJK.

**Belum ditemui dalam aplikasi:** gerbang bayaran dengan pengesahan automatik, notifikasi automatik, wakil ganti, rekonsiliasi bank, ledger perbelanjaan/derma/baki bank asal, eksport penuh untuk pemulihan dan aliran tuntutan lengkap dengan bukti pembayaran.

FPX dan aplikasi native boleh dipertimbangkan kemudian. Untuk jumlah keluarga kecil, DuitNow dengan semakan AJK mungkin memadai; ketepatan rekod dan bantuan bagi wakil warga emas lebih penting dahulu.

## Dapatan P1

### F01 — Kiraan bulan lama berubah apabila kadar atau ahli berubah

**Bukti:** [business.ts:81](C:/Users/User/Desktop/MyKhairat/lib/business.ts:81), [queries.ts:86](C:/Users/User/Desktop/MyKhairat/lib/queries.ts:86), [queries.ts:657](C:/Users/User/Desktop/MyKhairat/lib/queries.ts:657).

Setiap bulan tanpa Approved payment menggunakan bilangan Aktif dan kadar semasa. Bulan dengan Approved payment mempunyai snapshot expectedAmount; perlindungan ini tidak meliputi bulan belum bayar, dan laporan tahunan tetap menggunakan bilangan/kadar semasa. Contoh: empat ahli dahulu = RM20; menambah seorang hari ini boleh menjadikan bulan lama yang belum dibayar RM25. Death claim menukar ahli kepada Tidak Aktif lalu boleh mengurangkan tunggakan lama pula. Statement dan laporan expected boleh berbeza.

**Cadangan:** jadual monthly assessments dengan snapshot bilangan ahli/kadar, polisi bertarikh kuat kuasa dan sejarah perubahan ahli. Jangan mencipta sejarah tepat daripada bilangan ahli hari ini; AJK perlu mengesahkan data 2025.

### F02 — Total Fund Balance belum mewakili baki tunai sebenar

**Bukti:** [queries.ts:648](C:/Users/User/Desktop/MyKhairat/lib/queries.ts:648), [schema.ts](C:/Users/User/Desktop/MyKhairat/lib/schema.ts).

Baki ialah semua Approved payments tolak semua claim. Tiada baki bank asal, derma, perbelanjaan lain, refund atau rekonsiliasi bank. openingBalance keluarga ialah baki hutang/kredit, bukan wang dalam bank. Koleksi tahunan dikelompokkan mengikut bulan caruman, bukan tarikh wang diterima; perlu beza laporan caruman dan aliran tunai.

**Cadangan:** ledger dana dengan baki awal pada tarikh cutover, transaksi masuk/keluar, jurnal pelarasan, akaun bank dan rekonsiliasi; import transaksi sejak 2025 atau baki bank yang telah disahkan. Label laporan semasa dengan jelas sementara itu.

### F03 — Akaun belum diaktifkan boleh dituntut oleh orang yang mengetahui password default

**Bukti:** [usernames.ts](C:/Users/User/Desktop/MyKhairat/lib/usernames.ts), [login route](C:/Users/User/Desktop/MyKhairat/app/api/auth/login/route.ts), [guard.ts](C:/Users/User/Desktop/MyKhairat/lib/guard.ts).

Username mudah dijangka dan password awal/reset sama untuk semua, mengikut permintaan pengguna. Forced change serta pembatalan sesi sudah ada, tetapi tidak mengesahkan bahawa orang yang login pertama ialah wakil sebenar. Tiada rate limiter aplikasi ditemui; kawalan Vercel belum diperiksa.

**Cadangan:** kekalkan format login yang dipersetujui tetapi tambah pengaktifan oleh admin atau kod sekali guna per wakil, tempoh sah reset dan had percubaan dalam storan bersama. Akaun admin perlukan kawalan lebih kuat. Keputusan identiti/aktivasi perlu dipersetujui sebelum mengubah aliran pengguna.

### F04 — Semakan dan perubahan kewangan belum atomik

**Bukti:** [queries.ts:542](C:/Users/User/Desktop/MyKhairat/lib/queries.ts:542), [queries.ts:590](C:/Users/User/Desktop/MyKhairat/lib/queries.ts:590), [queries.ts:425](C:/Users/User/Desktop/MyKhairat/lib/queries.ts:425), [migrate.ts](C:/Users/User/Desktop/MyKhairat/lib/migrate.ts).

Review payment membaca Pending kemudian update dengan paymentId sahaja. Dua admin boleh berlumba approve/reject dan perubahan terakhir menang. Death claim duplicate disemak sebelum insert tanpa constraint unik; semakan itu tidak menjamin satu tuntutan semasa permintaan serentak. Lulusan permohonan ahli boleh mencipta ahli dua kali. Reference payment tidak mempunyai uniqueness/idempotency; semakan Pending sahaja tidak menghalang rekod Approved yang sama diulang. Import keluarga sudah menggunakan transaksi, tetapi kebanyakan mutasi lain belum.

**Cadangan:** transaksi, update bersyarat status=Pending, semak affected rows, constraint unik yang sesuai dan idempotency key. Reference perlu boleh dibahagi antara bulan melalui payment allocations, bukan constraint buta yang menolak bayaran sah.

### F05 — Claim direkod terus sebagai wang keluar tanpa aliran pembayaran

**Bukti:** [createClaim](C:/Users/User/Desktop/MyKhairat/lib/queries.ts:590), [claimSchema](C:/Users/User/Desktop/MyKhairat/lib/validators.ts:68), [claims schema](C:/Users/User/Desktop/MyKhairat/lib/schema.ts).

Tiada status Submitted/Reviewed/Approved/Paid, penerima/waris, bukti warded kritikal/kematian, reference payout, tarikh dibayar atau second approver. Semua claim terus ditolak dalam baki dana. Amount bebas walaupun setting mempunyai lump sum. Tarikh claim boleh sebelum menyertai atau pada masa depan jika calendar date sah; eligibility diperiksa pada keadaan hari ini, bukan tarikh kejadian. Polisi tuntutan warded berulang belum dimodelkan.

**Cadangan:** jenis tuntutan dan polisi bertarikh, dokumen, tarikh kejadian, penilaian eligibility pada tarikh berkenaan, penerima, approval dan bukti payout. Hanya Paid masuk laporan tunai; pengecualian amount mesti ada sebab dan kuasa jelas. Jangan menetapkan had warded atau tempoh menunggu tanpa persetujuan keluarga.

### F06 — Kredit/baki awal tidak menyelesaikan bulan untuk tujuan suspension

**Bukti:** [business.ts:142](C:/Users/User/Desktop/MyKhairat/lib/business.ts:142), [business.ts:156](C:/Users/User/Desktop/MyKhairat/lib/business.ts:156).

Baki awal/kredit mempengaruhi jumlah tunggakan tetapi bukan paid/settled setiap bulan. Contoh logik: kredit awal RM60 (openingBalance=-60), tiga bulan tertutup pada RM20 sebulan, tiada rekod payment bulan tersebut; baki jumlah RM0 tetapi consecutiveUnpaid=3 dan keluarga Suspended. Lebihan bayaran di bulan lain juga boleh menghasilkan ketidakselarasan.

**Cadangan:** bezakan ledger hutang dan pengagihan pembayaran/kredit kepada assessment bulanan; jelaskan polisi lebihan bayar bersama AJK. Import baki lama mesti menyatakan tarikh cutover supaya hutang tidak dikira dua kali.

## Dapatan P2

### F07 — Import menggunakan nama sebagai identiti

**Bukti:** [groupImportRows](C:/Users/User/Desktop/MyKhairat/lib/family-import.ts:24), [import route](C:/Users/User/Desktop/MyKhairat/app/api/import/families/route.ts).

Wakil bernama penuh sama digabung dalam preview atau ditolak jika sudah wujud; ahli bernama sama dibuang sebagai pendua walaupun dua orang berlainan. Semua ahli import ditandakan Aktif, joinedMonth satu untuk batch, openingBalance=0. Tiada import transaksi, batch log atau pemetaan status sejarah. Preview membolehkan pemetaan tetapi belum ada template khusus fail sebenar pengguna.

**Cadangan:** family/member external IDs, pemeriksaan identiti, pemetaan status dan bulan per keluarga, import batch serta laporan baris ditolak. Tambah import transaksi secara berasingan dengan pengesahan jumlah.

### F08 — Borang keluarga biasa tidak memasukkan wakil sebagai ahli

**Bukti:** [createFamily](C:/Users/User/Desktop/MyKhairat/lib/queries.ts:221), [import route](C:/Users/User/Desktop/MyKhairat/app/api/import/families/route.ts).

Import memasukkan wakil sebagai ahli; createFamily biasa hanya mencipta keluarga dan user. Keluarga baharu boleh mempunyai 0 ahli/RM0 sehingga admin menambah ahli, dan wakil tiada rekod eligibility. Sama ada wakil turut dikira perlu konsisten dengan persetujuan keluarga.

**Cadangan:** borang jelas “Wakil juga ahli pencarum” dan cipta rekod ahli dalam transaksi yang sama; boleh dikecualikan jika polisi keluarga membenarkan.

### F09 — Audit log belum meliputi semua perubahan penting dan data sensitif

**Bukti:** [family API](C:/Users/User/Desktop/MyKhairat/app/api/families/[id]/route.ts), [member API](C:/Users/User/Desktop/MyKhairat/app/api/members/[id]/route.ts), [recordActivity](C:/Users/User/Desktop/MyKhairat/lib/queries.ts:891).

Family/member create/update/delete tidak semuanya merekod audit; tiada nilai before/after. Beberapa route menulis audit selepas mutasi/commit, jadi audit gagal boleh menghasilkan error walaupun data sudah disimpan. IC disimpan sebagai teks aplikasi dan dipulangkan penuh dalam DTO; tiada masking/enkripsi medan/audit bacaan aplikasi ditemui. Enkripsi storan platform tidak diaudit.

**Cadangan:** audit atomik dengan actor ID, entity ID dan before/after yang ditapis; mask IC, kawal reveal serta audit akses. Elakkan password/IC penuh dalam log. Activity UI limit 80 bukan pemadaman log tetapi tiada carian/eksport sejarah lengkap.

### F10 — Tarikh bisnes bergantung timezone proses

**Bukti:** [business.ts:40](C:/Users/User/Desktop/MyKhairat/lib/business.ts:40), [format.ts:50](C:/Users/User/Desktop/MyKhairat/lib/format.ts:50), [member-tools](C:/Users/User/Desktop/MyKhairat/app/admin/families/[id]/member-tools.tsx).

getFullYear/getMonth/getDate menggunakan timezone runtime; beberapa default tarikh menggunakan ISO UTC. Kod tiada zon bisnes Asia/Kuala_Lumpur. Lokasi hosting Singapore tidak menjamin timezone proses Malaysia. Pada sempadan hari/bulan kiraan due date dan tarikh rekod boleh berbeza.

**Cadangan:** satu utility tarikh bisnes Malaysia; timestamp simpan UTC, event date/date-only Malaysia dan penutupan bulan ikut zon yang sama.

### F11 — Kuasa AJK dan wakil pengganti belum dibezakan

**Bukti:** [auth-token.ts](C:/Users/User/Desktop/MyKhairat/lib/auth-token.ts), [requireAdmin](C:/Users/User/Desktop/MyKhairat/lib/guard.ts), [schema.ts](C:/Users/User/Desktop/MyKhairat/lib/schema.ts).

Semua admin berkuasa penuh; tiada bendahari/pelulus/auditor lihat sahaja. Admin boleh memasukkan dan terus meluluskan bayaran manual. Wakil ganti yang membantu orang tua atau menggantikan wakil meninggal belum ada aliran khusus.

**Cadangan:** permission berasingan untuk data ahli, kutipan, kelulusan, tuntutan, settings dan audit. Wakil ganti hanya keluarga sendiri; pertukaran rasmi kekalkan sejarah. Ahli biasa kekal tanpa login mengikut keperluan sekarang.

### F12 — Pemulihan rekod dan backup belum dibuktikan

**Bukti:** repositori/konfigurasi deployment mempunyai PDF reports tetapi tiada runbook backup/restore atau eksport lengkap rekod+bukti yang ditemui.

Ini jurang bukti operasi, bukan bukti Turso tiada backup. Resit base64 dalam DB meningkatkan saiz eksport. Runtime migrations juga perlu pelan rollback dan kawalan release.

**Cadangan:** semak retention/PITR sebenar Turso, backup terenkripsi berjadual, eksport lengkap, restore drill ke database berasingan dan dokumen tarikh cutover. Tetapkan akses dan tempoh simpan dokumen bersama keluarga.

### F13 — Dependency production mempunyai advisory terbuka

`npm audit --omit=dev`: Drizzle ORM dan PostCSS high; ExcelJS, uuid dan Next moderate (termasuk kesan dependency transitif). Drizzle fixed release menurut advisory ialah 0.45.2; eksploit memerlukan identifier/alias dinamik daripada input tidak dipercayai. Carian kod tidak menemui sql.identifier/sql.raw atau alias input pengguna, jadi exploitability aplikasi tidak dibuktikan. PostCSS advisory bergantung input CSS/source map; aplikasi tidak didapati menerima CSS pengguna. uuid isu melibatkan fungsi/buffer tertentu dan tidak membuktikan import Excel terjejas.

**Cadangan:** upgrade terancang dan semak path sebenar, bukan `npm audit fix --force` atau downgrade ExcelJS secara automatik. [Drizzle advisory](https://github.com/advisories/GHSA-gpj5-g38j-94v9), [uuid advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq), [PostCSS advisory](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp).

### F14 — Responsive sudah ada; kesesuaian warga emas belum lengkap

**Bukti:** [shells.tsx](C:/Users/User/Desktop/MyKhairat/components/shells.tsx), [globals.css](C:/Users/User/Desktop/MyKhairat/app/globals.css), [layout.tsx](C:/Users/User/Desktop/MyKhairat/app/layout.tsx).

Admin/wakil berkongsi responsive shell, desktop sidebar dan mobile bottom nav. Namun banyak label English, label navigasi 11px, borang 14px, lang=en untuk kandungan campuran dan menu drawer belum ada fokus trap/Escape/aria-expanded. Maklumat hubungi admin belum berupa nombor/saluran bantuan khusus. Ini semakan kod, bukan ujian visual/WCAG penuh.

**Cadangan:** Bahasa Melayu konsisten, saiz teks pilihan besar, tindakan “Bayar caruman”, “Semak keluarga”, bantuan AJK dengan klik, fokus/accessibility dan semakan 320/375/768/1440px serta zoom 200% dengan wakil sebenar.

## Dapatan P3

### F15 — Bacaan satu keluarga memproses keseluruhan dana

**Bukti:** [loadContext](C:/Users/User/Desktop/MyKhairat/lib/queries.ts:68), [syncAllFamilies](C:/Users/User/Desktop/MyKhairat/lib/queries.ts:98), [getFamilyBundle](C:/Users/User/Desktop/MyKhairat/lib/queries.ts:138).

Bacaan bundle/payment/dashboard berulang kali load semua keluarga, ahli dan payment, kemudian filter dalam memori dan kadang menulis status. Dataset kecil mungkin memadai; tiada ukuran latency/load dalam audit ini. Ia meningkatkan kerja DB apabila rekod 2025 bertambah.

**Cadangan:** query terhad keluarga, aggregation SQL, pagination, pemprosesan status bersasar dan penjadualan yang jelas. Jadual cron/notifikasi automatik tidak ditemui; pautan WhatsApp sekarang manual.

### F16 — Dokumen dan tuntutan UI perlu diselaraskan dengan sistem sebenar

**Bukti:** [README](C:/Users/User/Desktop/MyKhairat/README.md), [PROMPT_SYSTEM](C:/Users/User/Desktop/MyKhairat/PROMPT_SYSTEM.md), [settings page](C:/Users/User/Desktop/MyKhairat/app/admin/settings/page.tsx).

README/PROMPT masih menerangkan AppSheet/Google Sheets/Drive dan login Google; arahan pengguna kini mengatasinya. Settings menyatakan perubahan tidak menulis semula payments/claims, tetapi kewajipan sejarah tanpa payment masih dikira semula (F01). Dokumentasi onboarding baharu sudah lebih tepat.

**Cadangan:** kemas kini spesifikasi kepada stack sebenar, tarikh kuat kuasa polisi, penjelasan baki kredit/hutang dan manual operasi admin. Pastikan tuntutan UI menggambarkan batasan kiraan sejarah.

## Cadangan urutan kerja

1. **Ketepatan kewangan:** assessment bulanan, sejarah ahli/kadar, allocation kredit, cutover 2025, ledger dana serta rekonsiliasi. Sahkan jumlah sumber dengan AJK.
2. **Kawalan akaun/transaksi:** pengaktifan wakil, login throttling, mutasi atomik, idempotency dan audit lengkap.
3. **Tuntutan dan kuasa:** aliran tuntutan sampai Paid, dokumen/waris, polisi warded, permission AJK dan wakil ganti.
4. **Operasi harian:** import beridentiti, backup/restore, BM/warga emas, laporan eksport dan notifikasi pilihan.
5. **Automasi pilihan:** FPX jika jumlah kutipan membenarkan kos/kerumitan, dengan webhook verification dan bank reconciliation.

## Kriteria penerimaan untuk pembaikan

- Tambah/keluar/kematian ahli dan perubahan kadar tidak mengubah assessment bulan yang sudah dikunci.
- Statement, tunggakan dan laporan kewangan berpunca daripada ledger/assessment yang sama; kredit tidak menyebabkan suspension palsu.
- Baki dana pada tarikh cutover menyamai sumber bank yang disahkan; laporan tunai menggunakan tarikh pembayaran.
- Dua request serentak menghasilkan satu keputusan review, satu event tuntutan dan satu ahli baru.
- Tuntutan belum dibayar tidak ditolak daripada tunai; pengecualian polisi mempunyai alasan/pelulus.
- Orang selain wakil tidak boleh mengaktifkan akaun hanya dengan username+password default.
- Import tidak menggabungkan dua orang bernama sama; jumlah dan baris ditolak boleh dijejak.
- Restore dapat mengembalikan keluarga, transaksi, bukti dan audit di persekitaran berasingan.

Keputusan keluarga yang masih perlu diformalkan: bilakah perubahan bilangan ahli berkuat kuasa, polisi kredit/lebihan bayar, kelayakan warded kritikal/ulang tuntutan, pengecualian tunggakan, cara pengesahan wakil dan siapa berkuasa meluluskan pembayaran.
