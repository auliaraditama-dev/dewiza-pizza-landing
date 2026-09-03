# Pengelolaan Data Dewiza Pizza & Cafe

## Data Menu

Menu resmi cafe berada di `assets/data/menu.json`.

Contoh struktur satu menu:

```json
{
  "id": "id-menu",
  "name": "Nama Menu",
  "category": "pizza",
  "price": 50000,
  "description": "Deskripsi menu",
  "image": "assets/menu/nama-file.webp",
  "available": true,
  "badge": "",
  "tags": [],
  "allergens": [],
  "calories": null,
  "spicyLevel": 0,
  "featured": false
}
```

Yang wajib diisi:
- `id`
- `name`
- `category`
- `price`

Gunakan ID yang unik dan jangan mengganti ID menu yang sudah dipakai pelanggan kecuali memang diperlukan.

## Status Menu

`available: true` berarti menu dapat dipesan.

`available: false` berarti menu tetap dapat ditampilkan tetapi tidak dapat dimasukkan ke keranjang.

Gunakan status ini ketika stok sementara habis tanpa perlu menghapus menu dari katalog.

## Informasi Toko

Data utama cafe berada di `assets/data/site.json`.

Bagian yang dapat dikelola mencakup:
- identitas cafe;
- nomor WhatsApp;
- Instagram;
- alamat;
- map;
- jam buka;
- kategori;
- jenis pesanan;
- biaya layanan;
- voucher;
- promo;
- ulasan;
- pengumuman;
- pengaturan order.

## Jam Operasional

Jam operasional digunakan untuk:
- menampilkan informasi jam buka;
- menentukan status Buka/Tutup;
- validasi scheduled order;
- membatasi checkout di luar jam buka jika cafe mengaktifkannya.

Pastikan timezone toko menggunakan wilayah yang benar, misalnya `Asia/Jakarta`.

## Jenis Pesanan

Setiap layanan dapat memiliki:
- nama layanan;
- label detail;
- placeholder pengisian;
- kewajiban mengisi detail;
- biaya layanan.

Contoh:

```json
{
  "id": "delivery",
  "label": "Delivery",
  "detailLabel": "Alamat pengiriman",
  "detailPlaceholder": "Masukkan alamat pengiriman lengkap",
  "required": true,
  "fee": 0
}
```

## Voucher

Voucher hanya berlaku jika dibuat di data toko.

Contoh:

```json
{
  "code": "KODE",
  "type": "percent",
  "value": 10,
  "minOrder": 50000,
  "maxDiscount": 20000,
  "expiresAt": "2026-12-31T23:59:59+07:00",
  "active": true
}
```

Gunakan:
- `fixed` untuk diskon nominal;
- `percent` untuk diskon persentase.

## Promo

Promo hanya ditampilkan jika ada data promo aktif. Jika promo kosong, website tidak membuat promo contoh.

## Ulasan

Ulasan hanya ditampilkan jika cafe mengisinya. Jika data ulasan kosong, bagian ulasan tidak ditampilkan.

## Pengumuman

Pengumuman cocok untuk informasi seperti:
- perubahan jam buka;
- menu baru;
- layanan delivery sedang tidak tersedia;
- informasi hari libur;
- informasi event cafe.

Jika tidak ada pengumuman, biarkan array pengumuman kosong.

## Pengaturan Pesanan

Cafe dapat mengatur antara lain:
- batas jumlah per menu;
- fitur riwayat terakhir dilihat;
- filter lanjutan katalog;
- suggestion pencarian;
- jadwal pesanan;
- minimum pembelian;
- pembatasan order ketika cafe tutup;
- share ringkasan pesanan.

Aktifkan hanya fitur yang sesuai dengan alur operasional cafe.

## Foto Menu

Simpan foto menu pada folder asset menu dan gunakan nama file yang konsisten.

Disarankan:
- foto tajam dan terang;
- rasio seragam antar menu;
- file berukuran efisien;
- format WebP jika memungkinkan.

## Prinsip Data Resmi

Website tidak membuat menu, promo, voucher, ulasan, atau pengumuman contoh secara otomatis.

Semua informasi yang dilihat pelanggan harus berasal dari data resmi Dewiza Pizza & Cafe.
