# Configuration

Seluruh data bisnis yang dapat berubah berada di `assets/data/site.json`. Produk hanya berasal dari `assets/data/menu.json`; aplikasi tidak membuat produk fallback/dummy.

## `business`

Identitas usaha, logo, hero, WhatsApp, Instagram, alamat, map embed, locale, currency, dan `timeZone` untuk indikator jam buka/tutup. Gunakan timezone IANA, misalnya `Asia/Jakarta`.

## `openingHours`

Teks jam operasional yang tampil di footer.

## `openingHoursMachine`

Data jam operasional machine-readable untuk indikator buka/tutup dan Schema.org. Setiap objek memakai:
- `days`: array angka hari, Minggu `0` sampai Sabtu `6`.
- `open`: jam `HH:MM`.
- `close`: jam `HH:MM`.

## `announcements`

Banner informasi opsional. Jika array kosong, banner tidak dirender. Properti yang didukung:
- `text`
- `url` opsional (`http`/`https`)
- `active` opsional; `false` menyembunyikan item.

## `categories`

Kategori dapat didefinisikan di config. Jika menu memakai kategori valid yang belum terdaftar, UI tetap menampilkannya dengan label hasil normalisasi nama kategori.

## `orderTypes`

Properti:
- `id`
- `label`
- `detailLabel`
- `detailPlaceholder`
- `required`
- `fee` opsional, angka >= 0

## `vouchers`

Properti:
- `code`
- `type`: `fixed` atau `percent`
- `value`
- `minOrder` opsional
- `maxDiscount` opsional
- `expiresAt` opsional, tanggal ISO 8601
- `active`

## `settings`

- `menuPreviewLimit`
- `menuPageSize`
- `enableWishlist`
- `enableOrdering`
- `orderDetailMaxLength`
- `deliveryAddressMinLength`
- `maxCartQuantity`
- `enableRecentlyViewed`
- `recentlyViewedLimit`
- `enableKeyboardShortcuts`
- `customerNameMaxLength`
- `orderNoteMaxLength`
- `enableAdvancedFilters`: filter tersedia + harga pada halaman menu.
- `enableSearchSuggestions`: autocomplete berdasarkan data menu aktual.
- `searchSuggestionLimit`: jumlah maksimum suggestion.
- `enableOrderSchedule`: menampilkan pilihan tanggal/waktu pesanan. Default sebaiknya `false` sampai bisnis memang menerima scheduled order.
- `orderScheduleLeadMinutes`: jeda minimum dari waktu sekarang.
- `orderScheduleDaysAhead`: batas hari maksimum untuk schedule.
- `enableOrderSummaryShare`: tombol salin/bagikan ringkasan cart.
- `minimumOrderAmount`: minimum subtotal sebelum checkout; `0` berarti tidak dibatasi.
- `blockOrderingWhenClosed`: jika `true`, order langsung ditolak di luar jam operasional kecuali memakai scheduled order yang valid.

## `menu.json`

Harus berupa array JSON. Field wajib:
- `id`
- `name`
- `category`
- `price`

Field opsional:
- `description`
- `image`
- `available`
- `badge`
- `tags`: array label pencarian/filter informasi.
- `allergens`: array informasi alergen.
- `calories`: angka >= 0.
- `spicyLevel`: angka 0–5.
- `featured`: boolean.

Item yang tidak memiliki ID/nama/kategori/harga valid akan diabaikan. ID duplikat juga diabaikan.

## URL katalog

Halaman `menu.html` mendukung state yang dapat dibagikan:
- `category`
- `q`
- `sort`
- `page`
- `item`
- `available=1`
- `minPrice`
- `maxPrice`
- `cart=open`
