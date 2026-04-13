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

  _isImagePath(img) {
    if (!img) return false;
    return img.startsWith('/uploads/') || img.startsWith('http') ||
           img.startsWith('images/') || img.startsWith('./') ||
           /\.(jpg|jpeg|png|webp|gif)$/i.test(img);
  }

  _imageHTML(p) {
    if (this._isImagePath(p.image)) {
      return `<img
        src="${p.image}"
        alt="${this.esc(p.name)}"
        style="width:100%;max-height:260px;object-fit:cover;border-radius:12px;"
        onerror="this.style.display='none';this.nextElementSibling.style.display='block';"
      /><span style="display:none;font-size:4rem;text-align:center;width:100%;">📦</span>`;
    }
    return `<span style="font-size:4rem;display:block;text-align:center;">${p.image ?? '📦'}</span>`;
  }

  static CATEGORY_LABELS = {
    'impresion':    { label: 'Impresión',    icon: 'fa-print' },
    'pop':          { label: 'Material POP', icon: 'fa-gift' },
    'packaging':    { label: 'Packaging',    icon: 'fa-box' },
    'etiquetas':    { label: 'Etiquetas',    icon: 'fa-tags' },
    'diseno':       { label: 'Diseño',       icon: 'fa-palette' },
    'gran-formato': { label: 'Gran Formato', icon: 'fa-expand-arrows-alt' },
  };

  show(p) {
    if (!this._body || !this.$el) return;

    const waUrl = `https://wa.me/593996884150?text=${encodeURIComponent('Hola! Me interesa: ' + p.name + '. ¿Pueden darme información y precio?')}`;

    const price = typeof p.price === 'number'
      ? `Desde $${p.price.toFixed(2)}<small> ${this.esc(p.priceUnit ?? '')}</small>`
      : this.esc(p.price ?? 'Consultar');

    const features = p.features?.length
      ? `<ul class="modal-features">
          ${p.features.map(f => `<li><i class="fas fa-check-circle"></i>${this.esc(f)}</li>`).join('')}
         </ul>`
      : '';

    const minQty = p.minQuantity
      ? `<div class="modal-meta-item"><i class="fas fa-layer-group"></i> Cantidad mínima: <strong>${p.minQuantity}</strong> ${this.esc(p.priceUnit ?? 'unidades')}</div>`
      : '';

    const materials = p.materials
      ? `<div class="modal-meta-item"><i class="fas fa-layer-group" style="color:#8b5cf6;"></i> Materiales: <strong>${this.esc(p.materials)}</strong></div>`
      : '';

    const delivery = p.deliveryTime
      ? `<div class="modal-meta-item"><i class="fas fa-clock" style="color:#f97316;"></i> Entrega: <strong>${this.esc(p.deliveryTime)}</strong></div>`
      : '';

    const catInfo = ModalView.CATEGORY_LABELS[p.category];
    const catChip = catInfo
      ? `<span class="modal-cat-chip"><i class="fas ${catInfo.icon}"></i> ${catInfo.label}</span>`
      : '';

    this._body.innerHTML = `
      <div class="modal-product">
        <div class="modal-image">${this._imageHTML(p)}</div>
        <div class="modal-product-info">
          ${catChip}
          <h2 class="modal-product-name">${this.esc(p.name)}</h2>
          <p class="modal-product-desc">${this.esc(p.description)}</p>
          <div class="modal-price-badge">${price}</div>
          ${features}
          <div class="modal-meta">
            ${minQty}
            ${materials}
            ${delivery}
          </div>
          <div class="modal-actions">
            <button class="btn btn-primary" data-action="quote">
              <i class="fas fa-calculator"></i> Cotizar ahora
            </button>
            <a class="btn btn-wa-modal" href="${waUrl}" target="_blank" rel="noopener noreferrer">
              <i class="fab fa-whatsapp"></i> WhatsApp
            </a>
          </div>
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
