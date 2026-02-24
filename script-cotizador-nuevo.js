// ===== COTIZADOR MEJORADO =====
// Este archivo contiene el código nuevo del cotizador
// Copia estas funciones al script.js principal reemplazando las antiguas

function calculateQuote() {
    // Obtener todos los valores del formulario
    const service = document.getElementById('quoteService').value;
    const quantity = parseInt(document.getElementById('quoteQuantity').value);
    const size = document.getElementById('quoteSize').value;
    const material = document.getElementById('quoteMaterial').value;
    const color = document.getElementById('quoteColor').value;
    const finish = document.getElementById('quoteFinish').value;
    const delivery = document.getElementById('quoteDelivery').value;
    const design = document.getElementById('quoteDesign').value;
    const needProof = document.getElementById('quoteProof').checked;
    const needInstall = document.getElementById('quoteInstall').checked;
    
    if (!service || !quantity) {
        alert('Por favor completa todos los campos obligatorios');
        return;
    }
    
    // PRECIOS BASE POR SERVICIO (por unidad)
    const basePrices = {
        'flyers': 0.12,
        'tarjetas': 0.20,
        'brochures': 0.35,
        'catalogos': 1.50,
        'banners': 8.00,
        'rollups': 45.00,
        'vinilos': 6.50,
        'cajas': 0.80,
        'etiquetas': 0.08,
        'bolsas': 0.40,
        'gorras': 5.00,
        'tazas': 4.00,
        'esferos': 0.35,
        'diseno-logo': 150.00,
        'diseno-completo': 500.00
    };
    
    let basePrice = basePrices[service] || 0.20;
    let breakdown = [];
    
    // CÁLCULO BASE
    let productCost = 0;
    if (service.includes('diseno')) {
        productCost = basePrice;
        breakdown.push({ label: 'Servicio de Diseño', value: basePrice });
    } else {
        productCost = basePrice * quantity;
        breakdown.push({ 
            label: `${quantity} unidades × $${basePrice.toFixed(2)}`, 
            value: productCost 
        });
    }
    
    // MULTIPLICADOR DE TAMAÑO
    const sizeMultipliers = {
        'a6': 0.8, 'a5': 1.0, 'a4': 1.2, 'a3': 1.8,
        'carta': 1.15, 'oficio': 1.3, 'personalizado': 1.5
    };
    
    if (size && !service.includes('diseno')) {
        const sizeMult = sizeMultipliers[size] || 1;
        if (sizeMult !== 1) {
            const sizeAdj = productCost * (sizeMult - 1);
            productCost *= sizeMult;
            breakdown.push({ label: `Ajuste por Tamaño`, value: sizeAdj });
        }
    }
    
    // MATERIAL
    const materialMult = {
        'couche115': 1.0, 'couche150': 1.15, 'couche200': 1.35,
        'couche300': 1.6, 'opalina': 1.4, 'adhesivo': 1.25, 'lona': 1.3
    };
    
    if (material && !service.includes('diseno')) {
        const matMult = materialMult[material] || 1;
        if (matMult !== 1) {
            const matAdj = productCost * (matMult - 1);
            productCost *= matMult;
            breakdown.push({ label: `Material Premium`, value: matAdj });
        }
    }
    
    // COLOR
    const colorCosts = {
        'full-color': 1.0, 'color-frente': 0.7, 'bn': 0.5,
        '1-tinta': 0.6, '2-tintas': 0.75
    };
    
    if (color && !service.includes('diseno')) {
        const colorMult = colorCosts[color] || 1;
        if (colorMult !== 1) {
            const colorAdj = productCost * (colorMult - 1);
            productCost *= colorMult;
            const label = colorMult < 1 ? 'Descuento B/N' : 'Impresión a Color';
            breakdown.push({ label, value: colorAdj });
        }
    }
    
    // ACABADOS
    const finishCosts = {
        'ninguno': 0, 'laminado-mate': quantity * 0.05,
        'laminado-brillante': quantity * 0.06, 'barniz-uv': quantity * 0.10,
        'troquelado': quantity * 0.08, 'relieve': quantity * 0.15
    };
    
    let finishCost = finishCosts[finish] || 0;
    if (finishCost > 0) {
        breakdown.push({ label: `Acabado Especial`, value: finishCost });
    }
    
    // DISEÑO
    const designCosts = { 'no': 0, 'basico': 25, 'profesional': 50, 'premium': 100 };
    let designCost = designCosts[design] || 0;
    if (designCost > 0) {
        breakdown.push({ label: `Diseño Gráfico`, value: designCost });
    }
    
    // OPCIONALES
    let additionalCosts = 0;
    if (needProof) {
        additionalCosts += 15;
        breakdown.push({ label: `Prueba de Color`, value: 15 });
    }
    if (needInstall) {
        additionalCosts += 50;
        breakdown.push({ label: `Instalación`, value: 50 });
    }
    
    // SUBTOTAL
    let subtotal = productCost + finishCost + designCost + additionalCosts;
    
    // DESCUENTO
    let discount = 0, discountPercent = 0;
    if (quantity >= 5000) { discountPercent = 15; discount = subtotal * 0.15; }
    else if (quantity >= 2000) { discountPercent = 10; discount = subtotal * 0.10; }
    else if (quantity >= 1000) { discountPercent = 5; discount = subtotal * 0.05; }
    
    // ENTREGA
    const deliveryMult = { 'estandar': 1.0, 'express': 1.15, 'urgente': 1.30 };
    let deliveryCost = 0;
    if (deliveryMult[delivery] > 1) {
        deliveryCost = subtotal * (deliveryMult[delivery] - 1);
        breakdown.push({ label: `Entrega Urgente`, value: deliveryCost });
    }
    
    // TOTAL
    let total = subtotal + deliveryCost - discount;
    
    showDetailedQuoteResult({
        service, quantity, size, material, color, finish, delivery, design,
        breakdown, subtotal, discount, discountPercent, total,
        unitPrice: total / (quantity || 1)
    });
}

