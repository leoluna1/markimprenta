// ================================================
// 🎨 MARK PUBLICIDAD - JAVASCRIPT
// Versión Profesional con Cotizador Mejorado
// ================================================

// ===== UTILIDAD: detectar si image es ruta o emoji =====
function isImagePath(img) {
    if (!img) return false;
    return img.startsWith('http') || img.startsWith('images/') || img.startsWith('./') || img.endsWith('.jpg') || img.endsWith('.png') || img.endsWith('.webp');
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
function initializeProducts() {
    loadProducts();
    initializeFilters();
}

function loadProducts(filter = 'todos', page = 1) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (typeof productsDatabase === 'undefined') {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--text-dark); padding: 3rem;">
                <h3>Productos en carga...</h3>
            </div>
        `;
        return;
    }

    let filteredProducts = filter === 'todos'
        ? productsDatabase
        : productsDatabase.filter(p => p.category === filter);

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
        <div style="margin-top:1.75rem; text-align:center;">
            <button onclick="navigateToSection('cotizador'); closeProductModal();" class="btn btn-primary">
                <i class="fas fa-calculator"></i> Cotizar Ahora
            </button>
        </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
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
