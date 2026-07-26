# Despliegue en NAS Asustor

Guia para publicar Marka Publicidad en un NAS Asustor con Node.js instalado.

## Arquitectura recomendada

```text
Dominio / Cloudflare
  -> NAS Asustor
  -> proxy HTTPS/HTTP hacia Node
  -> app Express en 127.0.0.1:3000
  -> PostgreSQL
  -> uploads persistentes en /volume1/web/marka/uploads
```

## Requisitos

- Node.js instalado en el NAS.
- Git instalado o posibilidad de subir el proyecto por SSH/SFTP.
- PostgreSQL accesible desde el NAS.
- Un proceso persistente para Node. Recomendado: PM2.
- Un proxy web para publicar el puerto 3000 con HTTPS. Puede ser el portal web/proxy del NAS, Nginx, Apache o Cloudflare Tunnel.

## Variables de entorno

Crear `.env` en la raiz del proyecto en el NAS:

```env
NODE_ENV=production
PORT=3000
SITE_URL=https://TU-DOMINIO.com

DATABASE_URL=postgresql://USUARIO:PASSWORD@HOST:5432/BASE
DATABASE_SSL=false

JWT_SECRET=usa-un-secreto-largo-y-unico

ADMIN_EMAIL=marka.publicidadimpresa@gmail.com
ADMIN_PASSWORD=cambia-esto-antes-de-publicar

MAIL_HOST=
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=
MAIL_PASS=
MAIL_FROM=

GMAIL_USER=marka.publicidadimpresa@gmail.com
GMAIL_PASS=google-app-password
CONTACT_EMAIL=marka.publicidadimpresa@gmail.com

UPLOAD_STORAGE=local
UPLOADS_DIR=/volume1/web/marka/uploads
PUBLIC_UPLOADS_URL=/uploads
```

## Instalacion inicial

```bash
cd /volume1/web
git clone https://github.com/leoluna1/markimprenta.git marka
cd /volume1/web/marka
npm ci --omit=dev
mkdir -p /volume1/web/marka/uploads
chmod 700 /volume1/web/marka/uploads
```

Si el NAS no tiene `npm ci`, usa:

```bash
npm install --omit=dev
```

## Prueba manual

```bash
cd /volume1/web/marka
npm start
```

Abrir:

```text
http://IP-DEL-NAS:3000
http://IP-DEL-NAS:3000/admin
```

Si esto funciona, detener el proceso y dejarlo con PM2.

## Ejecutar con PM2

Instalar PM2 si no existe:

```bash
npm install -g pm2
```

Arrancar:

```bash
cd /volume1/web/marka
pm2 start ecosystem.config.cjs --env production
pm2 save
```

Ver logs:

```bash
pm2 logs markimprenta
```

Reiniciar:

```bash
pm2 restart markimprenta
```

Configurar arranque automatico despues de reinicio:

```bash
pm2 startup
```

PM2 imprimira un comando adicional; ejecutarlo tal como lo indique.

## Proxy / dominio

La app debe quedar escuchando internamente en `127.0.0.1:3000` o `IP-DEL-NAS:3000`.

Configurar el proxy del NAS, Nginx o Apache para enviar el dominio hacia:

```text
http://127.0.0.1:3000
```

Rutas que deben llegar a Node:

```text
/
/admin
/api/*
/uploads/*
```

No publicar directamente carpetas internas como:

```text
data/
db/
lib/
logs/
.env
```

El servidor Express ya bloquea esas rutas, pero el proxy tambien debe evitar exponerlas.

## Flujo de actualizacion

En local:

```bash
npm audit --audit-level=moderate
QA_BASE_URL=http://localhost:3001 npm run qa:browser
git add .
git commit -m "fix: descripcion"
git push origin master
```

En el NAS:

```bash
cd /volume1/web/marka
git pull origin master
npm ci --omit=dev
pm2 restart markimprenta
pm2 logs markimprenta --lines 80
```

## Verificacion post-deploy

```bash
curl -I https://TU-DOMINIO.com
curl -I https://TU-DOMINIO.com/api/products
curl -I https://TU-DOMINIO.com/admin
```

Desde navegador:

- Revisar home.
- Revisar cotizador.
- Ingresar a `/admin`.
- Crear o editar un producto de prueba.
- Subir una imagen de prueba.
- Confirmar que la imagen queda en `/volume1/web/marka/uploads`.

## Backups minimos

Respaldar periodicamente:

```text
PostgreSQL
/volume1/web/marka/uploads
/volume1/web/marka/.env
```

No depender solo de GitHub: GitHub no guarda datos reales del admin, uploads ni secretos.

## Notas de produccion

- Usar `NODE_ENV=production`.
- Cambiar `ADMIN_PASSWORD` inicial y activar 2FA.
- Usar `JWT_SECRET` largo y unico.
- Mantener PostgreSQL, uploads y `.env` fuera de carpetas publicas del servidor web.
- Si usas Cloudflare, poner el DNS en proxy naranja y configurar SSL en modo `Full` o `Full (strict)` si el NAS tiene certificado valido.
