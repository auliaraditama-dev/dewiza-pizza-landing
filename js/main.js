(() => {
  'use strict';

  const DATA_URLS = {
    site: 'assets/data/site.json',
    menu: 'assets/data/menu.json'
  };

  const STORAGE = {
    theme: 'dewiza_theme',
    cart: 'dewiza_cart_v2',
    wishlist: 'dewiza_wishlist_v2',
    menuCache: 'dewiza_menu_cache_v1',
    siteCache: 'dewiza_site_cache_v1',
    recentlyViewed: 'dewiza_recently_viewed_v1',
    orderDraft: 'dewiza_order_draft_v1',
    menuCacheMeta: 'dewiza_menu_cache_meta_v1'
  };

  const state = {
    config: null,
    menu: [],
    cart: readStorage(STORAGE.cart, readStorage('dewiza_cart', [])),
    wishlist: readStorage(STORAGE.wishlist, readStorage('dewiza_wishlist', [])),
    recentlyViewed: readStorage(STORAGE.recentlyViewed, []),
    orderDraft: readStorage(STORAGE.orderDraft, {}),
    activeCategory: 'all',
    searchQuery: '',
    sort: 'default',
    availableOnly: false,
    minPrice: null,
    maxPrice: null,
    currentPage: 1,
    orderType: '',
    appliedVoucher: null,
    deferredPrompt: null,
    swRegistration: null,
    swRefreshing: false,
    swUpdateRequested: false,
    lastFocusCart: null,
    lastFocusModal: null,
    page: document.body.dataset.page || 'home',
    dataWarnings: [],
    menuSource: 'network',
    menuCacheSavedAt: Number(readStorage(STORAGE.menuCacheMeta, {})?.savedAt) || 0,
    suggestionIndex: -1
  };

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    initTheme();
    window.DewizaNavigation?.init();
    initPwa();
    bindStaticEvents();
    renderIcons();
    renderLoadingState();

    const [siteResult, menuResult] = await Promise.allSettled([
      fetchJson(DATA_URLS.site),
      fetchJson(DATA_URLS.menu)
    ]);

    const cachedSite = readStorage(STORAGE.siteCache, null);
    const cachedMenu = readStorage(STORAGE.menuCache, null);

    state.config = siteResult.status === 'fulfilled' && isObject(siteResult.value)
      ? siteResult.value
      : (isObject(cachedSite) ? cachedSite : createSafeConfig());

    const rawMenu = menuResult.status === 'fulfilled' && Array.isArray(menuResult.value)
      ? menuResult.value
      : (Array.isArray(cachedMenu) ? cachedMenu : []);
    state.menuSource = menuResult.status === 'fulfilled' ? 'network' : (Array.isArray(cachedMenu) ? 'cache' : 'empty');
    state.menu = normalizeMenuCollection(rawMenu);

    if (siteResult.status === 'fulfilled' && isObject(siteResult.value)) writeStorage(STORAGE.siteCache, siteResult.value);
    if (menuResult.status === 'fulfilled' && Array.isArray(menuResult.value)) {
      writeStorage(STORAGE.menuCache, menuResult.value);
      state.menuCacheSavedAt = Date.now();
      writeStorage(STORAGE.menuCacheMeta, { savedAt: state.menuCacheSavedAt });
    }

    normalizeStoredState();
    ensureEnhancementUi();
    restoreOrderDraft();
    applyUrlState();
    applySiteConfig();
    renderAll();
    renderBusinessStatus();
    openDeepLinkedItem();
    openRequestedCart();
    cacheMenuAssets();
    updateNetworkStatus();
    reportDataWarnings();
    window.setInterval(renderBusinessStatus, 60000);

    if (siteResult.status === 'rejected' && !cachedSite) {
      showToast('Konfigurasi situs tidak dapat dimuat.', 'warning');
    }
    if (menuResult.status === 'rejected') {
      showToast(cachedMenu ? cacheAgeMessage('Offline: menampilkan katalog terakhir yang tersimpan.') : 'Data menu tidak dapat dimuat.', 'warning');
    }
  }

  function createSafeConfig() {
    return {
      business: {
        name: 'Dewiza Pizza & Cafe',
        shortName: 'Dewiza Pizza',
        description: '',
        logo: 'assets/logo/logo.webp',
        heroImage: 'assets/hero/hero-bg.webp',
        whatsapp: '',
        instagramUrl: '',
        instagramLabel: '',
        address: '',
        mapEmbedUrl: '',
        locale: 'id-ID',
        currency: 'IDR'
      },
      openingHours: [],
      openingHoursMachine: [],
      announcements: [],
      categories: [],
      orderTypes: [],
      promos: [],
      testimonials: [],
      vouchers: [],
      settings: {
        menuPreviewLimit: 6,
        menuPageSize: 12,
        enableWishlist: true,
        enableOrdering: true,
        orderDetailMaxLength: 300,
        deliveryAddressMinLength: 10,
        maxCartQuantity: 99,
        enableRecentlyViewed: true,
        recentlyViewedLimit: 6,
        enableKeyboardShortcuts: true,
        customerNameMaxLength: 80,
        orderNoteMaxLength: 300,
        enableAdvancedFilters: true,
        enableSearchSuggestions: true,
        searchSuggestionLimit: 6,
        enableOrderSchedule: false,
        orderScheduleLeadMinutes: 30,
        orderScheduleDaysAhead: 7,
        enableOrderSummaryShare: true,
        minimumOrderAmount: 0,
        blockOrderingWhenClosed: false
      }
    };
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (response.headers.get('X-Dewiza-Offline-Fallback') === '1') throw new Error('OFFLINE_FALLBACK');
    return response.json();
  }

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function normalizeMenuItem(item, index) {
    if (!isObject(item)) return null;
    const id = String(item.id ?? '').trim();
    const name = String(item.name ?? '').trim();
    const category = String(item.category ?? '').trim();
    const price = Number(item.price);
    if (!id || !name || !category || !Number.isFinite(price) || price < 0) {
      state.dataWarnings.push(`Item menu ke-${index + 1} diabaikan karena id, nama, kategori, atau harga tidak valid.`);
      return null;
    }

    return {
      id,
      name,
      category,
      price,
      description: String(item.description ?? '').trim(),
      image: safeAssetUrl(item.image),
      available: item.available !== false,
      badge: String(item.badge ?? '').trim(),
      tags: Array.isArray(item.tags) ? item.tags.map(value => String(value).trim()).filter(Boolean).slice(0, 12) : [],
      allergens: Array.isArray(item.allergens) ? item.allergens.map(value => String(value).trim()).filter(Boolean).slice(0, 12) : [],
      calories: Number.isFinite(Number(item.calories)) && Number(item.calories) >= 0 ? Number(item.calories) : null,
      spicyLevel: Math.max(0, Math.min(5, Number(item.spicyLevel) || 0)),
      featured: item.featured === true
    };
  }

  function normalizeMenuCollection(rawMenu) {
    const seen = new Set();
    const normalized = [];
    (Array.isArray(rawMenu) ? rawMenu : []).forEach((item, index) => {
      const value = normalizeMenuItem(item, index);
      if (!value) return;
      if (seen.has(value.id)) {
        state.dataWarnings.push(`ID menu duplikat "${value.id}" diabaikan.`);
        return;
      }
      seen.add(value.id);
      normalized.push(value);
    });
    return normalized;
  }

  function reportDataWarnings() {
    if (!state.dataWarnings.length) return;
    console.warn('[Dewiza] Validasi data:', ...state.dataWarnings);
    showToast(`${state.dataWarnings.length} data menu tidak valid diabaikan.`, 'warning');
  }

  function safeAssetUrl(value) {
    const url = String(value ?? '').trim();
    if (!url) return '';
    if (/^assets\/[a-zA-Z0-9_./-]+$/.test(url)) return url;
    if (/^https:\/\//i.test(url)) return url;
    return '';
  }

  function readStorage(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      showToast('Penyimpanan browser tidak tersedia.', 'warning');
    }
  }

  function normalizeStoredState() {
    const ids = new Set(state.menu.map(item => item.id));
    state.wishlist = Array.isArray(state.wishlist)
      ? [...new Set(state.wishlist.map(String))].filter(id => ids.has(id))
      : [];

    const maxQty = Math.max(1, Math.min(999, Number(settings().maxCartQuantity) || 99));
    const oldCart = Array.isArray(state.cart) ? state.cart : [];
    state.cart = oldCart
      .map(entry => {
        const current = state.menu.find(item => item.id === String(entry.id));
        if (!current || !current.available) return null;
        const qty = Math.max(1, Math.min(maxQty, Number(entry.qty) || 1));
        return { id: current.id, qty };
      })
      .filter(Boolean);

    state.recentlyViewed = Array.isArray(state.recentlyViewed)
      ? [...new Set(state.recentlyViewed.map(String))].filter(id => ids.has(id)).slice(0, Math.max(1, Number(settings().recentlyViewedLimit) || 6))
      : [];

    writeStorage(STORAGE.wishlist, state.wishlist);
    writeStorage(STORAGE.cart, state.cart);
    writeStorage(STORAGE.recentlyViewed, state.recentlyViewed);
  }

  function configArray(key) {
    return Array.isArray(state.config?.[key]) ? state.config[key] : [];
  }

  function settings() {
    return { ...createSafeConfig().settings, ...(state.config?.settings || {}) };
  }

  function business() {
    return { ...createSafeConfig().business, ...(state.config?.business || {}) };
  }

  function applySiteConfig() {
    const b = business();
    setText('[data-business-name]', b.name);
    setText('[data-business-short-name]', b.shortName || b.name);
    setText('[data-business-description]', b.description);
    setText('[data-business-address]', b.address);
    setText('[data-instagram-label]', b.instagramLabel);

    document.querySelectorAll('[data-business-logo]').forEach(img => {
      if (b.logo) img.src = b.logo;
      img.alt = `${b.name} logo`;
    });

    const heroImage = document.querySelector('[data-hero-image]');
    if (heroImage && b.heroImage) {
      heroImage.src = b.heroImage;
      heroImage.alt = b.name;
    }

    const instagram = document.querySelector('[data-instagram-link]');
    toggleLink(instagram, b.instagramUrl);

    const waLinks = document.querySelectorAll('[data-whatsapp-link]');
    const waUrl = b.whatsapp ? `https://wa.me/${digitsOnly(b.whatsapp)}` : '';
    waLinks.forEach(link => toggleLink(link, waUrl));

    renderOpeningHours();
    renderMap();
    renderStructuredData();
    updateSeo();
    renderOrderTypes();
    renderVoucherArea();
    renderAnnouncement();
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach(el => {
      el.textContent = value || '';
      if (el.closest('[data-hide-empty]')) {
        el.closest('[data-hide-empty]').hidden = !value;
      }
    });
  }

  function toggleLink(link, href) {
    if (!link) return;
    if (href) {
      link.href = href;
      link.hidden = false;
    } else {
      link.removeAttribute('href');
      link.hidden = true;
    }
  }

  function renderOpeningHours() {
    const list = document.getElementById('opening-hours-list');
    if (!list) return;
    const hours = configArray('openingHours').filter(isObject);
    list.replaceChildren();
    if (!hours.length) {
      list.closest('[data-opening-hours-block]')?.setAttribute('hidden', '');
      return;
    }
    list.closest('[data-opening-hours-block]')?.removeAttribute('hidden');
    hours.forEach(row => {
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = String(row.label ?? '');
      const value = document.createElement('strong');
      value.textContent = String(row.value ?? '');
      li.append(label, value);
      list.appendChild(li);
    });
  }

  function renderMap() {
    const frame = document.getElementById('business-map');
    if (!frame) return;
    const url = business().mapEmbedUrl;
    if (url && /^https:\/\/www\.google\.com\/maps\/embed/i.test(url)) {
      frame.src = url;
      frame.closest('[data-map-block]')?.removeAttribute('hidden');
    } else {
      frame.removeAttribute('src');
      frame.closest('[data-map-block]')?.setAttribute('hidden', '');
    }
  }

  function renderStructuredData() {
    const restaurantScript = document.getElementById('business-schema');
    const menuScript = document.getElementById('menu-schema');
    const b = business();
    const menuUrl = absoluteUrl('menu.html');
    const logoUrl = b.logo ? absoluteUrl(b.logo) : undefined;
    const heroUrl = b.heroImage ? absoluteUrl(b.heroImage) : logoUrl;
    const restaurantId = `${absoluteUrl('')}#restaurant`;

    if (restaurantScript) {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Restaurant',
        '@id': restaurantId,
        name: b.name,
        description: b.description || undefined,
        url: absoluteUrl(''),
        image: heroUrl,
        logo: logoUrl,
        telephone: validWhatsappNumber(b.whatsapp) ? `+${digitsOnly(b.whatsapp)}` : undefined,
        address: b.address || undefined,
        hasMenu: menuUrl,
        openingHoursSpecification: configArray('openingHoursMachine').filter(isObject).map(entry => ({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: (Array.isArray(entry.days) ? entry.days : []).map(day => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][Number(day)]).filter(Boolean).map(day => `https://schema.org/${day}`),
          opens: String(entry.open || ''),
          closes: String(entry.close || '')
        })).filter(entry => entry.dayOfWeek.length && entry.opens && entry.closes) || undefined,
        sameAs: b.instagramUrl ? [b.instagramUrl] : undefined
      };
      if (Array.isArray(schema.openingHoursSpecification) && !schema.openingHoursSpecification.length) delete schema.openingHoursSpecification;
      Object.keys(schema).forEach(key => schema[key] === undefined && delete schema[key]);
      restaurantScript.textContent = JSON.stringify(schema);
    }

    if (menuScript) {
      const grouped = new Map();
      state.menu.forEach(item => {
        if (!grouped.has(item.category)) grouped.set(item.category, []);
        grouped.get(item.category).push(item);
      });
      const menuSchema = {
        '@context': 'https://schema.org',
        '@type': 'Menu',
        '@id': `${menuUrl}#menu`,
        name: `Menu ${b.name}`,
        url: menuUrl,
        inLanguage: 'id-ID',
        mainEntityOfPage: menuUrl,
        provider: { '@id': restaurantId },
        hasMenuSection: [...grouped.entries()].map(([categoryId, items]) => {
          const category = categories().find(cat => cat.id === categoryId);
          return {
            '@type': 'MenuSection',
            name: category?.label || titleCase(categoryId),
            hasMenuItem: items.map(item => ({
              '@type': 'MenuItem',
              name: item.name,
              description: item.description || undefined,
              image: item.image ? absoluteUrl(item.image) : undefined,
              keywords: item.tags.length ? item.tags.join(', ') : undefined,
              nutrition: item.calories !== null ? { '@type': 'NutritionInformation', calories: `${item.calories} calories` } : undefined,
              offers: {
                '@type': 'Offer',
                price: item.price,
                priceCurrency: b.currency || 'IDR',
                availability: item.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                url: productShareUrl(item)
              }
            })).map(entry => {
              Object.keys(entry).forEach(key => entry[key] === undefined && delete entry[key]);
              return entry;
            })
          };
        })
      };
      menuScript.textContent = JSON.stringify(menuSchema);
    }
  }

  function absoluteUrl(path = '') {
    try {
      return new URL(path || './', document.baseURI).href;
    } catch {
      return String(path || '');
    }
  }

  function setMeta(selector, value, attribute = 'content') {
    const node = document.querySelector(selector);
    if (!node) return;
    if (value) node.setAttribute(attribute, value);
    else node.removeAttribute(attribute);
  }

  function updateSeo() {
    const b = business();
    const params = new URLSearchParams(location.search);
    const itemId = params.get('item');
    const item = itemId ? state.menu.find(entry => entry.id === itemId) : null;
    const activeCategory = state.activeCategory !== 'all' && state.activeCategory !== 'wishlist-only'
      ? categories().find(cat => cat.id === state.activeCategory)
      : null;

    let title = b.name;
    let description = b.description || `Katalog menu dan pemesanan ${b.name}.`;
    if (state.page === 'menu') {
      title = `Menu - ${b.name}`;
      description = `Lihat katalog menu ${b.name}, cari berdasarkan kategori, simpan favorit, dan siapkan pesanan melalui WhatsApp.`;
      if (activeCategory) {
        title = `Menu ${activeCategory.label} - ${b.name}`;
        description = `Lihat pilihan ${activeCategory.label} yang tersedia di ${b.name}.`;
      }
      if (item) {
        title = `${item.name} - ${b.name}`;
        description = item.description || `Lihat detail ${item.name} di katalog ${b.name}.`;
      }
    }

    document.title = title;
    const catalogHeading = document.getElementById('catalog-heading');
    const catalogDescription = document.getElementById('catalog-description');
    if (catalogHeading && state.page === 'menu') {
      catalogHeading.textContent = activeCategory
        ? `Menu ${activeCategory.label} ${b.shortName || b.name}`
        : `Menu ${b.shortName || b.name}`;
    }
    if (catalogDescription && state.page === 'menu') {
      catalogDescription.textContent = item
        ? `Lihat detail ${item.name}, bagikan link, simpan favorit, atau tambahkan ke keranjang.`
        : activeCategory
          ? `Jelajahi kategori ${activeCategory.label}, urutkan menu, simpan favorit, dan siapkan pesanan.`
          : 'Cari, urutkan, simpan favorit, dan masukkan menu ke keranjang.';
    }
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:type"]', item ? 'product' : 'website');
    setMeta('meta[property="og:url"]', item ? productShareUrl(item) : location.href.split('#')[0]);
    setMeta('meta[property="og:site_name"]', b.name);
    setMeta('meta[property="og:locale"]', 'id_ID');
    setMeta('meta[property="og:image"]', item?.image ? absoluteUrl(item.image) : (b.heroImage ? absoluteUrl(b.heroImage) : (b.logo ? absoluteUrl(b.logo) : '')));
    setMeta('meta[name="twitter:card"]', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[name="twitter:image"]', item?.image ? absoluteUrl(item.image) : (b.heroImage ? absoluteUrl(b.heroImage) : (b.logo ? absoluteUrl(b.logo) : '')));

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = state.page === 'menu' ? absoluteUrl('menu.html') : absoluteUrl('');
  }

  function renderLoadingState() {
    const container = document.getElementById('menu-categories-wrapper');
    const filters = document.getElementById('filter-buttons-container');
    const resultBar = document.querySelector('.menu-result-bar');
    if (!container) return;
    if (filters) filters.hidden = true;
    if (resultBar) resultBar.hidden = true;
    container.innerHTML = `
      <div class="menu-grid skeleton-grid" aria-label="Memuat menu" aria-busy="true">
        ${Array.from({ length: state.page === 'home' ? 3 : 6 }, () => `
          <article class="menu-card skeleton-card" aria-hidden="true">
            <div class="skeleton skeleton-media"></div>
            <div class="menu-card-body">
              <div class="skeleton skeleton-line skeleton-title"></div>
              <div class="skeleton skeleton-line"></div>
              <div class="skeleton skeleton-line skeleton-short"></div>
              <div class="skeleton skeleton-button"></div>
            </div>
          </article>`).join('')}
      </div>`;
  }

  function applyUrlState() {
    if (state.page !== 'menu') return;
    const params = new URLSearchParams(location.search);
    const requestedCategory = String(params.get('category') || '').trim();
    const allowedCategories = new Set(['all', 'wishlist-only', ...categories().map(cat => cat.id)]);
    if (requestedCategory && allowedCategories.has(requestedCategory)) state.activeCategory = requestedCategory;
    const q = String(params.get('q') || '').trim().slice(0, 100);
    if (q) {
      state.searchQuery = q;
      const search = document.getElementById('menu-search');
      if (search) search.value = q;
      document.getElementById('clear-search-btn')?.removeAttribute('hidden');
    }
    const sort = String(params.get('sort') || '').trim();
    if (['price-asc', 'price-desc', 'name-asc', 'name-desc'].includes(sort)) {
      state.sort = sort;
      const select = document.getElementById('menu-sort');
      if (select) select.value = sort;
    }
    state.availableOnly = params.get('available') === '1';
    const minPrice = params.has('minPrice') ? Number(params.get('minPrice')) : NaN;
    const maxPrice = params.has('maxPrice') ? Number(params.get('maxPrice')) : NaN;
    state.minPrice = Number.isFinite(minPrice) && minPrice >= 0 ? minPrice : null;
    state.maxPrice = Number.isFinite(maxPrice) && maxPrice >= 0 ? maxPrice : null;
    syncAdvancedFilterInputs();
    const page = Number(params.get('page'));
    if (Number.isInteger(page) && page > 0) state.currentPage = page;
  }

  function syncUrlState({ push = false, keepItem = false } = {}) {
    if (state.page !== 'menu' || !history?.replaceState) return;
    const url = new URL(location.href);
    if (state.activeCategory && state.activeCategory !== 'all') url.searchParams.set('category', state.activeCategory);
    else url.searchParams.delete('category');
    if (state.searchQuery.trim()) url.searchParams.set('q', state.searchQuery.trim());
    else url.searchParams.delete('q');
    if (state.sort !== 'default') url.searchParams.set('sort', state.sort);
    else url.searchParams.delete('sort');
    if (state.availableOnly) url.searchParams.set('available', '1');
    else url.searchParams.delete('available');
    if (Number.isFinite(state.minPrice)) url.searchParams.set('minPrice', String(state.minPrice));
    else url.searchParams.delete('minPrice');
    if (Number.isFinite(state.maxPrice)) url.searchParams.set('maxPrice', String(state.maxPrice));
    else url.searchParams.delete('maxPrice');
    if (state.currentPage > 1) url.searchParams.set('page', String(state.currentPage));
    else url.searchParams.delete('page');
    if (!keepItem) url.searchParams.delete('item');
    const method = push ? 'pushState' : 'replaceState';
    history[method]({}, '', `${url.pathname}${url.search}${url.hash}`);
    updateSeo();
  }

  function openDeepLinkedItem() {
    if (state.page !== 'menu') return;
    const id = new URLSearchParams(location.search).get('item');
    if (!id) return;
    if (state.menu.some(item => item.id === id)) {
      window.setTimeout(() => openQuickView(id, { preserveUrl: true }), 0);
    }
  }

  function openRequestedCart() {
    const url = new URL(location.href);
    if (url.searchParams.get('cart') !== 'open') return;
    openCart();
    url.searchParams.delete('cart');
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function productShareUrl(item) {
    const url = new URL('menu.html', document.baseURI);
    if (item?.category) url.searchParams.set('category', item.category);
    if (item?.id) url.searchParams.set('item', item.id);
    return url.href;
  }

  async function copyText(value) {
    if (!value) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
      const input = document.createElement('textarea');
      input.value = value;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      const ok = document.execCommand('copy');
      input.remove();
      return ok;
    } catch {
      return false;
    }
  }

  async function shareMenuItem(id, forceCopy = false) {
    const item = state.menu.find(menuItem => menuItem.id === String(id));
    if (!item) return;
    const url = productShareUrl(item);
    if (!forceCopy && navigator.share) {
      try {
        await navigator.share({ title: item.name, text: item.description || `Lihat ${item.name} di ${business().name}.`, url });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    const copied = await copyText(url);
    showToast(copied ? 'Link menu disalin.' : 'Link tidak dapat disalin.', copied ? 'success' : 'warning');
  }

  function cacheMenuAssets() {
    if (!navigator.serviceWorker?.controller) return;
    const urls = state.menu
      .map(item => item.image)
      .filter(url => url && /^assets\//.test(url));
    if (!urls.length) return;
    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_URLS', urls: [...new Set(urls)] });
  }

  function ensureEnhancementUi() {
    ensureAdvancedFilters();
    ensureSearchSuggestions();
    ensureRecentClearButton();
    ensureCartEnhancements();
  }

  function ensureAdvancedFilters() {
    if (state.page !== 'menu' || settings().enableAdvancedFilters === false) return;
    const filterContainer = document.getElementById('filter-buttons-container');
    if (!filterContainer || document.getElementById('advanced-menu-filters')) return;
    const panel = document.createElement('div');
    panel.id = 'advanced-menu-filters';
    panel.className = 'advanced-menu-filters';
    panel.innerHTML = `
      <label class="availability-toggle"><input id="available-only-filter" type="checkbox"><span>Tersedia saja</span></label>
      <label class="price-filter"><span>Harga min</span><input id="min-price-filter" type="number" min="0" inputmode="numeric" placeholder="0"></label>
      <label class="price-filter"><span>Harga maks</span><input id="max-price-filter" type="number" min="0" inputmode="numeric" placeholder="Tanpa batas"></label>`;
    filterContainer.insertAdjacentElement('afterend', panel);
    syncAdvancedFilterInputs();
    const apply = () => {
      state.availableOnly = Boolean(document.getElementById('available-only-filter')?.checked);
      const min = Number(document.getElementById('min-price-filter')?.value);
      const max = Number(document.getElementById('max-price-filter')?.value);
      state.minPrice = Number.isFinite(min) && min >= 0 && document.getElementById('min-price-filter')?.value !== '' ? min : null;
      state.maxPrice = Number.isFinite(max) && max >= 0 && document.getElementById('max-price-filter')?.value !== '' ? max : null;
      if (Number.isFinite(state.minPrice) && Number.isFinite(state.maxPrice) && state.minPrice > state.maxPrice) {
        [state.minPrice, state.maxPrice] = [state.maxPrice, state.minPrice];
        syncAdvancedFilterInputs();
      }
      state.currentPage = 1;
      syncUrlState();
      renderMenu();
    };
    panel.querySelector('#available-only-filter')?.addEventListener('change', apply);
    panel.querySelectorAll('input[type="number"]').forEach(input => input.addEventListener('change', apply));
  }

  function syncAdvancedFilterInputs() {
    const available = document.getElementById('available-only-filter');
    const min = document.getElementById('min-price-filter');
    const max = document.getElementById('max-price-filter');
    if (available) available.checked = state.availableOnly;
    if (min) min.value = Number.isFinite(state.minPrice) ? String(state.minPrice) : '';
    if (max) max.value = Number.isFinite(state.maxPrice) ? String(state.maxPrice) : '';
  }

  function ensureSearchSuggestions() {
    if (settings().enableSearchSuggestions === false) return;
    const search = document.getElementById('menu-search');
    const box = search?.closest('.search-box');
    if (!search || !box || document.getElementById('menu-search-suggestions')) return;
    search.setAttribute('role', 'combobox');
    search.setAttribute('aria-autocomplete', 'list');
    search.setAttribute('aria-expanded', 'false');
    search.setAttribute('aria-controls', 'menu-search-suggestions');
    const list = document.createElement('div');
    list.id = 'menu-search-suggestions';
    list.className = 'search-suggestions';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    box.appendChild(list);
  }

  function searchSuggestions() {
    const query = state.searchQuery.trim().toLocaleLowerCase('id-ID');
    if (!query) return [];
    const limit = Math.max(3, Math.min(10, Number(settings().searchSuggestionLimit) || 6));
    return state.menu
      .filter(item => `${item.name} ${item.description} ${item.tags.join(' ')}`.toLocaleLowerCase('id-ID').includes(query))
      .slice(0, limit);
  }

  function renderSearchSuggestions() {
    const list = document.getElementById('menu-search-suggestions');
    const input = document.getElementById('menu-search');
    if (!list || !input || settings().enableSearchSuggestions === false) return;
    const matches = searchSuggestions();
    list.replaceChildren();
    state.suggestionIndex = -1;
    if (!matches.length || !state.searchQuery.trim()) return hideSearchSuggestions();
    matches.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'search-suggestion';
      button.id = `search-suggestion-${index}`;
      button.setAttribute('role', 'option');
      button.dataset.suggestionId = item.id;
      button.innerHTML = `<span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(categories().find(cat => cat.id === item.category)?.label || titleCase(item.category))}</small></span><span>${formatCurrency(item.price)}</span>`;
      list.appendChild(button);
    });
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function hideSearchSuggestions() {
    const list = document.getElementById('menu-search-suggestions');
    const input = document.getElementById('menu-search');
    if (list) list.hidden = true;
    if (input) {
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }
    state.suggestionIndex = -1;
  }

  function selectSearchSuggestion(id) {
    const item = state.menu.find(entry => entry.id === String(id));
    const search = document.getElementById('menu-search');
    if (!item || !search) return;
    state.searchQuery = item.name;
    state.activeCategory = item.category;
    state.currentPage = 1;
    search.value = item.name;
    document.getElementById('clear-search-btn')?.removeAttribute('hidden');
    hideSearchSuggestions();
    syncUrlState({ push: state.page === 'menu' });
    renderFilters();
    renderMenu();
    openQuickView(item.id);
  }

  function moveSearchSuggestion(direction) {
    const list = document.getElementById('menu-search-suggestions');
    const input = document.getElementById('menu-search');
    const options = list ? [...list.querySelectorAll('[role="option"]')] : [];
    if (!options.length || !input) return false;
    state.suggestionIndex = (state.suggestionIndex + direction + options.length) % options.length;
    options.forEach((option, index) => option.classList.toggle('active', index === state.suggestionIndex));
    input.setAttribute('aria-activedescendant', options[state.suggestionIndex].id);
    options[state.suggestionIndex].scrollIntoView({ block: 'nearest' });
    return true;
  }

  function ensureRecentClearButton() {
    const section = document.getElementById('recently-viewed-section');
    const heading = section?.querySelector('.section-heading');
    if (!heading || heading.querySelector('[data-clear-recent]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-ghost btn-sm';
    button.dataset.clearRecent = 'true';
    button.innerHTML = '<span data-icon="trash"></span>Hapus riwayat';
    heading.appendChild(button);
    button.addEventListener('click', () => {
      state.recentlyViewed = [];
      writeStorage(STORAGE.recentlyViewed, state.recentlyViewed);
      renderRecentlyViewed();
      showToast('Riwayat menu dihapus.');
    });
    renderIcons(button);
  }

  function ensureCartEnhancements() {
    const panel = document.querySelector('.cart-panel');
    const actions = document.querySelector('.cart-actions');
    if (panel && settings().enableOrderSchedule === true && !document.getElementById('order-schedule-group')) {
      const schedule = document.createElement('div');
      schedule.id = 'order-schedule-group';
      schedule.className = 'order-schedule-group';
      schedule.innerHTML = `<span class="field-title">Jadwal pesanan <small>(opsional)</small></span><div class="schedule-grid"><label class="field-group"><span>Tanggal</span><input id="order-schedule-date" type="date"></label><label class="field-group"><span>Waktu</span><input id="order-schedule-time" type="time"></label></div>`;
      panel.appendChild(schedule);
      schedule.querySelectorAll('input').forEach(input => input.addEventListener('change', persistOrderDraft));
      updateOrderScheduleBounds();
    }
    if (actions && settings().enableOrderSummaryShare !== false && !document.getElementById('copy-order-summary-btn')) {
      const tools = document.createElement('div');
      tools.className = 'cart-secondary-actions';
      tools.innerHTML = `<button id="copy-order-summary-btn" type="button" class="btn btn-soft btn-block"><span data-icon="copy"></span>Salin ringkasan</button><button id="share-order-summary-btn" type="button" class="btn btn-ghost btn-block"><span data-icon="share"></span>Bagikan ringkasan</button>`;
      actions.prepend(tools);
      tools.querySelector('#copy-order-summary-btn')?.addEventListener('click', () => shareOrderSummary(true));
      tools.querySelector('#share-order-summary-btn')?.addEventListener('click', () => shareOrderSummary(false));
      renderIcons(tools);
    }
  }

  function updateOrderScheduleBounds() {
    if (settings().enableOrderSchedule !== true) return;
    const date = document.getElementById('order-schedule-date');
    if (!date) return;
    const lead = Math.max(0, Math.min(1440, Number(settings().orderScheduleLeadMinutes) || 30));
    const days = Math.max(1, Math.min(30, Number(settings().orderScheduleDaysAhead) || 7));
    const min = new Date(Date.now() + lead * 60000);
    const max = new Date(min.getTime() + days * 86400000);
    date.min = localDateValue(min);
    date.max = localDateValue(max);
  }

  function localDateValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function renderProductMeta(item, compact = false) {
    const parts = [];
    if (item.featured) parts.push('<span class="product-chip"><span data-icon="sparkles"></span>Unggulan</span>');
    item.tags.slice(0, compact ? 2 : 5).forEach(tag => parts.push(`<span class="product-chip">${escapeHtml(tag)}</span>`));
    if (!compact && item.calories !== null) parts.push(`<span class="product-chip">${escapeHtml(String(item.calories))} kkal</span>`);
    if (!compact && item.spicyLevel > 0) parts.push(`<span class="product-chip">Pedas ${item.spicyLevel}/5</span>`);
    if (!compact && item.allergens.length) parts.push(`<span class="product-chip product-chip-warning"><span data-icon="alert"></span>Alergen: ${escapeHtml(item.allergens.join(', '))}</span>`);
    return parts.length ? `<div class="product-meta${compact ? ' compact' : ''}">${parts.join('')}</div>` : '';
  }

  function renderAnnouncement() {
    let banner = document.getElementById('site-announcement');
    const announcements = configArray('announcements').filter(item => isObject(item) && item.active !== false && String(item.text || '').trim());
    const item = announcements[0];
    if (!item) {
      banner?.remove();
      return;
    }
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'site-announcement';
      banner.className = 'site-announcement';
      const header = document.querySelector('.header');
      header?.insertAdjacentElement('afterend', banner);
    }
    const text = escapeHtml(String(item.text || '').trim());
    const href = safeHttpUrl(item.url);
    banner.innerHTML = `<div class="container announcement-inner"><span data-icon="sparkles"></span><span>${text}</span>${href ? `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">Selengkapnya</a>` : ''}</div>`;
    renderIcons(banner);
  }

  function safeHttpUrl(value) {
    const url = String(value || '').trim();
    return /^https?:\/\//i.test(url) ? url : '';
  }

  function renderBusinessStatus() {
    const machine = configArray('openingHoursMachine').filter(isObject);
    if (!machine.length) return;
    let holder = document.getElementById('business-open-status');
    const host = document.querySelector('.catalog-hero-inner > div, .hero-content');
    if (!host) return;
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'business-open-status';
      holder.className = 'business-open-status';
      host.appendChild(holder);
    }
    const status = getBusinessOpenStatus(machine);
    holder.className = `business-open-status ${status.open ? 'is-open' : 'is-closed'}`;
    holder.innerHTML = `<span class="status-dot"></span><strong>${status.open ? 'Buka sekarang' : 'Tutup'}</strong>${status.detail ? `<span>${escapeHtml(status.detail)}</span>` : ''}`;
  }

  function getBusinessOpenStatus(machine) {
    const timeZone = String(business().timeZone || 'Asia/Jakarta');
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
      const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const day = days[values.weekday];
      const minuteNow = Number(values.hour) * 60 + Number(values.minute);
      const row = machine.find(entry => Array.isArray(entry.days) && entry.days.map(Number).includes(day));
      if (!row) return { open: false, detail: 'Tidak ada jadwal hari ini' };
      const toMinutes = value => { const [h, m] = String(value || '').split(':').map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null; };
      const open = toMinutes(row.open);
      const close = toMinutes(row.close);
      if (open === null || close === null) return { open: false, detail: '' };
      const isOpen = minuteNow >= open && minuteNow < close;
      return { open: isOpen, detail: `${String(row.open)}–${String(row.close)} WIB` };
    } catch {
      return { open: false, detail: '' };
    }
  }

  function orderReference() {
    const now = new Date();
    return `DWZ-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  }

  function getOrderSchedule() {
    if (settings().enableOrderSchedule !== true) return null;
    const date = String(document.getElementById('order-schedule-date')?.value || '');
    const time = String(document.getElementById('order-schedule-time')?.value || '');
    if (!date && !time) return null;
    if (!date || !time) return { invalid: true };
    const target = new Date(`${date}T${time}:00`);
    const lead = Math.max(0, Math.min(1440, Number(settings().orderScheduleLeadMinutes) || 30));
    const maxDays = Math.max(1, Math.min(30, Number(settings().orderScheduleDaysAhead) || 7));
    if (!Number.isFinite(target.getTime()) || target.getTime() < Date.now() + lead * 60000 || target.getTime() > Date.now() + maxDays * 86400000) return { invalid: true, reason: 'range' };
    const machine = configArray('openingHoursMachine').filter(isObject);
    if (machine.length) {
      const day = target.getDay();
      const [hour, minute] = time.split(':').map(Number);
      const minuteTarget = hour * 60 + minute;
      const row = machine.find(entry => Array.isArray(entry.days) && entry.days.map(Number).includes(day));
      const toMinutes = value => { const [h, m] = String(value || '').split(':').map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null; };
      const open = row ? toMinutes(row.open) : null;
      const close = row ? toMinutes(row.close) : null;
      if (!row || open === null || close === null || minuteTarget < open || minuteTarget >= close) return { invalid: true, reason: 'closed' };
    }
    return { date, time, target };
  }

  function buildOrderMessage({ requireValidation = false } = {}) {
    const items = cartDetailed();
    const b = business();
    const orderTypes = configArray('orderTypes').filter(isObject);
    const order = orderTypes.find(item => String(item.id) === state.orderType);
    const detail = String(document.getElementById('order-location-input')?.value || '').trim().replace(/\s+/g, ' ');
    const customerName = String(document.getElementById('customer-name-input')?.value || '').trim().replace(/\s+/g, ' ');
    const orderNote = String(document.getElementById('order-note-input')?.value || '').trim().replace(/\s+/g, ' ');
    if (!items.length) return { error: 'Keranjang masih kosong.' };
    if (requireValidation && orderTypes.length && !order) return { error: 'Pilih tipe pesanan terlebih dahulu.' };
    if (requireValidation && order?.required === true && !detail) return { error: `${String(order.detailLabel || 'Detail pesanan')} wajib diisi.` };
    const schedule = getOrderSchedule();
    if (schedule?.invalid) return { error: 'Jadwal pesanan tidak valid atau berada di luar rentang yang diizinkan.' };
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = calculateDiscount(subtotal);
    const fee = currentOrderFee();
    const total = Math.max(0, subtotal - discount + fee);
    const ref = orderReference();
    const lines = [`Pesanan ${b.name}`, `Referensi: ${ref}`];
    if (order) lines.push(`Tipe: ${String(order.label || order.id)}`);
    if (schedule) lines.push(`Jadwal: ${schedule.date} ${schedule.time}`);
    if (customerName) lines.push(`Nama: ${customerName}`);
    if (detail) lines.push(`${String(order?.detailLabel || 'Detail')}: ${detail}`);
    if (orderNote) lines.push(`Catatan: ${orderNote}`);
    lines.push('', ...items.map((item, index) => `${index + 1}. ${item.name} x${item.qty} — ${formatCurrency(item.lineTotal)}`));
    lines.push('', `Subtotal: ${formatCurrency(subtotal)}`);
    if (discount > 0) lines.push(`Diskon: -${formatCurrency(discount)}`);
    if (fee > 0) lines.push(`Biaya: ${formatCurrency(fee)}`);
    lines.push(`Total: ${formatCurrency(total)}`);
    return { message: lines.join('\n'), ref, total, schedule };
  }

  async function shareOrderSummary(forceCopy = false) {
    const built = buildOrderMessage();
    if (built.error) return showToast(built.error, 'warning');
    if (!forceCopy && navigator.share) {
      try {
        await navigator.share({ title: `Pesanan ${business().shortName || business().name}`, text: built.message });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    const copied = await copyText(built.message);
    showToast(copied ? 'Ringkasan pesanan disalin.' : 'Ringkasan tidak dapat disalin.', copied ? 'success' : 'warning');
  }

  function cacheAgeMessage(prefix) {
    if (!state.menuCacheSavedAt) return prefix;
    const elapsed = Math.max(0, Date.now() - state.menuCacheSavedAt);
    const minutes = Math.floor(elapsed / 60000);
    const age = minutes < 1 ? 'baru saja' : minutes < 60 ? `${minutes} menit lalu` : `${Math.floor(minutes / 60)} jam lalu`;
    return `${prefix} Cache terakhir diperbarui ${age}.`;
  }

  function renderAll() {
    renderFilters();
    renderMenu();
    renderPromos();
    renderTestimonials();
    renderCart();
    renderRecentlyViewed();
    updateWishlistCount();
    renderStructuredData();
    updateSeo();
    renderIcons();
  }

  function categories() {
    const configured = configArray('categories')
      .filter(isObject)
      .map(item => ({
        id: String(item.id ?? '').trim(),
        label: String(item.label ?? item.id ?? '').trim(),
        icon: String(item.icon ?? 'utensils').trim()
      }))
      .filter(item => item.id);

    const known = new Set(configured.map(item => item.id));
    state.menu.forEach(item => {
      if (!known.has(item.category)) {
        configured.push({ id: item.category, label: titleCase(item.category), icon: 'utensils' });
        known.add(item.category);
      }
    });
    return configured;
  }

  function renderFilters() {
    const container = document.getElementById('filter-buttons-container');
    if (!container) return;
    const wishlistEnabled = settings().enableWishlist !== false;
    const buttons = [
      { id: 'all', label: 'Semua', icon: 'utensils', count: state.menu.length },
      ...categories().map(cat => ({
        ...cat,
        count: state.menu.filter(item => item.category === cat.id).length
      }))
    ];
    if (wishlistEnabled) {
      buttons.push({ id: 'wishlist-only', label: 'Favorit', icon: 'heart', count: state.wishlist.length });
    }

    container.replaceChildren();
    buttons.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `filter-btn${state.activeCategory === item.id ? ' active' : ''}`;
      button.dataset.category = item.id;
      button.setAttribute('aria-pressed', String(state.activeCategory === item.id));
      button.innerHTML = `<span data-icon="${escapeAttr(iconName(item.icon))}"></span><span>${escapeHtml(item.label)}</span><span class="filter-count">${item.count}</span>`;
      container.appendChild(button);
    });
  }

  function getFilteredMenu() {
    const query = state.searchQuery.trim().toLocaleLowerCase('id-ID');
    let items = state.menu.filter(item => {
      const categoryMatch = state.activeCategory === 'all'
        || (state.activeCategory === 'wishlist-only' && state.wishlist.includes(item.id))
        || item.category === state.activeCategory;
      if (!categoryMatch) return false;
      if (state.availableOnly && !item.available) return false;
      if (Number.isFinite(state.minPrice) && item.price < state.minPrice) return false;
      if (Number.isFinite(state.maxPrice) && item.price > state.maxPrice) return false;
      if (!query) return true;
      return `${item.name} ${item.description} ${item.tags.join(' ')} ${item.allergens.join(' ')}`.toLocaleLowerCase('id-ID').includes(query);
    });

    items = [...items];
    if (state.sort === 'price-asc') items.sort((a, b) => a.price - b.price);
    if (state.sort === 'price-desc') items.sort((a, b) => b.price - a.price);
    if (state.sort === 'name-asc') items.sort((a, b) => a.name.localeCompare(b.name, 'id'));
    if (state.sort === 'name-desc') items.sort((a, b) => b.name.localeCompare(a.name, 'id'));
    return items;
  }

  function renderMenu() {
    const container = document.getElementById('menu-categories-wrapper');
    const pagination = document.getElementById('pagination');
    const resultText = document.getElementById('menu-result-count');
    if (!container) return;

    const filtered = getFilteredMenu();
    document.querySelectorAll('.menu-toolbar, #filter-buttons-container, #advanced-menu-filters, .menu-result-bar').forEach(el => { el.hidden = state.menu.length === 0; });
    if (resultText) resultText.textContent = `${filtered.length} menu`;
    container.replaceChildren();
    if (pagination) pagination.replaceChildren();

    if (!state.menu.length) {
      const empty = createEmptyState(
        'Menu belum tersedia',
        state.menuSource === 'network' ? 'Menu belum tersedia saat ini. Silakan cek kembali nanti.' : 'Katalog belum dapat dimuat dari jaringan maupun cache.'
      );
      if (state.menuSource !== 'network') {
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'btn btn-soft btn-sm';
        retry.innerHTML = '<span data-icon="refresh"></span>Coba lagi';
        retry.addEventListener('click', () => location.reload());
        empty.appendChild(retry);
        renderIcons(empty);
      }
      container.appendChild(empty);
      return;
    }

    if (!filtered.length) {
      const activeCategory = categories().find(cat => cat.id === state.activeCategory);
      const title = state.activeCategory === 'wishlist-only'
        ? 'Belum ada favorit'
        : activeCategory && !state.searchQuery
          ? `Belum ada menu ${activeCategory.label}`
          : 'Menu tidak ditemukan';
      const advancedActive = state.availableOnly || Number.isFinite(state.minPrice) || Number.isFinite(state.maxPrice);
      const text = state.activeCategory === 'wishlist-only'
        ? 'Belum ada menu yang disimpan ke favorit.'
        : advancedActive
          ? 'Tidak ada menu yang cocok dengan filter ketersediaan atau rentang harga. Ubah filter lalu coba lagi.'
          : activeCategory && !state.searchQuery
            ? `Kategori ${activeCategory.label} tersedia, tetapi belum memiliki produk aktif di katalog.`
            : 'Ubah kata pencarian atau pilih kategori lain.';
      container.appendChild(createEmptyState(title, text));
      return;
    }

    const pageSize = state.page === 'home'
      ? Math.max(1, Number(settings().menuPreviewLimit) || 6)
      : Math.max(1, Number(settings().menuPageSize) || 12);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    const start = (state.currentPage - 1) * pageSize;
    const visible = filtered.slice(start, start + pageSize);

    const grid = document.createElement('div');
    grid.className = 'menu-grid';
    visible.forEach(item => grid.appendChild(createMenuCard(item)));
    container.appendChild(grid);

    if (totalPages > 1 && pagination) renderPagination(pagination, totalPages);
    wireImageFallbacks(container);
    renderIcons(container);
  }

  function createMenuCard(item) {
    const card = document.createElement('article');
    card.className = `menu-card${item.available ? '' : ' is-unavailable'}`;
    card.dataset.itemId = item.id;
    const category = categories().find(cat => cat.id === item.category);
    const wished = state.wishlist.includes(item.id);
    const wishlistEnabled = settings().enableWishlist !== false;

    card.innerHTML = `
      <button type="button" class="menu-media" data-action="quick-view" data-id="${escapeAttr(item.id)}" aria-label="Lihat detail ${escapeAttr(item.name)}">
        ${item.image ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}" loading="lazy" decoding="async">` : ''}
        <span class="media-placeholder"${item.image ? ' hidden' : ''}><span>Gambar belum tersedia</span></span>
        <span class="menu-category-tag">${escapeHtml(category?.label || titleCase(item.category))}</span>
        ${item.badge ? `<span class="menu-badge">${escapeHtml(item.badge)}</span>` : ''}
      </button>
      <div class="menu-card-body">
        <div class="menu-title-row">
          <button type="button" class="menu-title-button" data-action="quick-view" data-id="${escapeAttr(item.id)}">${escapeHtml(item.name)}</button>
          <div class="menu-title-actions">
            <button type="button" class="wishlist-btn share-btn" data-action="share-menu" data-id="${escapeAttr(item.id)}" aria-label="Bagikan ${escapeAttr(item.name)}"><span data-icon="share"></span></button>
            ${wishlistEnabled ? `<button type="button" class="wishlist-btn${wished ? ' active' : ''}" data-action="wishlist" data-id="${escapeAttr(item.id)}" aria-label="${wished ? 'Hapus dari favorit' : 'Tambah ke favorit'}"><span data-icon="heart"></span></button>` : ''}
          </div>
        </div>
        ${item.description ? `<p class="menu-card-desc">${escapeHtml(item.description)}</p>` : ''}
        ${renderProductMeta(item, true)}
        <div class="menu-card-footer">
          <strong class="menu-price">${formatCurrency(item.price)}</strong>
          <button type="button" class="btn btn-primary btn-sm" data-action="add-cart" data-id="${escapeAttr(item.id)}" ${item.available ? '' : 'disabled'}>
            <span data-icon="plus"></span>${item.available ? 'Tambah' : 'Habis'}
          </button>
        </div>
      </div>`;
    return card;
  }

  function createEmptyState(title, text) {
    const box = document.createElement('div');
    box.className = 'empty-state';
    const h = document.createElement('h3');
    h.textContent = title;
    const p = document.createElement('p');
    p.textContent = text;
    box.append(h, p);
    return box;
  }

  function trackRecentlyViewed(id) {
    if (settings().enableRecentlyViewed === false) return;
    const value = String(id || '');
    if (!state.menu.some(item => item.id === value)) return;
    const limit = Math.max(1, Math.min(12, Number(settings().recentlyViewedLimit) || 6));
    state.recentlyViewed = [value, ...state.recentlyViewed.filter(itemId => itemId !== value)].slice(0, limit);
    writeStorage(STORAGE.recentlyViewed, state.recentlyViewed);
    renderRecentlyViewed();
  }

  function renderRecentlyViewed() {
    const section = document.getElementById('recently-viewed-section');
    const container = document.getElementById('recently-viewed-grid');
    if (!section || !container || settings().enableRecentlyViewed === false) {
      if (section) section.hidden = true;
      return;
    }
    const items = state.recentlyViewed.map(id => state.menu.find(item => item.id === id)).filter(Boolean);
    section.hidden = items.length === 0;
    container.replaceChildren();
    const clearButton = section.querySelector('[data-clear-recent]');
    if (clearButton) clearButton.hidden = items.length === 0;
    if (!items.length) return;
    items.forEach(item => container.appendChild(createMenuCard(item)));
    wireImageFallbacks(container);
    renderIcons(container);
  }

  function resetMenuView() {
    state.activeCategory = 'all';
    state.searchQuery = '';
    state.sort = 'default';
    state.availableOnly = false;
    state.minPrice = null;
    state.maxPrice = null;
    state.currentPage = 1;
    const search = document.getElementById('menu-search');
    const sort = document.getElementById('menu-sort');
    const clear = document.getElementById('clear-search-btn');
    if (search) search.value = '';
    if (sort) sort.value = 'default';
    if (clear) clear.hidden = true;
    syncAdvancedFilterInputs();
    hideSearchSuggestions();
    syncUrlState({ push: state.page === 'menu' });
    renderFilters();
    renderMenu();
    showToast('Filter menu direset.');
  }

  async function shareCurrentMenuView() {
    const url = location.href.split('#')[0];
    const title = document.title;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    const copied = await copyText(url);
    showToast(copied ? 'Link katalog disalin.' : 'Link katalog tidak dapat disalin.', copied ? 'success' : 'warning');
  }

  function renderPagination(container, totalPages) {
    const previous = pageButton('chevronLeft', 'Halaman sebelumnya', state.currentPage === 1, () => changePage(state.currentPage - 1));
    container.appendChild(previous);

    const range = paginationRange(state.currentPage, totalPages);
    range.forEach(value => {
      if (value === '…') {
        const dots = document.createElement('span');
        dots.className = 'pagination-dots';
        dots.textContent = '…';
        container.appendChild(dots);
        return;
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `page-btn${value === state.currentPage ? ' active' : ''}`;
      btn.textContent = String(value);
      btn.setAttribute('aria-label', `Halaman ${value}`);
      btn.setAttribute('aria-current', value === state.currentPage ? 'page' : 'false');
      btn.addEventListener('click', () => changePage(value));
      container.appendChild(btn);
    });

    const next = pageButton('chevronRight', 'Halaman berikutnya', state.currentPage === totalPages, () => changePage(state.currentPage + 1));
    container.appendChild(next);
    renderIcons(container);
  }

  function pageButton(icon, label, disabled, handler) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'page-btn';
    btn.disabled = disabled;
    btn.setAttribute('aria-label', label);
    btn.innerHTML = `<span data-icon="${icon}"></span>`;
    btn.addEventListener('click', handler);
    return btn;
  }

  function paginationRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
    if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '…', current - 1, current, current + 1, '…', total];
  }

  function changePage(page) {
    state.currentPage = page;
    syncUrlState();
    renderMenu();
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderPromos() {
    const promos = configArray('promos').filter(isObject);
    document.querySelectorAll('a[href$="#promo"]').forEach(link => link.hidden = promos.length === 0);
    const section = document.getElementById('promo');
    const grid = document.getElementById('promo-grid');
    if (!section || !grid) return;
    section.hidden = promos.length === 0;
    grid.replaceChildren();
    promos.forEach(promo => {
      const card = document.createElement('article');
      card.className = 'promo-card';
      const image = safeAssetUrl(promo.image);
      card.innerHTML = `
        <div class="promo-media">
          ${image ? `<img src="${escapeAttr(image)}" alt="${escapeAttr(String(promo.title || 'Promo'))}" loading="lazy">` : '<span class="media-placeholder"><span>Gambar belum tersedia</span></span>'}
        </div>
        <div class="promo-content">
          ${promo.label ? `<span class="eyebrow">${escapeHtml(String(promo.label))}</span>` : ''}
          <h3>${escapeHtml(String(promo.title || ''))}</h3>
          ${promo.description ? `<p>${escapeHtml(String(promo.description))}</p>` : ''}
        </div>`;
      grid.appendChild(card);
    });
    wireImageFallbacks(grid);
  }

  function renderTestimonials() {
    const testimonials = configArray('testimonials').filter(isObject);
    document.querySelectorAll('a[href$="#testimoni"]').forEach(link => link.hidden = testimonials.length === 0);
    const section = document.getElementById('testimoni');
    const grid = document.getElementById('testimonials-grid');
    if (!section || !grid) return;
    section.hidden = testimonials.length === 0;
    grid.replaceChildren();
    testimonials.forEach(item => {
      const card = document.createElement('article');
      card.className = 'testimonial-card';
      const rating = Math.max(0, Math.min(5, Number(item.rating) || 0));
      card.innerHTML = `
        <div class="testimonial-heading">
          <div>
            <h3>${escapeHtml(String(item.name || ''))}</h3>
            ${rating ? `<div class="rating" aria-label="Rating ${rating} dari 5">${'★'.repeat(Math.round(rating))}</div>` : ''}
          </div>
        </div>
        ${item.text ? `<p>${escapeHtml(String(item.text))}</p>` : ''}`;
      grid.appendChild(card);
    });
  }

  function renderOrderTypes() {
    const container = document.getElementById('order-type-buttons');
    if (!container) return;
    const types = configArray('orderTypes').filter(isObject).map(item => ({
      id: String(item.id ?? '').trim(),
      label: String(item.label ?? item.id ?? '').trim(),
      detailLabel: String(item.detailLabel ?? 'Detail pesanan').trim(),
      detailPlaceholder: String(item.detailPlaceholder ?? '').trim(),
      required: item.required === true,
      fee: Math.max(0, Number(item.fee) || 0)
    })).filter(item => item.id);

    container.replaceChildren();
    if (!types.length) {
      state.orderType = '';
      document.getElementById('order-detail-group')?.setAttribute('hidden', '');
      return;
    }

    if (!types.some(type => type.id === state.orderType)) state.orderType = types[0].id;
    types.forEach(type => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `type-btn${type.id === state.orderType ? ' active' : ''}`;
      btn.dataset.orderType = type.id;
      btn.textContent = type.label;
      btn.setAttribute('aria-pressed', String(type.id === state.orderType));
      container.appendChild(btn);
    });
    updateOrderDetailInput();
  }

  function updateOrderDetailInput() {
    const types = configArray('orderTypes').filter(isObject);
    const current = types.find(item => String(item.id) === state.orderType);
    const group = document.getElementById('order-detail-group');
    const label = document.getElementById('order-detail-label');
    const input = document.getElementById('order-location-input');
    if (!group || !label || !input || !current) return;
    group.hidden = false;
    label.textContent = String(current.detailLabel || 'Detail pesanan');
    input.placeholder = String(current.detailPlaceholder || 'Masukkan detail pesanan');
    input.required = current.required === true;
    input.maxLength = Math.max(20, Math.min(1000, Number(settings().orderDetailMaxLength) || 300));
    input.minLength = String(current.id) === 'delivery'
      ? Math.max(5, Math.min(100, Number(settings().deliveryAddressMinLength) || 10))
      : (current.required === true ? 2 : 0);
    const customer = document.getElementById('customer-name-input');
    const note = document.getElementById('order-note-input');
    if (customer) customer.maxLength = Math.max(20, Math.min(120, Number(settings().customerNameMaxLength) || 80));
    if (note) note.maxLength = Math.max(50, Math.min(1000, Number(settings().orderNoteMaxLength) || 300));
  }

  function renderVoucherArea() {
    const area = document.getElementById('voucher-area');
    if (!area) return;
    const activeVouchers = configArray('vouchers').filter(voucherIsActive);
    area.hidden = activeVouchers.length === 0;
    if (!activeVouchers.length) state.appliedVoucher = null;
  }

  function addToCart(id) {
    const item = state.menu.find(menuItem => menuItem.id === String(id));
    if (!item || !item.available || settings().enableOrdering === false) return;
    const existing = state.cart.find(entry => entry.id === item.id);
    if (existing) existing.qty = Math.min(Math.max(1, Math.min(999, Number(settings().maxCartQuantity) || 99)), existing.qty + 1);
    else state.cart.push({ id: item.id, qty: 1 });
    writeStorage(STORAGE.cart, state.cart);
    renderCart();
    showToast(`${item.name} ditambahkan ke keranjang.`);
  }

  function updateCartQty(id, delta) {
    const item = state.cart.find(entry => entry.id === String(id));
    if (!item) return;
    item.qty += Number(delta) || 0;
    if (item.qty <= 0) state.cart = state.cart.filter(entry => entry.id !== item.id);
    else item.qty = Math.min(Math.max(1, Math.min(999, Number(settings().maxCartQuantity) || 99)), item.qty);
    writeStorage(STORAGE.cart, state.cart);
    renderCart();
  }

  function removeFromCart(id) {
    state.cart = state.cart.filter(entry => entry.id !== String(id));
    writeStorage(STORAGE.cart, state.cart);
    renderCart();
  }

  function clearCart() {
    if (!state.cart.length) return;
    state.cart = [];
    state.appliedVoucher = null;
    writeStorage(STORAGE.cart, state.cart);
    persistOrderDraft();
    const input = document.getElementById('promo-input');
    if (input) input.value = '';
    renderCart();
    showToast('Keranjang dikosongkan.');
  }

  function cartDetailed() {
    return state.cart.map(entry => {
      const item = state.menu.find(menuItem => menuItem.id === entry.id);
      return item ? { ...item, qty: entry.qty, lineTotal: item.price * entry.qty } : null;
    }).filter(Boolean);
  }

  function renderCart() {
    const cartBody = document.getElementById('cart-body');
    const checkout = document.getElementById('checkout-wa-btn');
    const clear = document.getElementById('clear-cart-btn');
    const detailed = cartDetailed();
    const totalQty = detailed.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = detailed.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = calculateDiscount(subtotal);
    const fee = currentOrderFee();
    const total = Math.max(0, subtotal - discount + fee);

    document.querySelectorAll('[data-cart-badge]').forEach(badge => {
      badge.textContent = String(totalQty);
      badge.hidden = totalQty === 0;
    });
    setCartAmount('cart-subtotal-price', subtotal);
    setCartAmount('cart-discount-price', discount, true);
    setCartAmount('cart-fee-price', fee);
    setCartAmount('cart-total-price', total);

    const feeRow = document.getElementById('cart-fee-row');
    if (feeRow) feeRow.hidden = fee <= 0;
    const discountRow = document.getElementById('cart-discount-row');
    if (discountRow) discountRow.hidden = discount <= 0;
    if (checkout) checkout.disabled = !detailed.length || !validWhatsappNumber(business().whatsapp) || settings().enableOrdering === false;
    if (clear) clear.disabled = !detailed.length;
    const copySummary = document.getElementById('copy-order-summary-btn');
    const shareSummary = document.getElementById('share-order-summary-btn');
    if (copySummary) copySummary.disabled = !detailed.length;
    if (shareSummary) shareSummary.disabled = !detailed.length;

    if (!cartBody) return;
    cartBody.replaceChildren();
    if (!detailed.length) {
      cartBody.appendChild(createEmptyState('Keranjang kosong', 'Tambahkan menu untuk mulai membuat pesanan.'));
      return;
    }

    detailed.forEach(item => {
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `
        <div class="cart-thumb">
          ${item.image ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}">` : ''}
          <span class="media-placeholder"${item.image ? ' hidden' : ''}></span>
        </div>
        <div class="cart-item-info">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${formatCurrency(item.lineTotal)}</span>
          <div class="qty-control" aria-label="Jumlah ${escapeAttr(item.name)}">
            <button type="button" data-action="cart-minus" data-id="${escapeAttr(item.id)}" aria-label="Kurangi jumlah"><span data-icon="minus"></span></button>
            <span>${item.qty}</span>
            <button type="button" data-action="cart-plus" data-id="${escapeAttr(item.id)}" aria-label="Tambah jumlah" ${item.qty >= Math.max(1, Math.min(999, Number(settings().maxCartQuantity) || 99)) ? 'disabled' : ''}><span data-icon="plus"></span></button>
          </div>
        </div>
        <button type="button" class="cart-remove" data-action="cart-remove" data-id="${escapeAttr(item.id)}" aria-label="Hapus ${escapeAttr(item.name)}"><span data-icon="trash"></span></button>`;
      cartBody.appendChild(row);
    });
    wireImageFallbacks(cartBody);
    renderIcons(cartBody);
  }

  function setCartAmount(id, amount, negative = false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = `${negative && amount > 0 ? '- ' : ''}${formatCurrency(amount)}`;
  }

  function currentOrderFee() {
    const order = configArray('orderTypes').find(item => isObject(item) && String(item.id) === state.orderType);
    return Math.max(0, Number(order?.fee) || 0);
  }

  function voucherIsActive(voucher) {
    if (!isObject(voucher) || voucher.active === false || !String(voucher.code || '').trim()) return false;
    if (!voucher.expiresAt) return true;
    const expiry = Date.parse(String(voucher.expiresAt));
    return Number.isFinite(expiry) && expiry >= Date.now();
  }

  function calculateDiscount(subtotal) {
    if (!state.appliedVoucher) return 0;
    const voucher = state.appliedVoucher;
    const minOrder = Math.max(0, Number(voucher.minOrder) || 0);
    if (subtotal < minOrder) return 0;
    const value = Math.max(0, Number(voucher.value) || 0);
    let discount = voucher.type === 'fixed' ? Math.min(subtotal, value) : subtotal * (Math.min(100, value) / 100);
    const maxDiscount = Math.max(0, Number(voucher.maxDiscount) || 0);
    if (maxDiscount > 0) discount = Math.min(discount, maxDiscount);
    return Math.min(subtotal, discount);
  }

  function applyVoucher() {
    const input = document.getElementById('promo-input');
    if (!input) return;
    const code = input.value.trim().toUpperCase();
    if (!code) {
      state.appliedVoucher = null;
      persistOrderDraft();
      renderCart();
      showToast('Voucher dilepas.');
      return;
    }
    const voucher = configArray('vouchers').find(item =>
      voucherIsActive(item) && String(item.code || '').trim().toUpperCase() === code
    );
    if (!voucher) {
      state.appliedVoucher = null;
      persistOrderDraft();
      renderCart();
      showToast('Kode voucher tidak valid.', 'warning');
      return;
    }
    state.appliedVoucher = voucher;
    persistOrderDraft();
    renderCart();
    showToast('Voucher diterapkan.');
  }

  function checkoutWhatsApp() {
    const items = cartDetailed();
    const b = business();
    const phone = digitsOnly(b.whatsapp);
    const orderTypes = configArray('orderTypes').filter(isObject);
    const order = orderTypes.find(item => String(item.id) === state.orderType);
    const detailInput = document.getElementById('order-location-input');
    const detail = (detailInput?.value || '').trim().replace(/\s+/g, ' ');
    const customerNameInput = document.getElementById('customer-name-input');
    const orderNoteInput = document.getElementById('order-note-input');
    const customerName = (customerNameInput?.value || '').trim().replace(/\s+/g, ' ');
    const orderNote = (orderNoteInput?.value || '').trim().replace(/\s+/g, ' ');
    const maxDetailLength = Math.max(20, Math.min(1000, Number(settings().orderDetailMaxLength) || 300));
    const maxCustomerNameLength = Math.max(20, Math.min(120, Number(settings().customerNameMaxLength) || 80));
    const maxOrderNoteLength = Math.max(50, Math.min(1000, Number(settings().orderNoteMaxLength) || 300));
    const schedule = getOrderSchedule();

    if (!items.length) {
      showToast('Keranjang masih kosong.', 'warning');
      return;
    }
    if (!validWhatsappNumber(phone)) {
      showToast('Nomor WhatsApp toko tidak valid. Gunakan format kode negara tanpa tanda +.', 'warning');
      return;
    }
    if (settings().enableOrdering === false) {
      showToast('Pemesanan sedang dinonaktifkan.', 'warning');
      return;
    }
    if (items.some(item => !item.available || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > Math.max(1, Math.min(999, Number(settings().maxCartQuantity) || 99)) || !Number.isFinite(item.price) || item.price < 0)) {
      showToast('Keranjang berisi data yang sudah tidak valid. Muat ulang katalog lalu periksa pesanan.', 'warning');
      return;
    }
    if (orderTypes.length && !order) {
      showToast('Pilih tipe pesanan terlebih dahulu.', 'warning');
      document.getElementById('order-type-buttons')?.querySelector('button')?.focus();
      return;
    }
    if (detail.length > maxDetailLength) {
      showToast(`Detail pesanan maksimal ${maxDetailLength} karakter.`, 'warning');
      detailInput?.focus();
      return;
    }
    if (customerName.length > maxCustomerNameLength) {
      showToast(`Nama pemesan maksimal ${maxCustomerNameLength} karakter.`, 'warning');
      customerNameInput?.focus();
      return;
    }
    if (orderNote.length > maxOrderNoteLength) {
      showToast(`Catatan pesanan maksimal ${maxOrderNoteLength} karakter.`, 'warning');
      orderNoteInput?.focus();
      return;
    }
    if (schedule?.invalid) {
      showToast(schedule.reason === 'closed' ? 'Jadwal pesanan berada di luar jam operasional.' : 'Jadwal pesanan tidak valid atau berada di luar rentang yang diizinkan.', 'warning');
      document.getElementById('order-schedule-date')?.focus();
      return;
    }
    if (order?.required === true && !detail) {
      showToast(`${String(order.detailLabel || 'Detail pesanan')} wajib diisi.`, 'warning');
      detailInput?.focus();
      return;
    }
    if (order?.required === true) {
      const minLength = String(order.id) === 'delivery'
        ? Math.max(5, Math.min(100, Number(settings().deliveryAddressMinLength) || 10))
        : 2;
      if (detail.length < minLength) {
        showToast(`${String(order.detailLabel || 'Detail pesanan')} terlalu singkat. Minimal ${minLength} karakter.`, 'warning');
        detailInput?.focus();
        return;
      }
    }

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = calculateDiscount(subtotal);
    const fee = currentOrderFee();
    const total = Math.max(0, subtotal - discount + fee);
    const minimumOrder = Math.max(0, Number(settings().minimumOrderAmount) || 0);
    if (minimumOrder > 0 && subtotal < minimumOrder) {
      showToast(`Minimum pesanan ${formatCurrency(minimumOrder)}.`, 'warning');
      return;
    }
    if (settings().blockOrderingWhenClosed === true && !schedule) {
      const machine = configArray('openingHoursMachine').filter(isObject);
      if (machine.length && !getBusinessOpenStatus(machine).open) {
        showToast('Pemesanan langsung sedang ditutup di luar jam operasional. Pilih jadwal pesanan jika fitur jadwal diaktifkan.', 'warning');
        return;
      }
    }
    if (![subtotal, discount, total].every(Number.isFinite)) {
      showToast('Total pesanan tidak valid. Muat ulang halaman dan coba kembali.', 'warning');
      return;
    }

    const lines = [
      `Halo ${b.name}, saya ingin memesan:`,
      `Referensi: ${orderReference()}`,
      '',
      order ? `Tipe pesanan: ${String(order.label || order.id)}` : ''
    ].filter(Boolean);
    if (schedule) lines.push(`Jadwal pesanan: ${schedule.date} ${schedule.time}`);
    if (customerName) lines.push(`Nama pemesan: ${customerName}`);
    if (detail) lines.push(`${String(order?.detailLabel || 'Detail')}: ${detail}`);
    if (orderNote) lines.push(`Catatan: ${orderNote}`);
    lines.push('', ...items.map((item, index) => `${index + 1}. ${item.name} x${item.qty} — ${formatCurrency(item.lineTotal)}`));
    lines.push('', `Subtotal: ${formatCurrency(subtotal)}`);
    if (discount > 0) lines.push(`Diskon: -${formatCurrency(discount)}`);
    if (fee > 0) lines.push(`Biaya layanan/pengantaran: ${formatCurrency(fee)}`);
    lines.push(`Total: ${formatCurrency(total)}`, '', 'Mohon konfirmasi ketersediaan dan total pesanan. Terima kasih.');

    const message = lines.join('\n');
    if (message.length > 3500) {
      showToast('Pesanan terlalu panjang untuk dikirim sekaligus melalui WhatsApp. Kurangi jumlah item berbeda.', 'warning');
      return;
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function toggleWishlist(id) {
    if (settings().enableWishlist === false) return;
    const value = String(id);
    if (state.wishlist.includes(value)) {
      state.wishlist = state.wishlist.filter(itemId => itemId !== value);
      showToast('Menu dihapus dari favorit.');
    } else if (state.menu.some(item => item.id === value)) {
      state.wishlist.push(value);
      showToast('Menu disimpan ke favorit.');
    }
    writeStorage(STORAGE.wishlist, state.wishlist);
    renderFilters();
    renderMenu();
    updateWishlistCount();
  }

  function updateWishlistCount() {
    document.querySelectorAll('[data-wishlist-count]').forEach(el => {
      el.textContent = String(state.wishlist.length);
    });
  }

  function openQuickView(id, options = {}) {
    const item = state.menu.find(menuItem => menuItem.id === String(id));
    const modal = document.getElementById('quick-view-modal');
    const body = document.getElementById('modal-body');
    if (!item || !modal || !body) return;
    trackRecentlyViewed(item.id);
    if (document.getElementById('cart-drawer')?.classList.contains('active')) closeCart(false);
    state.lastFocusModal = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const category = categories().find(cat => cat.id === item.category);
    body.innerHTML = `
      <div class="modal-detail-grid">
        <div class="modal-detail-media">
          ${item.image ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}">` : ''}
          <span class="media-placeholder"${item.image ? ' hidden' : ''}><span>Gambar belum tersedia</span></span>
        </div>
        <div class="modal-detail-info">
          <span class="eyebrow">${escapeHtml(category?.label || titleCase(item.category))}</span>
          <h2>${escapeHtml(item.name)}</h2>
          <strong class="modal-price">${formatCurrency(item.price)}</strong>
          ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
          ${renderProductMeta(item, false)}
          <div class="modal-action-row">
            <button type="button" class="btn btn-primary btn-lg" data-action="modal-add" data-id="${escapeAttr(item.id)}" ${item.available ? '' : 'disabled'}>
              <span data-icon="bag"></span>${item.available ? 'Tambah ke keranjang' : 'Sedang tidak tersedia'}
            </button>
            <button type="button" class="btn btn-soft btn-lg" data-action="share-menu" data-id="${escapeAttr(item.id)}"><span data-icon="share"></span>Bagikan</button>
            <button type="button" class="btn btn-ghost btn-lg" data-action="copy-menu" data-id="${escapeAttr(item.id)}"><span data-icon="copy"></span>Salin link</button>
          </div>
        </div>
      </div>`;
    wireImageFallbacks(body);
    renderIcons(body);
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    if (state.page === 'menu' && !options.preserveUrl) {
      const url = new URL(location.href);
      url.searchParams.set('item', item.id);
      url.searchParams.set('category', item.category);
      history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      updateSeo();
    }
    document.getElementById('modal-close-btn')?.focus();
  }

  function closeQuickView(restoreFocus = true) {
    const modal = document.getElementById('quick-view-modal');
    if (!modal || !modal.classList.contains('active')) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    if (!document.getElementById('cart-drawer')?.classList.contains('active')) document.body.classList.remove('modal-open');
    if (state.page === 'menu') {
      const url = new URL(location.href);
      if (url.searchParams.has('item')) {
        url.searchParams.delete('item');
        history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        updateSeo();
      }
    }
    if (restoreFocus && state.lastFocusModal?.isConnected) state.lastFocusModal.focus();
    state.lastFocusModal = null;
  }

  function openCart() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (!drawer || !overlay) return;
    if (document.getElementById('quick-view-modal')?.classList.contains('active')) closeQuickView(false);
    state.lastFocusCart = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    drawer.classList.add('active');
    overlay.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    document.getElementById('close-cart-btn')?.focus();
  }

  function closeCart(restoreFocus = true) {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (!drawer || !overlay || !drawer.classList.contains('active')) return;
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    drawer.setAttribute('aria-hidden', 'true');
    if (!document.getElementById('quick-view-modal')?.classList.contains('active')) document.body.classList.remove('modal-open');
    if (restoreFocus && state.lastFocusCart?.isConnected) state.lastFocusCart.focus();
    state.lastFocusCart = null;
  }

  function focusableElements(container) {
    if (!container) return [];
    return [...container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.hidden && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
  }

  function trapFocus(event, container) {
    if (event.key !== 'Tab' || !container) return;
    const focusables = focusableElements(container);
    if (!focusables.length) {
      event.preventDefault();
      container.focus?.();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function bindStaticEvents() {
    document.addEventListener('click', event => {
      const suggestion = event.target.closest('[data-suggestion-id]');
      if (suggestion) {
        selectSearchSuggestion(suggestion.dataset.suggestionId);
        return;
      }
      if (!event.target.closest('.search-box')) hideSearchSuggestions();
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      const id = button.dataset.id;
      const actions = {
        'add-cart': () => addToCart(id),
        'wishlist': () => toggleWishlist(id),
        'quick-view': () => openQuickView(id),
        'share-menu': () => shareMenuItem(id),
        'copy-menu': () => shareMenuItem(id, true),
        'modal-add': () => { addToCart(id); closeQuickView(); },
        'cart-minus': () => updateCartQty(id, -1),
        'cart-plus': () => updateCartQty(id, 1),
        'cart-remove': () => removeFromCart(id)
      };
      actions[action]?.();
    });

    document.getElementById('filter-buttons-container')?.addEventListener('click', event => {
      const btn = event.target.closest('[data-category]');
      if (!btn) return;
      state.activeCategory = btn.dataset.category;
      state.currentPage = 1;
      syncUrlState({ push: state.page === 'menu' });
      renderFilters();
      renderMenu();
    });

    const search = document.getElementById('menu-search');
    const clear = document.getElementById('clear-search-btn');
    search?.addEventListener('input', () => {
      state.searchQuery = search.value;
      state.currentPage = 1;
      clear?.toggleAttribute('hidden', !state.searchQuery);
      syncUrlState();
      renderMenu();
      renderSearchSuggestions();
    });
    search?.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') { if (moveSearchSuggestion(1)) event.preventDefault(); }
      else if (event.key === 'ArrowUp') { if (moveSearchSuggestion(-1)) event.preventDefault(); }
      else if (event.key === 'Enter' && state.suggestionIndex >= 0) {
        const options = document.querySelectorAll('#menu-search-suggestions [data-suggestion-id]');
        const option = options[state.suggestionIndex];
        if (option) { event.preventDefault(); selectSearchSuggestion(option.dataset.suggestionId); }
      } else if (event.key === 'Escape') hideSearchSuggestions();
    });
    clear?.addEventListener('click', () => {
      if (!search) return;
      search.value = '';
      state.searchQuery = '';
      state.currentPage = 1;
      clear.hidden = true;
      search.focus();
      syncUrlState();
      renderMenu();
      hideSearchSuggestions();
    });

    document.getElementById('reset-menu-view-btn')?.addEventListener('click', resetMenuView);
    document.getElementById('share-menu-view-btn')?.addEventListener('click', shareCurrentMenuView);

    document.getElementById('menu-sort')?.addEventListener('change', event => {
      state.sort = event.target.value;
      state.currentPage = 1;
      syncUrlState();
      renderMenu();
    });

    document.getElementById('cart-toggle-btn')?.addEventListener('click', openCart);
    document.getElementById('floating-cart-btn')?.addEventListener('click', openCart);
    document.getElementById('hero-cart-open-btn')?.addEventListener('click', openCart);
    document.getElementById('close-cart-btn')?.addEventListener('click', closeCart);
    document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
    document.getElementById('clear-cart-btn')?.addEventListener('click', clearCart);
    document.getElementById('apply-promo-btn')?.addEventListener('click', applyVoucher);
    document.getElementById('checkout-wa-btn')?.addEventListener('click', checkoutWhatsApp);

    document.getElementById('order-type-buttons')?.addEventListener('click', event => {
      const btn = event.target.closest('[data-order-type]');
      if (!btn) return;
      state.orderType = btn.dataset.orderType;
      persistOrderDraft();
      renderOrderTypes();
      renderCart();
    });

    document.getElementById('order-location-input')?.addEventListener('input', persistOrderDraft);
    document.getElementById('customer-name-input')?.addEventListener('input', persistOrderDraft);
    document.getElementById('order-note-input')?.addEventListener('input', persistOrderDraft);
    document.getElementById('order-schedule-date')?.addEventListener('change', persistOrderDraft);
    document.getElementById('order-schedule-time')?.addEventListener('change', persistOrderDraft);

    document.getElementById('modal-close-btn')?.addEventListener('click', closeQuickView);
    document.getElementById('quick-view-modal')?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeQuickView();
    });

    document.addEventListener('keydown', event => {
      const target = event.target;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
      if (settings().enableKeyboardShortcuts !== false && !typing && event.key === '/') {
        const searchBox = document.getElementById('menu-search');
        if (searchBox) { event.preventDefault(); searchBox.focus(); }
      }
      if (settings().enableKeyboardShortcuts !== false && !typing && event.key.toLowerCase() === 'c' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        openCart();
      }
      const modal = document.getElementById('quick-view-modal');
      const drawer = document.getElementById('cart-drawer');
      if (modal?.classList.contains('active')) trapFocus(event, modal);
      else if (drawer?.classList.contains('active')) trapFocus(event, drawer);
      if (event.key === 'Escape') {
        if (modal?.classList.contains('active')) closeQuickView();
        else if (drawer?.classList.contains('active')) closeCart();
      }
    });

    window.addEventListener('popstate', () => {
      if (state.page !== 'menu') return;
      state.activeCategory = 'all';
      state.searchQuery = '';
      state.sort = 'default';
      state.availableOnly = false;
      state.minPrice = null;
      state.maxPrice = null;
      state.currentPage = 1;
      const searchBox = document.getElementById('menu-search');
      const sortBox = document.getElementById('menu-sort');
      if (searchBox) searchBox.value = '';
      if (sortBox) sortBox.value = 'default';
      syncAdvancedFilterInputs();
      applyUrlState();
      renderFilters();
      renderMenu();
      updateSeo();
      const itemId = new URLSearchParams(location.search).get('item');
      if (itemId && state.menu.some(item => item.id === itemId)) openQuickView(itemId, { preserveUrl: true });
      else closeQuickView(false);
    });

    const backToTop = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
      backToTop?.classList.toggle('active', window.scrollY > 500);
    }, { passive: true });
    backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    window.addEventListener('offline', () => { updateNetworkStatus(); showToast(cacheAgeMessage('Koneksi internet terputus. Katalog cache tetap dapat digunakan.'), 'warning'); });
    window.addEventListener('online', () => { updateNetworkStatus(); showToast('Koneksi internet tersambung kembali.'); });
  }

  function restoreOrderDraft() {
    const draft = isObject(state.orderDraft) ? state.orderDraft : {};
    const orderTypes = configArray('orderTypes').filter(isObject).map(item => String(item.id));
    if (draft.orderType && orderTypes.includes(String(draft.orderType))) state.orderType = String(draft.orderType);
    if (typeof draft.voucherCode === 'string' && draft.voucherCode.trim()) {
      state.appliedVoucher = configArray('vouchers').find(item => voucherIsActive(item) && String(item.code || '').trim().toUpperCase() === draft.voucherCode.trim().toUpperCase()) || null;
    }
    requestAnimationFrame(() => {
      const input = document.getElementById('order-location-input');
      if (input && typeof draft.detail === 'string') input.value = draft.detail.slice(0, Math.max(20, Number(settings().orderDetailMaxLength) || 300));
      const customer = document.getElementById('customer-name-input');
      const note = document.getElementById('order-note-input');
      if (customer && typeof draft.customerName === 'string') customer.value = draft.customerName.slice(0, Math.max(20, Number(settings().customerNameMaxLength) || 80));
      if (note && typeof draft.orderNote === 'string') note.value = draft.orderNote.slice(0, Math.max(50, Number(settings().orderNoteMaxLength) || 300));
      const scheduleDate = document.getElementById('order-schedule-date');
      const scheduleTime = document.getElementById('order-schedule-time');
      if (scheduleDate && typeof draft.scheduleDate === 'string') scheduleDate.value = draft.scheduleDate;
      if (scheduleTime && typeof draft.scheduleTime === 'string') scheduleTime.value = draft.scheduleTime;
      const promo = document.getElementById('promo-input');
      if (promo && state.appliedVoucher) promo.value = String(state.appliedVoucher.code || '');
      updateOrderScheduleBounds();
      updateOrderDetailInput();
    });
  }

  function persistOrderDraft() {
    const input = document.getElementById('order-location-input');
    const customer = document.getElementById('customer-name-input');
    const note = document.getElementById('order-note-input');
    state.orderDraft = {
      orderType: state.orderType || '',
      detail: String(input?.value || '').slice(0, Math.max(20, Number(settings().orderDetailMaxLength) || 300)),
      customerName: String(customer?.value || '').slice(0, Math.max(20, Number(settings().customerNameMaxLength) || 80)),
      orderNote: String(note?.value || '').slice(0, Math.max(50, Number(settings().orderNoteMaxLength) || 300)),
      scheduleDate: String(document.getElementById('order-schedule-date')?.value || ''),
      scheduleTime: String(document.getElementById('order-schedule-time')?.value || ''),
      voucherCode: state.appliedVoucher ? String(state.appliedVoucher.code || '') : ''
    };
    writeStorage(STORAGE.orderDraft, state.orderDraft);
  }

  function updateNetworkStatus() {
    let badge = document.getElementById('network-status');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'network-status';
      badge.className = 'network-status';
      badge.setAttribute('role', 'status');
      badge.setAttribute('aria-live', 'polite');
      document.body.appendChild(badge);
    }
    const online = navigator.onLine !== false;
    badge.classList.toggle('is-offline', !online);
    badge.innerHTML = `<span data-icon="${online ? 'wifi' : 'wifiOff'}"></span><span>${online ? 'Online' : 'Offline'}</span>`;
    badge.hidden = online;
    renderIcons(badge);
  }

  function initTheme() {
    const saved = localStorage.getItem(STORAGE.theme);
    const preferredDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : preferredDark;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';

    const button = document.getElementById('theme-toggle');
    updateThemeButton();
    button?.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem(STORAGE.theme, next);
      updateThemeButton();
    });
  }

  function updateThemeButton() {
    const button = document.getElementById('theme-toggle');
    const holder = button?.querySelector('[data-icon]');
    const dark = document.documentElement.dataset.theme === 'dark';
    if (button) button.setAttribute('aria-label', dark ? 'Gunakan tema terang' : 'Gunakan tema gelap');
    if (holder && window.DewizaIcons) window.DewizaIcons.set(holder, dark ? 'sun' : 'moon');
  }

  function initPwa() {
    const updateBanner = document.getElementById('pwa-update-banner');
    const updateButton = document.getElementById('pwa-update-btn');
    const dismissButton = document.getElementById('pwa-update-dismiss');

    const showUpdate = registration => {
      if (!registration?.waiting || !navigator.serviceWorker.controller) return;
      state.swRegistration = registration;
      if (updateBanner) updateBanner.hidden = false;
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!state.swUpdateRequested || state.swRefreshing) return;
        state.swRefreshing = true;
        location.reload();
      });

      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(registration => {
          state.swRegistration = registration;
          if (registration.waiting) showUpdate(registration);
          registration.addEventListener('updatefound', () => {
            const installing = registration.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) showUpdate(registration);
            });
          });
          registration.update().catch(() => {});
          cacheMenuAssets();
        }).catch(() => {});
      });
    }

    updateButton?.addEventListener('click', () => {
      const worker = state.swRegistration?.waiting;
      if (!worker) return;
      state.swUpdateRequested = true;
      updateButton.disabled = true;
      updateButton.textContent = 'Memperbarui…';
      worker.postMessage({ type: 'SKIP_WAITING' });
    });
    dismissButton?.addEventListener('click', () => {
      if (updateBanner) updateBanner.hidden = true;
    });

    const install = document.getElementById('pwa-install-btn');
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (install && standalone) install.hidden = true;
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      state.deferredPrompt = event;
      if (install && !standalone) install.hidden = false;
    });
    install?.addEventListener('click', async () => {
      if (!state.deferredPrompt) return;
      state.deferredPrompt.prompt();
      await state.deferredPrompt.userChoice.catch(() => null);
      state.deferredPrompt = null;
      install.hidden = true;
    });
    window.addEventListener('appinstalled', () => {
      state.deferredPrompt = null;
      if (install) install.hidden = true;
    });
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container || !message) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `<span data-icon="${type === 'warning' ? 'alert' : 'check'}"></span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    renderIcons(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    window.setTimeout(() => {
      toast.classList.remove('show');
      window.setTimeout(() => toast.remove(), 200);
    }, 3200);
  }

  function wireImageFallbacks(root = document) {
    root.querySelectorAll('img').forEach(img => {
      if (img.dataset.fallbackBound) return;
      img.dataset.fallbackBound = 'true';
      img.addEventListener('error', () => {
        img.hidden = true;
        img.parentElement?.querySelector('.media-placeholder')?.removeAttribute('hidden');
      }, { once: true });
    });
  }

  function renderIcons(root = document) {
    window.DewizaIcons?.render(root);
  }

  function formatCurrency(value) {
    const b = business();
    try {
      return new Intl.NumberFormat(b.locale || 'id-ID', {
        style: 'currency',
        currency: b.currency || 'IDR',
        maximumFractionDigits: 0
      }).format(Number(value) || 0);
    } catch {
      return `Rp ${new Intl.NumberFormat('id-ID').format(Number(value) || 0)}`;
    }
  }

  function validWhatsappNumber(value) {
    const digits = digitsOnly(value);
    return /^\d{8,15}$/.test(digits) && !/^0/.test(digits);
  }

  function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function titleCase(value) {
    return String(value || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  function iconName(value) {
    const map = { 'cup-soda': 'cup', 'shopping-cart': 'cart', 'shopping-bag': 'bag', 'map-pin': 'mapPin' };
    return map[value] || value || 'utensils';
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
  }

  window.DewizaApp = Object.freeze({
    version: '7.0.0',
    refresh: renderAll,
    resetFilters: resetMenuView,
    getStatus: () => ({ menuItems: state.menu.length, cartItems: state.cart.length, favorites: state.wishlist.length, menuSource: state.menuSource, online: navigator.onLine !== false, filters: { category: state.activeCategory, query: state.searchQuery, sort: state.sort, availableOnly: state.availableOnly, minPrice: state.minPrice, maxPrice: state.maxPrice }, cacheSavedAt: state.menuCacheSavedAt || null })
  });
})();
