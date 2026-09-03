# Architecture

## Layer

1. **HTML shell** — `index.html`, `menu.html`, `404.html`, `offline.html`.
2. **Design system / layout** — `css/style.css`.
3. **Navigation module** — `css/navigation.css` + `js/navigation.js`.
4. **Icon module** — `js/icons.js`, subset Lucide lokal agar offline-safe.
5. **Application layer** — `js/main.js`: loading/validasi data, catalog state, suggestion/filter, cart, favorite, recently viewed, order draft, checkout, SEO, status operasional, dan UI PWA.
6. **Data layer** — `assets/data/site.json` dan `assets/data/menu.json`.
7. **Offline layer** — `sw.js` + Cache API + fallback `localStorage`.

## Prinsip data

- Produk tidak dibuat di JavaScript sebagai fallback.
- `menu.json` kosong menghasilkan empty-state.
- Item invalid tidak dirender.
- ID produk wajib unik.
- Promo/testimonial/voucher/announcement kosong otomatis menyembunyikan UI terkait.
- Fitur yang menyangkut kebijakan bisnis, seperti scheduled order, dibuat configurable dan tidak dipaksa aktif.

## Catalog state

State katalog dapat direpresentasikan di URL agar refresh/back-forward/share konsisten. Filter mencakup kategori, pencarian, sorting, halaman, ketersediaan, rentang harga, dan deep-link item.

Autocomplete tidak memiliki database terpisah; suggestion selalu dihitung dari katalog yang sudah tervalidasi.

## Navigation

Mobile bottom navigation merupakan child langsung `<body>` dan memakai `position: fixed; bottom: 0`. Navigation tidak ditempatkan di dalam sticky/backdrop-filter header untuk menghindari containing-block bug pada browser tertentu.

## Persistence

Key utama:
- `dewiza_cart_v2`
- `dewiza_wishlist_v2`
- `dewiza_recently_viewed_v1`
- `dewiza_order_draft_v1`
- `dewiza_menu_cache_v1`
- `dewiza_menu_cache_meta_v1`
- `dewiza_site_cache_v1`
- `dewiza_theme`

State tersimpan dinormalisasi terhadap katalog terbaru sebelum dipakai. Metadata cache menyimpan timestamp untuk menjelaskan umur katalog terakhir ketika offline.

## Checkout

Cart tetap menjadi source of truth. Ringkasan yang disalin/dibagikan dibangun dari cart aktual, fee, voucher, tipe order, dan schedule opsional. Checkout WhatsApp melakukan validasi ulang sebelum membuka URL WhatsApp.

## SEO

Structured data berasal dari data bisnis/menu yang sama dengan UI. Jam operasional machine-readable digunakan untuk `OpeningHoursSpecification`, sementara metadata produk opsional dapat memperkaya `MenuItem`.

## Public diagnostics

`window.DewizaApp.getStatus()` dapat dipakai di DevTools untuk mengecek jumlah menu/cart/favorite, filter aktif, sumber katalog, timestamp cache, dan status koneksi tanpa mengekspos data sensitif.
