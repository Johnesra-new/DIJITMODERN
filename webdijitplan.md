# PRD-1 — Web Platform Admin & Guru
**Sistem Ujian Digital Anti-Contek**
Versi 1.0 | Status: Draft | Terakhir diperbarui: Mei 2026

---

## 1. Ringkasan Produk

Web platform ini adalah pusat kendali utama seluruh ekosistem ujian digital. Digunakan oleh administrator instansi dan guru mata pelajaran untuk membuat soal, mengelola ujian, memantau siswa secara real-time, dan mengakses rekap nilai. Platform ini juga menyediakan satu halaman login terpadu untuk guru dan siswa — namun siswa yang login melalui web tidak dapat mengerjakan ujian (hanya melalui APK Android atau aplikasi Windows).

### 1.1 Tujuan

- Menyediakan dasbor lengkap bagi admin instansi untuk mengelola seluruh operasi ujian
- Memberikan guru kemampuan membuat soal teks, gambar, dan video tanpa keahlian teknis
- Memungkinkan pemantauan kamera siswa secara live selama ujian berlangsung
- Menghasilkan rekap nilai otomatis yang dapat diunduh ke Excel atau tersinkron ke Google Sheets

### 1.2 Pengguna

| Peran | Akses | Catatan |
|---|---|---|
| Admin instansi | Semua fitur | Buat kode instansi, kelola guru dan siswa |
| Guru mata pelajaran | Fitur sesuai mapel masing-masing | Buat soal, atur token, pantau ujian |
| Siswa (via web) | Hanya lihat profil & jadwal | Tidak bisa mengerjakan ujian |

---

## 2. Kode Instansi

### 2.1 Definisi

Kode instansi adalah identitas unik setiap lembaga (sekolah, kampus, lembaga kursus) yang menggunakan platform ini. Kode ini digunakan oleh aplikasi Android untuk menemukan server/data instansi yang tepat. Aplikasi Windows tidak memerlukan kode instansi karena sudah terintegrasi langsung ke web.

### 2.2 Format

```
[TIPE]-[KOTA]-[KODE_UNIK]
Contoh: SMA-MKS-X7K2
        SMK-JKT-PQ91
        UNIV-SBY-MN34
```

### 2.3 Proses Pembuatan

1. Admin mendaftar instansi baru melalui halaman registrasi publik
2. Sistem generate kode instansi otomatis berdasarkan tipe dan kota
3. Admin menerima email konfirmasi berisi kode instansi
4. Kode instansi dapat di-reset oleh super admin jika terjadi kebocoran

### 2.4 Aturan

- Satu kode instansi untuk satu lembaga
- Kode tidak bisa sama antar instansi (globally unique)
- Berlaku selamanya selama akun aktif
- Dapat dinonaktifkan sementara oleh admin instansi

---

## 3. Halaman Login Terpadu

### 3.1 Alur Login

```
Halaman utama
    └── Tombol "Masuk"
         └── Form login (username + password)
              ├── Jika guru/admin → redirect ke dashboard guru/admin
              └── Jika siswa → redirect ke halaman profil siswa
                   └── Banner: "Ujian hanya dapat dikerjakan melalui APK/Aplikasi Windows"
```

### 3.2 Spesifikasi Form Login

- Field: Username (NIP/NIS/email) + Password
- Tombol: "Masuk" + "Lupa Password"
- Tidak ada pemisahan form antara guru dan siswa — sistem mendeteksi peran dari database
- Proteksi: rate limiting 5x gagal → CAPTCHA muncul; 10x gagal → akun terkunci 30 menit
- Session timeout: guru 8 jam, siswa (web) 2 jam

### 3.3 Halaman Siswa (Jika Login via Web)

- Tampilkan: nama siswa, kelas, jadwal ujian yang akan datang, riwayat nilai
- Tampilkan banner peringatan permanen: "Untuk mengerjakan ujian, gunakan APK Android atau Aplikasi Windows"
- Semua tombol "Mulai Ujian" dinonaktifkan (disabled, bukan disembunyikan)

---

## 4. Dashboard Admin Instansi

### 4.1 Ringkasan Fitur

```
Dashboard Admin
├── Statistik instansi (total guru, siswa, ujian aktif, ujian selesai)
├── Manajemen guru
│   ├── Tambah / edit / nonaktifkan akun guru
│   ├── Assign mata pelajaran ke guru
│   └── Reset password guru
├── Manajemen siswa
│   ├── Import siswa massal via CSV/Excel
│   ├── Edit data siswa
│   └── Nonaktifkan akun siswa
├── Manajemen kelas
│   ├── Buat kelas baru
│   ├── Assign siswa ke kelas
│   └── Assign guru ke kelas
├── Pengaturan instansi
│   ├── Nama instansi, logo, alamat
│   ├── Lihat & salin kode instansi
│   └── Atur zona waktu
└── Log aktivitas
    ├── Riwayat login semua pengguna
    ├── Log ujian yang berjalan
    └── Log ekspor data
```

