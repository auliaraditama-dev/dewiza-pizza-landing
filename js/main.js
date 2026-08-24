if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => { })
            .catch(() => { });
    });
}

let deferredPrompt;
const pwaBtn = document.getElementById('pwa-install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaBtn) pwaBtn.classList.remove('hidden');
});

if (pwaBtn) {
    pwaBtn.addEventListener('click', () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    pwaBtn.classList.add('hidden');
                }
                deferredPrompt = null;
            });
        }
    });
}

const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const savedTheme = localStorage.getItem('theme');

if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    if (themeIcon) themeIcon.setAttribute('data-lucide', 'sun');
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (themeIcon) {
            themeIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
        }
        if (window.lucide) lucide.createIcons();
    });
}

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mainNav = document.getElementById('main-nav');

if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener('click', () => {
        mainNav.classList.toggle('active');
    });
}

let menuData = [];
let activeCategory = 'all';
let searchQuery = '';
let currentPage = 1;
const ITEMS_PER_PAGE = 8;

let cart = JSON.parse(localStorage.getItem('dewiza_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('dewiza_wishlist')) || [];
let orderType = 'dinein';
let appliedDiscountRate = 0;

const categoryTitles = {
    pizza: 'Pizza Spesial',
    drinks: 'Minuman Segar',
    sides: 'Side Dishes & Snacks'
};

const categoryIcons = {
    pizza: 'pizza',
    drinks: 'cup-soda',
    sides: 'utensils'
};

const defaultFallbackMenu = [
    { id: 1, name: "Dewiza Supreme Pizza", category: "pizza", price: 65000, description: "Topping daging sapi cincang, sosis premium, jamur segar, dan keju mozarella melimpah.", image: "assets/menu/pizza-supreme.webp" },
    { id: 2, name: "Meat Lover Pizza", category: "pizza", price: 70000, description: "Kombinasi sempurna dari pepperoni gurih, daging sapi berbalut saus spesial khas Dewiza.", image: "assets/menu/pizza-meat.webp" },
    { id: 3, name: "Cheesy Margherita Pizza", category: "pizza", price: 58000, description: "Klasik Margherita dengan saus tomat Italia otentik dan lelehan keju mozarella tebal.", image: "assets/menu/pizza-margherita.webp" },
    { id: 4, name: "Chicken BBQ Pizza", category: "pizza", price: 68000, description: "Potongan ayam panggang berbalut saus BBQ manis gurih dengan paprika segar.", image: "assets/menu/pizza-bbq.webp" },
    { id: 5, name: "Iced Americano", category: "drinks", price: 18000, description: "Ekstrak kopi espresso murni disajikan dingin dan menyegarkan.", image: "assets/menu/drink-americano.webp" },
    { id: 6, name: "Matcha Latte Creamy", category: "drinks", price: 22000, description: "Teh hijau matcha jepang otentik dipadukan susu segar lembut.", image: "assets/menu/drink-matcha.webp" },
    { id: 7, name: "Fresh Lemon Tea", category: "drinks", price: 15000, description: "Seduhan teh pilihan dengan perasan lemon asli penyegar dahaga.", image: "assets/menu/drink-lemontea.webp" },
    { id: 8, name: "Chocolate Hazelnut Shake", category: "drinks", price: 24000, description: "Minuman cokelat hazelnut kental dengan topping whipped cream manis.", image: "assets/menu/drink-chocohazelnut.webp" },
    { id: 9, name: "French Fries Seasoned", category: "sides", price: 15000, description: "Kentang goreng renyah dengan taburan bumbu gurih lezat.", image: "assets/menu/side-fries.webp" },
    { id: 10, name: "Crispy Garlic Bread", category: "sides", price: 17000, description: "Roti panggang mentega bawang gurih dengan taburan keju parut renyah.", image: "assets/menu/side-garlicbread.webp" },
    { id: 11, name: "Mozzarella Cheese Sticks", category: "sides", price: 23000, description: "Stik keju mozzarella goreng tepung renyah yang meleleh di mulut.", image: "assets/menu/side-mozzasticks.webp" },
    { id: 12, name: "Crispy Chicken Wings", category: "sides", price: 25000, description: "Sayap ayam goreng renyah berbumbu pedas manis istimewa.", image: "assets/menu/side-wings.webp" }
];

async function loadMenu() {
    try {
        const response = await fetch('assets/data/menu.json');
        if (!response.ok) throw new Error('File fetch error');
        menuData = await response.json();
    } catch (error) {
        menuData = defaultFallbackMenu;
    }
    updateCategoryCounts();
    renderMenu();
}

function updateCategoryCounts() {
    const countAll = document.getElementById('count-all');
    const countPizza = document.getElementById('count-pizza');
    const countDrinks = document.getElementById('count-drinks');
    const countSides = document.getElementById('count-sides');
    const countWishlist = document.getElementById('count-wishlist');

    if (countAll) countAll.innerText = menuData.length;
    if (countPizza) countPizza.innerText = menuData.filter(i => i.category === 'pizza').length;
    if (countDrinks) countDrinks.innerText = menuData.filter(i => i.category === 'drinks').length;
    if (countSides) countSides.innerText = menuData.filter(i => i.category === 'sides').length;
    if (countWishlist) countWishlist.innerText = wishlist.length;
}

function getFilteredData() {
    return menuData.filter(item => {
        let matchesCategory = false;
        if (activeCategory === 'all') {
            matchesCategory = true;
        } else if (activeCategory === 'wishlist-only') {
            matchesCategory = wishlist.includes(item.id);
        } else {
            matchesCategory = item.category === activeCategory;
        }
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });
}

function renderMenu() {
    const container = document.getElementById('menu-categories-wrapper');
    const paginationContainer = document.getElementById('pagination');
    if (!container) return;

    container.innerHTML = '';
    if (paginationContainer) paginationContainer.innerHTML = '';

    const filteredItems = getFilteredData();

    if (filteredItems.length === 0) {
        container.innerHTML = '<div class="empty-state">Maaf, menu yang Anda cari tidak ditemukan.</div>';
        if (window.lucide) lucide.createIcons();
        return;
    }

    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (activeCategory === 'all' && searchQuery === '') {
        const categories = ['pizza', 'drinks', 'sides'];
        categories.forEach(cat => {
            const itemsInCat = paginatedItems.filter(item => item.category === cat);
            if (itemsInCat.length > 0) {
                const groupEl = document.createElement('div');
                groupEl.className = 'category-group';

                const titleEl = document.createElement('h3');
                titleEl.className = 'category-title';
                titleEl.innerHTML = `<i data-lucide="${categoryIcons[cat] || 'utensils'}" class="filter-icon"></i> ${categoryTitles[cat] || cat}`;
                groupEl.appendChild(titleEl);

                const gridEl = document.createElement('div');
                gridEl.className = 'menu-grid';
                itemsInCat.forEach(item => gridEl.appendChild(createCardElement(item)));

                groupEl.appendChild(gridEl);
                container.appendChild(groupEl);
            }
        });
    } else {
        const gridEl = document.createElement('div');
        gridEl.className = 'menu-grid';
        paginatedItems.forEach(item => gridEl.appendChild(createCardElement(item)));
        container.appendChild(gridEl);
    }

    if (totalPages > 1 && paginationContainer) {
        renderPagination(totalPages);
    }

    if (window.lucide) lucide.createIcons();
}

function createCardElement(item) {
    const card = document.createElement('div');
    card.className = 'menu-card';

    const formattedPrice = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(item.price);

    const isWishlisted = wishlist.includes(item.id);

    card.innerHTML = `
    <div class="menu-card-img-wrapper" onclick="openQuickView(${item.id})">
      <img src="${item.image}" alt="${item.name}" class="menu-card-img" loading="lazy">
      <span class="menu-category-tag">${item.category}</span>
      <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlist(${item.id})" aria-label="Favorit">
        <i data-lucide="heart" class="btn-icon"></i>
      </button>
    </div>
    <div class="menu-card-body">
      <h3 class="menu-card-title" onclick="openQuickView(${item.id})">${item.name}</h3>
      <p class="menu-card-desc">${item.description}</p>
      <div class="menu-card-footer">
        <span class="menu-card-price">${formattedPrice}</span>
        <button class="btn btn-primary btn-sm" onclick="addToCart(${item.id})">
          <i data-lucide="shopping-bag" class="btn-icon"></i> + Keranjang
        </button>
      </div>
    </div>
  `;
    return card;
}

function renderPagination(totalPages) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i data-lucide="chevron-left" class="btn-icon"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderMenu();
        }
    });
    paginationContainer.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.innerText = i;
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderMenu();
        });
        paginationContainer.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '<i data-lucide="chevron-right" class="btn-icon"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderMenu();
        }
    });
    paginationContainer.appendChild(nextBtn);
}

