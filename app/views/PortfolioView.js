import BaseView from './BaseView.js';
import EventBus  from '../core/EventBus.js';

const CAT_LABELS = {
  impresion:    'Impresión',
  'gran-formato':'Gran formato',
  packaging:    'Packaging',
  pop:          'Material POP',
  personalizado:'Personalizado',
};

export default class PortfolioView extends BaseView {
  constructor() {
    super('#trabajos');
    this._grid    = document.getElementById('portfolio-grid');
    this._empty   = document.getElementById('portfolio-empty');
    this._filters = document.getElementById('portfolio-filters');
    this._all     = [];
    this._active  = 'all';
  }

  bind() {
    // Filtros
    this._filters?.addEventListener('click', e => {
      const btn = e.target.closest('.pf-btn');
      if (!btn) return;
      this._active = btn.dataset.cat;
      this._filters.querySelectorAll('.pf-btn').forEach(b => b.classList.toggle('active', b === btn));
      this._render(this._all);
    });

    EventBus.on('portfolio:loaded', items => {
      this._all = items;
      this._render(items);
    });
  }

  _render(items) {
    if (!this._grid) return;

    const existing = [...this._grid.querySelectorAll('.portfolio-card')];
    const filtered  = this._active === 'all' ? items : items.filter(i => i.category === this._active);

    if (!existing.length) {
      this._addCards(filtered);
      return;
    }

    // Fade-out antes de quitar las cards actuales
    existing.forEach(c => {
      c.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
      c.style.opacity    = '0';
      c.style.transform  = 'scale(0.92)';
    });
    setTimeout(() => {
      existing.forEach(c => c.remove());
      this._addCards(filtered);
    }, 200);
  }

  _addCards(filtered) {
    if (!this._grid) return;
    if (!filtered.length) {
      if (this._empty) this._empty.style.display = 'flex';
      return;
    }
    if (this._empty) this._empty.style.display = 'none';

    filtered.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'portfolio-card';
      card.style.animationDelay = `${idx * 0.05}s`;
      card.innerHTML = `
        <div class="portfolio-img-wrap">
          <img src="${this.esc(item.image)}" alt="${this.esc(item.title)}" loading="lazy" data-portfolio-image>
          <div class="portfolio-overlay">
            <span class="portfolio-cat-tag">${this.esc(CAT_LABELS[item.category] || item.category)}</span>
          </div>
        </div>
        <div class="portfolio-info">
          <p class="portfolio-title">${this.esc(item.title)}</p>
        </div>`;
      this._grid.appendChild(card);
      card.querySelector('img[data-portfolio-image]')?.addEventListener('error', e => {
        const wrap = e.currentTarget.closest('.portfolio-img-wrap');
        if (!wrap) return;
        const placeholder = document.createElement('div');
        placeholder.className = 'portfolio-img-placeholder';
        placeholder.innerHTML = '<i class="fas fa-image"></i>';
        wrap.replaceChildren(placeholder);
      }, { once: true });
    });
  }
}
