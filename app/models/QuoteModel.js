/**
 * QuoteModel — Lógica de cotización
 * Sin dependencias de DOM
 */
export default class QuoteModel {
  constructor() {
    this._base = {
      flyers:   0.15,
      tarjetas: 0.25,
      packaging: 0.50,
      etiquetas: 0.10,
      diseno:   50.00,
      digital:  0.20,
      pop:      0.30,
    };

    this._materialMult = { estandar: 1.0, premium: 1.5, lujo: 2.0 };
    this._sizeMult     = { pequeno: 1.0, mediano: 1.3, grande: 1.6 };

    this._serviceLabels = {
      flyers:    'Flyers y Volantes',
      tarjetas:  'Tarjetas de Presentación',
      packaging: 'Packaging',
      etiquetas: 'Etiquetas',
      diseno:    'Diseño Gráfico',
      digital:   'Impresión Digital',
      pop:       'Material POP',
    };
  }

  /**
   * @param {{ service, quantity, material, size }} params
   * @returns {{ price, discount, breakdown }}
   */
  calculate({ service, quantity, material = 'estandar', size = 'pequeno' }) {
    if (!service)            throw new Error('Selecciona un tipo de servicio.');
    if (!this._base[service])throw new Error('Servicio no reconocido.');
    if (!quantity || quantity < 1) throw new Error('La cantidad debe ser al menos 1.');

    const basePrice = this._base[service];
    const mult      = (this._materialMult[material] ?? 1) * (this._sizeMult[size] ?? 1);
    const isFixed   = service === 'diseno'; // precio fijo, no por unidad

    const subtotal = isFixed ? basePrice * mult : basePrice * quantity * mult;

    // Descuentos por volumen (solo aplica a servicios por unidad)
    let discount = 0;
    if (!isFixed) {
      if (quantity >= 5000) discount = 0.15;
      else if (quantity >= 1000) discount = 0.10;
    }

    return {
      price:    parseFloat((subtotal * (1 - discount)).toFixed(2)),
      discount,
      breakdown: {
        service:   this._serviceLabels[service] ?? service,
        quantity,
        material:  this._capitalize(material),
        size:      this._capitalize(size),
        basePrice,
        mult,
        isFixed,
      },
    };
  }

  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
