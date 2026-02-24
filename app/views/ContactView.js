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
    this._form    = document.getElementById('contactForm');
    this._overlay = document.getElementById('loadingOverlay');
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

    EventBus.on('contact:loading', ()        => this._overlay?.classList.add('active'));
    EventBus.on('contact:success', ({ msg }) => this._onSuccess(msg));
    EventBus.on('contact:error',   ({ msg }) => this._onError(msg));
  }

  // ── Privados ────────────────────────────────────────────────────────────

  _validate({ name, email, message }) {
    this._clearErrors();
    const errors = [];

    if (!name)    errors.push(['contactName',    'El nombre es requerido.']);
    if (!email)   errors.push(['contactEmail',   'El email es requerido.']);
    if (!message) errors.push(['contactMessage', 'El mensaje es requerido.']);

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push(['contactEmail', 'Ingresa un email válido.']);

    errors.forEach(([id, msg]) => this._showFieldError(id, msg));
    return errors.length === 0;
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

  _onSuccess(msg) {
    this._overlay?.classList.remove('active');
    this._form?.reset();
    this._clearErrors();
    this._showBanner('contact-success-banner', `<i class="fas fa-check-circle"></i> ${msg}`);
  }

  _onError(msg) {
    this._overlay?.classList.remove('active');
    this._showBanner('contact-error-banner', `<i class="fas fa-exclamation-circle"></i> ${msg}`);
  }

  _showBanner(className, html) {
    const banner = document.createElement('div');
    banner.className   = className;
    banner.innerHTML   = html;
    this._form?.parentNode?.prepend(banner);
    setTimeout(() => banner.remove(), 5000);
  }
}
