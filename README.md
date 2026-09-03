# Dewiza Pizza & Cafe

Website resmi katalog dan pemesanan digital Dewiza Pizza & Cafe untuk digunakan langsung oleh pelanggan dan operasional cafe.

Website ini menampilkan menu, informasi toko, promo, ulasan, jam operasional, keranjang belanja, voucher, serta pemesanan melalui WhatsApp. Tampilan sudah responsif untuk HP, tablet, laptop, dan perangkat kasir/cafe.

## Fitur Pelanggan

### Beranda Toko
- Menampilkan identitas Dewiza Pizza & Cafe.
- Hero/banner toko.
- Status buka atau tutup berdasarkan jam operasional.
- Informasi promo dan pengumuman toko jika tersedia.
- Menu pilihan dari data menu aktif.
- Ulasan pelanggan jika tersedia.
- Informasi alamat, kontak, Instagram, WhatsApp, dan lokasi.

### Katalog Menu
- Menampilkan seluruh menu Dewiza Pizza & Cafe.
- Pencarian menu secara langsung.
- Saran pencarian otomatis.
- Filter berdasarkan kategori.
- Filter menu tersedia.
- Filter rentang harga.
- Urutkan berdasarkan nama dan harga.
- Pagination untuk katalog berisi banyak produk.
- Detail menu melalui quick view.
- Informasi harga, deskripsi, kategori, badge, tag, alergen, kalori, dan level pedas jika tersedia.
- Menu yang sedang habis tetap dapat ditampilkan tetapi tidak bisa dimasukkan ke keranjang.
- Link kategori atau produk tertentu dapat dibagikan langsung.

### Favorit dan Riwayat
- Pelanggan dapat menyimpan menu favorit.
- Favorit tetap tersimpan pada perangkat pelanggan.
- Riwayat menu yang terakhir dilihat dapat ditampilkan.
- Riwayat dapat dihapus kapan saja.

### Keranjang Pesanan
- Tambah menu ke keranjang.
- Tambah atau kurangi jumlah pesanan.
- Batas jumlah per produk mengikuti pengaturan toko.
- Menampilkan subtotal, voucher, biaya layanan/pengantaran jika ada, dan total akhir.
- Produk yang sudah tidak tersedia akan dibersihkan dari keranjang secara aman.
- Isi keranjang tetap tersimpan pada perangkat pelanggan.
- Ringkasan pesanan dapat disalin atau dibagikan.

### Jenis Pesanan
Jenis pesanan mengikuti layanan yang diaktifkan toko, misalnya:
- Dine In.
- Take Away.
- Delivery.

Setiap jenis pesanan dapat memiliki:
- Keterangan tambahan.
- Alamat atau nomor meja.
- Biaya layanan.
- Persyaratan pengisian data.

### Pemesanan WhatsApp
- Pelanggan mengisi nama pemesan jika diaktifkan.
- Pelanggan dapat menambahkan catatan pesanan.
- Validasi pesanan dilakukan sebelum WhatsApp dibuka.
- Pesanan memiliki nomor referensi otomatis.
- Rincian menu, jumlah, subtotal, voucher, biaya, total, jenis pesanan, dan detail pelanggan dimasukkan ke pesan WhatsApp.
- Nomor WhatsApp tujuan berasal dari data resmi toko.
- Pesanan tidak dapat dilanjutkan jika data penting belum lengkap.

### Jadwal Pesanan
Jika fitur jadwal diaktifkan oleh cafe:
- Pelanggan dapat memilih tanggal dan waktu pesanan.
- Jadwal mengikuti jam operasional toko.
- Cafe dapat menentukan waktu minimum pemesanan sebelum jadwal.
- Cafe dapat menentukan batas maksimal hari pemesanan ke depan.

### Voucher dan Promo
- Voucher hanya muncul dan berlaku jika dibuat oleh toko.
- Mendukung potongan nominal atau persentase.
- Dapat memiliki minimum pembelian.
- Dapat memiliki maksimum potongan.
- Dapat memiliki masa berlaku.
- Voucher yang tidak aktif atau sudah kedaluwarsa tidak dapat digunakan.

## Fitur Operasional Cafe

### Pengelolaan Menu
Seluruh menu disimpan pada `assets/data/menu.json`.

Data menu dapat mencakup:
- Nama menu.
- Kategori.
- Harga.
- Deskripsi.
- Foto.
- Status tersedia/habis.
- Badge.
- Tag.
- Informasi alergen.
- Kalori.
- Level pedas.
- Status menu unggulan.

