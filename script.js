// ================================================
// 🎨 MARK PUBLICIDAD - JAVASCRIPT
// Versión Profesional con Cotizador Mejorado
// ================================================

// ===== UTILIDAD: detectar si image es ruta o emoji =====
function isImagePath(img) {
    if (!img) return false;
    return img.startsWith('/uploads/') || img.startsWith('http') || img.startsWith('images/') || img.startsWith('./') || /\.(jpg|jpeg|png|webp|gif)$/i.test(img);
}

// ===== VARIABLES GLOBALES =====
let currentFilter = 'todos';
let currentPage = 1;
const productsPerPage = 12;
let isScrolling = false;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    initializeTheme();
    createParticles();
    initializeNavigation();
    initializeAnimations();
    initializeProducts();
    initializePortfolio();
    initializeQuote();
    initializeContact();
    initializeScrollEffects();
    animateCounters();
    initializeMobileMenu();
    initializeVideoCards();
}

// ===== MODO OSCURO =====
function initializeTheme() {
    const btn = document.getElementById('themeToggle');
    const icon = document.getElementById('themeIcon');
    const html = document.documentElement;

    // Recuperar preferencia guardada, o usar preferencia del sistema
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;

    if (isDark) applyTheme('dark', icon, html);

    btn.addEventListener('click', () => {
        const current = html.getAttribute('data-theme') === 'dark';
        applyTheme(current ? 'light' : 'dark', icon, html);
        localStorage.setItem('theme', current ? 'light' : 'dark');
    });
}

function applyTheme(theme, icon, html) {
    if (theme === 'dark') {
        html.setAttribute('data-theme', 'dark');
        icon.className = 'fas fa-sun';
        icon.title = 'Cambiar a modo claro';
    } else {
        html.removeAttribute('data-theme');
        icon.className = 'fas fa-moon';
        icon.title = 'Cambiar a modo oscuro';
    }
}

// ===== PARTÍCULAS SUTILES =====
function createParticles() {
    const container = document.getElementById('particles-background');
    if (!container) return;

    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        const size = Math.random() * 4 + 1;
        const left = Math.random() * 100;
        const animationDuration = Math.random() * 20 + 30;
        const animationDelay = Math.random() * 10;
        const opacity = Math.random() * 0.15 + 0.05;

        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: radial-gradient(circle, 
                rgba(0, 113, 227, ${opacity}) 0%, 
                transparent 70%);
            border-radius: 50%;
            left: ${left}%;
            bottom: -10%;
            animation: floatUpSlow ${animationDuration}s linear ${animationDelay}s infinite;
            pointer-events: none;
        `;

        container.appendChild(particle);
    }

    if (!document.getElementById('particle-animations')) {
        const style = document.createElement('style');
        style.id = 'particle-animations';
        style.textContent = `
            @keyframes floatUpSlow {
                0% {
                    transform: translateY(0) translateX(0);
                    opacity: 0;
                }
                10% {
                    opacity: 0.3;
                }
                90% {
                    opacity: 0.3;
                }
                100% {
                    transform: translateY(-100vh) translateX(${Math.random() * 50 - 25}px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ===== NAVEGACIÓN MEJORADA =====
function initializeNavigation() {
    const nav = document.getElementById('mainNav');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);

            if (targetSection) {
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                const navMenu = document.getElementById('navMenu');
                if (navMenu) {
                    navMenu.classList.remove('active');
                }
            }
        });
    });
}

// ===== MENÚ MÓVIL =====
function initializeMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const menu = document.getElementById('navMenu');

    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            menu.classList.toggle('active');
            toggle.classList.toggle('active');

            const spans = toggle.querySelectorAll('span');
            if (toggle.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translateY(8px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translateY(-8px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }
}

// ===== ANIMACIONES AL SCROLL =====
function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.service-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(50px)';
        card.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });
}

