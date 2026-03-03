import EventBus    from '../core/EventBus.js';
import ContactView from '../views/ContactView.js';
import EMAIL_CONFIG from '../core/emailConfig.js';

/**
 * ContactController
 * Coordina ContactView → EmailJS → feedback al usuario
 */
export default class ContactController {
  constructor() {
    this._view    = new ContactView();
    this._ready   = false; // true una vez que EmailJS está inicializado
  }

  init() {
    this._view.bind();
    this._initEmailJS();
    EventBus.on('contact:submit', data => this._send(data));
  }

  // ── Privados ────────────────────────────────────────────────────────────

  _initEmailJS() {
    // EmailJS se carga como script global desde index.html
    if (typeof emailjs === 'undefined') {
      console.warn('[ContactController] EmailJS SDK no encontrado. Verifica que el script esté en index.html.');
      return;
    }

    const { PUBLIC_KEY, SERVICE_ID, TEMPLATE_ID } = EMAIL_CONFIG;

    if (PUBLIC_KEY.includes('PEGA_')) {
      console.warn('[ContactController] Configura tus credenciales en app/core/emailConfig.js');
      return;
    }

    emailjs.init({ publicKey: PUBLIC_KEY });
    this._ready = true;
  }

  async _send(data) {
    EventBus.emit('contact:loading');

    // Si las credenciales no están configuradas → modo demo con aviso claro
    if (!this._ready) {
      await new Promise(r => setTimeout(r, 800));
      EventBus.emit('contact:error', {
        msg: 'El servicio de email no está configurado aún. Por favor escríbenos directamente a info@markpublicidad.com',
      });
      return;
    }

    try {
      await emailjs.send(
        EMAIL_CONFIG.SERVICE_ID,
        EMAIL_CONFIG.TEMPLATE_ID,
        {
          from_name:  data.name,
          from_email: data.email,
          phone:      data.phone || 'No proporcionado',
          message:    data.message,
          reply_to:   data.email,
        }
      );

      EventBus.emit('contact:success', {
        msg: '¡Mensaje enviado! Te responderemos a la brevedad.',
      });
    } catch (err) {
      console.error('[ContactController] EmailJS error:', err);

      // Mensajes de error legibles para el usuario
      const friendlyMsg = this._friendlyError(err);
      EventBus.emit('contact:error', { msg: friendlyMsg });
    }
  }

  _friendlyError(err) {
    const status = err?.status ?? 0;
    if (status === 400) return 'Datos inválidos. Revisa tu email e intenta de nuevo.';
    if (status === 401) return 'Error de configuración del servicio de email. Contacta al administrador.';
    if (status === 402) return 'Se alcanzó el límite mensual de emails. Contáctanos directamente por WhatsApp.';
    if (status === 403) return 'Servicio de email bloqueado. Contáctanos directamente por WhatsApp.';
    if (status >= 500)  return 'Error del servidor de email. Por favor intenta en unos minutos.';
    return 'No se pudo enviar el mensaje. Intenta de nuevo o escríbenos por WhatsApp.';
  }
}