Project tidak membuat menu contoh secara otomatis. Jika belum ada menu, katalog menampilkan kondisi kosong tanpa data palsu.

### Pengelolaan Informasi Toko
Informasi toko disimpan pada `assets/data/site.json`, termasuk:
- Nama Dewiza Pizza & Cafe.
- Logo dan foto utama.
- Nomor WhatsApp.
- Instagram.
- Alamat.
- Lokasi/map.
- Jam operasional.
- Kategori menu.
- Jenis pesanan.
- Biaya layanan.
- Voucher.
- Promo.
- Ulasan.
- Pengumuman.
- Pengaturan pemesanan.

### Jam Operasional
- Website dapat menampilkan status Buka/Tutup secara otomatis.
- Jam operasional digunakan untuk informasi pelanggan dan validasi pesanan.
- Cafe dapat memilih apakah pesanan tetap diperbolehkan ketika toko tutup.
- Scheduled order dapat tetap digunakan jika diaktifkan dan jadwalnya valid.

### Informasi Ketersediaan Menu
- Menu tersedia dapat langsung dipesan.
- Menu habis dapat tetap terlihat sebagai informasi pelanggan.
- Menu habis tidak dapat dimasukkan ke keranjang.
- Status ketersediaan dapat diubah pada data menu tanpa mengubah tampilan website.

## Aplikasi Cafe / PWA

Website dapat dipasang ke layar utama perangkat yang mendukung instalasi web app.

Fitur aplikasi:
- Tampilan seperti aplikasi mandiri.
- Shortcut langsung ke Menu.
- Shortcut langsung ke Keranjang.
- Notifikasi jika versi website baru tersedia.
- Katalog terakhir tetap dapat dibuka ketika koneksi terganggu.
- Gambar menu yang pernah dimuat dapat tersedia saat offline.
- Indikator offline tampil ketika perangkat kehilangan koneksi.

## Tampilan dan Kenyamanan Pelanggan

- Responsif untuk mobile, tablet, desktop, dan perangkat cafe.
- Bottom navigation tetap di bawah layar pada mobile.
- Header mobile berisi Theme, Install, dan Cart.
- Dark mode dan light mode.
- Skeleton loading saat katalog sedang dibaca.
- Empty state ketika belum ada menu atau hasil filter kosong.
- Retry jika katalog gagal dimuat.
- Toast untuk informasi tindakan pelanggan.
- Tombol kembali ke atas.
- Safe-area untuk perangkat iPhone.

## Aksesibilitas

Website dirancang agar lebih mudah digunakan melalui sentuhan maupun keyboard:
- Fokus keyboard yang jelas.
- Navigasi aktif yang terbaca pembaca layar.
- Modal dan keranjang menjaga fokus di dalam panel aktif.
- Tombol Escape menutup modal atau keranjang.
- Pencarian dapat diakses cepat melalui keyboard.
- Dukungan reduced motion.
- Informasi hasil, jaringan, dan notifikasi dapat diumumkan ke pembaca layar.

## Informasi Pencarian Google dan Media Sosial

Website memiliki metadata yang membantu halaman Dewiza Pizza & Cafe tampil lebih baik ketika ditemukan atau dibagikan:
- Judul dan deskripsi halaman.
- Informasi restoran.
- Informasi menu dan kategori.
- Jam operasional.
- Informasi produk tertentu saat link menu dibagikan.
- Preview untuk media sosial.
- Sitemap dan robots.

## Data Kosong Tetap Aman

Website tidak membuat data contoh otomatis.

Jika toko belum mengisi data tertentu:
- Menu kosong menampilkan empty state.
- Promo kosong tidak menampilkan bagian promo.
- Ulasan kosong tidak menampilkan bagian ulasan.
- Voucher kosong tidak membuat voucher otomatis.
- Pengumuman kosong tidak menampilkan banner.

Dengan demikian, hanya data resmi Dewiza Pizza & Cafe yang tampil kepada pelanggan.

## Dokumen Operasional

- `docs/FITUR_TOKO.md` — ringkasan seluruh fitur yang tersedia untuk pelanggan dan cafe.
- `docs/PENGELOLAAN_DATA_TOKO.md` — panduan mengisi menu, jam buka, layanan, voucher, promo, ulasan, dan pengaturan toko.
- `docs/OPERASIONAL_CAFE.md` — panduan penggunaan website dalam kegiatan cafe sehari-hari.
