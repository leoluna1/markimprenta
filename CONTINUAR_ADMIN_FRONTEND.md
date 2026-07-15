# Continuidad - Marka Publicidad

Fecha: 2026-07-02

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
  - `/admin/styles.css?v=20260702-pricing-ux`
  - `/admin/admin.js?v=20260702-pricing-ux`

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

## Memoria revisada

- Memoria del proyecto: `/Users/leito/.claude/projects/-Users-leito-Desktop-proyectos-offset/memory/project_offset.md`
- Memoria de sesión: `/Users/leito/.claude/projects/-Users-leito-Desktop-proyectos-offset/memory/sesion_mejoras_2026-05-07.md`
- Pendientes históricos: agregar fotos reales al portfolio, configurar videos reales, revisar admin completo, mejorar hero con imagen/mockup, reforzar catálogo y revisar service worker/preloads.

## Avance 2026-07-02

- En admin/cotizador:
  - Se agregó botón "Ver cotizador" en la barra de guardado para abrir `/#cotizador`.
  - El botón "Guardar precios" queda deshabilitado cuando no hay cambios.
  - Se agregó alerta nativa al salir con cambios sin guardar.
  - Las pestañas del cotizador se centran al activarse.
  - Filas de precios, diseño y tiempos ahora usan clases CSS responsivas en lugar de grids inline.
  - Se corrigió la detección de Font Awesome: el fallback de iconos ya no se fuerza si el CDN cargó bien.
  - En móvil, los encabezados de filas de precios vuelven a mostrarse para que los inputs no queden sin contexto.
- En frontend público:
  - Se agregaron preloads para logo e imágenes principales del hero.
  - El badge de productos populares cambió a "Más pedido".
  - Se agregó estilo real para `.product-badge`, que antes solo tenía radio de borde.
  - Se corrigió el contraste de los botones de redes sociales: YouTube, Instagram, TikTok y Facebook vuelven a mostrar icono/texto.
  - El mapa de Google ahora recibe filtro visual en modo oscuro para no quedar claro dentro del tema dark.

## Verificación 2026-07-02

- `node --check admin/admin.js` pasó correctamente.
- El servidor inició con `npm start` y mostró `http://localhost:3000` y `/admin`.
- El navegador integrado no estuvo disponible (`agent.browsers.list()` devolvió vacío), pero se hizo QA visual con una instancia temporal de Brave por CDP.
- Capturas revisadas: dashboard desktop, cotizador desktop, seguridad desktop, dashboard móvil y cotizador móvil.
- En la revisión se detectó y corrigió el bug de iconos forzados al fallback.
- Móvil cotizador verificado con `innerWidth=390` y `scrollWidth=390`, sin desbordamiento horizontal.
- Se verificó visualmente la sección `#redes` en claro/oscuro y `.map-container` en oscuro con filtro activo.

## Avance 2026-07-12

- Se reforzó el fallback local de `db/db.js`:
  - `getPricing()` y `getSettings()` ahora usan `db/seeds/pricing.json` y `db/seeds/settings.json` cuando faltan los JSON locales en `data/`.
  - `writeLocalJson()` crea automáticamente la carpeta `data/` antes de guardar.
- Se documentó `db/seeds/` en la estructura del `README.md`.
- Verificación:
  - `node --check db/db.js`, `node --check server.js` y `node --check admin/admin.js` pasaron correctamente.
  - `npm start` levantó el servidor en `http://localhost:3000`.
  - `GET /api/pricing` devolvió `pricing,delivery`.
  - `GET /api/settings` devolvió `videos,socialMedia`.
- QA visual:
  - El navegador integrado no estuvo disponible (`agent.browsers.list()` devolvió `[]`).

## Avance 2026-07-12 - QA Playwright

- Se confirmó Playwright instalado (`Version 1.61.1`).
- Se agregó `npm run qa:browser` con `scripts/qa-browser.js`.
- El QA revisa:
  - Home/cotizador desktop.
  - Home/cotizador móvil.
  - Login admin desktop.
  - Overflow horizontal.
  - Visibilidad del cotizador y tab activo.
  - Que el botón flotante de WhatsApp no tape el selector "Terminado" en móvil.
- Se agregó un bypass del rate limiter solo en desarrollo para el header local `x-qa-browser: 1`; no aplica en producción.
- Se corrigió el widget de WhatsApp en móvil:
  - Oculta el globo "¿Necesitas un presupuesto?" en pantallas pequeñas.
  - Compacta el botón flotante a 50px.
  - Ajusta su posición sobre el bottom nav sin cubrir el formulario.
