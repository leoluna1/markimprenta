import BaseView from './BaseView.js';
import EventBus from '../core/EventBus.js';

/**
 * CatalogView — Grid de productos, filtros y paginación
 * Emite: catalog:filter { filter }, catalog:page { page }, catalog:open { id }
 */
export default class CatalogView extends BaseView {
  constructor() {
    super('#catalogo');
    this._grid    = document.getElementById('productsGrid');
    this._pag     = document.getElementById('catalogPagination');
    this._count   = document.getElementById('catalogCount');
    this._cardObs = null;
  }

  // Mapa de categorías a etiquetas legibles
  static CATEGORY_LABELS = {
    'impresion':   { label: 'Impresión',    icon: 'fa-print' },
    'pop':         { label: 'Material POP', icon: 'fa-gift' },
    'packaging':   { label: 'Packaging',    icon: 'fa-box' },
    'etiquetas':   { label: 'Etiquetas',    icon: 'fa-tags' },
    'diseno':      { label: 'Diseño',       icon: 'fa-palette' },
    'gran-formato':{ label: 'Gran Formato', icon: 'fa-expand-arrows-alt' },
  };

  bind() {
    // Filtros por categoría
    this.on('click', '.filter-btn[data-filter]', (e, el) => {
      this.$$('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
      EventBus.emit('catalog:filter', { filter: el.dataset.filter });
    });

    // Búsqueda por texto
    document.getElementById('catalogSearch')?.addEventListener('input', e => {
      EventBus.emit('catalog:search', { query: e.target.value });
    });

    // Filtro por precio
    const emitPrice = () => {
      const min = parseFloat(document.getElementById('catalogPriceMin')?.value) || null;
      const max = parseFloat(document.getElementById('catalogPriceMax')?.value) || null;
      EventBus.emit('catalog:price', { min, max });
    };
    document.getElementById('catalogPriceMin')?.addEventListener('change', emitPrice);
    document.getElementById('catalogPriceMax')?.addEventListener('change', emitPrice);

    // Click en tarjeta de producto
    this._grid?.addEventListener('click', e => {
      const card = e.target.closest('.product-card[data-id]');
      if (card) EventBus.emit('catalog:open', { id: +card.dataset.id });
    });
  }

  /**
   * Renderiza el grid con animación de transición.
   * @param {{ items, page, totalPages }} data
   */
  showSkeleton() {
    if (!this._grid) return;
    this._grid.style.opacity   = '1';
    this._grid.style.transform = 'none';
    this._grid.innerHTML = Array(6).fill(0).map(() => `
      <div class="product-card product-skeleton">
        <div class="skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton-line w70"></div>
          <div class="skeleton-line w90"></div>
          <div class="skeleton-line w50"></div>
        </div>
      </div>`).join('');
    if (this._count) this._count.textContent = '';
  }

  renderGrid({ items, page, totalPages, total }) {
    if (!this._grid) return;

    // Fade out
    this._grid.style.transition = 'opacity .22s ease, transform .22s ease';
    this._grid.style.opacity    = '0';
    this._grid.style.transform  = 'translateY(12px)';

    setTimeout(() => {
      this._grid.innerHTML = items.length
        ? items.map((p, i) => this._cardHTML(p, i)).join('')
        : this._emptyHTML();

      // Contador de resultados
      if (this._count) {
        const t = total ?? items.length;
        this._count.textContent = t > 0 ? `${t} producto${t !== 1 ? 's' : ''} encontrado${t !== 1 ? 's' : ''}` : '';
      }

      // Fade in
      requestAnimationFrame(() => {
        this._grid.style.opacity   = '1';
        this._grid.style.transform = 'translateY(0)';
      });

      this._renderPagination({ page, totalPages });
      this._animateCards();
    }, 230);
  }

  // ── Privados ────────────────────────────────────────────────────────────

  _isImagePath(img) {
    if (!img) return false;
    return img.startsWith('/uploads/') || img.startsWith('http') ||
           img.startsWith('images/') || img.startsWith('./') ||
           /\.(jpg|jpeg|png|webp|gif)$/i.test(img);
  }

  _imageHTML(p) {
    if (this._isImagePath(p.image)) {
      const placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      return `<img
        src="${placeholder}"
        data-src="${p.image}"
        alt="${this.esc(p.name)}"
        class="lazy-img"
        style="width:100%;height:100%;object-fit:contain;display:block;padding:8px;"
        onerror="this.src='';this.style.display='none';this.nextElementSibling.style.display='flex';"
      /><span style="display:none;font-size:3.5rem;align-items:center;justify-content:center;width:100%;height:100%;">📦</span>`;
    }
    return `<span style="font-size:3.5rem;display:flex;align-items:center;justify-content:center;width:100%;height:100%;">${p.image ?? '📦'}</span>`;
  }

  _cardHTML(p, i) {
    const priceText = typeof p.price === 'number'
      ? `Desde $${p.price.toFixed(2)}`
      : this.esc(p.price ?? 'Consultar');
    const priceUnit = typeof p.price === 'number' && p.priceUnit
      ? `<span class="price-unit"> ${this.esc(p.priceUnit)}</span>` : '';
    const badge = p.popular
      ? `<span class="product-badge"><i class="fas fa-star"></i> Popular</span>`
      : '';

    const catInfo = CatalogView.CATEGORY_LABELS[p.category];
    const catChip = catInfo
      ? `<span class="product-cat-chip"><i class="fas ${catInfo.icon}"></i> ${catInfo.label}</span>`
      : '';

    return `
      <div class="product-card" data-id="${p.id}" style="animation-delay:${i * 0.07}s">
        ${badge}
        <div class="product-image">
          ${this._imageHTML(p)}
          <div class="product-image-overlay"><i class="fas fa-search-plus"></i> Ver detalle</div>
        </div>
        <div class="product-content">
          ${catChip}
          <h3>${this.esc(p.name)}</h3>
          <p>${this.esc(p.description)}</p>
          <div class="product-price">
            <span>${priceText}${priceUnit}</span>
            <span class="view-btn"><i class="fas fa-arrow-right"></i></span>
          </div>
        </div>
      </div>
    `;
  }

  _emptyHTML() {
    return `
      <div class="catalog-empty">
        <span>🔍</span>
        <h3>Sin resultados</h3>
        <p>Intenta con otra categoría o modifica los filtros de búsqueda</p>
      </div>
    `;
  }

  _renderPagination({ page, totalPages }) {
    if (!this._pag) return;
    if (totalPages <= 1) { this._pag.innerHTML = ''; return; }

    const buttons = Array.from({ length: totalPages }, (_, i) => {
      const n = i + 1;
      return `<button class="filter-btn${n === page ? ' active' : ''}" data-page="${n}">${n}</button>`;
    }).join('');

    this._pag.innerHTML = `<div class="pagination-inner">${buttons}</div>`;

    this._pag.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        EventBus.emit('catalog:page', { page: +btn.dataset.page });
        document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  _animateCards() {
    // Desconectar el observer anterior antes de crear uno nuevo (evita memory leak)
    if (this._cardObs) {
      this._cardObs.disconnect();
      this._cardObs = null;
    }

    this._cardObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.style.opacity   = '1';
        e.target.style.transform = 'translateY(0)';
        this._cardObs?.unobserve(e.target);
      });
    }, { threshold: 0.08 });

    this._grid?.querySelectorAll('.product-card').forEach(card => {
      const delay = card.style.animationDelay || '0s';
      card.style.opacity    = '0';
      card.style.transform  = 'translateY(28px)';
      card.style.transition = `opacity .4s ease ${delay}, transform .4s ease ${delay}`;
      this._cardObs.observe(card);

      // Lazy loading: cargar imagen real al entrar al viewport
      const lazyImg = card.querySelector('img.lazy-img');
      if (lazyImg?.dataset.src) {
        const imgObs = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            lazyImg.src = lazyImg.dataset.src;
            lazyImg.removeAttribute('data-src');
            imgObs.disconnect();
          }
        }, { rootMargin: '100px' });
        imgObs.observe(lazyImg);
      }
    });
  }
}