function showDetailedQuoteResult(data) {
    const resultDiv = document.getElementById('quoteResult');
    const summaryContent = document.getElementById('summaryContent');
    const breakdownList = document.getElementById('breakdownList');
    const subtotalValue = document.getElementById('subtotalValue');
    const discountRow = document.getElementById('discountRow');
    const discountValue = document.getElementById('discountValue');
    const totalValue = document.getElementById('totalValue');
    const unitPrice = document.getElementById('unitPrice');
    const deliveryTime = document.getElementById('deliveryTime');
    
    if (!resultDiv) return;
    
    // Nombres amigables
    const serviceNames = {
        'flyers': 'Flyers y Volantes', 'tarjetas': 'Tarjetas de Presentación',
        'brochures': 'Brochures', 'catalogos': 'Catálogos', 'banners': 'Banners',
        'rollups': 'Roll-ups', 'vinilos': 'Vinilos', 'cajas': 'Cajas',
        'etiquetas': 'Etiquetas', 'bolsas': 'Bolsas', 'gorras': 'Gorras',
        'tazas': 'Tazas', 'esferos': 'Esferos', 'diseno-logo': 'Diseño de Logo',
        'diseno-completo': 'Identidad Corporativa'
    };
    
    const deliveryNames = {
        'estandar': '7-10 días hábiles',
        'express': '3-5 días hábiles',
        'urgente': '24-48 horas'
    };
    
    // RESUMEN
    let summaryHTML = `
        <div class="summary-item">
            <span class="summary-label">Servicio:</span>
            <span class="summary-value">${serviceNames[data.service] || data.service}</span>
        </div>`;
    
    if (!data.service.includes('diseno')) {
        summaryHTML += `<div class="summary-item">
            <span class="summary-label">Cantidad:</span>
            <span class="summary-value">${data.quantity} unidades</span>
        </div>`;
    }
    
    summaryContent.innerHTML = summaryHTML;
    
    // DESGLOSE
    let breakdownHTML = '';
    data.breakdown.forEach(item => {
        breakdownHTML += `<div class="breakdown-item">
            <span class="breakdown-label">${item.label}</span>
            <span class="breakdown-value">$${item.value.toFixed(2)}</span>
        </div>`;
    });
    breakdownList.innerHTML = breakdownHTML;
    
    // TOTALES
    subtotalValue.textContent = '$' + data.subtotal.toFixed(2);
    
    if (data.discount > 0) {
        discountRow.style.display = 'flex';
        discountValue.textContent = `-$${data.discount.toFixed(2)} (${data.discountPercent}%)`;
    } else {
        discountRow.style.display = 'none';
    }
    
    totalValue.textContent = '$' + data.total.toFixed(2);
    unitPrice.textContent = '$' + data.unitPrice.toFixed(2);
    deliveryTime.textContent = 'Entrega estimada: ' + deliveryNames[data.delivery];
    
    // ANIMACIÓN
    resultDiv.style.display = 'block';
    resultDiv.style.transform = 'scale(0.95)';
    resultDiv.style.opacity = '0';
    
    setTimeout(() => {
        resultDiv.style.transform = 'scale(1)';
        resultDiv.style.opacity = '1';
        resultDiv.style.transition = 'all 0.5s ease';
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        createConfetti();
    }, 100);
}
