import EventBus    from '../core/EventBus.js';
import ContactView from '../views/ContactView.js';

/**
 * ContactController
 * Envía el formulario a /api/contact (Nodemailer + WhatsApp)
 * Ya no depende de EmailJS
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
      const res = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Error desconocido');
      }

      // Construir mensaje de éxito según qué canales respondieron
      const channels = [];
      if (result.results?.email)    channels.push('correo electrónico');
      if (result.results?.whatsapp) channels.push('WhatsApp');

      const via = channels.length > 0
        ? `Te contactaremos pronto vía ${channels.join(' y ')}.`
        : 'Tu mensaje fue recibido. Te contactaremos pronto.';

      EventBus.emit('contact:success', {
        msg: `¡Mensaje enviado! ${via}`,
      });

    } catch (err) {
      console.error('[ContactController] Error:', err.message);
      EventBus.emit('contact:error', {
        msg: err.message.includes('Failed to fetch')
          ? 'No hay conexión con el servidor. Escríbenos directamente por WhatsApp.'
          : err.message,
      });
    }
  }
}