- Se agregó `qa-artifacts/` al `.gitignore`.
- Verificación:
  - `npm run qa:browser` pasó correctamente.
  - `node --check server.js`, `node --check whatsapp-widget.js` y `node --check scripts/qa-browser.js` pasaron correctamente.

## Avance 2026-07-12 - Usuarios admin e historial

- Se revisó el estado previo:
  - El admin usaba una credencial singleton (`auth`) con correo, contraseña y 2FA global.
  - Existía `logs/audit.log`, pero no había historial consultable desde el panel ni usuarios múltiples.
- Backend:
  - Se agregó tabla/fallback `admin_users`.
  - Se agregó tabla/fallback `audit_events`.
  - Se migra automáticamente el administrador actual como primer usuario `owner`.
  - Las sesiones JWT ahora incluyen identidad: `id`, `email`, `name`, `role`.
  - Login, recuperación, cambio de contraseña y 2FA ahora funcionan por usuario.
  - Nuevas rutas:
    - `GET /api/admin/users`
    - `POST /api/admin/users`
    - `PATCH /api/admin/users/:id`
    - `POST /api/admin/users/:id/password`
    - `GET /api/admin/audit`
  - Se auditan acciones administrativas: login, usuarios, contraseña, 2FA, productos, precios, settings, contactos, reseñas, portfolio y uploads.
- Admin UI:
  - Se agregaron secciones laterales `Usuarios` e `Historial`.
  - Dashboard ahora muestra `Usuarios admin` y `Cambios recientes`.
  - `Seguridad` quedó como `Mi acceso`, enfocado en correo, contraseña y 2FA del usuario actual.
  - `Usuarios` permite crear accesos y activar/desactivar usuarios.
  - `Historial` muestra fecha/hora, usuario, acción, entidad y detalle.
- Verificación:
  - Migración PostgreSQL ejecutada correctamente: se creó/migró `admin_users`.
  - Login autenticado con 2FA pasó.
  - `GET /api/auth/profile`, `GET /api/admin/users` y `GET /api/admin/audit` pasaron.
  - Creación y desactivación de usuario temporal vía API pasaron; se limpió la cuenta temporal.
  - QA visual autenticado con Playwright pasó para dashboard, usuarios e historial.
  - `npm run qa:browser` pasó correctamente.
  - `node --check db/db.js`, `lib/jwt-session.js`, `server.js`, `admin/admin.js`, `whatsapp-widget.js` y `scripts/qa-browser.js` pasaron correctamente.

## Ajuste 2026-07-12 - Permisos de Usuarios/Historial

- `Usuarios` e `Historial` quedan visibles solo para roles `owner` y `admin`.
- Los usuarios nuevos creados desde el panel se crean como `editor`.
- Los usuarios `editor` no ven accesos de Usuarios/Historial en sidebar, dashboard ni acciones rápidas.
- Backend refuerza el permiso: `GET /api/admin/audit` y rutas de usuarios devuelven `403` para `editor`.
- Verificación:
  - Admin principal ve `Usuarios` e `Historial`.
  - Usuario temporal `editor` no vio esas opciones y recibió `403` al intentar acceder a auditoría.
  - Se limpiaron los usuarios/eventos temporales de prueba.

## Ajuste 2026-07-12 - Recuperación de contraseña multiusuario

- La recuperación de contraseña funciona por correo de cualquier `admin_user` activo, no solo el admin principal.
- Textos del formulario cambiados a "usuario registrado".
- En la lista de `Usuarios`, se agregó acción `Recuperar` para enviar enlace al usuario seleccionado.
- Si Gmail falla por credenciales (`535 BadCredentials`) o no está configurado:
  - En producción devuelve advertencia/error claro.
  - En local/desarrollo devuelve `devResetLink` para probar el flujo sin depender de Gmail.
- Verificación:
  - `POST /api/auth/forgot` para admin devuelve respuesta controlada aunque Gmail rechace credenciales.
  - Usuario temporal nuevo pudo recibir token local, cambiar contraseña y hacer login con la nueva clave.
  - La contraseña anterior dejó de funcionar.
  - UI de recuperación muestra advertencia y botón `Abrir enlace local` en entorno local.

## Ajuste 2026-07-14 - Sesión admin al refrescar

- Se corrigió el flujo de sesión del admin:
  - `showApp()` ahora valida primero `/api/auth/profile`.
  - Si la sesión no es válida, vuelve limpiamente al login.
  - `loadAdminProfile()` devuelve `true/false` y limpia `currentAdminUser` si falla.
  - El polling de notificaciones se inicia una sola vez y se limpia al cerrar sesión.
- Se actualizó el cache-buster del admin:
  - `/admin/styles.css?v=20260714-session-guard`
  - `/admin/admin.js?v=20260714-session-guard`
