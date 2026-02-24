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
    this._form    = document.getElementById('quoteForm');
    this._panel   = document.getElementById('quoteResult');
    this._details = document.getElementById('resultDetails');
    this._priceEl = document.getElementById('priceValue');
  }

  bind() {
    // Submit del formulario
    this._form?.addEventListener('submit', e => {
      e.preventDefault();
      EventBus.emit('quote:submit', {
        service:  document.getElementById('quoteService')?.value  ?? '',
        quantity: +(document.getElementById('quoteQuantity')?.value ?? 0),
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
    const discHTML = discount > 0
      ? `<p class="result-discount">
           <i class="fas fa-tag"></i>
           Descuento por volumen: <strong>${(discount * 100).toFixed(0)}%</strong>
         </p>`
      : '';

    this._details.innerHTML = `
      <div class="result-breakdown">
        <div class="rb-row"><span>Servicio</span>  <strong>${this.esc(breakdown.service)}</strong></div>
        <div class="rb-row"><span>Cantidad</span>  <strong>${breakdown.quantity.toLocaleString()} uds.</strong></div>
        <div class="rb-row"><span>Material</span>  <strong>${this.esc(breakdown.material)}</strong></div>
        <div class="rb-row"><span>Tamaño</span>    <strong>${this.esc(breakdown.size)}</strong></div>
        ${discHTML}
      </div>
    `;

    this._animatePrice(price);

    // Animación de entrada del panel
    Object.assign(this._panel.style, {
      transition: 'opacity .35s ease, transform .35s ease',
      opacity:    '0',
      transform:  'scale(.95)',
    });
    requestAnimationFrame(() => {
      Object.assign(this._panel.style, { opacity: '1', transform: 'scale(1)' });
    });

    this._launchConfetti();

    setTimeout(() => {
      this._panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
  }

  _showError(msg) {
    // Shake en el formulario
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

    // Banner de error
    const alert = document.createElement('div');
    alert.className = 'form-alert';
    alert.textContent = msg;
    this._form?.prepend(alert);
    setTimeout(() => alert.remove(), 4000);
  }

  _animatePrice(target) {
    if (!this._priceEl) return;
    const steps = 50;
    const inc   = target / steps;
    let cur = 0, n = 0;
    const tick = () => {
      cur += inc; n++;
      this._priceEl.textContent = '$' + cur.toFixed(2);
      if (n < steps) requestAnimationFrame(tick);
      else this._priceEl.textContent = '$' + target.toFixed(2);
    };
    tick();
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