function addToCart(id) {
    const item = menuData.find(i => i.id === id);
    if (!item) return;

    const existing = cart.find(c => c.id === id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...item, qty: 1 });
    }

    saveCart();
    updateCartUI();
    showToast(`${item.name} ditambahkan ke keranjang!`);
}

function updateCartQty(id, delta) {
    const index = cart.findIndex(c => c.id === id);
    if (index !== -1) {
        cart[index].qty += delta;
        if (cart[index].qty <= 0) {
            cart.splice(index, 1);
        }
    }
    saveCart();
    updateCartUI();
}

function removeFromCart(id) {
    cart = cart.filter(c => c.id !== id);
    saveCart();
    updateCartUI();
}

function clearCart() {
    if (cart.length === 0) return;
    cart = [];
    appliedDiscountRate = 0;
    saveCart();
    updateCartUI();
    showToast('Keranjang berhasil dikosongkan.');
}

function saveCart() {
    localStorage.setItem('dewiza_cart', JSON.stringify(cart));
}

function updateCartUI() {
    const cartBody = document.getElementById('cart-body');
    const headerBadge = document.getElementById('header-cart-badge');
    const floatingBadge = document.getElementById('floating-cart-badge');
    const subtotalPriceEl = document.getElementById('cart-subtotal-price');
    const discountPriceEl = document.getElementById('cart-discount-price');
    const totalPriceEl = document.getElementById('cart-total-price');

    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discountAmount = subtotalPrice * appliedDiscountRate;
    const grandTotal = subtotalPrice - discountAmount;

    if (headerBadge) headerBadge.innerText = totalQty;
    if (floatingBadge) floatingBadge.innerText = totalQty;

    const formatCurrency = (val) => new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(val);

    if (subtotalPriceEl) subtotalPriceEl.innerText = formatCurrency(subtotalPrice);
    if (discountPriceEl) discountPriceEl.innerText = `- ${formatCurrency(discountAmount)}`;
    if (totalPriceEl) totalPriceEl.innerText = formatCurrency(grandTotal);

    if (!cartBody) return;

    if (cart.length === 0) {
        cartBody.innerHTML = '<div class="empty-state">Keranjang Anda masih kosong.</div>';
        return;
    }

    cartBody.innerHTML = '';
    cart.forEach(item => {
        const itemPriceFormatted = formatCurrency(item.price * item.qty);

        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-info">
        <div class="cart-item-title">${item.name}</div>
        <div class="cart-item-price">${itemPriceFormatted}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="updateCartQty(${item.id}, -1)">-</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="updateCartQty(${item.id}, 1)">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
        <i data-lucide="trash-2"></i>
      </button>
    `;
        cartBody.appendChild(itemEl);
    });

    if (window.lucide) lucide.createIcons();
}

const clearCartBtn = document.getElementById('clear-cart-btn');
if (clearCartBtn) {
    clearCartBtn.addEventListener('click', clearCart);
}

const orderTypeBtns = document.querySelectorAll('.type-btn');
const orderLocationInput = document.getElementById('order-location-input');

orderTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        orderTypeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        orderType = btn.getAttribute('data-type');

        if (orderLocationInput) {
            if (orderType === 'dinein') {
                orderLocationInput.placeholder = 'Nomor Meja (Contoh: Meja 05)...';
            } else if (orderType === 'takeaway') {
                orderLocationInput.placeholder = 'Nama Pemesan (Contoh: Budi)...';
            } else if (orderType === 'delivery') {
                orderLocationInput.placeholder = 'Alamat Pengiriman Lengkap...';
            }
        }
    });
});

const applyPromoBtn = document.getElementById('apply-promo-btn');
const promoInput = document.getElementById('promo-input');

if (applyPromoBtn && promoInput) {
    applyPromoBtn.addEventListener('click', () => {
        const code = promoInput.value.trim().toUpperCase();
        if (code === 'DEWIZA10') {
            appliedDiscountRate = 0.10;
            showToast('Kode voucher DEWIZA10 berhasil dipasang! (Diskon 10%)');
        } else if (code === '') {
            appliedDiscountRate = 0;
            showToast('Voucher dihapus.', 'warning');
        } else {
            showToast('Kode promo tidak valid.', 'warning');
        }
        updateCartUI();
    });
}

const checkoutWaBtn = document.getElementById('checkout-wa-btn');
if (checkoutWaBtn) {
    checkoutWaBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            showToast('Keranjang belanja Anda masih kosong!', 'warning');
            return;
        }

        const locationVal = orderLocationInput ? orderLocationInput.value.trim() : '';

        let message = `Halo Dewiza Pizza Cafe, saya ingin memesan:\n\n`;
        message += `📌 *Tipe Pesanan:* ${orderType.toUpperCase()}\n`;
        if (locationVal) {
            message += `📍 *Detail/Lokasi:* ${locationVal}\n`;
        }
        message += `---------------------------------\n`;

        let subtotal = 0;
        cart.forEach((item, index) => {
            const itemSubtotal = item.price * item.qty;
            subtotal += itemSubtotal;
            const formatted = new Intl.NumberFormat('id-ID').format(itemSubtotal);
            message += `${index + 1}. ${item.name} (x${item.qty}) = Rp ${formatted}\n`;
        });

        const discountAmount = subtotal * appliedDiscountRate;
        const grandTotal = subtotal - discountAmount;

        message += `---------------------------------\n`;
        message += `Subtotal: Rp ${new Intl.NumberFormat('id-ID').format(subtotal)}\n`;
        if (appliedDiscountRate > 0) {
            message += `Diskon Promo (10%): -Rp ${new Intl.NumberFormat('id-ID').format(discountAmount)}\n`;
        }
        message += `*Total Bayar: Rp ${new Intl.NumberFormat('id-ID').format(grandTotal)}*\n\n`;
        message += `Mohon konfirmasi dan proses pesanan saya. Terima kasih!`;

        const waUrl = `https://wa.me/6282361193797?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    });
}

const cartOverlay = document.getElementById('cart-overlay');
const cartDrawer = document.getElementById('cart-drawer');
const cartToggleBtn = document.getElementById('cart-toggle-btn');
const floatingCartBtn = document.getElementById('floating-cart-btn');
const heroCartOpenBtn = document.getElementById('hero-cart-open-btn');
const closeCartBtn = document.getElementById('close-cart-btn');

function openCart() {
    if (cartDrawer && cartOverlay) {
        cartDrawer.classList.add('active');
        cartOverlay.classList.add('active');
    }
}

function closeCart() {
    if (cartDrawer && cartOverlay) {
        cartDrawer.classList.remove('active');
        cartOverlay.classList.remove('active');
    }
}

if (cartToggleBtn) cartToggleBtn.addEventListener('click', openCart);
if (floatingCartBtn) floatingCartBtn.addEventListener('click', openCart);
if (heroCartOpenBtn) heroCartOpenBtn.addEventListener('click', openCart);
if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

function toggleWishlist(id) {
    const index = wishlist.indexOf(id);
    if (index === -1) {
        wishlist.push(id);
        showToast('Item ditambahkan ke favorit!');
    } else {
        wishlist.splice(index, 1);
        showToast('Item dihapus dari favorit');
    }
    localStorage.setItem('dewiza_wishlist', JSON.stringify(wishlist));
    updateCategoryCounts();
    renderMenu();
}

const quickViewModal = document.getElementById('quick-view-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalBody = document.getElementById('modal-body');

function openQuickView(id) {
    const item = menuData.find(i => i.id === id);
    if (!item || !quickViewModal || !modalBody) return;

    const formattedPrice = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(item.price);

    modalBody.innerHTML = `
    <div class="modal-detail-grid">
      <img src="${item.image}" alt="${item.name}" class="modal-detail-img">
      <div class="modal-detail-info">
        <h2 class="modal-detail-title">${item.name}</h2>
        <div class="modal-detail-price">${formattedPrice}</div>
        <p class="modal-detail-desc">${item.description}</p>
        <button class="btn btn-primary btn-lg" onclick="addToCart(${item.id}); closeQuickView();">
          <i data-lucide="shopping-bag"></i> Tambah ke Keranjang
        </button>
      </div>
    </div>
  `;

    quickViewModal.classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closeQuickView() {
    if (quickViewModal) quickViewModal.classList.remove('active');
}

if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeQuickView);
if (quickViewModal) {
    quickViewModal.addEventListener('click', (e) => {
        if (e.target === quickViewModal) closeQuickView();
    });
}

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i data-lucide="${type === 'warning' ? 'alert-circle' : 'check-circle'}"></i> ${msg}`;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.getAttribute('data-category');
        currentPage = 1;
        renderMenu();
    });
});

const searchInput = document.getElementById('menu-search');
const clearSearchBtn = document.getElementById('clear-search-btn');

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (clearSearchBtn) {
            if (searchQuery.length > 0) clearSearchBtn.classList.remove('hidden');
            else clearSearchBtn.classList.add('hidden');
        }
        currentPage = 1;
        renderMenu();
    });
}

if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        currentPage = 1;
        renderMenu();
    });
}

const backToTopBtn = document.getElementById('back-to-top');
window.addEventListener('scroll', () => {
    if (backToTopBtn) {
        if (window.scrollY > 300) backToTopBtn.classList.add('active');
        else backToTopBtn.classList.remove('active');
    }
});

if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function initCountdown() {
    let hours = 8, minutes = 45, seconds = 12;
    const cdHours = document.getElementById('cd-hours');
    const cdMinutes = document.getElementById('cd-minutes');
    const cdSeconds = document.getElementById('cd-seconds');

    if (!cdHours) return;

    setInterval(() => {
        seconds--;
        if (seconds < 0) {
            seconds = 59;
            minutes--;
            if (minutes < 0) {
                minutes = 59;
                hours--;
                if (hours < 0) {
                    hours = 24;
                }
            }
        }
        cdHours.innerText = hours.toString().padStart(2, '0');
        cdMinutes.innerText = minutes.toString().padStart(2, '0');
        cdSeconds.innerText = seconds.toString().padStart(2, '0');
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    loadMenu();
    updateCartUI();
    initCountdown();
    if (window.lucide) lucide.createIcons();
});