/**
 * ProductModel — Datos y lógica de productos
 * Lee desde la API Node.js; si falla usa los datos locales como fallback.
 */

// ── Datos de emergencia (fallback sin servidor) ────────────────────────────
const FALLBACK_PRODUCTS = [
  { id: 1,  name: 'Flyers y Volantes',       category: 'impresion',    image: 'images/flyers.png',           price: 80.00,  priceUnit: 'por 1000 unidades', popular: true,  minQuantity: 1000, description: 'Volantes A6, A5 y A4 en alta calidad para promociones, eventos y campañas masivas.',                    features: ['A6 1 cara: $80/mil · 2 caras: $90/mil', 'A5 1 cara: $3.00/100 · 2 caras: $2.50/100', 'A4 1 cara: $1.80/100 · 2 caras: $1.60/100', 'Papel couché 115g / 150g o bond 90g', 'Diseño personalizable incluido'] },
  { id: 2,  name: 'Tarjetas de Presentación', category: 'impresion',   image: 'images/tarjetas_p.png',       price: 35.00,  priceUnit: 'por 1000 unidades', popular: true,  minQuantity: 1000, description: 'Tarjetas 8.5 × 5.2 cm a una o dos caras con acabados premium.',                                            features: ['Brillo UV: $35/mil', 'Laminado mate: $55/mil', 'UV selectivo: $75/mil', 'Cartulina couché 300g'] },
  { id: 3,  name: 'Hojas Membretadas',        category: 'impresion',   image: 'images/hojas_membretadas.png',price: 50.00,  priceUnit: 'por 1000 unidades', popular: false, minQuantity: 1000, description: 'Papelería corporativa en papel bond de alta calidad.',                                                        features: ['$50 por 1000 unidades', 'Papel bond / offset 75g – 90g', 'Impresión full color'] },
  { id: 4,  name: 'Carpetas Corporativas',    category: 'impresion',   image: 'images/carpetas.png',         price: 35.00,  priceUnit: 'por 100 unidades',  popular: false, minQuantity: 100,  description: 'Carpetas A4 (22 × 31 cm) con acabados de lujo para presentaciones corporativas.',                          features: ['Brillo UV: $35/100', 'Laminado mate: $55/100', 'Cartulina couché 300g'] },
  { id: 5,  name: 'Gorras Personalizadas',    category: 'pop',         image: '🧢',                          price: 5.00,   priceUnit: 'por unidad',        popular: true,  minQuantity: 12,   description: 'Gorras bordadas o estampadas con tu logo.',                                                               features: ['Bordado o estampado', 'Varios colores', 'Talla ajustable'] },
  { id: 6,  name: 'Tazas Sublimadas',         category: 'pop',         image: 'images/tasas.png',            price: 4.99,   priceUnit: 'por unidad',        popular: true,  minQuantity: 1,    description: 'Tazas cerámicas 11 oz con impresión sublimada en full color.',                                             features: ['1 u: $4.99 · 6 u: $3.50/u', 'Cerámica blanca 11 oz', 'Área: 20 × 9 cm'] },
  { id: 7,  name: 'Esferos y Bolígrafos',     category: 'pop',         image: '✏️',                          price: 0.40,   priceUnit: 'por unidad',        popular: true,  minQuantity: 100,  description: 'Esferos personalizados con tu marca.',                                                                    features: ['Impresión de logo', 'Varios colores'] },
  { id: 8,  name: 'Agendas y Cuadernos',      category: 'pop',         image: '📓',                          price: 3.50,   priceUnit: 'por unidad',        popular: false, minQuantity: 50,   description: 'Agendas y cuadernos personalizados para regalos corporativos.',                                            features: ['Tapa dura o blanda', 'Varios tamaños'] },
  { id: 9,  name: 'Cajas Personalizadas',     category: 'packaging',   image: '📦',                          price: 1.20,   priceUnit: 'por unidad',        popular: true,  minQuantity: 100,  description: 'Cajas de cartón impresas en full color.',                                                                 features: ['Varios tamaños', 'Impresión full color'] },
  { id: 10, name: 'Bolsas de Papel',          category: 'packaging',   image: '🛍️',                         price: 0.65,   priceUnit: 'por unidad',        popular: false, minQuantity: 100,  description: 'Bolsas de papel kraft personalizadas.',                                                                   features: ['Papel kraft ecológico', 'Varios tamaños'] },
  { id: 11, name: 'Stickers y Calcomanías',   category: 'packaging',   image: '✨',                          price: 0.15,   priceUnit: 'por unidad',        popular: true,  minQuantity: 100,  description: 'Stickers troquelados en vinil o papel.',                                                                  features: ['Vinil o papel', 'Resistente al agua'] },
  { id: 12, name: 'Etiquetas Adhesivas',      category: 'etiquetas',   image: '🏷️',                         price: 0.08,   priceUnit: 'por unidad',        popular: true,  minQuantity: 500,  description: 'Etiquetas en rollo o pliego para cualquier producto.',                                                    features: ['Material resistente', 'Corte personalizado'] },
  { id: 13, name: 'Banners y Lonas',          category: 'gran-formato',image: '🖼️',                         price: 12.00,  priceUnit: 'por m²',            popular: true,  minQuantity: 1,    description: 'Impresión de banners y lonas en alta resolución.',                                                        features: ['Material lona resistente', 'Ojales incluidos'] },
  { id: 14, name: 'Roll Up Publicitario',     category: 'gran-formato',image: 'images/roll-up.png',          price: 50.00,  priceUnit: 'por unidad (+IVA)', popular: true,  minQuantity: 1,    description: 'Display retráctil portátil 80 × 200 cm.',                                                                features: ['Estructura aluminio', 'Impresión full color', 'Bolsa incluida'] },
  { id: 15, name: 'Vinilos Adhesivos',        category: 'gran-formato',image: '🎨',                          price: 7.00,   priceUnit: 'por m²',            popular: false, minQuantity: 1,    description: 'Vinilos autoadhesivos para decoración y señalética.',                                                     features: ['Alta calidad', 'Resistente a UV'] },
  { id: 16, name: 'Gigantografías',           category: 'gran-formato',image: '🏢',                          price: 12.00,  priceUnit: 'por m²',            popular: true,  minQuantity: 1,    description: 'Impresiones de gran formato para fachadas y locales.',                                                    features: ['Hasta 3.20 m de ancho', 'Impresión HD'] },
  { id: 17, name: 'Cajas de Luz',             category: 'gran-formato',image: '💡',                          price: 77.00,  priceUnit: 'por unidad',        popular: false, minQuantity: 1,    description: 'Rótulos luminosos LED para exterior e interior.',                                                         features: ['LED bajo consumo', 'Varios tamaños'] },
  { id: 18, name: 'Stand PVC',                category: 'gran-formato',image: 'images/stand-pvc.png',        price: 130.00, priceUnit: 'por unidad (+IVA)', popular: false, minQuantity: 1,    description: 'Stand publicitario portátil de PVC expandido.',                                                           features: ['PVC expandido', 'Fácil montaje'] },
  { id: 19, name: 'Identidad Corporativa',    category: 'diseno',      image: '🏆',                          price: 150.00, priceUnit: 'paquete completo',  popular: true,  minQuantity: 1,    description: 'Diseño completo de imagen corporativa para tu empresa.',                                                  features: ['Logo + manual de marca', 'Archivos vectoriales'] },
  { id: 20, name: 'Diseño de Logotipo',       category: 'diseno',      image: '✍️',                          price: 80.00,  priceUnit: 'por proyecto',      popular: true,  minQuantity: 1,    description: 'Diseño profesional de logotipo con múltiples propuestas.',                                                features: ['3 propuestas iniciales', '2 rondas de revisión'] },
  { id: 21, name: 'Letreros en 3D',           category: 'gran-formato',image: '🔡',                          price: 8.00,   priceUnit: 'por letra',         popular: true,  minQuantity: 1,    description: 'Letras y logos en relieve para fachadas, locales y eventos. Disponibles en acrílico, foam PVC o con iluminación LED.', features: ['Acrílico 3D desde $8/letra', 'Foam/PVC 3D desde $5/letra', 'LED Iluminado desde $18/letra', 'Corte láser de precisión', 'Pintado, vinil o iluminado', 'Instalación disponible'] },
];

