import BaseView from './BaseView.js';
import EventBus from '../core/EventBus.js';

/**
 * QuoteView — Formulario y panel de resultado del cotizador
 * Emite:    quote:submit { service, quantity, material, size }
 * Escucha:  quote:result { price, discount, breakdown }
 *           quote:error  { msg }
 */
export default class QuoteView extends BaseView {
  constructor() {
    super('#cotizador');
    this._form     = document.getElementById('quoteForm');
    this._panel    = document.getElementById('quoteResult');
    this._details  = document.getElementById('resultDetails');
    this._priceEl  = document.getElementById('priceValue');
    this._priceRaf = null; // id del rAF activo: cancela animaciones previas si el usuario cotiza rápido
  }

  bind() {
    const serviceEl = document.getElementById('quoteService');
    const qtyInput  = document.getElementById('quoteQuantity');
    const qtyLabel  = document.querySelector('label[for="quoteQuantity"]');
    const isSqmSvc  = new Set(['banners', 'vinilos']);

    // Actualizar etiqueta de cantidad según el servicio seleccionado
    serviceEl?.addEventListener('change', () => {
      const sqm = isSqmSvc.has(serviceEl.value);
      if (qtyLabel) qtyLabel.innerHTML = sqm
        ? '<i class="fas fa-vector-square"></i> Metros cuadrados (m²)'
        : '<i class="fas fa-sort-numeric-up"></i> Cantidad';
      if (qtyInput) qtyInput.placeholder = sqm ? '10' : '1000';
    });

    // Submit del formulario
    this._form?.addEventListener('submit', e => {
      e.preventDefault();
      EventBus.emit('quote:submit', {
        service:  serviceEl?.value ?? '',
        quantity: +(qtyInput?.value ?? 0),
        material: document.getElementById('quoteMaterial')?.value ?? 'estandar',
        size:     document.getElementById('quoteSize')?.value     ?? 'pequeno',
      });
    });

    // Resultado exitoso
    EventBus.on('quote:result', result => this._showResult(result));

    // Error de validación
    EventBus.on('quote:error', ({ msg }) => this._showError(msg));
  }

  // ── Privados ────────────────────────────────────────────────────────────