### 4.2 Import Siswa Massal

- Format file: CSV atau Excel (.xlsx)
- Kolom wajib: Nama, NIS, Kelas, Email (opsional)
- Sistem validasi otomatis: duplikat NIS, format tidak valid
- Preview data sebelum konfirmasi import
- Setelah import: sistem auto-generate password acak, kirim via email atau unduh PDF daftar password

---

## 5. Dashboard Guru Mata Pelajaran

### 5.1 Struktur Dasbor Guru

```
Dashboard Guru
├── Ringkasan (ujian aktif hari ini, total soal bank, rata-rata nilai terakhir)
├── Bank Soal
│   ├── Buat soal baru
│   ├── Edit / hapus soal
│   ├── Filter per topik / tingkat kesulitan
│   └── Import soal dari file Word/Excel
├── Manajemen Ujian
│   ├── Buat ujian baru
│   ├── Edit ujian (soal, durasi, jadwal)
│   ├── Generate token ujian
│   └── Arsip ujian lama
├── Monitor Ujian Live
│   ├── Daftar siswa yang sedang mengerjakan
│   ├── Feed kamera siswa (grid view)
│   ├── Status per siswa (mengerjakan / selesai / terputus)
│   └── Log pelanggaran (keluar layar, ganti aplikasi, dll.)
└── Rekap Nilai
    ├── Tabel nilai per ujian
    ├── Statistik (rata-rata, tertinggi, terendah, distribusi)
    ├── Export Excel (.xlsx)
    └── Sync ke Google Sheets
```

---

## 6. Modul Pembuatan Soal

### 6.1 Tipe Soal yang Didukung

| Tipe | Deskripsi | Format Jawaban |
|---|---|---|
| Pilihan ganda | 4 pilihan (A/B/C/D), 1 jawaban benar | Radio button |
| Pilihan ganda kompleks | 4 pilihan, bisa lebih dari 1 jawaban benar | Checkbox |
| Benar/Salah | Pernyataan, siswa pilih Benar atau Salah | Toggle |
| Soal berbasis video | Putar video, lalu pilihan ganda muncul setelah video selesai | Radio button |
| Soal berbasis gambar | Gambar sebagai bagian soal | Radio button |

### 6.2 Editor Soal

- Editor teks rich-text (bold, italic, subscript, superscript untuk formula matematika)
- Upload gambar: format JPG, PNG, WEBP, maks 5MB per gambar
- Upload video soal:
  - Format: MP4, WEBM
  - Ukuran maks: 500MB per video
  - Pilihan: upload langsung atau embed link YouTube/Google Drive
  - Opsi: video hanya bisa diputar 1x atau bisa diulang (diatur guru)
  - Opsi: pilihan jawaban muncul setelah video selesai / langsung tampil
- Tingkat kesulitan: Mudah / Sedang / Sulit
- Tag topik: guru bisa buat tag sendiri (contoh: "Bab 3", "Trigonometri", "UTS")
- Bobot nilai per soal (default semua sama, bisa dikustomisasi)

### 6.3 Kunci Jawaban

- Guru menandai jawaban benar saat membuat soal
- Kunci jawaban disimpan terenkripsi di database — tidak pernah dikirim ke client/APK
- Guru dapat mengubah kunci jawaban setelah ujian selesai (untuk re-grading)
- Sistem otomatis hitung ulang nilai jika kunci diubah

### 6.4 Pengacakan Soal

- Opsi acak urutan soal (per siswa dapat urutan berbeda)
- Opsi acak urutan pilihan jawaban (A/B/C/D diacak per siswa)
- Seed pengacakan disimpan per sesi ujian siswa (untuk audit jika diperlukan)

---

## 7. Manajemen Ujian

### 7.1 Pengaturan Ujian

```
Konfigurasi Ujian:
├── Informasi dasar
│   ├── Judul ujian
│   ├── Mata pelajaran
│   ├── Kelas / kelompok yang boleh mengikuti
│   └── Deskripsi / instruksi ujian
├── Waktu
│   ├── Tanggal dan jam mulai
│   ├── Tanggal dan jam berakhir (window waktu akses)
│   └── Durasi pengerjaan (menit)
├── Soal
│   ├── Pilih soal dari bank soal
│   ├── Atau: buat soal baru langsung
│   ├── Jumlah soal yang tampil (bisa lebih sedikit dari bank)
│   └── Pengaturan acak soal & jawaban
├── Keamanan
│   ├── Aktifkan token ujian (on/off)
│   ├── Wajib kamera (on/off)
│   ├── Izinkan kalkulator on-screen (on/off)
│   └── Tampilkan jawaban benar setelah submit (on/off)
└── Nilai
    ├── Nilai minimum lulus
    ├── Rumus: standar / ada pengurangan salah
    └── Bobot soal: sama rata / kustom per soal
```

### 7.2 Token Ujian

