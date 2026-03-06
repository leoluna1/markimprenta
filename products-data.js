// BASE DE DATOS DE PRODUCTOS
// Este archivo contiene todos los productos del catálogo
// Fácil de editar para agregar, modificar o eliminar productos

const productsDatabase = [
    // CATEGORÍA: IMPRESIÓN
    {
        id: 1,
        name: "Flyers y Volantes",
        category: "impresion",
        description: "Impresión de flyers y volantes en alta calidad, ideal para promociones y publicidad masiva.",
        image: "images/flyers.pdf",
        price: 0.15,
        priceUnit: "por unidad",
        features: [
            "Impresión a full color",
            "Varios tamaños disponibles",
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
        description: "Tarjetas profesionales que causan una gran primera impresión.",
        image: "images/flyers.jpg",
        price: 0.25,
        priceUnit: "por unidad",
        features: [
            "Impresión doble cara",
            "Papel couché 300gr",
            "Acabados especiales disponibles",
            "Diseño incluido"
        ],
        popular: true,
        minQuantity: 500
    },
    {
        id: 3,
        name: "Hojas Membretadas",
        category: "impresion",
        description: "Papelería corporativa personalizada para tu empresa.",
        image: "images/hojas_membretadas.pdf",
        price: 0.30,
        priceUnit: "por unidad",
        features: [
            "Papel bond 75gr",
            "Full color",
            "Diseño corporativo",
            "Entrega rápida"
        ],
        popular: false,
        minQuantity: 100
    },
    {
        id: 4,
        name: "Catálogos y Revistas",
        category: "impresion",
        description: "Impresión de catálogos y revistas con acabados profesionales.",
        image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80",
        price: 2.50,
        priceUnit: "por unidad",
        features: [
            "Varios formatos",
            "Encuadernado incluido",
            "Papel couché",
            "Diseño editorial"
        ],
        popular: false,
        minQuantity: 50
    },

    // CATEGORÍA: MATERIAL POP Y PROMOCIONAL
    {
        id: 5,
        name: "Gorras Personalizadas",
        category: "pop",
        description: "Gorras bordadas o estampadas con tu logo.",
        image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80",
        price: 5.00,
        priceUnit: "por unidad",
        features: [
            "Bordado o estampado",
            "Varios colores",
            "Ajustable",
            "Logo personalizado"
        ],
        popular: true,
        minQuantity: 12
    },
    {
        id: 6,
        name: "Agendas y Cuadernos",
        category: "pop",
        description: "Agendas y cuadernos personalizados para regalos corporativos.",
        image: "https://images.unsplash.com/photo-1531346680769-a1d79b57de5b?w=600&q=80",
        price: 3.50,
        priceUnit: "por unidad",
        features: [
            "Tapa dura o blanda",
            "Personalización total",
            "Varios tamaños",
            "Anillado o cosido"
        ],
        popular: true,
        minQuantity: 50
    },
    {
        id: 7,
        name: "Esferos y Bolígrafos",
        category: "pop",
        description: "Esferos personalizados con tu marca.",
        image: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&q=80",
        price: 0.50,
        priceUnit: "por unidad",
        features: [
            "Impresión de logo",
            "Varios colores",
            "Tinta de calidad",
            "Económicos"
        ],
        popular: true,
        minQuantity: 100
    },
    {
        id: 8,
        name: "Tazas Personalizadas",
        category: "pop",
        description: "Tazas cerámicas con impresión sublimada.",
        image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&q=80",
        price: 4.00,
        priceUnit: "por unidad",
        features: [
            "Sublimación de alta calidad",
            "Cerámica resistente",
            "Diseños a full color",
            "Apto microondas"
        ],
        popular: false,
        minQuantity: 12
    },

    // CATEGORÍA: PACKAGING
    {
        id: 9,
        name: "Cajas Personalizadas",
        category: "packaging",
        description: "Cajas de cartón impresas para empaque de productos.",
        image: "https://images.unsplash.com/photo-1607166452427-7e4477079cb9?w=600&q=80",
        price: 1.50,
        priceUnit: "por unidad",
        features: [
            "Varios tamaños",
            "Impresión full color",
            "Cartón resistente",
            "Diseño incluido"
        ],
        popular: true,
        minQuantity: 100
    },
    {
        id: 10,
        name: "Etiquetas Adhesivas",
        category: "etiquetas",
        description: "Etiquetas en rollo o pliego para productos.",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
        price: 0.10,
        priceUnit: "por unidad",
        features: [
            "Material resistente",
            "Impresión a color",
            "Corte personalizado",
            "Adhesivo de calidad"
        ],
        popular: true,
        minQuantity: 500
    },
    {
        id: 11,
        name: "Bolsas de Papel",
        category: "packaging",
        description: "Bolsas de papel kraft personalizadas.",
        image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80",
        price: 0.75,
        priceUnit: "por unidad",
        features: [
            "Papel kraft ecológico",
            "Asas resistentes",
            "Impresión personalizada",
            "Varios tamaños"
        ],
        popular: false,
        minQuantity: 100
    },
    {
        id: 12,
        name: "Stickers y Calcomanías",
        category: "etiquetas",
        description: "Stickers troquelados en diversos materiales.",
        image: "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=600&q=80",
        price: 0.15,
        priceUnit: "por unidad",
        features: [
            "Vinil o papel",
            "Resistente al agua",
            "Corte personalizado",
            "Alta durabilidad"
        ],
        popular: true,
        minQuantity: 100
    },

    // CATEGORÍA: GRAN FORMATO
    {
        id: 13,
        name: "Banners y Lonas",
        category: "gran-formato",
        description: "Impresión de banners y lonas para exterior e interior.",
        image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80",
        price: 15.00,
        priceUnit: "por m²",
        features: [
            "Material resistente",
            "Impresión UV",
            "Ojales incluidos",
            "Tamaño personalizado"
        ],
        popular: true,
        minQuantity: 1
    },
    {
        id: 14,
        name: "Roll Ups",
        category: "gran-formato",
        description: "Display portátil retráctil con impresión de alta calidad.",
        image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&q=80",
        price: 45.00,
        priceUnit: "por unidad",
        features: [
            "Estructura incluida",
            "Fácil instalación",
            "Portátil",
            "Impresión HD"
        ],
        popular: true,
        minQuantity: 1
    },
    {
        id: 15,
        name: "Vinilos y Adhesivos",
        category: "gran-formato",
        description: "Vinilos autoadhesivos para decoración y publicidad.",
        image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=600&q=80",
        price: 8.00,
        priceUnit: "por m²",
        features: [
            "Vinil de alta calidad",
            "Instalación disponible",
            "Resistente a UV",
            "Varios acabados"
        ],
        popular: false,
        minQuantity: 1
    },
    {
        id: 16,
        name: "Gigantografías",
        category: "gran-formato",
        description: "Impresiones de gran formato para fachadas y espacios amplios.",
        image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&q=80",
        price: 12.00,
        priceUnit: "por m²",
        features: [
            "Hasta 3.20m de ancho",
            "Impresión HD",
            "Material resistente",
            "Instalación disponible"
        ],
        popular: true,
        minQuantity: 1
    },

    // CATEGORÍA: DISEÑO
    {
        id: 17,
        name: "Diseño de Logotipos",
        category: "diseno",
        description: "Creación de identidad visual profesional para tu marca.",
        image: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&q=80",
        price: 80.00,
        priceUnit: "por proyecto",
        features: [
            "3 propuestas iniciales",
            "Revisiones incluidas",
            "Archivos en alta resolución",
            "Manual de marca"
        ],
        popular: true,
        minQuantity: 1
    },
    {
        id: 18,
        name: "Diseño Publicitario",
        category: "diseno",
        description: "Diseño de piezas publicitarias para medios digitales e impresos.",
        image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&q=80",
        price: 50.00,
        priceUnit: "por proyecto",
        features: [
            "Diseño creativo",
            "Formatos múltiples",
            "Entrega en 48 horas",
            "Revisiones incluidas"
        ],
        popular: false,
        minQuantity: 1
    }
];

// Función para obtener productos por categoría
function getProductsByCategory(category) {
    if (category === 'all') {
        return productsDatabase;
    }
    return productsDatabase.filter(product => product.category === category);
}

// Función para obtener productos populares
function getPopularProducts() {
    return productsDatabase.filter(product => product.popular);
}

// Función para buscar productos
function searchProducts(query) {
    const lowerQuery = query.toLowerCase();
    return productsDatabase.filter(product => 
        product.name.toLowerCase().includes(lowerQuery) ||
        product.description.toLowerCase().includes(lowerQuery)
    );
}

// Función para obtener un producto por ID
function getProductById(id) {
    return productsDatabase.find(product => product.id === id);
}

// Exportar funciones (para uso en script.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        productsDatabase,
        getProductsByCategory,
        getPopularProducts,
        searchProducts,
        getProductById
    };
}
