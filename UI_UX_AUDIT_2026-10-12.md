# Audit UI/UX, layout, design dan tema warna MyKhairat

Tarikh: 12 Oktober 2026. Sasaran utama: wakil keluarga warga emas di telefon; AJK di desktop dan telefon.

## Skop dan keputusan

Audit ini berasaskan kod komponen, halaman, borang, Tailwind tokens dan pengiraan contrast sRGB. Tiada browser/screenshot, ujian viewport sebenar, keyboard, screen reader atau sesi bersama pengguna dilakukan. Dapatan yang memerlukan pemerhatian visual ditandakan sebagai risiko untuk disahkan. Ini bukan pensijilan WCAG.

**Keputusan:** responsive shell untuk admin dan wakil sudah ada. Masalah utama ialah kebolehbacaan, bahasa, kejelasan langkah bayaran serta konsistensi tindakan. Arah reka bentuk sesuai ialah tenang, jelas, berorientasikan keluarga: satu warna tindakan utama, teks kuat, status bermakna dan borang pendek.

## Apa yang sudah baik

- Sidebar desktop dan bottom navigation mobile dikongsi oleh admin/wakil.
- Kebanyakan grid bertukar mengikut breakpoint; jadual laporan mempunyai horizontal scrolling.
- Status mempunyai teks selain warna, membantu apabila warna sukar dibezakan.
- Password visibility mempunyai nama accessible dan aria-pressed.
- Borang import mempunyai preview, role=alert dan role=status.
- Resit dan maklumat bayaran boleh diperiksa bersama dalam aliran admin.

## Dapatan

### U01 — P1: contrast warna tindakan tidak cukup untuk teks biasa

Bukti: [theme](C:/Users/User/Desktop/MyKhairat/tailwind.config.ts), [Button](C:/Users/User/Desktop/MyKhairat/components/ui.tsx), [shell](C:/Users/User/Desktop/MyKhairat/components/shells.tsx).

- Putih / biru #007BFF = **3.979:1**.
- Putih / hijau #28A745 = **3.133:1**.
- Slate400 #94A3B8 / putih = **2.564:1**; / slate50 = **2.451:1**.
- Slate500 #64748B / putih = **4.759:1**.

Button biasa text-sm (14px) memerlukan sekurang-kurangnya 4.5:1. Biru sebagai teks link atas putih mempunyai ratio yang sama. Bottom nav inactive text-slate-400 juga bermasalah. Teks besar pada sesetengah kad boleh menggunakan threshold 3:1; jangan menganggap semua penggunaan biru/hijau gagal. Logo mempunyai pengecualian berbeza.

Cadangan: primary #1D4ED8 (putih = **6.702:1**), success #15803D (putih = **5.016:1**), teks biasa #0F172A dan secondary #475569. Pale backgrounds boleh dikekalkan dengan teks gelap. Ratio dikira daripada pasangan warna kod tanpa opacity; bukan sampling screenshot. [WCAG contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

### U02 — P2: teks terlalu kecil dan bahasa bercampur

Bukti: [globals](C:/Users/User/Desktop/MyKhairat/app/globals.css), [shell](C:/Users/User/Desktop/MyKhairat/components/shells.tsx), [login](C:/Users/User/Desktop/MyKhairat/app/login/page.tsx), [layout](C:/Users/User/Desktop/MyKhairat/app/layout.tsx).

Nav 11px, metadata/status 12px, label/borang 14px. English seperti Ledger, Dependents, Suspended bercampur BM; html lang=en. Password visibility BM tetapi button Log In English.

Cadangan: BM konsisten, body/input 16px, metadata utama 14px, tajuk 24–32px. Input 16px juga mengurangkan risiko auto-zoom pada Safari iPhone; tingkah laku perlu disahkan pada peranti. Gunakan “Ahli keluarga”, “Rekod bayaran”, “Penyata”, “Menunggu semakan”, “Keahlian digantung”. Ini sasaran usability, bukan dakwaan 14px sendiri melanggar WCAG.

### U03 — P1: CTA bayaran tidak membezakan sudah bayar, sebahagian dan tertunggak

Bukti: [home](C:/Users/User/Desktop/MyKhairat/app/app/page.tsx), [payment page](C:/Users/User/Desktop/MyKhairat/app/app/payment/page.tsx), [payment form](C:/Users/User/Desktop/MyKhairat/app/app/payment/payment-form.tsx).

Home sentiasa menunjukkan jumlah monthlyDues dan “Bayar bulan ini” tanpa merujuk outstanding bulan itu. Dropdown menerima semua bulan, termasuk Paid/Pending. Form menggunakan outstanding || dues, jadi outstanding=0 ditukar kepada caruman penuh. Wakil boleh terdorong membayar semula bulan selesai. Warning membandingkan amount dengan dues semasa, bukan assessment/outstanding bulan dipilih.