- Setiap ujian memiliki token unik 6 karakter (huruf kapital + angka, contoh: `UJI-7K2`)
- Token dibuat oleh guru mata pelajaran masing-masing — tidak bisa dibuat oleh guru lain
- Token dapat di-refresh kapan saja oleh guru yang bersangkutan
- Token aktif hanya selama window waktu ujian berlangsung
- Siswa wajib memasukkan token di APK/Windows sebelum ujian dimulai

### 7.3 Jadwal & Status Ujian

| Status | Kondisi |
|---|---|
| Draft | Baru dibuat, belum dijadwalkan |
| Terjadwal | Sudah ada jadwal, belum waktunya |
| Berlangsung | Dalam window waktu aktif |
| Selesai | Sudah melewati waktu berakhir |
| Diarsipkan | Disimpan untuk referensi |

---

## 8. Monitor Ujian Live

### 8.1 Feed Kamera Siswa

- Tampilkan thumbnail live kamera setiap siswa dalam grid (4x4 atau 6x6)
- Klik thumbnail → buka full-screen kamera siswa tersebut
- Indikator status di pojok tiap tile: hijau (aktif), kuning (tidak ada gerakan), merah (pelanggaran terdeteksi)
- Rekaman kamera disimpan di server (format pendek, snapshot per 10 detik) untuk audit pasca ujian

### 8.2 Deteksi Pelanggaran Otomatis

| Pelanggaran | Tindakan Sistem |
|---|---|
| Keluar aplikasi / ganti tab | Catat log + notifikasi guru |
| Wajah tidak terdeteksi > 10 detik | Catat log + notifikasi guru |
| Lebih dari 1 wajah terdeteksi | Catat log + notifikasi guru + flag merah |
| Koneksi terputus > 60 detik | Ujian dipause otomatis |

### 8.3 Tindakan Guru

- Kirim pesan teks ke siswa tertentu (muncul sebagai notifikasi di layar ujian siswa)
- Force-submit ujian siswa tertentu (jika terjadi kecurangan parah)
- Tambah waktu ujian untuk siswa tertentu (misal: kendala teknis)
- Kunci / blokir akses siswa tertentu

---

## 9. Rekap Nilai & Export

### 9.1 Tampilan Rekap

- Tabel: No Absen | Nama | Kelas | Nilai | Jumlah Benar | Waktu Submit | Status (Lulus/Remedial)
- Sortir per kolom
- Filter per kelas
- Statistik otomatis: rata-rata, nilai tertinggi, nilai terendah, distribusi nilai (grafik batang)

### 9.2 Export Excel

- Klik "Download Excel" → file .xlsx terunduh langsung
- Sheet 1: Rekap nilai semua siswa
- Sheet 2: Detail jawaban per soal (soal mana yang paling banyak salah)
- Sheet 3: Log pelanggaran per siswa
- Format nama file: `Nilai_[MapelF]_[Kelas]_[Tanggal].xlsx`

### 9.3 Sync Google Sheets

- Guru hubungkan akun Google sekali di pengaturan profil
- Setiap siswa submit → baris baru otomatis muncul di Google Sheets guru
- Sheets dapat dibagikan ke kepala sekolah secara real-time

---

## 10. Teknologi yang Digunakan

| Komponen | Teknologi | Biaya |
|---|---|---|
| Framework frontend | React.js + Tailwind CSS | Gratis |
| Backend / API | Node.js + Express | Gratis |
| Database | Supabase (PostgreSQL) | Gratis s.d. 500MB |
| Hosting server | Railway atau Render | Gratis (free tier) |
| Hosting frontend | Vercel | Gratis |
| Video storage | Supabase Storage / Cloudflare R2 | Gratis s.d. 10GB |
| Auth | Supabase Auth + JWT | Gratis |
| Export Excel | SheetJS (xlsx) | Gratis (open source) |
| Google Sheets sync | Google Sheets API v4 | Gratis |
| Kamera live | WebRTC (browser native) | Gratis |
| Enkripsi | bcrypt (password) + AES-256 (kunci jawaban) | Gratis |

---

## 11. Keamanan & Privasi

- Semua komunikasi wajib HTTPS (TLS 1.3)
- Kunci jawaban tidak pernah dikirim ke client dalam bentuk apapun
- Password di-hash dengan bcrypt (cost factor 12)
- Data rekaman kamera disimpan terenkripsi, hanya bisa diakses guru dan admin instansi
- Rekaman kamera dihapus otomatis setelah 30 hari (konfigurabel oleh admin)
- Log aktivitas disimpan 1 tahun

---

## 12. Catatan Integrasi Lintas Platform

- Web adalah sumber kebenaran (source of truth) untuk semua data: soal, nilai, kunci jawaban
- APK Android terhubung ke web via REST API — tidak menyimpan soal di lokal
- Aplikasi Windows membuka sesi browser terkunci yang mengarah ke web yang sama
- Token ujian dan kode instansi adalah titik penghubung antara ketiga platform

---

*Dokumen ini adalah bagian dari seri 3 PRD. Lihat juga: PRD-2 (APK Android) dan PRD-3 (Aplikasi Windows).*