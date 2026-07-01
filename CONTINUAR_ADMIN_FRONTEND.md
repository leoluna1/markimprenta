# Continuidad - Marka Publicidad

Fecha: 2026-06-29

## Estado actual

- Se redisenó el frontend público con fondo blanco, estilo liquid glass y rojo cereza como color distintivo.
- Se ajustó el nav público para que no quede fijo arriba al hacer scroll.
- Se corrigió contraste de textos en fondo blanco.
- Se aplicó liquid glass en secciones generales, diferenciadores y cotizador.
- Se ajustó el cotizador público para que use fondo blanco/glass y no tarjeta negra.
- Se agregaron/fijaron iconos en secciones como experiencia, contactos y redes sociales.

## Admin

- Se trabajó el panel admin por problemas de iconos que no aparecían.
- El admin usa Font Awesome por CDN, pero se agregó fallback local para que no queden iconos vacíos.
- `admin/index.html` tiene `class="fa-fallback"` en `<html>` para forzar los iconos de respaldo.
- Se agregaron mapeos de iconos en `admin/styles.css` bajo:
  `/* ===== ADMIN ICON FALLBACKS ===== */`
- Se validó `admin/admin.js` con:
  `node --check admin/admin.js`

## Logo en admin

- Se reemplazó el icono genérico de impresora por el logo del colibrí usando:
  `/images/logo.png`
- Lugares modificados:
  - Login principal del admin.
  - Sidebar/cabecera del panel.
  - Header móvil del admin.
- Se agregaron estilos:
  - `.brand-logo`
  - `.logo-mark`
  - `.mob-logo`
- El cache-buster actual del admin quedó como:
  - `styles.css?v=20260629-logo`
  - `admin.js?v=20260629-logo`

## Archivos tocados recientemente

- `admin/index.html`
- `admin/styles.css`
- `admin/admin.js`
- `styles.css`
- `app/views/NavigationView.js`
- `app/controllers/NavigationController.js`
- `app/views/QuoteView.js`

## Pendientes sugeridos

- Revisar visualmente el admin completo después de iniciar el servidor desde la terminal del usuario.
- Confirmar que el logo del colibrí se ve bien en login, sidebar y móvil.
- Revisar si otros formularios del admin necesitan estilo liquid glass o ajustes de contraste.
- Continuar mejoras del cotizador tanto en frontend público como en admin.

