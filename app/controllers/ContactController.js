import EventBus    from '../core/EventBus.js';
import ContactView from '../views/ContactView.js';

/**
 * ContactController
 * Coordina ContactView ↔ backend (o simulación)
 */
export default class ContactController {
  constructor() {
    this._view = new ContactView();
  }

  init() {
    this._view.bind();

    EventBus.on('contact:submit', data => this._send(data));
  }

  // ── Privados ────────────────────────────────────────────────────────────

  async _send(data) {
    EventBus.emit('contact:loading');
    try {
      /* ── Reemplaza con tu endpoint real en producción ──────────────────
      await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      ──────────────────────────────────────────────────────────────────── */
      // No loguear datos personales en producción
      await new Promise(r => setTimeout(r, 1600)); // simulación

      EventBus.emit('contact:success', {
        msg: '¡Mensaje enviado! Te contactaremos pronto.',
      });
    } catch (err) {
      console.error('[ContactController]', err);
      EventBus.emit('contact:error', {
        msg: 'Error al enviar. Por favor intenta de nuevo.',
      });
    }
  }
}