  _showResult({ price, discount, breakdown }) {
    const unit = breakdown.unit ?? 'uds.';
    const qty  = breakdown.quantity;

    const unitPriceHTML = !breakdown.isFixed
      ? `<div class="rb-row">
           <span>Precio unitario</span>
           <strong>${breakdown.unitCost.toFixed(breakdown.unitCost < 1 ? 3 : 2)} / ${unit === 'm²' ? 'm²' : 'u'}</strong>
         </div>`
      : '';

    const discHTML = discount > 0
      ? `<div class="rb-row rb-discount">
           <span><i class="fas fa-tag"></i> Descuento volumen</span>
           <strong class="discount-val">−${(discount * 100).toFixed(0)}%</strong>
         </div>`
      : '';

    const materialHTML = !breakdown.isFixed
      ? `<div class="rb-row"><span>Material</span><strong>${this.esc(breakdown.material)}</strong></div>
         <div class="rb-row"><span>Tamaño</span><strong>${this.esc(breakdown.size)}</strong></div>`
      : '';

    // Tabla de precios por volumen según el servicio
    const tiersHTML = this._tiersHTML(breakdown.service, qty);

    this._details.innerHTML = `
      <div class="result-breakdown">
        <div class="rb-row"><span>Servicio</span><strong>${this.esc(breakdown.service)}</strong></div>
        <div class="rb-row"><span>Cantidad</span><strong>${qty.toLocaleString()} ${unit}</strong></div>
        ${materialHTML}
        ${unitPriceHTML}
        ${discHTML}
        <div class="rb-row rb-delivery">
          <span><i class="fas fa-truck"></i> Entrega est.</span>
          <strong>${this.esc(breakdown.delivery)}</strong>
        </div>
      </div>
      ${tiersHTML}
    `;

    this._animatePrice(price);

    // Animación de entrada del panel
    Object.assign(this._panel.style, {
      transition: 'none',
      opacity:    '0',
      transform:  'scale(.95)',
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        Object.assign(this._panel.style, {
          transition: 'opacity .35s ease, transform .35s ease',
          opacity:    '1',
          transform:  'scale(1)',
        });
      });
    });

    this._launchConfetti();

    setTimeout(() => {
      this._panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
  }

  _showError(msg) {
    if (!document.getElementById('shake-kf')) {
      const s = document.createElement('style');
      s.id = 'shake-kf';
      s.textContent = `
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25%      { transform: translateX(-8px); }
          75%      { transform: translateX(8px); }
        }
        .form-shake { animation: shake .45s ease; }
      `;
      document.head.appendChild(s);
    }
    this._form?.classList.add('form-shake');
    this._form?.addEventListener('animationend', () => this._form.classList.remove('form-shake'), { once: true });

    const alert = document.createElement('div');
    alert.className = 'form-alert';
    alert.textContent = msg;
    this._form?.prepend(alert);
    setTimeout(() => alert.remove(), 4000);
  }

  _animatePrice(target) {
    if (!this._priceEl) return;
    // Cancelar animación anterior si el usuario cotiza dos veces seguidas rápido
    if (this._priceRaf) {
      cancelAnimationFrame(this._priceRaf);
      this._priceRaf = null;
    }
    const steps = 50;
    const inc   = target / steps;
    let cur = 0, n = 0;
    const tick = () => {
      cur += inc; n++;
      this._priceEl.textContent = '$' + cur.toFixed(2);
      if (n < steps) {
        this._priceRaf = requestAnimationFrame(tick);
      } else {
        this._priceEl.textContent = '$' + target.toFixed(2);
        this._priceRaf = null;
      }
    };
    this._priceRaf = requestAnimationFrame(tick);
  }

  /** Tabla de tramos de precio según servicio — resalta el tramo activo */
  _tiersHTML(serviceLabel, qty) {
    const tiers = {
      'Flyers y Volantes': [
        { qty: '100 u',   price: '$0.10/u' },
        { qty: '500 u',   price: '$0.09/u' },
        { qty: '1 000 u', price: '$0.08/u' },
        { qty: '2 000 u', price: '$0.07/u' },
        { qty: '5 000 u', price: '$0.068/u' },
      ],
      'Tarjetas de Presentación': [
        { qty: '100 u',   price: '$0.07/u' },
        { qty: '500 u',   price: '$0.04/u' },
        { qty: '1 000 u', price: '$0.035/u' },
        { qty: '2 000 u', price: '$0.032/u' },
        { qty: '5 000 u', price: '$0.03/u' },
      ],
      'Tazas Sublimadas': [
        { qty: '1 u',    price: '$4.99/u', threshold: 1  },
        { qty: '6 u',    price: '$3.50/u', threshold: 6  },
        { qty: '12 u',   price: '$3.00/u', threshold: 12 },
        { qty: '24 u',   price: '$2.50/u', threshold: 24 },
        { qty: '36 u',   price: '$1.80/u', threshold: 36 },
        { qty: '100 u',  price: '$1.60/u', threshold: 100},
      ],
      'Banners y Lonas': [
        { qty: '1 m²',   price: '$12/m²' },
        { qty: '5 m²',   price: '$10/m²' },
        { qty: '10 m²',  price: '$8/m²'  },
        { qty: '20 m²',  price: '$7.50/m²'},
      ],
      'Roll Ups': [
        { qty: 'Lona',   price: '$50 + IVA' },
        { qty: 'Pet B.', price: '$60 + IVA' },
      ],
    };

    const rows = tiers[serviceLabel];
    if (!rows) return ''; // sin tabla para este servicio

    const isTazas = serviceLabel === 'Tazas Sublimadas';

    const cells = rows.map(r => {
      let active = false;
      if (isTazas && r.threshold !== undefined) {
        // El tramo activo es el máximo umbral que no supera qty
        const maxThreshold = rows
          .filter(x => x.threshold !== undefined && x.threshold <= qty)
          .reduce((max, x) => Math.max(max, x.threshold), 0);
        active = r.threshold === maxThreshold;
      } else if (!isTazas && rows.length > 1) {
        // Para otros servicios, el mayor tramo disponible según qty
        const thresholds = [100, 500, 1000, 2000, 5000];
        const idx = thresholds.filter(t => t <= qty).length - 1;
        active = rows.indexOf(r) === Math.min(idx, rows.length - 1);
      }
      return `<div class="price-tier${active ? ' active' : ''}">
        <span class="tier-qty">${r.qty}</span>
        <span class="tier-price">${r.price}</span>
      </div>`;
    }).join('');

    return `
      <div class="rb-price-tiers">
        <p><i class="fas fa-layer-group"></i> Precios por volumen</p>
        <div class="price-tier-grid" style="grid-template-columns: repeat(${Math.min(rows.length, 3)}, 1fr)">
          ${cells}
        </div>
      </div>
    `;
  }

  _launchConfetti() {
    if (!document.getElementById('confetti-kf')) {
      const s = document.createElement('style');
      s.id = 'confetti-kf';
      s.textContent = `
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `;
      document.head.appendChild(s);
    }

    const colors = ['#0071e3', '#1d1d1f', '#30d158', '#ff9f0a', '#ff375f'];

    for (let i = 0; i < 40; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.style.cssText = `
          position: fixed;
          left: ${Math.random() * window.innerWidth}px;
          top: -8px;
          width: 8px; height: 8px;
          background: ${colors[Math.floor(Math.random() * colors.length)]};
          border-radius: 2px;
          pointer-events: none;
          z-index: 10000;
          transform: rotate(${Math.random() * 360}deg);
          animation: confettiFall 2.4s ease-out forwards;
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2400);
      }, i * 40);
    }
  }
}
