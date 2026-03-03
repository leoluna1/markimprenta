/**
 * emailConfig.js — Configuración de EmailJS
 * ─────────────────────────────────────────────────────────────────
 * CÓMO CONFIGURAR (solo una vez, 5 minutos):
 *
 * 1. Ir a https://www.emailjs.com y crear cuenta gratuita
 * 2. En "Email Services" → Add Service → elegir Gmail (u otro)
 *    Copiar el SERVICE_ID que aparece
 * 3. En "Email Templates" → Create Template → usar este contenido:
 *
 *    Subject:  Nuevo mensaje de {{from_name}} — Mark Publicidad
 *
 *    Body (HTML o texto plano):
 *      Nombre:   {{from_name}}
 *      Email:    {{from_email}}
 *      Teléfono: {{phone}}
 *
 *      Mensaje:
 *      {{message}}
 *
 *    Reply To: {{from_email}}
 *    Copiar el TEMPLATE_ID que aparece
 *
 * 4. En "Account" → "Public Key" → copiar la PUBLIC_KEY
 *
 * 5. Pegar los tres valores aquí abajo y guardar.
 * ─────────────────────────────────────────────────────────────────
 */

const EMAIL_CONFIG = {
  SERVICE_ID:  'PEGA_TU_SERVICE_ID_AQUI',   // ej: 'service_abc123'
  TEMPLATE_ID: 'PEGA_TU_TEMPLATE_ID_AQUI',  // ej: 'template_xyz789'
  PUBLIC_KEY:  'PEGA_TU_PUBLIC_KEY_AQUI',   // ej: 'AbCdEfGhIjKlMnOp'
};

export default EMAIL_CONFIG;
