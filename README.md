# 🖨️ Mark Publicidad Impresa - Sitio Web

Sitio web moderno y profesional para imprenta con animaciones, catálogo dinámico de productos, cotizador en línea y panel de administración.

---

## ✨ Características Principales

- 🎨 **Animaciones Modernas**: Efectos suaves y profesionales en el frontend.
- 📦 **Catálogo Dinámico**: Gestión de productos en tiempo real desde el Panel Admin.
- 📱 **Diseño Responsive**: Perfecto en todos los dispositivos (Mobile-First).
- 🧮 **Cotizador en Línea**: Cálculo automático de precios interactivo.
- 💬 **WhatsApp Flotante**: Widget de contacto directo integrado.
- 🔐 **Panel Admin**: Control total con login seguro y soporte 2FA (TOTP).
- 👥 **Usuarios Admin**: Accesos separados para varios usuarios del panel.
- 🧾 **Historial de Cambios**: Registro de usuario, fecha, hora y acción realizada.

---

## 📝 GUÍA DE USO Y GESTIÓN

### 1. Agregar y Gestionar Productos
Ya **no** necesitas editar archivos de código como `products-data.js`.
1. Ingresa al panel de administración: `http://localhost:3000/admin`.
2. Introduce tu contraseña (y código 2FA si está activo).
3. Ve a la sección **Productos** para crear, editar o eliminar productos del catálogo.

### 2. Ajustar Precios del Cotizador
Los precios se administran dinámicamente:
1. En el Panel Admin, navega a **Precios del Cotizador**.
2. Modifica los valores directamente en la interfaz gráfica.
3. Guarda los cambios para que se apliquen al instante en la web pública.

### 3. Gestionar Usuarios e Historial
1. En el Panel Admin, navega a **Usuarios** para crear o desactivar accesos.
2. Navega a **Historial** para revisar quién hizo cambios, cuándo y sobre qué módulo.
3. Cada usuario puede cambiar su propio correo, contraseña y 2FA desde **Seguridad**.

### 4. Cambiar Colores del Sitio
Edita las variables CSS en la raíz de `styles.css`:
```css
:root {
    --primary-color: #E30613;    /* Color principal (Rojo Marka) */
    --secondary-color: #c0392b;  /* Variación oscura */
    /* ... */
}
```

---

## 📱 Estructura del Proyecto

El sitio web está organizado siguiendo una estructura limpia de separación de responsabilidades:

```
offset/
├── server.js               # Servidor Node.js (Express, APIs de productos, autenticación y CSRF)
├── index.html              # Shell HTML de la aplicación principal
├── styles.css              # Hoja de estilos de la aplicación principal
├── package.json            # Script de ejecución y dependencias del backend
├── app/                    # Aplicación Frontend Modular (Cliente MVC)
│   ├── App.js              # Bootstrapper del cliente
│   ├── config/             # Configuración y precios por defecto de cotizaciones
│   ├── controllers/        # Controladores (Catálogo, Cotizaciones, Contacto, etc.)
│   ├── models/             # Modelos de datos del cliente
│   └── views/              # Vistas estructuradas
├── admin/                  # Panel de Administración
│   ├── index.html          # Estructura del panel administrativo
│   ├── styles.css          # Estilos del panel
│   └── admin.js            # Lógica del panel
├── lib/                    # Lógica del servidor (Sesiones JWT, seguridad CSRF)
├── db/                     # Cliente de base de datos PostgreSQL con fallback local
│   └── seeds/              # Semillas iniciales para cotizador y ajustes si faltan JSON locales
└── data/                   # Archivos JSON usados como fallback local
```

---

## 🚀 Cómo Correr en Local

1. Asegúrate de tener instalado Node.js.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea un archivo `.env` en la raíz (puedes guiarte por el log de arranque del servidor) configurando:
   - `ADMIN_EMAIL` (Correo con el que ingresa el administrador; si no existe usa `GMAIL_USER`)
   - `ADMIN_PASSWORD` (Contraseña de administrador)
   - `JWT_SECRET` (Secreto para firmar sesiones)
   - `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` y `MAIL_FROM` para usar un SMTP dedicado para recuperación y contacto
   - `GMAIL_USER` y `GMAIL_PASS` como alternativa si prefieres seguir usando Gmail; en Gmail usa una contraseña de aplicación, no la contraseña normal de la cuenta
4. Inicia el servidor en modo desarrollo:
   ```bash
   npm run dev
   ```
5. Abre en tu navegador: `http://localhost:3000`

---

## ✅ Checklist Pre-Lanzamiento

- [ ] Configurar variables de entorno de producción usando `.env.example` como referencia.
- [ ] Configurar `NODE_ENV=production`.
- [ ] Crear PostgreSQL y configurar `DATABASE_URL`.
- [ ] Configurar uploads persistentes en el NAS: `UPLOAD_STORAGE=local`, `UPLOADS_DIR=/volume1/web/marka/uploads`, `PUBLIC_UPLOADS_URL=/uploads`.
- [ ] Configurar `SITE_URL=https://markpublicidad.com` para enlaces de recuperación de contraseña.
- [ ] Configurar WhatsApp en el Panel de Ajustes.
- [ ] Ajustar la lista de precios en la sección del Cotizador.
- [ ] Subir al menos 10 productos reales con sus respectivas imágenes.
- [ ] Validar el correcto funcionamiento de correos para formularios de contacto.
- [ ] Validar recuperación de contraseña para admin y usuarios nuevos.
- [ ] Cambiar la contraseña admin antes de publicar y activar 2FA.
