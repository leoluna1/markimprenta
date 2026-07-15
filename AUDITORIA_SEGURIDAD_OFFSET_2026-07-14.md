# Auditoría de seguridad - Offset / Mark Publicidad

Fecha: 2026-07-14  
Alcance revisado: proyecto local `/Users/leito/Desktop/proyectos/offset`, excluyendo dependencias generadas (`node_modules`), logs runtime y artefactos QA. Se revisó código fuente, frontend, backend, configuración, archivos de datos, uploads, dependencias y flujos admin. No se exponen valores de `.env`.

## 1. Mapa del proyecto

- Arquitectura: aplicación Node.js/Express monolítica. Sirve sitio público estático/modular JS, panel admin estático y API REST en el mismo proceso.
- Backend: `server.js`, `db/db.js`, `lib/csrf.js`, `lib/jwt-session.js`, `lib/logger.js`.
- Frontend público: `index.html`, `app/**/*.js`, `styles.css`, `whatsapp-widget.js`, `sw.js`.
- Admin: `admin/index.html`, `admin/admin.js`, `admin/styles.css`.
- Datos: PostgreSQL si existe `DATABASE_URL`; fallback local JSON en `data/*.json`.
- Uploads: local/NAS en `uploads/` y `uploads/videos/`, o Cloudinary si `UPLOAD_STORAGE=cloudinary`.
- Autenticación: login admin con bcrypt, cookie `admin_session` HttpOnly/SameSite=Strict, JWT firmado, 2FA TOTP opcional, reset por email con token temporal en memoria.
- Autorización: roles `owner`, `admin`, `editor`; `owner/admin` gestionan usuarios e historial; rutas de contenido requieren sesión admin.
- Flujo de peticiones: Express aplica Helmet/CSP, compression, rate limit, cookie CSRF, bloqueo de rutas privadas, estáticos y APIs.
- APIs públicas: productos, precios, settings, reseñas aprobadas, portfolio, contacto.
- APIs admin: contactos, reseñas, portfolio, uploads, productos, pricing, settings, usuarios, auditoría, 2FA y password.
- Dependencias críticas: `express`, `helmet`, `express-rate-limit`, `jsonwebtoken`, `bcryptjs`, `pg`, `multer`, `cloudinary`, `nodemailer`, `speakeasy`, `qrcode`.
- Servicios externos: PostgreSQL, SMTP/Gmail, Cloudinary, YouTube/Maps, WhatsApp.
- Archivos sensibles: `.env`, `data/auth.json`, `data/admin-users.json`, `data/audit-events.json`, `logs/*.log`, `uploads/*`, `package-lock.json`.

## 2. Puntuación

- Seguridad global actual: 88/100.
- OWASP Top 10: 86/100.
- Riesgo global: Medio-Bajo.
- Dependencias: `npm audit --audit-level=moderate` reporta `0 vulnerabilities`.

La puntuación subió tras aplicar hardening inicial y pre-publicación: CSRF global, cambio de 2FA setup a POST, upload de imágenes sin PDF/SVG, restricción Cloudinary, validación de settings, sesión JWT con versión persistente, revocación persistente de logout, roles owner-only, CSP admin sin atributos inline y validación por magic bytes.

## 3. Vulnerabilidades corregidas en este ciclo

### V1 - CSRF incompleto en mutaciones admin

- Archivo afectado: `server.js` aprox. 546-554; `admin/admin.js` varias mutaciones.
- Riesgo: Alto.
- Explicación: antes solo `POST /api/contact` y `POST /api/reviews` exigían CSRF. Rutas admin con cookie HttpOnly podían depender solo de SameSite=Strict.
- Explotación: si el navegador enviaba la cookie admin en un escenario compatible, una página externa podía intentar mutaciones como borrar productos/contactos.
- Impacto: cambios no autorizados en contenido, pricing, usuarios o uploads.
- Código vulnerable:
  ```js
  app.put('/api/pricing', authenticate, async (req, res) => { ... });
  ```
- Código corregido:
  ```js
  function requireApiCsrf(req, res, next) {
    if (!req.path.startsWith('/api/')) return next();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    return csrfProtect(req, res, next);
  }
  app.use(requireApiCsrf);
  ```
- Cambio: toda mutación `/api` requiere cookie `csrf-token` + header `x-csrf-token`. El panel admin ya envía el header.

### V2 - Endpoint GET con efecto lateral para 2FA

