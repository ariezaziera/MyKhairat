# MyKhairat — Sistem Dana Kita

Sistem khairat keluarga dengan caruman bulanan per kepala, bantuan kematian dan kemasukan wad kritikal. Aliran utama: wakil hantar resit di WhatsApp → AJK rekod → pelulus semak. Portal wakil disediakan sebagai akses pilihan.

## Teknologi

Next.js App Router · TypeScript · Tailwind CSS · Turso SQLite / libSQL · GitHub · Vercel.

## Modul

- Direktori keluarga/ahli, import Excel/CSV dengan preview dan akaun wakil automatik.
- Resit WhatsApp/manual, kelulusan atomik dan rujukan unik.
- Snapshot caruman bulanan, kredit, tunggakan dan pengesahan sejarah2025.
- Ledger dana, baki bank asal, perbelanjaan/derma/pelarasan dan rekonsiliasi.
- Tuntutan kematian/wad: permohonan, semakan, kelulusan dan bukti payout.
- Kuasa owner/bendahari/pelulus/auditor, wakil ganti dan reset dengan kod pengaktifan.
- IC terenkripsi/tersamar, audit, PDF, backup manual/harian terenkripsi dan restore ke database kosong.
- UI Bahasa Melayu, ilustrasi SVG/CSS3D, reduced motion, teks besar dan layout responsif.

## Jalankan secara lokal

1. npm install
2. Salin .env.example ke .env.local dan tetapkan kunci. Untuk development berasingan, gunakan TURSO_DATABASE_URL=file:local.db; SEED_DEMO=true jika mahu rekod demo.
3. npm run dev

Production menggunakan Turso URL/token, AUTH_SECRET dan DATA_ENCRYPTION_KEY yang stabil. Cron memerlukan CRON_SECRET dan BACKUP_PASSPHRASE. Migrations tambahan berjalan idempotently semasa startup; demo tidak diisi ke Turso remote secara default.

## Operasi

Baca [OPERATIONS.md](./OPERATIONS.md) untuk cutover, pengesahan sejarah, akaun, polisi, backup dan restore. Baca [ONBOARDING.md](./ONBOARDING.md) untuk format import. Keperluan pengguna terkini mengatasi bahagian AppSheet/Google lama dalam PROMPT_SYSTEM.md.

## Semakan

npm run lint · npm run test:rules · npm run test:onboarding (database disposable) · npm run build.
