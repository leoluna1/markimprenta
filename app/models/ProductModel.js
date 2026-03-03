/**
 * ProductModel — Datos y lógica de productos
 * Sin dependencias de DOM
 */

const PRODUCTS = [
  // ── IMPRESIÓN ─────────────────────────────────────────────────────────────
  {
    id: 1,
    name: 'Flyers y Volantes',
    category: 'impresion',
    image: 'images/flyers.jpg',
    price: 0.15,
    priceUnit: 'por unidad',
    popular: true,
    minQuantity: 500,
    description: 'Impresión de flyers y volantes en alta calidad, ideal para promociones y publicidad masiva.',
    features: [
      'Impresión a full color',
      'Varios tamaños disponibles',
      'Papel couché 115gr – 300gr',
      'Acabados: brillante o mate',
    ],
  },
  {
    id: 2,
    name: 'Tarjetas de Presentación',
    category: 'impresion',
    image: 'images/flyers.jpg',
    price: 0.25,
    priceUnit: 'por unidad',
    popular: true,
    minQuantity: 1000,
    description: 'Tarjetas profesionales que causan una gran primera impresión.',
    features: [
      'Impresión doble cara',
      'Papel couché 300gr',
      'Acabados especiales disponibles',
      'Diseño incluido',
    ],
  },
  {
    id: 3,
    name: 'Hojas Membretadas',
    category: 'impresion',
    image: '📄',
    price: 0.30,
    priceUnit: 'por unidad',
    popular: false,
    minQuantity: 300,
    description: 'Papelería corporativa personalizada para tu empresa.',
    features: ['Papel bond 75gr', 'Full color', 'Diseño corporativo', 'Entrega rápida'],
  },
  {
    id: 4,
    name: 'Catálogos y Revistas',
    category: 'impresion',
    image: '📚',
    price: 2.50,
    priceUnit: 'por unidad',
    popular: false,
    minQuantity: 50,
    description: 'Impresión de catálogos y revistas con acabados profesionales.',
    features: ['Varios formatos', 'Encuadernado incluido', 'Papel couché', 'Diseño editorial'],
  },

  // ── MATERIAL POP ──────────────────────────────────────────────────────────
  {
    id: 5,
    name: 'Gorras Personalizadas',
    category: 'pop',
    image: '🧢',
    price: 5.00,
    priceUnit: 'por unidad',
    popular: true,
    minQuantity: 12,
    description: 'Gorras bordadas o estampadas con tu logo.',
    features: ['Bordado o estampado', 'Varios colores', 'Ajustable', 'Logo personalizado'],
  },
  {
    id: 6,
    name: 'Agendas y Cuadernos',
    category: 'pop',
    image: '📓',
    price: 3.50,
    priceUnit: 'por unidad',
    popular: true,
    minQuantity: 50,
    description: 'Agendas y cuadernos personalizados para regalos corporativos.',
    features: ['Tapa dura o blanda', 'Personalización total', 'Varios tamaños', 'Anillado o cosido'],
  },
  {
    id: 7,
    name: 'Esferos y Bolígrafos',
    category: 'pop',
    image: '✏️',
    price: 0.50,
    priceUnit: 'por unidad',
    popular: true,
    minQuantity: 100,
    description: 'Esferos personalizados con tu marca.',
    features: ['Impresión de logo', 'Varios colores', 'Tinta de calidad', 'Económicos'],
  },
  {
    id: 8,
    name: 'Tazas Personalizadas',
    category: 'pop',
    image: '☕',
    price: 4.00,
    priceUnit: 'por unidad',
    popular: false,
    minQuantity: 12,
    description: 'Tazas cerámicas con impresión sublimada.',
    features: ['Sublimación de alta calidad', 'Cerámica resistente', 'Diseños a full color', 'Apto microondas'],
  },

  // ── PACKAGING ─────────────────────────────────────────────────────────────
  {
    id: 9,
    name: 'Cajas Personalizadas',
    category: 'packaging',
    image: '📦',
    price: 1.50,
    priceUnit: 'por unidad',
    popular: true,
    minQuantity: 100,
    description: 'Cajas de cartón impresas para empaque de productos.',
    features: ['Varios tamaños', 'Impresión full color', 'Cartón resistente', 'Diseño incluido'],
  },
  {
    id: 10,
    name: 'Bolsas de Papel',
    category: 'packaging',
    image: '🛍️',
    price: 0.75,
    priceUnit: 'por unidad',
    popular: false,
    minQuantity: 100,
    description: 'Bolsas de papel kraft personalizadas.',
    features: ['Papel kraft ecológico', 'Asas resistentes', 'Impresión personalizada', 'Varios tamaños'],
  },
  {
    id: 11,
    name: 'Stickers y Calcomanías',
    category: 'packaging',
    image: '✨',
    price: 0.15,
    priceUnit: 'por unidad',
    popular: true,
    minQuantity: 100,
    description: 'Stickers troquelados en diversos materiales.',
    features: ['Vinil o papel', 'Resistente al agua', 'Corte personalizado', 'Alta durabilidad'],
  },

  // ── ETIQUETAS ─────────────────────────────────────────────────────────────
  {
    id: 12,
    name: 'Etiquetas Adhesivas',
    category: 'etiquetas',
    image: '🏷️',
    price: 0.10,
    priceUnit: 'por unidad',
    popular: true,
    minQuantity: 500,
    description: 'Etiquetas en rollo o pliego para cualquier tipo de producto.',
    features: ['Material resistente', 'Impresión a color', 'Corte personalizado', 'Adhesivo de calidad'],
  },
  {
    id: 13,
    name: 'Banners y Lonas',
    category: 'gran-formato',
    image: '🖼️',
    price: 15.00,
    priceUnit: 'por m²',
    popular: true,
    minQuantity: 1,
    description: 'Impresión de banners y lonas para exterior e interior.',
    features: ['Material resistente', 'Impresión UV', 'Ojales incluidos', 'Tamaño personalizado'],
  },
  {
    id: 14,
    name: 'Roll Ups',
    category: 'gran-formato',
    image: '📊',
    price: 45.00,
    priceUnit: 'por unidad',
    popular: true,
    minQuantity: 1,
    description: 'Display portátil retráctil con impresión de alta calidad.',
    features: ['Estructura incluida', 'Fácil instalación', 'Portátil', 'Impresión HD'],
  },
  {
    id: 15,
    name: 'Vinilos y Adhesivos',
    category: 'gran-formato',
    image: '🎨',
    price: 8.00,
    priceUnit: 'por m²',
    popular: false,
    minQuantity: 1,
    description: 'Vinilos autoadhesivos para decoración y publicidad.',
    features: ['Vinil de alta calidad', 'Instalación disponible', 'Resistente a UV', 'Varios acabados'],
  },

  // ── DISEÑO ────────────────────────────────────────────────────────────────
  {
    id: 16,
    name: 'Identidad Corporativa',
    category: 'diseno',
    image: '🏆',
    price: 150.00,
    priceUnit: 'paquete completo',
    popular: true,
    minQuantity: 1,
    description: 'Diseño completo de imagen corporativa para tu empresa.',
    features: ['Logo + manual de marca', 'Paleta de colores', 'Tipografía corporativa', 'Archivos editables'],
  },
  {
    id: 17,
    name: 'Diseño de Logotipo',
    category: 'diseno',
    image: '✍️',
    price: 80.00,
    priceUnit: 'servicio',
    popular: true,
    minQuantity: 1,
    description: 'Diseño profesional de logo con múltiples propuestas.',
    features: ['3 propuestas iniciales', '2 rondas de revisión', 'Formatos vectoriales', 'Archivos en alta resolución'],
  },
  {
    id: 18,
    name: 'Gigantografías',
    category: 'gran-formato',
    image: '🏢',
    price: 12.00,
    priceUnit: 'por m²',
    popular: true,
    minQuantity: 1,
    description: 'Impresiones de gran formato para fachadas y espacios amplios.',
    features: ['Hasta 3.20m de ancho', 'Impresión HD', 'Material resistente', 'Instalación disponible'],
  },
];

export default class ProductModel {
  getAll() {
    return PRODUCTS;
  }

  getById(id) {
    return PRODUCTS.find(p => p.id === id) ?? null;
  }

  getByCategory(category) {
    if (category === 'todos') return PRODUCTS;
    return PRODUCTS.filter(p => p.category === category);
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