// ===== CONTADORES ANIMADOS =====
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');

    const animateCounter = (counter) => {
        const target = parseInt(counter.getAttribute('data-count'));
        const duration = 2000;
        const increment = target / (duration / 16);
        let current = 0;

        const updateCounter = () => {
            current += increment;
            if (current < target) {
                counter.textContent = Math.floor(current) + '+';
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target + '+';
            }
        };

        updateCounter();
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.target.textContent === '0') {
                animateCounter(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

// ===== CATÁLOGO DE PRODUCTOS =====
// ── Base de datos en memoria (se llena desde la API o desde products-data.js) ──
let productsCache = [];

async function fetchProductsFromAPI() {
    try {
        const r = await fetch('/api/products');
        if (!r.ok) throw new Error('API no disponible');
        productsCache = await r.json();
        return true;
    } catch {
        // Fallback: usar productos del archivo estático
        if (typeof productsDatabase !== 'undefined') {
            productsCache = productsDatabase;
        }
        return false;
    }
}

function initializeProducts() {
    fetchProductsFromAPI().then(() => {
        loadProducts();
        initializeFilters();
    });
}

function loadProducts(filter = 'todos', page = 1) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (productsCache.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--text-dark); padding: 3rem;">
                <h3>Productos en carga...</h3>
            </div>
        `;
        return;
    }

    let filteredProducts = filter === 'todos'
        ? productsCache
        : productsCache.filter(p => p.category === filter);

    const start = (page - 1) * productsPerPage;
    const end = start + productsPerPage;
    const paginatedProducts = filteredProducts.slice(start, end);

    grid.style.opacity = '0';
    grid.style.transform = 'translateY(20px)';

    setTimeout(() => {
        grid.innerHTML = '';

        if (paginatedProducts.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <h3>No se encontraron productos</h3>
                </div>
            `;
        } else {
            paginatedProducts.forEach((product, index) => {
                const card = createProductCard(product, index);
                grid.appendChild(card);
            });
        }

        requestAnimationFrame(() => {
            grid.style.opacity = '1';
            grid.style.transform = 'translateY(0)';
        });

        updatePagination(filteredProducts.length, page);
    }, 300);
}

function createProductCard(product, index) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = `opacity 0.4s ease ${index * 0.06}s, transform 0.4s ease ${index * 0.06}s`;

    const priceDisplay = typeof product.price === 'number'
        ? `Desde ${product.price.toFixed(2)} ${product.priceUnit || ''}`
        : product.price || 'Consultar precio';

    const popularBadge = product.popular
        ? '<span class="badge-popular">Popular</span>'
        : '';

    card.innerHTML = `
        <div class="product-image">
            ${isImagePath(product.image)
            ? `<img src="${product.image}" alt="${product.name}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
            : ''}
        <span style="font-size:4rem; display:${isImagePath(product.image) ? 'none' : 'flex'}; align-items:center; justify-content:center; width:100%; height:100%;">${!isImagePath(product.image) ? (product.image || '📦') : '📦'}</span>
        </div>
        <div class="product-content">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <div class="product-price">
                <span>${priceDisplay}</span>
                <span class="view-btn">Ver detalle <i class="fas fa-arrow-right"></i></span>
            </div>
            <a href="https://wa.me/593996884150?text=${encodeURIComponent('Hola! Me interesa: ' + product.name + '. ¿Me pueden dar más información y precio?')}"
               target="_blank" class="btn-wa-product" onclick="event.stopPropagation()">
                <i class="fab fa-whatsapp"></i> Pedir por WhatsApp
            </a>
        </div>
    `;

    requestAnimationFrame(() => requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
    }));

    card.addEventListener('click', () => openProductModal(product));
    return card;
}

function initializeFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');
            currentFilter = filter;
            currentPage = 1;

            loadProducts(filter, currentPage);
        });
    });
}

function updatePagination(totalItems, currentPage) {
    const totalPages = Math.ceil(totalItems / productsPerPage);
    const pagination = document.getElementById('catalogPagination');

    if (!pagination || totalPages <= 1) {
        if (pagination) pagination.innerHTML = '';
        return;
    }

    let html = '<div style="display: flex; justify-content: center; gap: 0.5rem; flex-wrap: wrap;">';

    for (let i = 1; i <= totalPages; i++) {
        const active = i === currentPage ? 'active' : '';
        html += `
            <button onclick="changePage(${i})" 
                    class="filter-btn ${active}"
                    style="min-width: 45px;">
                ${i}
            </button>
        `;
    }

    html += '</div>';
    pagination.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadProducts(currentFilter, page);

    const catalog = document.getElementById('catalogo');
    if (catalog) {
        catalog.scrollIntoView({ behavior: 'smooth' });
    }
}

function openProductModal(product) {
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('modalBody');

    if (!modal || !modalBody) return;

    const priceDisplay = typeof product.price === 'number'
        ? `Desde $${product.price.toFixed(2)}`
        : product.price || 'Consultar precio';

    const featuresHTML = product.features && product.features.length > 0
        ? `<p class="modal-features-title">Características incluidas</p>
           <ul class="modal-features">
               ${product.features.map(f => `<li><i class="fas fa-check-circle"></i>${f}</li>`).join('')}
           </ul>`
        : '';

    const modalImageHTML = isImagePath(product.image)
        ? `<img src="${product.image}" alt="${product.name}" style="width:100%; max-height:280px; object-fit:cover; border-radius:16px; margin-bottom:1.5rem;">`
        : `<div class="modal-product-icon">${product.image || '📦'}</div>`;

    modalBody.innerHTML = `
        <div style="text-align:center;">
            ${modalImageHTML}
            <h2 class="modal-product-name">${product.name}</h2>
            <p class="modal-product-desc">${product.description}</p>
            <div class="modal-price-badge">${priceDisplay}</div>
        </div>
        ${featuresHTML}
        <div style="margin-top:1.75rem; text-align:center; display:flex; gap:0.75rem; justify-content:center; flex-wrap:wrap;">
            <a id="modalWaBtn" href="#" target="_blank"
               style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.875rem 1.5rem;background:#25d366;color:white;border-radius:980px;font-weight:600;text-decoration:none;font-size:0.9rem;">
                <i class="fab fa-whatsapp"></i> Pedir por WhatsApp
            </a>
            <button onclick="navigateToSection('cotizador'); closeProductModal();" class="btn btn-secondary">
                <i class="fas fa-calculator"></i> Cotizar
            </button>
        </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Actualizar link de WhatsApp con el nombre del producto
    const waBtn = document.getElementById('modalWaBtn');
    if (waBtn) {
        waBtn.href = 'https://wa.me/593996884150?text=' + encodeURIComponent('Hola! Me interesa: ' + product.name + '. ¿Me pueden dar más información y precio?');
    }
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

