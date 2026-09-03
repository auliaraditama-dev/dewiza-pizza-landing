# Dewiza Pizza & Cafe — Production Complete v7

Website katalog dan pemesanan statis yang data-driven, responsif, PWA-ready, dan dapat dipasang di GitHub Pages, Vercel, Netlify, atau hosting HTTPS statis lain.

## Menjalankan project

```bash
python -m http.server 8000
```

Buka `http://localhost:8000`.

`fetch()` dipakai untuk membaca JSON, jadi jangan membuka `index.html` langsung dengan `file://`.

## Data utama

- `assets/data/site.json`: identitas usaha, kategori, jam, tipe pesanan, promo, ulasan, voucher, dan settings.
- `assets/data/menu.json`: seluruh produk/menu.

Fresh project tidak membuat produk, promo, ulasan, atau voucher contoh. `menu.json` default adalah `[]`.

## Fitur lengkap

### UI/UX dan responsive
- Header desktop/tablet yang ringkas.
- Bottom navigation mobile fixed di viewport dengan ikon Lucide lokal + label.
- Theme, Install PWA, dan Cart tetap di header atas mobile.
- Safe-area iPhone, breakpoint 1020/820/620/420, dark/light mode, reduced motion.
- Skeleton loading, empty state, retry state, toast, back-to-top.
- Sticky search/sort toolbar dan mobile layout tanpa floating cart duplikat.

### Katalog
- Search realtime + autocomplete dari data menu aktual dengan navigasi keyboard.
- Filter kategori + jumlah item.
- Favorite filter.
- Sorting harga/nama.
- Advanced filter: tersedia saja + harga minimum/maksimum, tersinkron ke URL.
- Pagination.
- Quick view modal.
- Share produk + copy link.
- URL state: `category`, `q`, `sort`, `page`, `item`.
- Reset filter dan share URL katalog aktif.
- Recently viewed tersimpan di `localStorage` + tombol hapus riwayat.
- Metadata produk opsional: tag, alergen, kalori, level pedas, featured.
- Validasi data: item invalid dan ID duplikat diabaikan dengan aman.
- Produk unavailable tetap terlihat tetapi tidak dapat ditambahkan ke cart.


### Informasi operasional
- Status Buka/Tutup dihitung dari `openingHoursMachine` + timezone bisnis.
- Announcement banner berasal dari `announcements`; array kosong tidak menampilkan apa pun.
- Tidak ada konten announcement fallback.

### Favorite dan Cart
- Favorite persistence `localStorage`.
- Cart persistence `localStorage`.
- Quantity control dengan `maxCartQuantity` configurable.
- Cart membersihkan item yang sudah tidak ada/tidak tersedia saat katalog berubah.
- Subtotal, voucher, biaya order type opsional, total.
- Clear cart dan badge quantity.
- Salin/bagikan ringkasan pesanan langsung dari cart.

### Checkout WhatsApp
- Validasi nomor WhatsApp format kode negara.
- Validasi cart, quantity, harga, availability, tipe order, detail/alamat, dan panjang pesan.
- Dine-in / Take Away / Delivery berasal dari JSON.
- Detail order dapat required per tipe.
- Biaya per tipe order opsional melalui `fee`.
- Nama pemesan dan catatan order opsional.
- Draft tipe/detail/nama/catatan/jadwal tersimpan di `localStorage`.
- Scheduled order opsional dan configurable; default nonaktif sampai bisnis mengaktifkannya.
- Referensi order otomatis dimasukkan ke pesan WhatsApp.
- Voucher mendukung `minOrder`, `maxDiscount`, `expiresAt`, fixed/percent dan kode voucher aktif ikut tersimpan pada draft.
- Minimum order dan pemblokiran order di luar jam buka dapat diaktifkan dari settings.

### PWA dan Offline
- Manifest lengkap, icons, standalone mode, shortcuts.
- Shortcut buka Menu dan buka Keranjang.
- Install prompt.
- Install state otomatis disembunyikan ketika app sudah standalone.
- Service Worker versioned cache.
- PWA update banner, update hanya aktif setelah pengguna menekan Perbarui.
- Offline navigation fallback.
- Network-first untuk JSON menu/config.
- Cache katalog terakhir + fallback `localStorage`.
- Cache gambar menu lokal untuk offline.
- Runtime cache memiliki batas entry agar tidak tumbuh tanpa batas.
- Badge offline ketika koneksi terputus.
- Timestamp cache lokal untuk memberi konteks umur katalog terakhir saat offline.

### SEO
- Canonical.
- Description dan robots.
- Open Graph.
- Twitter Card.
- Schema.org Restaurant/Menu/MenuSection/MenuItem + OpeningHoursSpecification + nutrition/keywords opsional.
- SEO dinamis kategori dan deep-link produk.
- `robots.txt` dan `sitemap.xml`.
- 404 GitHub Pages dengan recovery `/menu` ke `menu.html`.

### Accessibility
- Skip link.
- `aria-current` navigation.
- `aria-live` result count/toast/network state.
- Focus trap cart/modal.
- Restore focus.
- Escape close.
- Keyboard `/` untuk fokus ke search dan `C` untuk membuka cart saat tidak sedang mengetik.
- Combobox/listbox ARIA untuk suggestion pencarian.
- Focus-visible dan reduced motion.

## Format menu

```json
{
  "id": "id-unik-dan-stabil",
  "name": "Nama menu",
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

`id`, `name`, `category`, dan `price` wajib valid. ID harus unik dan stabil karena dipakai cart, favorite, recently viewed, SEO, dan deep-link.

## Order type dengan biaya opsional

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

`fee` opsional. Jika tidak ditulis, nilainya dianggap `0`.

## Voucher

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

Semua voucher tetap berasal dari `site.json`. Tidak ada voucher otomatis.

## Settings tambahan

- `maxCartQuantity`
- `enableRecentlyViewed`
- `recentlyViewedLimit`
- `enableKeyboardShortcuts`
- `customerNameMaxLength`
- `orderNoteMaxLength`
- `orderDetailMaxLength`
- `deliveryAddressMinLength`
- `enableAdvancedFilters`
- `enableSearchSuggestions` / `searchSuggestionLimit`
- `enableOrderSchedule` / `orderScheduleLeadMinutes` / `orderScheduleDaysAhead`
- `enableOrderSummaryShare`
- `minimumOrderAmount`
- `blockOrderingWhenClosed`

## Struktur

Lihat `docs/ARCHITECTURE.md` dan `docs/CONFIGURATION.md`.

## Deployment

Gunakan HTTPS untuk PWA. Jika domain final berbeda dari `dewizapizzacafe.com`, ubah URL di `robots.txt` dan `sitemap.xml` sebelum indexing publik.

Setelah mengubah logic cache penting, naikkan `CACHE_VERSION` di `sw.js`. Versi paket ini menggunakan cache production v7.