export default class ProductModel {
  constructor() {
    this._products = [];       // se llenará al llamar load()
    this._loaded   = false;
  }

  /**
   * Carga productos desde la API Node.js.
   * Si el servidor no está disponible usa los datos locales.
   */
  async load() {
    if (this._loaded) return;
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('API no disponible');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        this._products = data;
      } else {
        this._products = FALLBACK_PRODUCTS;
      }
    } catch {
      this._products = FALLBACK_PRODUCTS;
    }
    this._loaded = true;
  }

  /**
   * Fuerza recarga desde la API (útil tras editar en admin).
   */
  async reload() {
    this._loaded = false;
    await this.load();
  }

  getAll() {
    return this._products;
  }

  getById(id) {
    return this._products.find(p => p.id === id) ?? null;
  }

  getByCategory(category) {
    if (category === 'todos') return this._products;
    return this._products.filter(p => p.category === category);
  }

  getBySearch(items, query) {
    if (!query || !query.trim()) return items;
    const q = query.toLowerCase().trim();
    return items.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }

  getByPriceRange(items, min, max) {
    return items.filter(p => {
      if (typeof p.price !== 'number') return true;
      if (min !== null && p.price < min) return false;
      if (max !== null && p.price > max) return false;
      return true;
    });
  }

  paginate(items, page = 1, perPage = 12) {
    const total      = items.length;
    const totalPages = Math.ceil(total / perPage) || 1;
    const safePage   = Math.max(1, Math.min(page, totalPages));
    const start      = (safePage - 1) * perPage;
    return {
      items: items.slice(start, start + perPage),
      total,
      totalPages,
      page: safePage,
    };
  }
}
