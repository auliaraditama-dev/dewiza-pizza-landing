/**
 * Local icon subset based on Lucide icons (ISC).
 * Bundled locally so navigation/icons remain available offline.
 */
(() => {
  const icons = {
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    badgePercent: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m15 9-6 6"/><path d="M9 9h.01"/><path d="M15 15h.01"/>',
    messageCircle: '<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    moon: '<path d="M20 15.2A8 8 0 0 1 8.8 4 8.3 8.3 0 1 0 20 15.2Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.3 10.4a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6"/>',
    bag: '<path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" class="fill-current"/>',
    phone: '<path d="M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-4-1-2 2c-4.2-1.8-7.2-4.8-9-9l2-2-1-4Z"/>',
    mapPin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    pizza: '<path d="M4 20 12 4c5 1 8 4 9 9L4 20Z"/><circle cx="13" cy="10" r="1"/><circle cx="10" cy="14" r="1"/>',
    cup: '<path d="M5 8h12l-1 12H6L5 8ZM17 10h2a2 2 0 0 1 0 4h-2M8 4h6"/>',
    utensils: '<path d="M6 3v7M3 3v4a3 3 0 0 0 6 0V3M6 10v11M15 3v18M15 3c3 2 4 5 4 8h-4"/>',
    sparkles: '<path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14ZM5 13l.8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8L5 13Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    alert: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v4M12 17h.01"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01"/>',
    wifiOff: '<path d="m3 3 18 18M5 9a12 12 0 0 1 6-2M14.5 7.3A12 12 0 0 1 19 10M8.5 13a6 6 0 0 1 5-.7M12 18h.01"/>',
    rotateCcw: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/>',
    copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    refresh: '<path d="M20 6v5h-5M4 18v-5h5M6.1 9a7 7 0 0 1 11.4-2.5L20 11M4 13l2.5 4.5A7 7 0 0 0 17.9 15"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>'
  };

  function renderIcon(el) {
    const key = el.dataset.icon;
    const content = icons[key];
    if (!content) return;
    const size = el.dataset.iconSize || '20';
    const label = el.getAttribute('aria-label');
    el.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"${label ? ` role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : ' aria-hidden="true"'}>${content}</svg>`;
    el.classList.add('icon');
  }

  window.DewizaIcons = {
    render(root = document) {
      root.querySelectorAll('[data-icon]').forEach(renderIcon);
    },
    set(el, name) {
      if (!el) return;
      el.dataset.icon = name;
      renderIcon(el);
    }
  };
})();