- Archivo afectado: `server.js` aprox. 813-830; `admin/admin.js` aprox. 2197-2203.
- Riesgo: Medio.
- Explicación: generar el secreto TOTP con GET viola semántica HTTP y evita CSRF en una acción que modifica estado.
- Explotación: una navegación/carga externa autenticada podía regenerar el secreto TOTP pendiente.
- Impacto: interrupción del proceso de activación 2FA.
- Código vulnerable:
  ```js
  app.get('/api/auth/2fa/setup', authenticate, async (req, res) => { ... });
  ```
- Código corregido:
  ```js
  app.post('/api/auth/2fa/setup', authenticate, async (req, res) => { ... });
  ```
- Cambio: la UI usa POST con `x-csrf-token`.

### V3 - Upload de PDF/SVG ofrecido como imagen pública

- Archivo afectado: `server.js` aprox. 258-276; `admin/index.html` inputs de upload.
- Riesgo: Medio.
- Explicación: PDF/SVG no son imágenes raster seguras para el catálogo. Servirlos en el mismo origen aumenta riesgo de contenido activo, phishing o bypass visual.
- Explotación: un admin comprometido o con bajo privilegio subía archivo activo y lo enlazaba como recurso público.
- Impacto: contenido activo bajo dominio principal, confusión de usuarios, superficie XSS/phishing.
- Código vulnerable:
  ```js
  ['application/pdf', new Set(['.pdf'])]
  ```
- Código corregido:
  ```js
  const ALLOWED_UPLOAD_TYPES = new Map([
    ['image/jpeg', new Set(['.jpg', '.jpeg'])],
    ['image/png', new Set(['.png'])],
    ['image/webp', new Set(['.webp'])],
    ['image/gif', new Set(['.gif'])],
  ]);
  ```
- Cambio: UI y backend aceptan solo JPG, PNG, WEBP y GIF.

### V4 - Borrado Cloudinary sin restringir folder

- Archivo afectado: `server.js` aprox. 1212-1281.
- Riesgo: Medio.
- Explicación: cualquier usuario admin autenticado podía enviar un `public_id` arbitrario al endpoint de borrado.
- Explotación: borrar assets Cloudinary fuera del folder de esta app si la cuenta comparte recursos.
- Impacto: pérdida de medios de otros proyectos.
- Código corregido:
  ```js
  if (!isCloudinaryPublicIdInFolder(req.query.public_id))
    return res.status(400).json({ error: 'public_id fuera del folder configurado.' });
  ```
- Cambio: solo se destruyen recursos dentro de `CLOUDINARY_FOLDER`.

### V5 - Settings aceptaba URLs/videos sin validación server-side fuerte

- Archivo afectado: `server.js` aprox. 1511-1544 y 1641-1664.
- Riesgo: Medio.
- Explicación: el frontend validaba más que el backend. Un cliente directo podía persistir URLs sociales/videos fuera de lo esperado.
- Explotación: enviar `PUT /api/settings` con links externos no permitidos o videos inválidos.
- Impacto: enlaces maliciosos, tracking o contenido roto.
- Cambio: se agregaron `sanitizeHttpsUrl`, validación de YouTube ID, verificación de uploads locales/Cloudinary y normalización de WhatsApp.

## 4. Hallazgos pendientes / trazabilidad

### P1 - Invalidación JWT y denylist solo en memoria (resuelto)

- Archivo afectado: `lib/jwt-session.js` aprox. 21-76.
- Riesgo: Alto.
- Explicación: `SESSION_GEN` y `_denylist` viven en memoria. Tras reinicio se pierde la invalidación global y logout individual.
- Explotación: un token robado antes de cambio de contraseña podría volver a ser válido tras reinicio si no expiró.
- Impacto: secuestro de sesión hasta 8 horas.
- Código vulnerable:
  ```js
  let SESSION_GEN = 1;
  const _denylist = new Set();
  ```
- Código recomendado:
  ```js
  // Persistir por usuario en DB:
  // admin_users.session_version INT NOT NULL DEFAULT 1
  // JWT incluye sv: user.session_version
  // readSession compara decoded.sv contra DB.
  ```
- Estado: resuelto el 2026-07-14. JWT incluye `jti` y `sv`; `admin_users.session_version` invalida sesiones tras cambios sensibles y `admin_session_revocations` persiste logout por `jti`.

### P2 - Promoción de roles demasiado amplia (resuelto)

