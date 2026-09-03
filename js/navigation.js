(() => {
  'use strict';

  const SELECTOR = '[data-navigation]';
  let initialized = false;
  let rafId = 0;
  let links = [];
  let page = 'home';

  function init() {
    if (initialized) return;

    const navs = [...document.querySelectorAll(SELECTOR)];
    if (!navs.length) return;

    initialized = true;
    page = document.body.dataset.page || 'home';
    links = navs.flatMap(nav => [...nav.querySelectorAll('.nav-link')]);

    links.forEach(link => {
      link.addEventListener('click', () => {
        const href = link.getAttribute('href') || '';
        if (href.startsWith('#')) setActiveKey(link.dataset.navKey, 'location');
      });
    });

    window.addEventListener('scroll', requestSync, { passive: true });
    window.addEventListener('resize', requestSync, { passive: true });
    window.addEventListener('hashchange', requestSync);

    const observer = new MutationObserver(requestSync);
    navs.forEach(nav => observer.observe(nav, {
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden']
    }));

    requestSync();
  }

  function requestSync() {
    if (rafId) return;
    rafId = requestAnimationFrame(syncFromViewport);
  }

  function syncFromViewport() {
    rafId = 0;

    if (page === 'menu') {
      const footer = document.getElementById('footer-info');
      const footerVisible = footer && footer.getBoundingClientRect().top < window.innerHeight * 0.72;
      setActiveKey(footerVisible ? 'location' : 'menu', footerVisible ? 'location' : 'page');
      return;
    }

    const localLinks = uniqueVisibleLocalLinks();
    if (!localLinks.length) {
      setActiveKey('home', 'page');
      return;
    }

    const viewportMarker = window.scrollY + (window.innerHeight * 0.32);
    let candidate = localLinks[0];

    localLinks.forEach(link => {
      const selector = link.getAttribute('href');
      const section = selector ? document.querySelector(selector) : null;
      if (!section || section.hidden) return;
      const top = section.getBoundingClientRect().top + window.scrollY;
      if (top <= viewportMarker) candidate = link;
    });

    const footer = document.getElementById('footer-info');
    const locationLink = links.find(link => link.dataset.navKey === 'location' && !link.hidden);
    if (footer && locationLink && footer.getBoundingClientRect().top < window.innerHeight * 0.72) {
      candidate = locationLink;
    }

    setActiveKey(candidate?.dataset.navKey || 'home', 'location');
  }

  function uniqueVisibleLocalLinks() {
    const seen = new Set();
    return links.filter(link => {
      const key = link.dataset.navKey;
      const href = link.getAttribute('href') || '';
      if (!key || seen.has(key) || link.hidden || !href.startsWith('#')) return false;
      seen.add(key);
      return true;
    });
  }

  function setActiveKey(key, currentType = 'page') {
    if (!key) return;

    links.forEach(link => {
      const active = link.dataset.navKey === key;
      link.classList.toggle('active-link', active);
      if (active) link.setAttribute('aria-current', currentType);
      else link.removeAttribute('aria-current');
    });
  }

  window.DewizaNavigation = Object.freeze({ init, refresh: requestSync });
})();