Cadangan: home menunjukkan “Bulan ini sudah selesai” / “Baki bulan ini RM…”; pilihan hanya bulan yang sesuai, Pending dilabel/dikunci; amount menggunakan baki assessment dipilih dan RM0 kekal RM0. Bezakan “Hantar bukti bayaran” daripada pembayaran bank sebenar. Kawalan backend tetap perlu menjaga ulang transaksi.

### U04 — P2: QR kurang jelas untuk bayaran menggunakan telefon yang sama

Bukti: [payment form](C:/Users/User/Desktop/MyKhairat/app/app/payment/payment-form.tsx).

Arahan “Scan this code” menganggap ada kamera/peranti kedua. Tiada tindakan simpan QR atau salin nombor akaun. QR bercampur arahan upload tanpa urutan jelas.

Cadangan: 1) buka aplikasi bank dan bayar; 2) simpan resit; 3) kembali dan hantar bukti. Tambah “Simpan QR”, “Salin nombor akaun”, jumlah dan penerima. Nyatakan pilihan import QR jika aplikasi bank menyokongnya; jangan menjamin semua bank boleh import imej.

### U05 — P1: sambungan gagal boleh meninggalkan borang dalam keadaan busy

Bukti: [payment form](C:/Users/User/Desktop/MyKhairat/app/app/payment/payment-form.tsx), [review panel](C:/Users/User/Desktop/MyKhairat/app/admin/approvals/[id]/review-panel.tsx).

Login mempunyai try/catch/finally, tetapi payment upload/submit dan approve/reject tiada pengendalian exception menyeluruh. Jika fetch/FileReader gagal, pending/busy boleh kekal true. Ini kesimpulan daripada control flow; tidak diuji dengan gangguan rangkaian dalam audit ini.

Cadangan: try/catch/finally konsisten, mesej BM, retry dan kekalkan input. Jika respons terputus selepas submission, arah pengguna menyemak rekod dahulu; backend idempotency diperlukan untuk retry selamat. Success mesti menyatakan “Bukti diterima, menunggu semakan AJK”.

### U06 — P2: navigasi belum mengikut tugas dan akses keyboard

Bukti: [shell](C:/Users/User/Desktop/MyKhairat/components/shells.tsx).

Admin mobile hanya empat item pertama dan More; Reports/Arrears/Accounts kurang terus kelihatan. Home/Pay/Ledger ialah label abstrak bagi pengguna sasaran. Active link tiada aria-current; menu tiada aria-expanded, dialog semantics, focus trap, Escape atau focus return. Nama accessible butang menu sudah ada; browser default focus tidak semestinya hilang, tetapi focus style komponen tidak konsisten.

Cadangan: wakil “Utama / Bayaran / Keluarga / Rekod / Bantuan”; admin kelompok “Kerja hari ini / Keluarga / Kewangan / Pentadbiran”. Sediakan skip link dan drawer keyboard lengkap. Bantuan AJK perlu mempunyai saluran sebenar, bukan teks “contact admin” sahaja.

### U07 — P2: dashboard wakil mengulang angka dan istilah baki kurang jelas

Bukti: [home](C:/Users/User/Desktop/MyKhairat/app/app/page.tsx).

Monthly Dues muncul pada kad ringkasan dan panel Bayaran bulan ini. Baki awal/semasa tiada penjelasan sama ada hutang/kredit. Family ID menjadi heading paling utama berbanding tindakan dan nama keluarga. Empat kad pada mobile boleh memanjangkan perjalanan sebelum CTA; ini perlu disahkan melalui screenshot.

Cadangan: atas sekali nama keluarga + status, satu panel “Perlu dibayar” dengan pecahan/bulan, satu CTA, kemudian ahli/rekod/manfaat. Baki positif dilabel hutang, negatif kredit berdasarkan semantik ledger yang disahkan; jangan sekadar menukar label tanpa membetulkan kiraan.

### U08 — P2: direktori dan import belum cukup membimbing admin

Bukti: [directory](C:/Users/User/Desktop/MyKhairat/app/admin/families/page.tsx), [import form](C:/Users/User/Desktop/MyKhairat/app/admin/families/import/form.tsx).

Directory menggunakan kad penuh untuk setiap keluarga, tiada empty state bila search tiada hasil, filter status atau pagination UI. Search input tiada label accessible eksplisit. Pada mobile search button tiada padding menegak/min-height, jadi sasaran tap berisiko kecil. Import memaparkan semua mapping dan semua kolum checkbox serentak; long list boleh menyukarkan semakan.

Cadangan: desktop jadual dengan search/status filters; mobile kad padat. “Tiada keluarga ditemui” + reset search. Import langkah Upload → Pemetaan → Preview → Sahkan → Akaun, template dan isu mengikut baris; nombor jumlah sentiasa jelas. Kekalkan preview sebelum commit.

### U09 — P2: label, validation dan status feedback tidak konsisten

