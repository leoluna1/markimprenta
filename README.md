# 🖨️ Mark Publicidad Impresa - Sitio Web

Sitio web moderno y profesional para imprenta con animaciones, catálogo dinámico de productos y cotizador en línea.

## ✨ Características Principales

- 🎨 **Animaciones Modernas**: Efectos suaves y profesionales
- 📦 **Catálogo Dinámico**: Sistema fácil de gestionar productos
- 📱 **Diseño Responsive**: Perfecto en todos los dispositivos
- 🧮 **Cotizador en Línea**: Cálculo automático de precios
- 💬 **WhatsApp Flotante**: Contacto directo con clientes
- 🎯 **Filtros de Categorías**: Navegación intuitiva

---

## 📝 GUÍA RÁPIDA: Agregar Productos

### 1. Abre `products-data.js`

### 2. Copia este template:

```javascript
{
    id: XX, // Número único
    name: "Nombre del Producto",
    category: "impresion", // impresion | pop | packaging | etiquetas | diseno
    price: "Desde $XX.XX",
    description: "Descripción completa del producto",
    features: [
        "✓ Característica 1",
        "✓ Característica 2",
        "✓ Característica 3"
    ],
    image: "🎨" // Emoji o URL de imagen
},
```

### 3. Pégalo antes de `];`

### 4. Guarda y recarga la página

---

## 🎨 Cambiar Colores

Edita las variables en `styles.css`:

```css
:root {
    --primary-color: #e74c3c;
    --secondary-color: #c0392b;
}
```

---

## 📞 Actualizar Contacto

En `index.html` busca y modifica:
- Dirección
- Teléfonos  
- Email
- Horarios
- WhatsApp: `https://wa.me/TUNUMERO`

---

## 💰 Ajustar Precios del Cotizador

En `script.js` modifica:

```javascript
const basePrices = {
    'flyers': 0.15,
    'tarjetas': 0.25,
    // etc...
};
```

---

## 🚀 Publicar en Internet

**Opción 1: GitHub Pages** (Gratis)
1. Sube a GitHub
2. Activa GitHub Pages

**Opción 2: Netlify** (Gratis)
1. Arrastra carpeta a netlify.com
2. Listo!

---

## 📱 Estructura de Archivos

```
offset/
├── index.html          - Página principal
├── styles.css          - Diseño y estilos
├── script.js           - Funcionalidad
├── products-data.js    - Productos del catálogo
└── README.md          - Esta guía
```

---

## ✅ Checklist Pre-Lanzamiento

- [ ] Información de contacto correcta
- [ ] WhatsApp configurado
- [ ] Precios actualizados
- [ ] Al menos 10 productos
- [ ] Probado en móvil
- [ ] Colores de marca aplicados

---

**¡Sitio listo para usar! 🎉**

Para soporte adicional, consulta la documentación completa en este archivo.
# markimprenta
