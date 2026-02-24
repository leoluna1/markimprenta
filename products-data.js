// ================================================
// 📦 MARK PUBLICIDAD - BASE DE DATOS DE PRODUCTOS
// Fácil de editar: agrega, modifica o elimina productos
// Categorías válidas: impresion | pop | packaging | etiquetas | diseno
// ================================================

const productsDatabase = [

    // ========== IMPRESIÓN ==========
    {
        id: 1,
        name: "Flyers y Volantes",
        category: "impresion",
        description: "Impresión de flyers y volantes en alta calidad, ideal para promociones y publicidad masiva.",
        image: "🎯",
        price: 0.15,
        priceUnit: "por unidad",
        features: [
            "Impresión a full color",
            "Tamaños: A5, A4, A3",
            "Papel couché 115gr - 300gr",
            "Acabados: brillante o mate"
        ],
        popular: true,
        minQuantity: 100
    },
    {
        id: 2,
        name: "Tarjetas de Presentación",
        category: "impresion",
        description: "Tarjetas profesionales que causan una gran primera impresión. Impresión doble cara.",
        image: "💼",
        price: 0.25,
        priceUnit: "por unidad",
        features: [
            "Impresión doble cara",
            "Papel couché 300gr",
            "Acabados: barniz, plastificado",
            "Diseño incluido"
        ],
        popular: true,
        minQuantity: 100
    },
    {
        id: 3,
        name: "Hojas Membretadas",
        category: "impresion",
        description: "Papelería corporativa personalizada. Ideal para documentos y comunicaciones oficiales.",
        image: "📄",
        price: 0.20,
        priceUnit: "por unidad",
        features: [
            "Papel bond 75gr",
            "Full color",
            "Diseño corporativo profesional",
            "Entrega rápida"
        ],
        popular: false,
        minQuantity: 100
    },
    {
        id: 4,
        name: "Banners y Lonas",
        category: "impresion",
        description: "Impresión de banners y lonas para exterior e interior con material resistente.",
        image: "🖼️",
        price: 15.00,
        priceUnit: "por m²",
        features: [
            "Material lona de alta resistencia",
            "Impresión UV outdoor",
            "Ojales incluidos",
            "Tamaño personalizado"
        ],
        popular: true,
        minQuantity: 1
    },
    {
        id: 5,
        name: "Roll Ups",
        category: "impresion",
        description: "Display portátil retráctil con impresión de alta calidad. Ideal para ferias y eventos.",
        image: "📊",
        price: 45.00,
        priceUnit: "por unidad",
        features: [
            "Estructura de aluminio incluida",
            "Fácil instalación",
            "Portátil con bolsa de transporte",
            "Impresión HD"
        ],
        popular: true,
        minQuantity: 1
    },
    {
        id: 6,
        name: "Catálogos y Revistas",
        category: "impresion",
        description: "Impresión de catálogos y revistas con acabados editoriales profesionales.",
        image: "📚",
        price: 2.50,
        priceUnit: "por unidad",
        features: [
            "Varios formatos disponibles",
            "Encuadernado anillado o cosido",
            "Papel couché interior",
            "Tapa suave o dura"
        ],
        popular: false,
        minQuantity: 50
    },
    {
        id: 7,
        name: "Gigantografías",
        category: "impresion",
        description: "Impresiones de gran formato para fachadas, locales y espacios amplios.",
        image: "🏢",
        price: 12.00,
        priceUnit: "por m²",
        features: [
            "Hasta 3.20m de ancho",
            "Impresión HD de alta resolución",
            "Material resistente a UV",
            "Instalación disponible"
        ],
        popular: true,
        minQuantity: 1
    },
    {
        id: 8,
        name: "Vinilos Adhesivos",
        category: "impresion",
        description: "Vinilos autoadhesivos para decoración de locales, vehículos y vitrinas.",
        image: "🎨",
        price: 8.00,
        priceUnit: "por m²",
        features: [
            "Vinil de alta calidad",
            "Resistente a UV y agua",
            "Varios acabados disponibles",
            "Instalación disponible"
        ],
        popular: false,
        minQuantity: 1
    },

    // ========== MATERIAL POP ==========
    {
        id: 9,
        name: "Gorras Personalizadas",
        category: "pop",
        description: "Gorras bordadas o estampadas con tu logo. Perfectas para uniformes y obsequios corporativos.",
        image: "🧢",
        price: 5.00,
        priceUnit: "por unidad",
        features: [
            "Bordado o estampado de alta calidad",
            "Varios colores disponibles",
            "Talla ajustable",
            "Logo personalizado"
        ],
        popular: true,
        minQuantity: 12
    },
    {
        id: 10,
        name: "Agendas y Cuadernos",
        category: "pop",
        description: "Agendas y cuadernos personalizados para regalos corporativos y merchandising.",
        image: "📓",
        price: 3.50,
        priceUnit: "por unidad",
        features: [
            "Tapa dura o blanda",
            "Personalización total de portada",
            "Varios tamaños",
            "Anillado o cosido"
        ],
        popular: true,
        minQuantity: 24
    },
    {
        id: 11,
        name: "Esferos Personalizados",
        category: "pop",
        description: "Esferos con tu marca impresos. Artículo promocional económico y efectivo.",
        image: "✏️",
        price: 0.50,
        priceUnit: "por unidad",
        features: [
            "Impresión de logo y datos",
            "Varios colores de tinta",
            "Tinta de calidad premium",
            "Ideal para eventos"
        ],
        popular: true,
        minQuantity: 100
    },
    {
        id: 12,
        name: "Tazas Personalizadas",
        category: "pop",
        description: "Tazas cerámicas con impresión sublimada a full color. Recuerdo corporativo premium.",
        image: "☕",
        price: 4.00,
        priceUnit: "por unidad",
        features: [
            "Sublimación de alta calidad",
            "Cerámica resistente 11oz",
            "Diseños a full color",
            "Apto para microondas"
        ],
        popular: false,
        minQuantity: 12
    },
    {
        id: 13,
        name: "Camisetas Personalizadas",
        category: "pop",
        description: "Camisetas con serigrafía o sublimación. Ideal para uniformes y eventos empresariales.",
        image: "👕",
        price: 6.00,
        priceUnit: "por unidad",
        features: [
            "Serigrafía o sublimación",
            "Tallas S a XXXL",
            "Algodón peinado o mix",
            "Varios colores"
        ],
        popular: true,
        minQuantity: 12
    },
    {
        id: 14,
        name: "Libretas de Notas",
        category: "pop",
        description: "Libretas tipo block personalizadas. Económicas y muy útiles para tu público objetivo.",
        image: "🗒️",
        price: 1.20,
        priceUnit: "por unidad",
        features: [
            "Portada personalizada full color",
            "50 hojas bond",
            "Formato A5 o personalizado",
            "Espiral metálico"
        ],
        popular: false,
        minQuantity: 50
    },

    // ========== PACKAGING ==========
    {
        id: 15,
        name: "Cajas Personalizadas",
        category: "packaging",
        description: "Cajas de cartón impresas a full color. Protege y promociona tu producto al mismo tiempo.",
        image: "📦",
        price: 1.50,
        priceUnit: "por unidad",
        features: [
            "Varios tamaños y formas",
            "Impresión full color",
            "Cartón resistente E, B o C",
            "Diseño incluido"
        ],
        popular: true,
        minQuantity: 100
    },
    {
        id: 16,
        name: "Bolsas de Papel",
        category: "packaging",
        description: "Bolsas de papel kraft personalizadas. Sostenibles y con excelente presentación.",
        image: "🛍️",
        price: 0.75,
        priceUnit: "por unidad",
        features: [
            "Papel kraft ecológico",
            "Asas de cordón o papel torcido",
            "Impresión personalizada",
            "Varios tamaños"
        ],
        popular: true,
        minQuantity: 100
    },
    {
        id: 17,
        name: "Estuches Premium",
        category: "packaging",
        description: "Empaques especiales para productos de lujo, cosméticos, joyería y regalos premium.",
        image: "🎁",
        price: 3.00,
        priceUnit: "por unidad",
        features: [
            "Cartón rígido premium",
            "Acabados especiales: foil, relieve",
            "Diseño a la medida",
            "Forro interior disponible"
        ],
        popular: true,
        minQuantity: 50
    },
    {
        id: 18,
        name: "Maletines Corporativos",
        category: "packaging",
        description: "Maletines y presentaciones para kits corporativos. Excelente para lanzamientos.",
        image: "🗂️",
        price: 4.50,
        priceUnit: "por unidad",
        features: [
            "Cartón dúplex resistente",
            "Con divisiones internas",
            "Impresión exterior personalizada",
            "Ideal para kits y portafolios"
        ],
        popular: false,
        minQuantity: 50
    },

    // ========== ETIQUETAS ==========
    {
        id: 19,
        name: "Etiquetas Adhesivas",
        category: "etiquetas",
        description: "Etiquetas en rollo o pliego para productos. Alta calidad y adhesivo permanente.",
        image: "🏷️",
        price: 0.10,
        priceUnit: "por unidad",
        features: [
            "Material BOPP, papel o transparente",
            "Impresión a full color",
            "Corte personalizado",
            "Adhesivo permanente o removible"
        ],
        popular: true,
        minQuantity: 500
    },
    {
        id: 20,
        name: "Stickers y Calcomanías",
        category: "etiquetas",
        description: "Stickers troquelados en vinil de alta durabilidad. Resistentes al agua y al sol.",
        image: "⭐",
        price: 0.15,
        priceUnit: "por unidad",
        features: [
            "Vinil o papel autoadhesivo",
            "Resistente al agua y UV",
            "Corte personalizado (troquel)",
            "Alta durabilidad"
        ],
        popular: true,
        minQuantity: 100
    },
    {
        id: 21,
        name: "Etiquetas para Ropa",
        category: "etiquetas",
        description: "Etiquetas para prendas en tela, satín o papel. Lavables y de alta calidad.",
        image: "👗",
        price: 0.20,
        priceUnit: "por unidad",
        features: [
            "Material: tela, satín o papel",
            "Lavables (etiquetas de tela)",
            "Varios tamaños",
            "Dobladas o rectas"
        ],
        popular: false,
        minQuantity: 200
    },
    {
        id: 22,
        name: "Etiquetas de Seguridad",
        category: "etiquetas",
        description: "Etiquetas de seguridad holográficas o VOID para proteger tu marca y productos.",
        image: "🔒",
        price: 0.30,
        priceUnit: "por unidad",
        features: [
            "Material holográfico o VOID",
            "Evidencia de manipulación",
            "Personalización disponible",
            "Adhesivo fuerte"
        ],
        popular: false,
        minQuantity: 250
    },

    // ========== DISEÑO ==========
    {
        id: 23,
        name: "Diseño de Logotipo",
        category: "diseno",
        description: "Creación de logotipo profesional con identidad visual completa para tu marca.",
        image: "✍️",
        price: 80.00,
        priceUnit: "servicio completo",
        features: [
            "3 propuestas iniciales",
            "Hasta 3 revisiones",
            "Entrega en PNG, SVG, PDF",
            "Manual de marca básico"
        ],
        popular: true,
        minQuantity: 1
    },
    {
        id: 24,
        name: "Diseño Publicitario",
        category: "diseno",
        description: "Diseño de piezas publicitarias: flyers, banners, redes sociales, afiches y más.",
        image: "🎨",
        price: 25.00,
        priceUnit: "por pieza",
        features: [
            "Diseño a medida",
            "Hasta 2 revisiones",
            "Entrega en alta resolución",
            "Listo para impresión"
        ],
        popular: true,
        minQuantity: 1
    },
    {
        id: 25,
        name: "Identidad Corporativa",
        category: "diseno",
        description: "Paquete completo de identidad: logo, colores, tipografía, tarjetas y papelería.",
        image: "🏆",
        price: 180.00,
        priceUnit: "paquete completo",
        features: [
            "Logo + variantes",
            "Paleta de colores oficial",
            "Tipografía corporativa",
            "Aplicaciones: tarjeta, hoja, sobre"
        ],
        popular: true,
        minQuantity: 1
    },
    {
        id: 26,
        name: "Diseño de Packaging",
        category: "diseno",
        description: "Diseño de empaques, etiquetas y cajas. Creatividad e impacto en el punto de venta.",
        image: "📐",
        price: 60.00,
        priceUnit: "por diseño",
        features: [
            "Troquelado incluido",
            "Diagramación técnica",
            "Vista previa 3D",
            "Listo para producción"
        ],
        popular: false,
        minQuantity: 1
    }
];

// ---- Funciones de utilidad ----

function getProductsByCategory(category) {
    if (category === 'todos' || category === 'all') return productsDatabase;
    return productsDatabase.filter(p => p.category === category);
}

function getPopularProducts() {
    return productsDatabase.filter(p => p.popular);
}

function searchProducts(query) {
    const q = query.toLowerCase();
    return productsDatabase.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
}

function getProductById(id) {
    return productsDatabase.find(p => p.id === id);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { productsDatabase, getProductsByCategory, getPopularProducts, searchProducts, getProductById };
}