- Verificación:
  - `node --check admin/admin.js`, `server.js`, `db/db.js`, `lib/jwt-session.js`, `whatsapp-widget.js` y `scripts/qa-browser.js` pasaron correctamente.
  - `npm audit --audit-level=moderate` devolvió `0 vulnerabilities`.
  - `QA_BASE_URL=http://localhost:3001 npm run qa:browser` pasó correctamente.
  - Prueba autenticada con Playwright: login admin + refresh de `/admin` conserva el dashboard visible.

## Ajuste 2026-07-14 - Hardening de seguridad inicial

- Se agregó CSRF obligatorio para toda mutación bajo `/api`.
- El panel admin ahora envía `x-csrf-token` en contactos, reseñas, portfolio, productos, precios, settings y uploads.
- `/api/auth/2fa/setup` pasó de `GET` con efecto lateral a `POST` protegido.
- Upload de imágenes ya no acepta PDF/SVG desde UI ni backend; solo JPG, PNG, WEBP y GIF.
- Borrados Cloudinary se restringen al `CLOUDINARY_FOLDER` configurado.
- Settings sanitiza URLs sociales, WhatsApp y videos antes de persistir.
- Se actualizó el cache-buster del admin:
  - `/admin/admin.js?v=20260714-security-hardening`
- Verificación:
  - `node --check server.js` y `node --check admin/admin.js` pasaron correctamente.
  - `npm audit --audit-level=moderate` devolvió `0 vulnerabilities`.
  - Prueba API: login sin CSRF devuelve `403`; login con cookie/header CSRF devuelve sesión válida.
  - `QA_BASE_URL=http://localhost:3001 npm run qa:browser` pasó correctamente.
  - Prueba autenticada con Playwright: refresh de `/admin` conserva dashboard visible.

## Ajuste 2026-07-14 - Hardening pre-publicación

- Sesiones admin:
  - JWT ahora incluye `jti` y `session_version`.
  - `admin_users.session_version` persiste en PostgreSQL/fallback JSON.
  - Logout registra revocación persistente en `admin_session_revocations`.
  - Cambios/restablecimientos de contraseña incrementan la versión de sesión del usuario afectado.
- Roles:
  - Solo `owner` puede cambiar roles.
  - No se permite desactivar/degradar el último `owner` activo.
- CSP admin:
  - Se eliminaron handlers inline del HTML y de plantillas dinámicas.
  - El admin usa delegación por `data-action`.
  - CSP admin ahora usa `script-src-attr 'none'`.
- Uploads:
  - Además de mimetype/extensión, se validan magic bytes para imágenes y videos.
  - Un PNG falso con mimetype `image/png` devuelve `400`; un PNG real mínimo devuelve `200`.
- Verificación:
  - `node --check server.js`, `admin/admin.js`, `db/db.js` y `lib/jwt-session.js` pasaron.
  - `npm audit --audit-level=moderate` devolvió `0 vulnerabilities`.
  - `QA_BASE_URL=http://localhost:3001 npm run qa:browser` pasó correctamente.
  - Prueba logout: profile `200` antes, logout `200`, profile `401` con el mismo token.
  - Prueba Playwright autenticada: panel admin sin errores de consola y CSP con `script-src-attr 'none'`.

## Ajuste 2026-07-15 - Verificación y cierre de pendientes seguridad

- CSRF:
  - Se corrigió `lib/csrf.js` para que `/api/csrf-token` no emita dos cookies distintas en la primera petición.
  - Prueba API: login sin CSRF devuelve `403`; login con cookie/header CSRF funciona.
- Imágenes de producto:
  - `sanitizeProductImage()` ya no acepta cualquier URL `https`.
  - Solo permite uploads locales (`/uploads`), assets `images/` y Cloudinary bajo `CLOUDINARY_FOLDER`.
  - Se probó con producto temporal usando `https://example.com/tracker.png`; la URL externa no se persistió y el producto se eliminó.
- Verificación:
  - `node --check server.js`, `admin/admin.js`, `db/db.js`, `lib/jwt-session.js`, `lib/csrf.js`, `whatsapp-widget.js` y `scripts/qa-browser.js` pasaron.
  - `npm audit --audit-level=moderate` devolvió `0 vulnerabilities`.
  - `QA_BASE_URL=http://localhost:3001 npm run qa:browser` pasó correctamente.
  - Prueba API autenticada: profile `200`, mutación sin CSRF `403`, upload PNG falso `400`, logout revocado con profile `401`.
  - Prueba Playwright autenticada: login con 2FA/cookie, refresh conserva dashboard, CSP contiene `script-src-attr 'none'` y consola limpia tras refresh.
