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
    this._cardObs = null; // referencia al observer actual para desconectarlo en cada recarga
  }

  bind() {
    // Filtros
    this.on('click', '.filter-btn[data-filter]', (e, el) => {
      this.$$('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
      EventBus.emit('catalog:filter', { filter: el.dataset.filter });
    });

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
  renderGrid({ items, page, totalPages }) {
    if (!this._grid) return;

    // Fade out
    this._grid.style.transition = 'opacity .22s ease, transform .22s ease';
    this._grid.style.opacity    = '0';
    this._grid.style.transform  = 'translateY(12px)';

    setTimeout(() => {
      this._grid.innerHTML = items.length
        ? items.map((p, i) => this._cardHTML(p, i)).join('')
        : this._emptyHTML();

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
    return img.startsWith('http') || img.startsWith('images/') ||
           img.endsWith('.jpg') || img.endsWith('.png') ||
           img.endsWith('.webp') || img.endsWith('.jpeg');
  }

  _imageHTML(p) {
    if (this._isImagePath(p.image)) {
      return `<img
        src="${p.image}"
        alt="${this.esc(p.name)}"
        style="width:100%;height:100%;object-fit:cover;display:block;"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
      /><span style="display:none;font-size:3.5rem;align-items:center;justify-content:center;width:100%;height:100%;">📦</span>`;
    }
    return `<span style="font-size:3.5rem;display:flex;align-items:center;justify-content:center;width:100%;height:100%;">${p.image ?? '📦'}</span>`;
  }

  _cardHTML(p, i) {
    const priceText = typeof p.price === 'number'
      ? `Desde ${p.price.toFixed(2)}`
      : this.esc(p.price ?? 'Consultar');
    const priceUnit = typeof p.price === 'number' && p.priceUnit
      ? `<span class="price-unit">${this.esc(p.priceUnit)}</span>` : '';
    const badge = p.popular
      ? `<span class="product-badge">⭐ Popular</span>`
      : '';

    return `
      <div class="product-card" data-id="${p.id}" style="animation-delay:${i * 0.07}s">
        ${badge}
        <div class="product-image">${this._imageHTML(p)}</div>
        <div class="product-content">
          <h3>${this.esc(p.name)}</h3>
          <p>${this.esc(p.description)}</p>
          <div class="product-price">
            <span>${priceText}</span>${priceUnit}
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
        <p>Intenta con otra categoría</p>
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
    });
  }
}
