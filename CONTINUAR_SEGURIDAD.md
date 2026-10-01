# Continuar: endurecimiento de seguridad (revisión del 2026-10-01)

Rama de trabajo: `claude/charming-johnson-6ytxf3` (sin PR abierto).
Origen: revisión del proyecto que listó 8 puntos. Se resolvieron los puntos 1, 2, 3, 5, 6 y 7.

## Hecho (un commit por tema)

| # | Problema | Solución | Archivos |
|---|----------|----------|----------|
| 1 | Bypass de la lista negra de rutas con URL-encoding (`/%73erver.js`, `/%64ata/...`) | Lista blanca: solo `app/`, `images/`, `uploads/`, 7 archivos de la raíz y `admin.js`/`styles.css` del admin. `admin/index.html` solo sale por la ruta con nonce CSP | `server.js` |
| 2 | `2fa/setup` desactivaba el 2FA con solo una sesión; `2fa/disable` pedía solo contraseña | `setup` responde 409 si el 2FA está activo; `disable` exige contraseña + código TOTP (campo nuevo en el panel) | `server.js`, `admin/admin.js`, `admin/index.html` |
| 3 | `token` fantasma en `admin.js` (siempre `''`): `pollNotifications` nunca corría | Guard con `currentAdminUser`; se eliminaron la variable y los 44 headers `x-admin-token`; el servidor solo lee la cookie `admin_session` | `admin/admin.js`, `server.js` |
| 5 | Auto-respuesta de contacto a un correo elegido por el visitante (relay de spam) | Eliminada. Sigue el aviso interno a `CONTACT_EMAIL` | `server.js` |
| 6 | El rol `editor` podía todo | `requireAdminRole` en `PUT /api/pricing`, `PUT /api/settings`, `DELETE /api/contacts/:id` y endpoints de video. El editor conserva productos, portfolio, imágenes, reseñas y leer contactos. El panel oculta cotizador, videos y redes | `server.js`, `admin/` |
| 7 | Tokens de reset y desafío 2FA en `Map` en memoria | Tabla `auth_tokens` (hash SHA-256, TTL 15 min / 5 min) con fallback `data/auth-tokens.json`; el reset se consume de forma atómica | `db/db.js`, `server.js`, `.gitignore` |

Verificado con servidor real: rutas estáticas por URL-encoding, flujo 2FA completo, editor vs owner (403/200), reinicio entre emisión y uso de tokens (JSON y PostgreSQL 16), reset concurrente (un 200 y un 400).

## Pendiente

- **Punto 4: XSS en el admin.** `toast()` (`admin.js`, ~línea 1100) interpola `msg` con `innerHTML` sin escapar y hay `'Error: ' + e.message` en `loadReviewsAdmin`. Revisar los 74 usos de `innerHTML` y escapar con `esc()`/`escHtml()` o usar `textContent`.
- **Punto 8 (menores):**
  - `isLocalRequest` confía en `X-Forwarded-For` (solo afecta a desarrollo).
  - `auditLog` guarda ese header sin sanitizar.
  - Secreto TOTP en texto plano en la BD.
  - `rejectUnauthorized: false` en la conexión a Postgres en producción.
  - `quote-prices.json` está en `.gitignore` pero versionado.
  - `unlinkSync`/`existsSync` síncronos en los DELETE de uploads.
- **Historial de git:** commits antiguos contienen `data/auth.json` con hash bcrypt y `totp_secret`. Si el repo es público o se comparte, rotar la contraseña admin y regenerar el 2FA.
- **2FA sin códigos de recuperación:** si se pierde el dispositivo ya no se puede desactivar desde el panel (hay que editar la BD). Valorar códigos de recuperación.
- **Límite por token del 2FA:** un código fallido no consume el desafío; el único freno es el rate limit por IP.
- **Auditoría vieja:** `AUDITORIA_SEGURIDAD_OFFSET_2026-07-14.md` declara 88/100 y no detectó el bypass del punto 1; actualizarla o no fiarse de la puntuación.

## Para retomar

```bash
git checkout claude/charming-johnson-6ytxf3
npm ci
# desarrollo con JSON local (ignora data/*.json de runtime):
PORT=3000 JWT_SECRET=x ADMIN_EMAIL=a@b.co ADMIN_PASSWORD=Passw0rd1 node server.js
```

Cuidado al probar: el modo JSON escribe en `data/products.json` (versionado). Restaurar con `git checkout -- data/products.json` antes de commitear.
Sin tests automáticos en el repo: las pruebas se hicieron con scripts ad hoc (fetch con cookie jar + CSRF, y Playwright para el admin).