document.addEventListener('click', (e) => {
    const modal = document.getElementById('productModal');
    if (e.target === modal) {
        closeProductModal();
    }
});

// ===== PORTFOLIO =====
function initializePortfolio() {
    const filterButtons = document.querySelectorAll('.portfolio-filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');

    if (filterButtons.length === 0) return;

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            portfolioItems.forEach((item, index) => {
                const category = item.getAttribute('data-category');

                if (filterValue === 'all' || category === filterValue) {
                    item.style.display = 'block';
                    item.style.animation = `fadeInUp 0.6s ease-out ${index * 0.1}s backwards`;
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
}

// ===== COTIZADOR MEJORADO =====
function initializeQuote() {
    const form = document.getElementById('quoteForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculateQuote();
    });
}

function calculateQuote() {
    const service = document.getElementById('quoteService').value;
    const quantity = parseInt(document.getElementById('quoteQuantity').value);
    const size = document.getElementById('quoteSize').value;
    const material = document.getElementById('quoteMaterial').value;
    const color = document.getElementById('quoteColor').value;
    const finish = document.getElementById('quoteFinish').value;
    const delivery = document.getElementById('quoteDelivery').value;
    const design = document.getElementById('quoteDesign').value;
    const needProof = document.getElementById('quoteProof').checked;
    const needInstall = document.getElementById('quoteInstall').checked;

    if (!service || !quantity) {
        alert('Por favor completa todos los campos obligatorios');
        return;
    }

    const basePrices = {
        'flyers': 0.12, 'tarjetas': 0.20, 'brochures': 0.35, 'catalogos': 1.50,
        'banners': 8.00, 'rollups': 45.00, 'vinilos': 6.50, 'cajas': 0.80,
        'etiquetas': 0.08, 'bolsas': 0.40, 'gorras': 5.00, 'tazas': 4.00,
        'esferos': 0.35, 'diseno-logo': 150.00, 'diseno-completo': 500.00
    };

    let basePrice = basePrices[service] || 0.20;
    let breakdown = [];

    let productCost = 0;
    if (service.includes('diseno')) {
        productCost = basePrice;
        breakdown.push({ label: 'Servicio de Diseño', value: basePrice });
    } else {
        productCost = basePrice * quantity;
        breakdown.push({
            label: `${quantity} unidades × $${basePrice.toFixed(2)}`,
            value: productCost
        });
    }

    const sizeMultipliers = {
        'a6': 0.8, 'a5': 1.0, 'a4': 1.2, 'a3': 1.8,
        'carta': 1.15, 'oficio': 1.3, 'personalizado': 1.5
    };

    if (size && !service.includes('diseno')) {
        const sizeMult = sizeMultipliers[size] || 1;
        if (sizeMult !== 1) {
            const sizeAdj = productCost * (sizeMult - 1);
            productCost *= sizeMult;
            breakdown.push({ label: `Ajuste por Tamaño`, value: sizeAdj });
        }
    }

    const materialMult = {
        'couche115': 1.0, 'couche150': 1.15, 'couche200': 1.35,
        'couche300': 1.6, 'opalina': 1.4, 'adhesivo': 1.25, 'lona': 1.3
    };

    if (material && !service.includes('diseno')) {
        const matMult = materialMult[material] || 1;
        if (matMult !== 1) {
            const matAdj = productCost * (matMult - 1);
            productCost *= matMult;
            breakdown.push({ label: `Material Premium`, value: matAdj });
        }
    }

    const colorCosts = {
        'full-color': 1.0, 'color-frente': 0.7, 'bn': 0.5,
        '1-tinta': 0.6, '2-tintas': 0.75
    };

    if (color && !service.includes('diseno')) {
        const colorMult = colorCosts[color] || 1;
        if (colorMult !== 1) {
            const colorAdj = productCost * (colorMult - 1);
            productCost *= colorMult;
            const label = colorMult < 1 ? 'Descuento B/N' : 'Impresión a Color';
            breakdown.push({ label, value: colorAdj });
        }
    }

    const finishCosts = {
        'ninguno': 0, 'laminado-mate': quantity * 0.05,
        'laminado-brillante': quantity * 0.06, 'barniz-uv': quantity * 0.10,
        'troquelado': quantity * 0.08, 'relieve': quantity * 0.15
    };

    let finishCost = finishCosts[finish] || 0;
    if (finishCost > 0) {
        breakdown.push({ label: `Acabado Especial`, value: finishCost });
    }

    const designCosts = { 'no': 0, 'basico': 25, 'profesional': 50, 'premium': 100 };
    let designCost = designCosts[design] || 0;
    if (designCost > 0) {
        breakdown.push({ label: `Diseño Gráfico`, value: designCost });
    }

    let additionalCosts = 0;
    if (needProof) {
        additionalCosts += 15;
        breakdown.push({ label: `Prueba de Color`, value: 15 });
    }
    if (needInstall) {
        additionalCosts += 50;
        breakdown.push({ label: `Instalación`, value: 50 });
    }

    let subtotal = productCost + finishCost + designCost + additionalCosts;

    let discount = 0, discountPercent = 0;
    if (quantity >= 5000) { discountPercent = 15; discount = subtotal * 0.15; }
    else if (quantity >= 2000) { discountPercent = 10; discount = subtotal * 0.10; }
    else if (quantity >= 1000) { discountPercent = 5; discount = subtotal * 0.05; }

    const deliveryMult = { 'estandar': 1.0, 'express': 1.15, 'urgente': 1.30 };
    let deliveryCost = 0;
    if (deliveryMult[delivery] > 1) {
        deliveryCost = subtotal * (deliveryMult[delivery] - 1);
        breakdown.push({ label: `Entrega Urgente`, value: deliveryCost });
    }

    let total = subtotal + deliveryCost - discount;

    showDetailedQuoteResult({
        service, quantity, size, material, color, finish, delivery, design,
        breakdown, subtotal, discount, discountPercent, total,
        unitPrice: total / (quantity || 1)
    });
}

function showDetailedQuoteResult(data) {
    const resultDiv = document.getElementById('quoteResult');
    const summaryContent = document.getElementById('summaryContent');
    const breakdownList = document.getElementById('breakdownList');
    const subtotalValue = document.getElementById('subtotalValue');
    const discountRow = document.getElementById('discountRow');
    const discountValue = document.getElementById('discountValue');
    const totalValue = document.getElementById('totalValue');
    const unitPrice = document.getElementById('unitPrice');
    const deliveryTime = document.getElementById('deliveryTime');

    if (!resultDiv) return;

    const serviceNames = {
        'flyers': 'Flyers y Volantes', 'tarjetas': 'Tarjetas de Presentación',
        'brochures': 'Brochures', 'catalogos': 'Catálogos', 'banners': 'Banners',
        'rollups': 'Roll-ups', 'vinilos': 'Vinilos', 'cajas': 'Cajas',
        'etiquetas': 'Etiquetas', 'bolsas': 'Bolsas', 'gorras': 'Gorras',
        'tazas': 'Tazas', 'esferos': 'Esferos', 'diseno-logo': 'Diseño de Logo',
        'diseno-completo': 'Identidad Corporativa'
    };

    const deliveryNames = {
        'estandar': '7-10 días hábiles',
        'express': '3-5 días hábiles',
        'urgente': '24-48 horas'
    };

    let summaryHTML = `
        <div class="summary-item">
            <span class="summary-label">Servicio:</span>
            <span class="summary-value">${serviceNames[data.service] || data.service}</span>
        </div>`;

    if (!data.service.includes('diseno')) {
        summaryHTML += `<div class="summary-item">
            <span class="summary-label">Cantidad:</span>
            <span class="summary-value">${data.quantity} unidades</span>
        </div>`;
    }

    summaryContent.innerHTML = summaryHTML;

    let breakdownHTML = '';
    data.breakdown.forEach(item => {
        breakdownHTML += `<div class="breakdown-item">
            <span class="breakdown-label">${item.label}</span>
            <span class="breakdown-value">$${item.value.toFixed(2)}</span>
        </div>`;
    });
    breakdownList.innerHTML = breakdownHTML;

    subtotalValue.textContent = '$' + data.subtotal.toFixed(2);

    if (data.discount > 0) {
        discountRow.style.display = 'flex';
        discountValue.textContent = `-$${data.discount.toFixed(2)} (${data.discountPercent}%)`;
    } else {
        discountRow.style.display = 'none';
    }

    totalValue.textContent = '$' + data.total.toFixed(2);
    unitPrice.textContent = '$' + data.unitPrice.toFixed(2);
    deliveryTime.textContent = 'Entrega estimada: ' + deliveryNames[data.delivery];

    resultDiv.style.display = 'block';
    resultDiv.style.transform = 'scale(0.95)';
    resultDiv.style.opacity = '0';

    setTimeout(() => {
        resultDiv.style.transform = 'scale(1)';
        resultDiv.style.opacity = '1';
        resultDiv.style.transition = 'all 0.5s ease';
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        createConfetti();
    }, 100);
}

// ===== CONTACTO =====
function initializeContact() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        const submitBtn = document.getElementById('contactSubmitBtn');
        const name = document.getElementById('contactName').value;
        const email = document.getElementById('contactEmail').value;
        const message = document.getElementById('contactMessage').value;

        if (!name || !email || !message) {
            e.preventDefault();
            showContactMessage('Por favor completa todos los campos obligatorios', 'error');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            e.preventDefault();
            showContactMessage('Por favor ingresa un email válido', 'error');
            return;
        }

        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        submitBtn.disabled = true;

        // Abrir WhatsApp con los datos del formulario
        const phone = document.getElementById('contactPhone') ? document.getElementById('contactPhone').value : '';
        const msgWA = 'Hola Mark Publicidad!\n\nNombre: ' + name + '\nEmail: ' + email + (phone ? '\nTeléfono: ' + phone : '') + '\n\nMensaje:\n' + document.getElementById('contactMessage').value;
        setTimeout(() => {
            window.open('https://wa.me/593996884150?text=' + encodeURIComponent(msgWA), '_blank');
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Mensaje enviado';
            submitBtn.disabled = false;
            document.getElementById('contactForm').reset();
        }, 800);
    });
}