- Archivo afectado: `server.js` aprox. 912-925.
- Riesgo: Medio-Alto.
- Explicación: `owner` y `admin` pueden cambiar `role` a `owner/admin/editor`.
- Explotación: una cuenta admin comprometida se autopromueve o promueve otra cuenta a owner.
- Impacto: escalada de privilegios interna.
- Código vulnerable:
  ```js
  patch.role = ['owner', 'admin', 'editor'].includes(req.body.role) ? req.body.role : current.role;
  ```
- Código recomendado:
  ```js
  if (req.body.role !== undefined) {
    if (req.adminUser.role !== 'owner') return res.status(403).json({ error: 'Solo owner cambia roles.' });
    if (id === req.adminUser.id && req.body.role !== 'owner') return res.status(400).json({ error: 'No puedes degradarte.' });
    patch.role = ['admin', 'editor'].includes(req.body.role) ? req.body.role : current.role;
  }
  ```
- Estado: resuelto el 2026-07-14. Solo `owner` puede cambiar roles y el backend impide degradar/desactivar el último owner activo.

### P3 - CSP admin permite `script-src-attr 'unsafe-inline'` (resuelto)

- Archivo afectado: `server.js` aprox. 507-519; `admin/index.html`/`admin/admin.js`.
- Riesgo: Medio.
- Explicación: el panel usa handlers inline (`onclick`, etc.), por eso CSP permite atributos inline.
- Explotación: si aparece una inyección HTML futura, `script-src-attr` reduce protección.
- Impacto: XSS admin con control total del panel.
- Estado: resuelto el 2026-07-14. El panel usa delegación por `data-action` y CSP admin usa `script-src-attr 'none'`.

### P4 - Validación de upload basada en mimetype/extensión, no magic bytes (resuelto parcialmente)

- Archivo afectado: `server.js` aprox. 258-276 y 281-301.
- Riesgo: Medio.
- Explicación: `multer` usa `file.mimetype` enviado por cliente y extensión. Falta inspección real de cabecera.
- Explotación: polyglots o archivos renombrados pueden pasar filtros básicos.
- Impacto: contenido inesperado servido desde `/uploads`.
- Estado: magic bytes resuelto el 2026-07-14 para imágenes y videos. Sigue recomendado reprocesar imágenes con Sharp y servir uploads desde dominio aislado.

### P5 - Fallback JSON local contiene secretos

- Archivo afectado: `db/db.js` aprox. 20-31; `data/*.json`.
- Riesgo: Medio.
- Explicación: fallback almacena hashes, TOTP secrets, contactos y auditoría en archivos dentro del proyecto.
- Explotación: error de Nginx/static o permisos débiles expone `data/`.
- Impacto: fuga de credenciales hash, TOTP y datos personales.
- Recomendación: producción solo PostgreSQL, `chmod 600 data/*.json`, `chown` a usuario app, bloquear `data/` en Nginx y mantener fuera del webroot.

### P6 - Imágenes de producto permiten cualquier HTTPS (resuelto)

- Archivo afectado: `server.js` aprox. 1496-1508.
- Riesgo: Bajo-Medio.
- Explicación: `sanitizeProductImage` acepta cualquier URL `https:`.
- Explotación: tracking pixel, hotlinking o contenido externo no controlado.
- Impacto: privacidad, disponibilidad visual, dependencia de terceros.
- Recomendación: permitir solo `/uploads`, `images/` y Cloudinary propio, o proxy/cache controlado.
- Estado: resuelto el 2026-07-15. `sanitizeProductImage` permite uploads locales, assets `images/` y URLs Cloudinary bajo `CLOUDINARY_FOLDER`; cualquier HTTPS externo se degrada a texto/emoji sanitizado.

### P7 - Dependencias desactualizadas aunque sin CVE auditado

- Archivo afectado: `package.json`, `package-lock.json`.
- Riesgo: Bajo-Medio.
- Estado: `npm outdated` detectó `dotenv`, `helmet`, `multer`, `pg`, `express`.
- Recomendación: actualizar primero parches/minors (`helmet`, `pg`), planificar breaking changes (`express@5`, `multer@2`) con QA.

## 5. Ataques simulados

