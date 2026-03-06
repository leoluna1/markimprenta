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
    image: 'images/flyers.png',
    price: 80.00,
    priceUnit: 'por 1000 unidades',
    popular: true,
    minQuantity: 1000,
    description: 'Volantes A6, A5 y A4 en alta calidad para promociones, eventos y campañas masivas.',
    features: [
      'A6 1 cara: $80/mil · 2 caras: $90/mil',
      'A5 1 cara: $3.00/100 · 2 caras: $2.50/100',
      'A4 1 cara: $1.80/100 · 2 caras: $1.60/100',
      'Papel couché 115g / 150g o bond 90g',
      'Corte recto, acabado profesional',
      'Diseño personalizable incluido',
    ],
  },
  {
    id: 2,
    name: 'Tarjetas de Presentación',
    category: 'impresion',
    image: 'images/tarjetas_p.png',
    price: 35.00,
    priceUnit: 'por 1000 unidades',
    popular: true,
    minQuantity: 1000,
    description: 'Tarjetas 8.5 × 5.2 cm a una o dos caras con acabados premium disponibles.',
    features: [
      'Brillo UV: $35/mil · Laminado mate: $55/mil',
      'UV selectivo: $75/mil · Troquelado: $130/mil',
      'Alto relieve: $130/mil',
      'Cartulina couché 300g',
      'Corte recto o esquinas redondeadas',
      'Diseño personalizable',
    ],
  },
  {
    id: 3,
    name: 'Hojas Membretadas',
    category: 'impresion',
    image: 'images/hojas_membretadas.png',
    price: 50.00,
    priceUnit: 'por 1000 unidades',
    popular: false,
    minQuantity: 1000,
    description: 'Papelería corporativa en papel bond de alta calidad.',
    features: [
      '$50 por 1000 unidades',
      'Papel bond / offset 75g – 90g',
      'Impresión full color o monocromática',
      'Compatible con impresoras láser e inkjet',
      'Presentación en resmas de 100 o 500 unidades',
    ],
  },
  {
    id: 4,
    name: 'Carpetas Corporativas',
    category: 'impresion',
    image: 'images/carpetas.png',
    price: 35.00,
    priceUnit: 'por 100 unidades',
    popular: false,
    minQuantity: 100,
    description: 'Carpetas A4 (22 × 31 cm) con acabados de lujo para presentaciones corporativas.',
    features: [
      'Brillo UV: $35/100 · Laminado mate: $55/100',
      'UV selectivo: $75/100 · Troquelado: $130/100',
      'Alto relieve: $130/100',
      'Cartulina couché 300g',
      'Con o sin solapa interna',
      'Diseño personalizable',
    ],
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
    features: ['Bordado o estampado', 'Varios colores disponibles', 'Talla ajustable', 'Logo personalizado'],
  },
  {
    id: 6,
    name: 'Tazas Sublimadas',
    category: 'pop',
    image: 'images/tasas.png',
    price: 4.99,
    priceUnit: 'por unidad',
    popular: true,
    minQuantity: 1,
    description: 'Tazas cerámicas 11 oz con impresión sublimada en full color.',
    features: [
      '1 u: $4.99 · 6 u: $3.50/u · 12 u: $3.00/u',
      '24 u: $2.50/u · 36 u: $1.80/u · 100 u: $1.60/u',
      'Cerámica blanca de alta calidad (11 oz)',
      'Área de impresión: 20 × 9 cm',
      'Modelos: clásica, color, mágica, metálica',
      'Apta para microondas y lavavajillas',
    ],
  },
  {
    id: 7,
    name: 'Esferos y Bolígrafos',
    category: 'pop',
    image: '✏️',
    price: 0.40,
    priceUnit: 'por unidad',
    popular: true,
    minQuantity: 100,
    description: 'Esferos personalizados con tu marca, ideales para regalos corporativos.',
    features: ['Impresión de logo', 'Varios colores', 'Tinta de calidad', 'Precio accesible por volumen'],
  },
  {
    id: 8,
    name: 'Agendas y Cuadernos',
    category: 'pop',
    image: '📓',
    price: 3.50,
    priceUnit: 'por unidad',
    popular: false,
    minQuantity: 50,
    description: 'Agendas y cuadernos personalizados para regalos corporativos.',
    features: ['Tapa dura o blanda', 'Personalización total', 'Varios tamaños', 'Anillado o cosido'],
  },

  // ── PACKAGING ─────────────────────────────────────────────────────────────
  {
    id: 9,
    name: 'Cajas Personalizadas',
    category: 'packaging',
    image: '📦',
    price: 1.20,
    priceUnit: 'por unidad',
    popular: true,
    minQuantity: 100,
    description: 'Cajas de cartón impresas en full color para empaque de productos.',
    features: ['Varios tamaños disponibles', 'Impresión full color', 'Cartón resistente', 'Diseño incluido'],
  },
  {
    id: 10,
    name: 'Bolsas de Papel',
    category: 'packaging',
    image: '🛍️',
    price: 0.65,
    priceUnit: 'por unidad',
    popular: false,
    minQuantity: 100,
    description: 'Bolsas de papel kraft personalizadas con tu marca.',
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
    description: 'Stickers troquelados en vinil o papel para todo uso.',
    features: ['Vinil o papel', 'Resistente al agua', 'Corte personalizado', 'Alta durabilidad'],
  },

  // ── ETIQUETAS ─────────────────────────────────────────────────────────────
  {
    id: 12,
    name: 'Etiquetas Adhesivas',
    category: 'etiquetas',
    image: '🏷️',
    price: 0.08,
    priceUnit: 'por unidad',
    popular: true,
    minQuantity: 500,
    description: 'Etiquetas en rollo o pliego para cualquier tipo de producto.',
    features: ['Material resistente', 'Impresión a color', 'Corte personalizado', 'Adhesivo de calidad'],
  },

  // ── GRAN FORMATO ──────────────────────────────────────────────────────────
  {
    id: 13,
    name: 'Banners y Lonas',
    category: 'gran-formato',
    image: '🖼️',
    price: 12.00,
    priceUnit: 'por m²',
    popular: true,
    minQuantity: 1,
    description: 'Impresión de banners y lonas para exterior e interior en alta resolución.',
    features: ['Material lona resistente', 'Impresión 300 dpi UV', 'Ojales metálicos incluidos', 'Tamaño personalizado a pedido'],
  },
  {
    id: 14,
    name: 'Roll Up Publicitario',
    category: 'gran-formato',
    image: 'images/roll-up.png',
    price: 50.00,
    priceUnit: 'por unidad (+IVA)',
    popular: true,
    minQuantity: 1,
    description: 'Display retráctil portátil 80 × 200 cm con impresión full color.',
    features: [
      'Lona mate/brillante: $50 + IVA',
      'Pet Banner: $60 + IVA',
      'Estructura de aluminio ligero',
      'Tamaño estándar: 80 × 200 cm',
      'Impresión 300 dpi full color',
      'Bolsa de transporte incluida',
    ],
  },
  {
    id: 15,
    name: 'Vinilos Adhesivos',
    category: 'gran-formato',
    image: '🎨',
    price: 7.00,
    priceUnit: 'por m²',
    popular: false,
    minQuantity: 1,
    description: 'Vinilos autoadhesivos de alta calidad para decoración y señalética.',
    features: ['Vinil de alta calidad', 'Instalación disponible', 'Resistente a UV', 'Varios acabados disponibles'],
  },
  {
    id: 16,
    name: 'Gigantografías',
    category: 'gran-formato',
    image: '🏢',
    price: 12.00,
    priceUnit: 'por m²',
    popular: true,
    minQuantity: 1,
    description: 'Impresiones de gran formato para fachadas, locales y espacios amplios.',
    features: ['Hasta 3.20 m de ancho', 'Impresión HD 300 dpi', 'Material resistente intemperie', 'Instalación disponible'],
  },
  {
    id: 17,
    name: 'Cajas de Luz',
    category: 'gran-formato',
    image: '💡',
    price: 77.00,
    priceUnit: 'por unidad',
    popular: false,
    minQuantity: 1,
    description: 'Rótulos luminosos LED para exterior e interior. Estructura metálica con iluminación de bajo consumo.',
    features: [
      'Cuadrada 60×40: $105 vinil / $125 acrílico',
      'Cuadrada 55×55: $110 vinil / $130 acrílico',
      'Redonda 40×40: $77 vinil / $97 acrílico',
      'Redonda 50×50: $80 vinil / $100 acrílico',
      'Giratoria 50×50: $120 vinil / $140 acrílico',
      'Iluminación LED interior bajo consumo',
    ],
  },
  {
    id: 18,
    name: 'Stand PVC',
    category: 'gran-formato',
    image: 'images/stand-pvc.png',
    price: 130.00,
    priceUnit: 'por unidad (+IVA)',
    popular: false,
    minQuantity: 1,
    description: 'Stand publicitario portátil de PVC expandido con estructura modular.',
    features: [
      '$130 + IVA por unidad',
      'Material PVC expandido resistente',
      'Estructura modular fácil montaje',
      'Impresión full color 300 dpi',
      'Acabado mate o brillante',
      'Bolso tipo maleta incluido',
    ],
  },

  // ── DISEÑO ────────────────────────────────────────────────────────────────
  {
    id: 19,
    name: 'Identidad Corporativa',
    category: 'diseno',
    image: '🏆',
    price: 150.00,
    priceUnit: 'paquete completo',
    popular: true,
    minQuantity: 1,
    description: 'Diseño completo de imagen corporativa para tu empresa.',
    features: ['Logo + manual de marca', 'Paleta de colores', 'Tipografía corporativa', 'Archivos editables vectoriales'],
  },
  {
    id: 20,
    name: 'Diseño de Logotipo',
    category: 'diseno',
    image: '✍️',
    price: 80.00,
    priceUnit: 'por proyecto',
    popular: true,
    minQuantity: 1,
    description: 'Diseño profesional de logotipo con múltiples propuestas y revisiones.',
    features: ['3 propuestas iniciales', '2 rondas de revisión', 'Formatos vectoriales', 'Archivos en alta resolución'],
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