function showContactMessage(message, type) {
    const successDiv = document.getElementById('contactSuccessMessage');
    const errorDiv = document.getElementById('contactErrorMessage');

    successDiv.style.display = 'none';
    errorDiv.style.display = 'none';

    if (type === 'success') {
        successDiv.textContent = message;
        successDiv.style.display = 'flex';
    } else {
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorDiv.style.display = 'flex';
    }

    setTimeout(() => {
        successDiv.style.display = 'none';
        errorDiv.style.display = 'none';
    }, 5000);
}

// ===== EFECTOS DE SCROLL =====
function initializeScrollEffects() {
    const scrollTop = document.getElementById('scrollTop');

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 500) {
            scrollTop.classList.add('visible');
        } else {
            scrollTop.classList.remove('visible');
        }
    });

    scrollTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ===== NAVEGACIÓN A SECCIONES =====
function navigateToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
            }
        });
    }
}

// ===== CONFETTI =====
function createConfetti() {
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            const colors = ['#0071e3', '#06c', '#28a745', '#ffc107', '#dc3545'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const x = Math.random() * window.innerWidth;
            const rotation = Math.random() * 360;
            const scale = Math.random() * 1 + 0.5;

            confetti.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: -20px;
                width: 10px;
                height: 10px;
                background: ${color};
                transform: rotate(${rotation}deg) scale(${scale});
                pointer-events: none;
                z-index: 10000;
                animation: confettiFall 3s ease-out forwards;
            `;

            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
}

if (!document.getElementById('confetti-animation')) {
    const style = document.createElement('style');
    style.id = 'confetti-animation';
    style.textContent = `
        @keyframes confettiFall {
            0% {
                transform: translateY(0) rotate(0deg);
                opacity: 1;
            }
            100% {
                transform: translateY(100vh) rotate(720deg);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// ===== LOADER DE PÁGINA =====
window.addEventListener('load', () => {
    const loader = document.getElementById('pageLoader');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('hidden');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }, 1500);
    }
});

// ===== VIDEOS: PLAY ON CLICK =====
function initializeVideoCards() {
    document.querySelectorAll('.video-wrapper').forEach(wrapper => {
        const videoId = wrapper.getAttribute('data-id');
        if (!videoId || videoId.startsWith('REEMPLAZA')) return; // sin ID real, no hace nada

        wrapper.addEventListener('click', () => {
            if (wrapper.classList.contains('playing')) return;
            const iframe = wrapper.querySelector('iframe');
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            wrapper.classList.add('playing');
        });
    });
}

// Exponer funciones globalmente
window.navigateToSection = navigateToSection;
window.closeProductModal = closeProductModal;
window.changePage = changePage;

console.log('✨ Mark Publicidad - Sistema cargado correctamente');

// =====================================================
// COTIZADOR NUEVO — Precios reales del catálogo
// =====================================================

const QPRICING = {
    volantes: {
        models: {
            'a6-1c': { label: 'A6 · 1 cara',  type: 'tiers',   tiers: [{qty:1000,total:80},{qty:2000,total:100},{qty:5000,total:249.50}] },
            'a6-2c': { label: 'A6 · 2 caras', type: 'tiers',   tiers: [{qty:1000,total:90},{qty:2000,total:110},{qty:5000,total:175}] },
            'a5-1c': { label: 'A5 · 1 cara',  type: 'perunit', unitPer1000: 3.00, minQty: 1000 },
            'a5-2c': { label: 'A5 · 2 caras', type: 'perunit', unitPer1000: 2.50, minQty: 1000 },
            'a4-1c': { label: 'A4 · 1 cara',  type: 'perunit', unitPer1000: 1.80, minQty: 1000 },
            'a4-2c': { label: 'A4 · 2 caras', type: 'perunit', unitPer1000: 1.60, minQty: 1000 },
        }
    },
    tarjetas: [
        { id: 'brillo-uv',  label: 'Con Brillo UV',     price: 35,  desc: 'Couché 300g · Acabado brillante UV' },
        { id: 'mate',       label: 'Laminado Mate',      price: 55,  desc: 'Couché 300g · Acabado suave elegante' },
        { id: 'uv-sel',     label: 'UV Selectivo',       price: 75,  desc: 'Brillo UV solo en zonas específicas' },
        { id: 'troquelado', label: 'Troquelado',         price: 130, desc: 'Forma o corte personalizado' },
        { id: 'relieve',    label: 'Alto Relieve',       price: 130, desc: 'Textura repujada en 3D' },
    ],
    tazas: [
        { qty: 1,   label: '1 unidad',    pricePerUnit: 4.99 },
        { qty: 6,   label: '6 unidades',  pricePerUnit: 3.50 },
        { qty: 12,  label: '12 unidades', pricePerUnit: 3.00 },
        { qty: 24,  label: '24 unidades', pricePerUnit: 2.50 },
        { qty: 36,  label: '36 unidades', pricePerUnit: 1.80 },
        { qty: 100, label: '100 uds.',    pricePerUnit: 1.60 },
    ],
    rollup: [
        { id: 'lona', label: 'Impresión en Lona',       price: 50, desc: 'Lona mate o brillante · Full color 300dpi' },
        { id: 'pet',  label: 'Impresión en Pet Banner', price: 60, desc: 'Pet banner premium · Full color 300dpi' },
    ]
};

// Estado del cotizador
const QS = {
    tab: 'volantes',
    vol: { model: 'a6-1c', tierIdx: 0, qty: 1000, material: 'couche115', acabado: 'brillante' },
    tarjeta: 'brillo-uv',
    taza: { tipo: 'Clásica Blanca', tierIdx: 0 },
    rollup: { model: 'lona', qty: 1 }
};

function initializeNewQuote() {
    // Tabs
    document.querySelectorAll('.qtab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.qtab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.qform').forEach(f => f.classList.remove('active'));
            btn.classList.add('active');
            QS.tab = btn.dataset.tab;
            const form = document.getElementById('form-' + QS.tab);
            if (form) form.classList.add('active');
            qUpdateResult();
        });
    });

    // qoption buttons (volantes modelo + acabado)
    document.querySelectorAll('.qoption').forEach(btn => {
        btn.addEventListener('click', () => {
            const group = btn.dataset.group;
            document.querySelectorAll(`.qoption[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const val = btn.dataset.val;
            if (group === 'vol-model')   { QS.vol.model = val; qRenderVolTiers(); }
            if (group === 'vol-acabado') { QS.vol.acabado = val; }
            qUpdateResult();
        });
    });

    // Volantes — material
    const volMat = document.getElementById('vol-material');
    if (volMat) volMat.addEventListener('change', () => { QS.vol.material = volMat.value; qUpdateResult(); });

    // Volantes — input cantidad manual
    const volQtyInput = document.getElementById('vol-qty-input');
    if (volQtyInput) volQtyInput.addEventListener('input', () => {
        const m = QPRICING.volantes.models[QS.vol.model];
        const min = m.minQty || 1000;
        QS.vol.qty = Math.max(min, parseInt(volQtyInput.value) || min);
        qUpdateResult();
    });

    // Taza — tipo
    const tazaTipo = document.getElementById('taza-tipo');
    if (tazaTipo) tazaTipo.addEventListener('change', () => { QS.taza.tipo = tazaTipo.value; qUpdateResult(); });

    // Roll Up — cantidad
    const rollupQty = document.getElementById('rollup-qty');
    if (rollupQty) rollupQty.addEventListener('input', () => {
        QS.rollup.qty = Math.max(1, parseInt(rollupQty.value) || 1);
        qUpdateResult();
    });

    // Render estático tarjetas y rollup
    qRenderTarjetas();
    qRenderRollup();
    qRenderVolTiers();
    qRenderTazaTiers();
    qUpdateResult();
}

function qRenderVolTiers() {
    const m = QPRICING.volantes.models[QS.vol.model];
    const tiersWrapper  = document.getElementById('vol-tiers-wrapper');
    const customWrapper = document.getElementById('vol-custom-wrapper');
    const tierBtns      = document.getElementById('vol-tier-buttons');
    const minLabel      = document.getElementById('vol-min-label');
    const priceHint     = document.getElementById('vol-price-hint');

    if (!tiersWrapper) return;

    if (m.type === 'tiers') {
        tiersWrapper.style.display = 'block';
        customWrapper.style.display = 'none';
        tierBtns.innerHTML = m.tiers.map((t, i) =>
            `<button class="qtier-btn${i === QS.vol.tierIdx ? ' active' : ''}" data-tiridx="${i}">
                <span class="tier-qty">${t.qty.toLocaleString()}</span>
                <span class="tier-price">${t.total}</span>
            </button>`
        ).join('');
        tierBtns.querySelectorAll('.qtier-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                QS.vol.tierIdx = parseInt(btn.dataset.tiridx);
                tierBtns.querySelectorAll('.qtier-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                qUpdateResult();
            });
        });
    } else {
        tiersWrapper.style.display = 'none';
        customWrapper.style.display = 'block';
        const min = m.minQty || 1000;
        minLabel.textContent = min.toLocaleString();
        priceHint.textContent = `Precio: ${m.unitPer1000.toFixed(2)} por cada 1000 unidades`;
        const inp = document.getElementById('vol-qty-input');
        inp.min = min;
        inp.value = Math.max(QS.vol.qty, min);
        QS.vol.qty = parseInt(inp.value);
    }
}

function qRenderTazaTiers() {
    const container = document.getElementById('taza-tier-buttons');
    if (!container) return;
    container.innerHTML = QPRICING.tazas.map((t, i) =>
        `<button class="qtier-btn${i === QS.taza.tierIdx ? ' active' : ''}" data-tazaidx="${i}">
            <span class="tier-qty">${t.label}</span>
            <span class="tier-price">${t.pricePerUnit.toFixed(2)} c/u</span>
        </button>`
    ).join('');
    container.querySelectorAll('.qtier-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            QS.taza.tierIdx = parseInt(btn.dataset.tazaidx);
            container.querySelectorAll('.qtier-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            qUpdateResult();
        });
    });
}

function qRenderTarjetas() {
    const container = document.getElementById('tarjetas-options');
    if (!container) return;
    container.innerHTML = QPRICING.tarjetas.map(t =>
        `<button class="qtarjeta-option${t.id === QS.tarjeta ? ' active' : ''}" data-tid="${t.id}">
            <div class="qtarjeta-info">
                <div class="name">${t.label}</div>
                <div class="desc">${t.desc}</div>
            </div>
            <div class="qtarjeta-price">${t.price}</div>
        </button>`
    ).join('');
    container.querySelectorAll('.qtarjeta-option').forEach(btn => {
        btn.addEventListener('click', () => {
            QS.tarjeta = btn.dataset.tid;
            container.querySelectorAll('.qtarjeta-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            qUpdateResult();
        });
    });
}

function qRenderRollup() {
    const container = document.getElementById('rollup-options');
    if (!container) return;
    container.innerHTML = QPRICING.rollup.map(r =>
        `<button class="qrollup-option${r.id === QS.rollup.model ? ' active' : ''}" data-rid="${r.id}">
            <div class="qrollup-info">
                <div class="name">${r.label}</div>
                <div class="desc">${r.desc}</div>
            </div>
            <div class="qrollup-price">${r.price}</div>
        </button>`
    ).join('');
    container.querySelectorAll('.qrollup-option').forEach(btn => {
        btn.addEventListener('click', () => {
            QS.rollup.model = btn.dataset.rid;
            container.querySelectorAll('.qrollup-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            qUpdateResult();
        });
    });
}

function qCalcResult() {
    switch (QS.tab) {
        case 'volantes': {
            const m = QPRICING.volantes.models[QS.vol.model];
            const mat = { couche115: 'Couché 115g', couche150: 'Couché 150g', bond90: 'Bond 90g' }[QS.vol.material];
            if (m.type === 'tiers') {
                const idx = Math.min(QS.vol.tierIdx, m.tiers.length - 1);
                const t = m.tiers[idx];
                return {
                    total: t.total,
                    qty: t.qty,
                    perUnit: false,
                    detail: `${t.qty.toLocaleString()} uds.`,
                    desc: `${m.label} · ${mat} · Acabado ${QS.vol.acabado} · ${t.qty.toLocaleString()} unidades`
                };
            } else {
                const qty = Math.max(QS.vol.qty, m.minQty);
                const total = (qty / 1000) * m.unitPer1000;
                return {
                    total,
                    qty,
                    perUnit: true,
                    pricePerUnit: m.unitPer1000,
                    detail: `${m.unitPer1000.toFixed(2)} × cada 1000 uds.`,
                    desc: `${m.label} · ${mat} · Acabado ${QS.vol.acabado} · ${qty.toLocaleString()} unidades`
                };
            }
        }
        case 'tarjetas': {
            const t = QPRICING.tarjetas.find(x => x.id === QS.tarjeta);
            return { total: t.price, qty: 1000, perUnit: false,
                detail: '1000 tarjetas',
                desc: `Tarjetas ${t.label} · 8.5×5.2cm · Couché 300g · 1000 unidades` };
        }
        case 'tazas': {
            const t = QPRICING.tazas[QS.taza.tierIdx];
            const total = t.pricePerUnit * t.qty;
            return { total, qty: t.qty, perUnit: true,
                pricePerUnit: t.pricePerUnit,
                detail: `${t.pricePerUnit.toFixed(2)} c/u × ${t.qty}`,
                desc: `Taza ${QS.taza.tipo} · ${t.qty} unidades` };
        }
        case 'rollup': {
            const r = QPRICING.rollup.find(x => x.id === QS.rollup.model);
            const qty = QS.rollup.qty;
            return { total: r.price * qty, qty, perUnit: qty > 1,
                pricePerUnit: r.price,
                detail: qty > 1 ? `${r.price} × ${qty} uds.` : 'Unidad',
                desc: `Roll Up ${r.label} · 80×200cm · ${qty} unidad${qty > 1 ? 'es' : ''}` };
        }
    }
}

function qUpdateResult() {
    const r = qCalcResult();
    if (!r) return;

    const placeholder = document.querySelector('.qresult-placeholder');
    const content     = document.getElementById('qresultContent');
    const priceVal    = document.getElementById('qPriceValue');
    const priceDetail = document.getElementById('qPriceDetail');
    const unitBox     = document.getElementById('qUnitBox');
    const unitVal     = document.getElementById('qUnitValue');
    const detailsBox  = document.getElementById('qDetailsBox');
    const waBtn       = document.getElementById('qWhatsappBtn');

    if (!priceVal) return;

    if (placeholder) placeholder.style.display = 'none';
    if (content) content.style.display = 'block';

    priceVal.textContent    = '
 + r.total.toFixed(2);
    priceDetail.textContent = r.detail;

    if (r.perUnit && r.qty > 1) {
        unitBox.style.display = 'block';
        unitVal.textContent   = '
 + r.pricePerUnit.toFixed(2) + ' por unidad';
    } else {
        unitBox.style.display = 'none';
    }

    detailsBox.textContent = r.desc;

    // WhatsApp
    const msgWA = `Hola! Me interesa cotizar:\n${r.desc}\nPrecio estimado: ${r.total.toFixed(2)} + IVA\n¿Me pueden confirmar disponibilidad?`;
    waBtn.href = 'https://wa.me/593996884150?text=' + encodeURIComponent(msgWA);
}

// Inicializar cotizador nuevo junto con el resto de la app
document.addEventListener('DOMContentLoaded', () => {
    initializeNewQuote();
});