Bukti: [login form](C:/Users/User/Desktop/MyKhairat/app/login/login-form.tsx), [review](C:/Users/User/Desktop/MyKhairat/app/admin/approvals/[id]/review-panel.tsx), [payment](C:/Users/User/Desktop/MyKhairat/app/app/payment/payment-form.tsx).

Login/payment/review banyak menggunakan mesej paragraph tanpa role=alert/status. Review rejection textarea hanya placeholder, tiada label. Tiada pola shared aria-invalid/aria-describedby atau fokus ke error. Upload input sr-only tiada focus-within yang menyerlahkan dropzone.

Cadangan: label kekal, bantuan sebelum submit, field error berhubung input, ringkasan error/fokus, status diumumkan. Saiz sasaran mata password sekitar36px daripada CSS: tidak automatik gagal AA24px, tetapi sasaran produk 44–48px lebih selesa untuk warga emas. [WCAG target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### U10 — P2: layout kecil/pendek dan safe area belum dilindungi sepenuhnya

Bukti: [shell](C:/Users/User/Desktop/MyKhairat/components/shells.tsx), [admin](C:/Users/User/Desktop/MyKhairat/app/admin/page.tsx).

Sidebar h-screen dan drawer tiada overflow-y-auto; nav boleh terpotong pada landscape/zoom. Bottom nav fixed tiada safe-area-inset-bottom; main mempunyai pb-24, tetapi tidak mengikut pertambahan safe area. Row approval nama+badge+Review dan direktori panjang tidak sentiasa mempunyai min-w-0/wrap.

Cadangan: shell/sidebar boleh scroll, safe area padding, row stacking pada skrin kecil, nama panjang boleh wrap. Semakan sebenar pada320/375/768/1440px, landscape dan zoom200% diperlukan; overflow belum dibuktikan secara visual.

### U11 — P3: tema warna dan surface belum menjadi sistem semantik

Bukti: [theme](C:/Users/User/Desktop/MyKhairat/tailwind.config.ts), [globals](C:/Users/User/Desktop/MyKhairat/app/globals.css), [UI](C:/Users/User/Desktop/MyKhairat/components/ui.tsx).

Biru/hijau terang digunakan untuk brand, CTA, angka dan chart; nilai hover hardcoded. Banyak kad mempunyai radius24px+shadow yang sama; background hexagon berulang. Ini pemerhatian kod dan pertimbangan reka bentuk, bukan defect accessibility sendiri.

Cadangan: tokens primary/success/warning/danger/text/surface/border/focus; primary biru gelap, hijau untuk status berjaya, latar plain. Radius12–16px pada panel dan10–12px controls, sempadan ringan dan shadow hanya pada layer terapung. Logo boleh mengekalkan identiti asal jika dikehendaki. Dark mode bukan keutamaan untuk pengguna ini.

### U12 — P3: chart dan angka memerlukan konteks

Bukti: [chart](C:/Users/User/Desktop/MyKhairat/components/collection-chart.tsx), [reports](C:/Users/User/Desktop/MyKhairat/app/admin/reports/page.tsx).

Chart mempunyai legend tetapi Y-axis tidak menyatakan RM; tooltip memulangkan nama series kosong. Teks tick12px. Jadual alternatif sudah ada dan merupakan asas yang baik. Tanda positif/negatif dan period laporan perlu jelas untuk mengelakkan keliru cash balance dengan expected collections.

Cadangan: labels “Jangkaan / Diterima”, unit RM, tooltip dengan bulan+nama series, ringkasan teks dan jadual berkaitan. Ketepatan data sejarah perlu dibaiki dahulu seperti audit kewangan sebelumnya.

## Arah tema yang dicadangkan

- Primary/action: #1D4ED8; hover #1E40AF.
- Success: #15803D; pale background #F0FDF4.
- Warning text: #92400E; background #FFFBEB.
- Danger: #BE123C; background #FFF1F2.
- Main text: #0F172A; secondary: #475569.
- Page: #F8FAFC; surface: #FFFFFF; border: #CBD5E1.
- Font: kekalkan Plus Jakarta Sans; body/input16px, navigation14–16px dan angka penting28–32px. Pilihan teks besar18px untuk wakil.
- Minimum control target produk44px;48px untuk tindakan utama. Ini cadangan produk melebihi sebahagian minimum WCAG.

## Urutan redesign

1. Contrast, BM, jenis teks, form feedback dan pembetulan keadaan bayaran.
2. Dashboard wakil + bayaran tiga langkah + bantuan AJK.
3. Navigasi, keyboard drawer, safe area dan responsive row.
4. Admin directory/import/approval, kemudian reports dan surface tokens.

Kriteria semakan seterusnya: screenshot setiap role/halaman utama pada viewport sasaran; focus keyboard; zoom200%; resit besar/invalid/network lost; bulan Paid/Partial/Pending; nama panjang; data kosong; QR pada telefon sama. Tiada redesign atau deployment dibuat dalam audit ini.