- SQL Injection: las consultas en `db/db.js` usan parámetros en PostgreSQL; riesgo bajo. Probar payloads en login/contactos no debe alterar SQL.
- XSS almacenado: contacto/reseña/producto se renderizan escapados en vistas principales. Riesgo residual en futuras plantillas admin por CSP con `script-src-attr`.
- CSRF: antes viable contra mutaciones admin; ahora un POST/PATCH/PUT/DELETE sin `x-csrf-token` devuelve `403`.
- JWT replay: token robado sigue siendo válido hasta expirar, salvo logout/revocación o incremento de `session_version`. La revocación ya persiste tras reinicios.
- Path traversal: borrado local de uploads bloquea `/` y `..`; `localUploadPathFromUrl` rechaza `..`. Riesgo bajo.
- Brute force: login/reset/contacto/reseñas tienen rate limiting; revisar límites por proxy real y Cloudflare.
- Directory listing: Express static no lista directorios por defecto; Nginx debe tener `autoindex off`.
- Malware upload: reducido al eliminar PDF/SVG y validar magic bytes. Sigue recomendado reprocesar imágenes con Sharp.
- IDOR/escalada: rutas admin requieren sesión y los cambios de rol quedan limitados a `owner`.
- Race conditions: no se detectaron locks para escrituras JSON fallback; usar PostgreSQL en producción.

## 6. Hardening recomendado

- Reprocesar imágenes con Sharp.
- Aislar uploads en subdominio sin cookies o bucket/CDN separado.
- Configurar Nginx: `autoindex off`, bloquear `/.env`, `/data`, `/logs`, `/db`, `/lib`, HSTS, proxy headers correctos, límites de body.
- Docker: usuario no root, filesystem read-only salvo uploads/logs, healthcheck, secrets fuera de imagen.
- Cloudflare/WAF: reglas para `/admin`, rate limit login/reset/uploads, bot fight o Turnstile en formularios públicos si hay abuso.
- Logs: no registrar tokens, passwords, TOTP, cookies ni reset links; rotación y retención limitada.
- Backups: PostgreSQL cifrado, pruebas de restore, retención separada, backup de uploads/Cloudinary.
- Monitoreo: alertas por login fallido, cambios de rol, 2FA desactivado, borrados masivos, errores 5xx y picos de upload.

## 7. Checklist producción

- [x] Helmet + CSP base.
- [x] HSTS en producción.
- [x] Cookies admin HttpOnly/Secure/SameSite.
- [x] Rate limit global y por rutas críticas.
- [x] bcrypt para contraseñas.
- [x] CSRF obligatorio en mutaciones API.
- [x] 2FA TOTP opcional.
- [x] Auditoría de acciones admin.
- [x] Bloqueo Express de archivos privados.
- [x] Session version persistente.
- [x] Owner-only para cambios de rol.
- [x] CSP admin sin `unsafe-inline` en atributos.
- [x] Magic-byte scan de uploads.
- [ ] Reprocesamiento de imágenes con Sharp.
- [ ] Nginx/Cloudflare hardening documentado y aplicado.
- [ ] Secrets en gestor externo, no `.env` en servidor compartido.

## 8. Plan de remediación priorizado

### Críticas / Altas

1. Revisar Nginx/Cloudflare real para confirmar bloqueo de `data/`, `logs/`, `.env`, `uploads` y `/admin`.
2. Configurar secretos en el proveedor de despliegue y no subir `.env`.
3. Confirmar `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `SITE_URL` y SMTP antes de exponer el dominio.

### Medias

1. Reprocesar imágenes con Sharp.
2. Aislar uploads en subdominio/bucket sin cookies.
3. Mantener la política de imágenes de producto restringida a uploads locales, `images/` y Cloudinary propio.

### Bajas / Mantenimiento

1. Actualizar dependencias con QA.
2. Agregar tests automatizados de seguridad: CSRF, roles, upload, headers, reset password.
3. Documentar runbook de backups, restore, logs y rotación de secretos.

## 9. Verificación ejecutada

- `node --check server.js`
- `node --check admin/admin.js`
- `npm audit --audit-level=moderate`
- `git diff --check`
- `QA_BASE_URL=http://localhost:3001 npm run qa:browser`
- Prueba API CSRF: login sin CSRF `403`, login con CSRF correcto y profile `200`.
- Prueba Playwright autenticada: reload de `/admin` conserva dashboard visible.
- Actualización 2026-07-15: se corrigió doble emisión inicial de cookie CSRF en `/api/csrf-token`.
- Actualización 2026-07-15: prueba API validó bloqueo CSRF, upload PNG falso `400`, logout revocado `401` y política de imagen de producto sin persistir URL externa.
