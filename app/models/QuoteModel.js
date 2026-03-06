/**
 * QuoteModel — Lógica de cotización
 * Sin dependencias de DOM
 */
export default class QuoteModel {
  constructor() {
    // Precio base por unidad basado en lista de precios oficial Mark Publicidad
    this._base = {
      // Impresión — precio por unidad a partir de 1 000 u
      flyers:         0.08,   // Volantes A6 1 cara: $80 / 1 000 u
      tarjetas:       0.035,  // Tarjetas brillo UV: $35 / 1 000 u
      digital:        0.08,   // Impresión digital general
      // Gran Formato
      banners:        8.00,   // por m² (lona)
      rollups:        50.00,  // por unidad, lona mate/brillante
      vinilos:        7.00,   // por m²
      // Packaging
      cajas:          1.20,
      bolsas:         0.65,
      etiquetas:      0.08,
      // Material POP
      gorras:         5.00,
      esferos:        0.40,
      tazas:          4.99,   // por unidad (precio unitario 1 u)
      pop:            0.35,
      // Diseño
      diseno:         50.00,  // precio base servicio diseño
      'diseno-logo':  80.00,  // diseño de logotipo
    };

    // Servicios de precio fijo (no se multiplica por cantidad)
    this._fixedPrice = new Set(['diseno', 'diseno-logo']);

    // Servicios donde la "cantidad" representa m²
    this._isSqm = new Set(['banners', 'vinilos']);

    this._materialMult = { estandar: 1.0, premium: 1.5, lujo: 2.0 };
    this._sizeMult     = { pequeno: 1.0, mediano: 1.3, grande: 1.6 };

    this._serviceLabels = {
      flyers:        'Flyers y Volantes',
      tarjetas:      'Tarjetas de Presentación',
      digital:       'Impresión Digital',
      banners:       'Banners y Lonas',
      rollups:       'Roll Ups',
      vinilos:       'Vinilos Adhesivos',
      cajas:         'Cajas Personalizadas',
      bolsas:        'Bolsas de Papel',
      etiquetas:     'Etiquetas Adhesivas',
      gorras:        'Gorras Personalizadas',
      esferos:       'Esferos Personalizados',
      tazas:         'Tazas Sublimadas',
      pop:           'Material POP General',
      diseno:        'Diseño Gráfico',
      'diseno-logo': 'Diseño de Logotipo',
    };

    // Tiempo estimado de entrega por tipo de servicio
    this._delivery = {
      flyers:        '5–7 días hábiles',
      tarjetas:      '7–10 días hábiles',
      digital:       '4–6 días hábiles',
      banners:       '2–4 días hábiles',
      rollups:       '4–6 días hábiles',
      vinilos:       '3–5 días hábiles',
      cajas:         '10–15 días hábiles',
      bolsas:        '7–10 días hábiles',
      etiquetas:     '5–8 días hábiles',
      gorras:        '10–15 días hábiles',
      esferos:       '7–10 días hábiles',
      tazas:         '5–7 días hábiles',
      pop:           '7–10 días hábiles',
      diseno:        '3–5 días hábiles',
      'diseno-logo': '5–7 días hábiles',
    };
  }

  /**
   * @param {{ service, quantity, material, size }} params
   * @returns {{ price, discount, breakdown }}
   */
  calculate({ service, quantity, material = 'estandar', size = 'pequeno' }) {
    if (!service)             throw new Error('Selecciona un tipo de servicio.');
    if (!this._base[service]) throw new Error('Servicio no reconocido.');
    if (!quantity || quantity < 1) throw new Error('La cantidad debe ser al menos 1.');

    const basePrice = this._base[service];
    const isFixed   = this._fixedPrice.has(service);
    const isSqm     = this._isSqm.has(service);

    // Para servicios fijos no aplicar multiplicadores de material/tamaño
    const mult     = isFixed ? 1 : (this._materialMult[material] ?? 1) * (this._sizeMult[size] ?? 1);
    const unitCost = isFixed ? basePrice : basePrice * mult;
    const subtotal = isFixed ? basePrice : basePrice * quantity * mult;

    // Descuentos por volumen según lista de precios oficial
    let discount = 0;
    if (!isFixed) {
      if (service === 'tazas') {
        // Escala real: 1u=$4.99, 6+=$3.50, 12+=$3.00, 24+=$2.50, 36+=$1.80, 100+=$1.60
        if      (quantity >= 100) discount = 1 - (1.60 / 4.99);
        else if (quantity >=  36) discount = 1 - (1.80 / 4.99);
        else if (quantity >=  24) discount = 1 - (2.50 / 4.99);
        else if (quantity >=  12) discount = 1 - (3.00 / 4.99);
        else if (quantity >=   6) discount = 1 - (3.50 / 4.99);
      } else {
        // Descuento general por volumen
        if      (quantity >= 5000) discount = 0.15;
        else if (quantity >= 2000) discount = 0.12;
        else if (quantity >= 1000) discount = 0.08;
      }
    }

    return {
      price:    parseFloat((subtotal * (1 - discount)).toFixed(2)),
      discount,
      breakdown: {
        service:  this._serviceLabels[service] ?? service,
        quantity,
        unit:     isSqm ? 'm²' : 'uds.',
        material: isFixed ? '—' : this._capitalize(material),
        size:     isFixed ? '—' : this._capitalize(size),
        basePrice,
        unitCost,
        mult,
        isFixed,
        isSqm,
        delivery: this._delivery[service] ?? '7–10 días hábiles',
      },
    };
  }

  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
