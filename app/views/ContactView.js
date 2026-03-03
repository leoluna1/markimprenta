import BaseView from './BaseView.js';
import EventBus from '../core/EventBus.js';

/**
 * ContactView — Formulario de contacto
 * Emite:    contact:submit { name, email, phone, message }
 * Escucha:  contact:loading
 *           contact:success { msg }
 *           contact:error   { msg }
 */
export default class ContactView extends BaseView {
  constructor() {
    super('#contacto');
    this._form       = document.getElementById('contactForm');
    this._submitBtn  = document.getElementById('contactSubmitBtn');
    this._successDiv = document.getElementById('contactSuccessMsg');
    this._errorDiv   = document.getElementById('contactErrorMsg');
  }

  bind() {
    this._form?.addEventListener('submit', e => {
      e.preventDefault();
      const data = {
        name:    document.getElementById('contactName')?.value.trim()    ?? '',
        email:   document.getElementById('contactEmail')?.value.trim()   ?? '',
        phone:   document.getElementById('contactPhone')?.value.trim()   ?? '',
        message: document.getElementById('contactMessage')?.value.trim() ?? '',
      };
      if (this._validate(data)) EventBus.emit('contact:submit', data);
    });

    EventBus.on('contact:loading', ()        => this._setLoading(true));
    EventBus.on('contact:success', ({ msg }) => this._onSuccess(msg));
    EventBus.on('contact:error',   ({ msg }) => this._onError(msg));
  }

  // ── Privados ────────────────────────────────────────────────────────────

  _validate({ name, email, phone, message }) {
    this._clearErrors();
    const errors = [];

    if (!name)    errors.push(['contactName',    'El nombre es requerido.']);
    if (!email)   errors.push(['contactEmail',   'El email es requerido.']);
    if (!message) errors.push(['contactMessage', 'El mensaje es requerido.']);

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push(['contactEmail', 'Ingresa un email válido.']);

    // Teléfono es opcional; si se ingresa, debe tener al menos 7 dígitos
    if (phone && phone.replace(/\D/g, '').length < 7)
      errors.push(['contactPhone', 'Ingresa un número de teléfono válido.']);

    errors.forEach(([id, msg]) => this._showFieldError(id, msg));
    return errors.length === 0;
  }

  _setLoading(on) {
    if (!this._submitBtn) return;
    this._submitBtn.disabled = on;
    this._submitBtn.innerHTML = on
      ? '<i class="fas fa-spinner fa-spin"></i> Enviando...'
      : '<i class="fas fa-paper-plane"></i> Enviar Mensaje';
    // Ocultar mensajes anteriores mientras carga
    if (on) this._hideFeedback();
  }

  _onSuccess(msg) {
    this._setLoading(false);
    this._form?.reset();
    this._clearErrors();
    this._showFeedback('success', msg);

    // Ocultar automáticamente después de 7 s
    setTimeout(() => this._hideFeedback(), 7000);
  }

  _onError(msg) {
    this._setLoading(false);
    this._showFeedback('error', msg);
    setTimeout(() => this._hideFeedback(), 8000);
  }

  _showFeedback(type, msg) {
    const isSuccess = type === 'success';
    const el        = isSuccess ? this._successDiv : this._errorDiv;
    const other     = isSuccess ? this._errorDiv   : this._successDiv;

    if (!el) return;

    // Ocultar el otro si estaba visible
    if (other) other.hidden = true;

    el.querySelector('span').textContent = msg;
    el.hidden = false;

    // Animación suave de entrada
    el.style.opacity   = '0';
    el.style.transform = 'translateY(-6px)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'opacity .3s ease, transform .3s ease';
        el.style.opacity    = '1';
        el.style.transform  = 'translateY(0)';
      });
    });
  }

  _hideFeedback() {
    [this._successDiv, this._errorDiv].forEach(el => {
      if (!el) return;
      el.hidden = true;
      el.style.transition = '';
    });
  }

  _showFieldError(fieldId, msg) {
    const el = document.getElementById(fieldId);
    if (!el) return;
    el.classList.add('input-error');
    const hint = document.createElement('span');
    hint.className   = 'field-hint';
    hint.textContent = msg;
    el.parentNode.appendChild(hint);
  }

  _clearErrors() {
    this._form?.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    this._form?.querySelectorAll('.field-hint').forEach(el => el.remove());
  }
}
