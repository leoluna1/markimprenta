import BaseView from './BaseView.js';
import EventBus from '../core/EventBus.js';

/**
 * ModalView — Modal de detalle de producto
 * Escucha: modal:show { product }
 * Emite:   modal:quote (cuando el usuario pulsa "Cotizar ahora")
 */
export default class ModalView extends BaseView {
  constructor() {
    super('#productModal');
    this._body   = document.getElementById('modalBody');
    this._isOpen = false;
  }

  bind() {
    // Cerrar con botón X
    document.getElementById('modalClose')
      ?.addEventListener('click', () => this.close());

    // Cerrar al hacer clic en el fondo
    this.$el?.addEventListener('click', e => {
      if (e.target === this.$el) this.close();
    });

    // Cerrar con Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this._isOpen) this.close();
    });

    // Botón "Cotizar ahora" dentro del modal
    this.$el?.addEventListener('click', e => {
      if (e.target.closest('[data-action="quote"]')) {
        EventBus.emit('modal:quote');
        this.close();
      }
    });

    // Escuchar evento para abrir
    EventBus.on('modal:show', ({ product }) => this.show(product));
  }

  show(p) {
    if (!this._body || !this.$el) return;

    const price = typeof p.price === 'number'
      ? `Desde $${p.price.toFixed(2)} <small style="font-size:.85rem;font-weight:400;">${this.esc(p.priceUnit ?? '')}</small>`
      : this.esc(p.price ?? 'Consultar');

    const features = p.features?.length
      ? `<ul class="modal-features">
          ${p.features.map(f => `<li><i class="fas fa-check-circle"></i>${this.esc(f)}</li>`).join('')}
         </ul>`
      : '';

    const minQty = p.minQuantity
      ? `<p class="modal-min-qty"><i class="fas fa-info-circle"></i> Cantidad mínima: <strong>${p.minQuantity}</strong> ${this.esc(p.priceUnit ?? 'unidades')}</p>`
      : '';

    this._body.innerHTML = `
      <div class="modal-product">
        <div class="modal-image">${this.esc(p.image ?? '📦')}</div>
        <h2>${this.esc(p.name)}</h2>
        <p class="modal-desc">${this.esc(p.description)}</p>
        <div class="modal-price-badge">${price}</div>
        ${features}
        ${minQty}
        <div class="modal-actions">
          <button class="btn btn-primary" data-action="quote">
            <i class="fas fa-calculator"></i> Cotizar ahora
          </button>
        </div>
      </div>
    `;

    this.$el.classList.add('active');
    document.body.style.overflow = 'hidden';
    this._isOpen = true;
  }

  close() {
    this.$el?.classList.remove('active');
    document.body.style.overflow = '';
    this._isOpen = false;
  }
}
