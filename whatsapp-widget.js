/**
 * =====================================================
 * MARK PUBLICIDAD — WhatsApp Chat Widget v4.0
 * Conversación humana · Mensajes en secuencia
 * Acuse de recibo · Variaciones aleatorias · Emojis
 * =====================================================
 */
(function () {
  'use strict';

  /* ─────────────────────────────────────────────────
     CONFIGURACIÓN
  ───────────────────────────────────────────────── */
  const CONFIG = {
    phone:     '593996884150',
    agentName: 'Marka Publicidad',
    agentRole: 'Respondemos en minutos',
    openDelay: 0,
    hintText:  '¿Necesitas un presupuesto? 😊',
  };

  /* ─────────────────────────────────────────────────
     UTILIDADES
  ───────────────────────────────────────────────── */

  // Elige aleatoriamente de un array
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Saludo según la hora del día
  function greeting() {
    const h = new Date().getHours();
    if (h >= 5  && h < 12) return '¡Buenos días';
    if (h >= 12 && h < 19) return '¡Buenas tardes';
    return '¡Buenas noches';
  }

  // Tiempo de "escritura" según longitud del mensaje (más natural)
  function typingMs(msg) {
    const len = (msg || '').replace(/<[^>]*>/g, '').replace(/[\*\n]/g, '').length;
    return Math.min(Math.max(420, len * 24), 1900);
  }

  // Emoji contextual según producto
  function productEmoji(product) {
    const p = (product || '').toLowerCase();
    if (p.includes('flyer') || p.includes('volante'))       return '🖨️';
    if (p.includes('banner') || p.includes('lona'))         return '🪧';
    if (p.includes('tarjeta'))                               return '📇';
    if (p.includes('taza'))                                  return '☕';
    if (p.includes('gorra'))                                 return '🧢';
    if (p.includes('packaging') || p.includes('caja'))      return '📦';
    if (p.includes('etiqueta') || p.includes('sticker'))    return '🏷️';
    if (p.includes('letrero') || p.includes('3d'))          return '✨';
    if (p.includes('giganto') || p.includes('gran format')) return '🖼️';
    return '🎨';
  }

  /* ─────────────────────────────────────────────────
     DEFINICIÓN DE PASOS
     Cada paso tiene:
     - intro[]: array de funciones que devuelven mensajes (enviados en secuencia)
     - ack: función(val) → mensaje de acuse ANTES de la siguiente pregunta
     - retryIntro[]: mensajes alternativos tras 2 fallos consecutivos
     - quickReplies?: chips de respuesta rápida
     - validate(v): retorna string de error o null si OK
  ───────────────────────────────────────────────── */
  const STEPS = [
    /* ── Paso 1: Nombre ── */
    {
      key: 'name',
      intro: [
        () => `${greeting()}! 👋`,
        () => pick([
          'Soy el asistente de *Marka Publicidad*.\n¿Con quién tengo el gusto? 😊',
          '¡Qué bueno que nos escribes! ¿Cómo te llamas? 😊',
          'Bienvenido/a a *Marka Publicidad*.\n¿Cuál es tu nombre? 😊',
        ]),
      ],
      ack: (v) => pick([
        `¡Hola, *${v}*! Un gusto conocerte 😊`,
        `*${v}*, ¡encantado/a de ayudarte! 👋`,
        `¡Qué bueno, *${v}*! Gracias por escribirnos 🙌`,
      ]),
      retryIntro: [
        () => pick(['¡Ups! 🙈', 'Hmm... 🤔', 'Disculpa 😅']),
        () => pick([
          '¿Puedes escribir solo tu nombre sin números? Ej: *Juan Pérez*',
          'Solo necesito letras para tu nombre 😊 Inténtalo de nuevo:',
        ]),
      ],
      placeholder: 'Ej: Juan Pérez',
      validate(v) {
        if (!v || v.trim().length < 2)
          return 'Necesito al menos 2 letras para tu nombre 😊';
        if (/\d/.test(v))
          return 'El nombre no debe tener números 🙈 Inténtalo de nuevo';
        if (/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s\'-]/.test(v))
          return 'Solo letras por favor, sin símbolos especiales 😊';
        return null;
      },
    },

    /* ── Paso 2: Teléfono ── */
    {
      key: 'phone',
      intro: [
        () => pick([
          '¿Me das tu número de celular? Así te enviamos el presupuesto 📱',
          '¿Cuál es tu WhatsApp o teléfono? 📱',
          '¿Tu número de celular? Así te contactamos más rápido 📱',
        ]),
      ],
      ack: () => pick([
        'Anotado ✅',
        '¡Perfecto, lo tengo! ✅',
        'Listo, guardado 👌',
        '¡Genial! 📋',
      ]),
      retryIntro: [
        () => pick(['Hmm, espera... 🤔', '¡Ojo! 🤭', 'Momento... 🧐']),
        () => pick([
          'Ese número no parece completo. Escríbelo así:\n*0987 654 321* 📱',
          'Necesito al menos 7 dígitos. ¿Puedes revisarlo? 📱',
          'No pude leer ese número. ¿Celular completo? 📱',
        ]),
      ],
      placeholder: 'Ej: 0987 654 321',
      type: 'tel',
      validate(v) {
        const digits = v.replace(/\D/g, '');
        if (!digits || digits.length === 0)
          return 'Escribe tu número de teléfono 📱';
        if (digits.length < 7)
          return `Muy corto (${digits.length} dígito${digits.length > 1 ? 's' : ''}). Mínimo 7 📱`;
        if (digits.length > 15)
          return '¿Seguro que es correcto? Ese número parece demasiado largo 🤔';
        return null;
      },
    },

    /* ── Paso 3: Producto (con chips) ── */
    {
      key: 'product',
      intro: [
        () => pick([
          '¿Qué producto estás buscando? 👇',
          'Dime, ¿qué necesitas hoy? 👇',
          '¿En qué te puedo ayudar? 👇',
          'Cuéntame, ¿qué producto te interesa? 👇',
        ]),
      ],
      ack: (v) => {
        const e = productEmoji(v);
        return pick([
          `${e} ¡Excelente elección!`,
          `${e} Perfecto, *${v}* es algo en lo que somos muy buenos 💪`,
          `${e} ¡Genial! Trabajamos *mucho* con ${v} 🙌`,
          `${e} Anotado. *${v}* es uno de los que más hacemos 🖨️`,
        ]);
      },
      retryIntro: [
        () => 'No pude identificar el producto. 🤔',
        () => pick([
          'Elige una opción de abajo o descríbelo con palabras:',
          'Selecciona una opción o escribe qué necesitas 😊',
        ]),
      ],
      placeholder: 'Ej: flyers, banners...',
      quickReplies: [
        'Flyers / Volantes',
        'Banners / Lonas',
        'Tarjetas de presentación',
        'Tazas sublimadas',
        'Gorras personalizadas',
        'Packaging / Cajas',
        'Etiquetas / Stickers',
        'Letreros 3D',
        'Otro producto',
      ],
      validate(v) {
        if (!v || v.trim().length < 2)
          return 'Elige o escribe el producto que necesitas 🙈';
        if (/^[0-9\s.,;:!?]+$/.test(v))
          return 'Escribe el nombre del producto, no solo números o signos 😅';
        return null;
      },
    },

    /* ── Paso 4: Detalle del pedido ── */
    {
      key: 'need',
      intro: [
        (d) => pick([
          `¡Casi listo! ✏️ Para *${d.product}*:\n¿Cuántas unidades necesitas y para cuándo?`,
          `Un dato más 🙌 Para *${d.product}*:\n¿Qué cantidad y tienes alguna fecha límite?`,
          `Ya casi terminamos 🎯 Para *${d.product}*:\n¿Cuántos quieres y en qué fecha los necesitas?`,
        ]),
      ],
      retryIntro: [
        () => pick([
          'Cuéntame un poquito más 😊',
          'Ayúdame con más detalle 📋',
          'Necesito un poco más de info 🤔',
        ]),
        () => pick([
          'Indica cantidad, colores y fecha.\nEj: *"500 uds a color, para el 20 de abril"*',
          'Dime cuántos quieres y para cuándo los necesitas:\nEj: *"200 tarjetas, para la próxima semana"*',
          '¿Cuántos necesitas y para qué fecha? 📅',
        ]),
      ],
      placeholder: 'Ej: 500 uds, full color, para el 20 de abril',
      validate(v) {
        if (!v || v.trim().length < 6)
          return 'Cuéntame cantidad y fecha aproximada 😊';
        if (/^[.\-,;:\s!?]+$/.test(v))
          return 'Descríbelo con palabras por favor 😅';
        return null;
      },
    },
  ];

  /* ─────────────────────────────────────────────────
     ESTADO
  ───────────────────────────────────────────────── */
  const st = { open: false, step: 0, data: {}, retries: 0, busy: false };

  /* ─────────────────────────────────────────────────
     HELPERS DOM
  ───────────────────────────────────────────────── */
  const $      = id => document.getElementById(id);
  const isDark = () =>
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.body.getAttribute('data-theme') === 'dark';

  function syncTheme() {
    const r = $('ww-root');
    if (r) r.classList.toggle('ww-dark', isDark());
  }

  function scrollBot() {
    const b = $('ww-body');
    if (b) requestAnimationFrame(() => { b.scrollTop = b.scrollHeight; });
  }

  function addBubble(html, who) {
    const d = document.createElement('div');
    d.className = `ww-bbl ww-bbl--${who}`;
    if (who === 'user') {
      d.textContent = html;
    } else {
      d.innerHTML = html
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    }
    $('ww-body').appendChild(d);
    scrollBot();
    return d;
  }

  function showTypingIndicator() {
    const t = document.createElement('div');
    t.className = 'ww-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    $('ww-body').appendChild(t);
    scrollBot();
    return t;
  }

  // Muestra typing → espera → elimina typing → muestra burbuja
  function botMsg(text) {
    return new Promise(resolve => {
      const t = showTypingIndicator();
      setTimeout(() => {
        if (t.parentNode) t.remove();
        addBubble(text, 'bot');
        resolve();
      }, typingMs(text));
    });
  }

  // Muestra una secuencia de mensajes del bot con sus propios tiempos
  async function botSay(messages) {
    const list = Array.isArray(messages) ? messages : [messages];
    for (const item of list) {
      const text = typeof item === 'function' ? item(st.data) : item;
      await botMsg(text);
    }
  }

  function updateProgress() {
    const prog = $('ww-progress');
    if (!prog) return;
    prog.querySelectorAll('.ww-prog-dot').forEach((dot, i) => {
      dot.classList.toggle('ww-prog-dot--done',   i < st.step);
      dot.classList.toggle('ww-prog-dot--active', i === st.step && st.step < STEPS.length);
      dot.classList.remove('ww-prog-dot--active');
      if (i === st.step && st.step < STEPS.length) dot.classList.add('ww-prog-dot--active');
    });
  }

  function buildProgress() {
    const prog = $('ww-progress');
    if (!prog) return;
    // STEPS.length puntos + 1 extra para el estado "completado"
    prog.innerHTML = [...Array(STEPS.length + 1)].map((_, i) =>
      `<span class="ww-prog-dot${i === 0 ? ' ww-prog-dot--active' : ''}"></span>`
    ).join('');
  }

  /* ─────────────────────────────────────────────────
     CHIPS DE RESPUESTA RÁPIDA
  ───────────────────────────────────────────────── */
  function renderChips(step, onSelect) {
    const wrap = document.createElement('div');
    wrap.className = 'ww-chips';
    step.quickReplies.forEach(label => {
      const chip = document.createElement('button');
      chip.className   = 'ww-chip';
      chip.textContent = label;
      chip.addEventListener('click', () => {
        if (wrap._used) return;
        wrap._used = true;
        wrap.querySelectorAll('.ww-chip').forEach(c => {
          c.disabled = true;
          c.classList.toggle('ww-chip--sel', c === chip);
        });
        onSelect(label);
      });
      wrap.appendChild(chip);
    });
    $('ww-body').appendChild(wrap);
    scrollBot();
    return wrap;
  }

  /* ─────────────────────────────────────────────────
     INPUT ROW
  ───────────────────────────────────────────────── */
  function renderInputRow(step, chipsEl) {
    const row = document.createElement('div');
    row.className = 'ww-row';

    const inp = document.createElement('input');
    inp.type         = step.type || 'text';
    inp.className    = 'ww-inp';
    inp.placeholder  = step.placeholder;
    inp.maxLength    = 200;
    inp.autocomplete = step.key === 'phone' ? 'tel' : step.key === 'name' ? 'name' : 'off';
    inp.setAttribute('inputmode', step.key === 'phone' ? 'tel' : 'text');

    const btn = document.createElement('button');
    btn.className = 'ww-sbtn';
    btn.setAttribute('aria-label', 'Enviar');
    btn.innerHTML = SVG_SEND;

    // Feedback visual en teléfono
    if (step.key === 'phone') {
      btn.style.opacity = '0.4';
      inp.addEventListener('input', () => {
        btn.style.opacity = inp.value.replace(/\D/g, '').length >= 7 ? '1' : '0.4';
      });
    }

    async function handleSubmit() {
      if (st.busy) return;
      const val = inp.value.trim();

      // Vacío: solo shake sin hacer nada
      if (!val) {
        inp.classList.add('ww-shake');
        setTimeout(() => inp.classList.remove('ww-shake'), 450);
        inp.focus();
        return;
      }

      const err = step.validate(val);

      /* ── INPUT INVÁLIDO ── */
      if (err) {
        st.retries++;
        st.busy = true;

        // Mostrar lo que escribió el usuario como burbuja
        addBubble(val, 'user');

        // Bloquear fila actual
        row.style.pointerEvents = 'none';
        row.style.opacity = '0.5';
        if (chipsEl) { chipsEl.style.pointerEvents = 'none'; chipsEl.style.opacity = '0.5'; }

        if (st.retries >= 2 && step.retryIntro) {
          // Segunda falla: el bot da instrucciones más claras
          await botSay(step.retryIntro);
          st.retries = 0;
        } else {
          // Primera falla: respuesta breve y directa
          await botMsg(`⚠️ ${err}`);
        }

        // Mostrar nuevo input (y chips si aplica)
        await new Promise(r => setTimeout(r, 220));
        const newChips = step.quickReplies
          ? renderChips(step, val => { if (inp2) inp2.value = val; btn2.click(); })
          : null;
        const { inp: inp2, btn: btn2 } = renderInputRowRaw(step, newChips);
        st.busy = false;
        return;
      }

      /* ── INPUT VÁLIDO ── */
      st.busy = true;
      row.style.pointerEvents = 'none';
      row.style.opacity = '0.55';
      if (chipsEl) { chipsEl.style.pointerEvents = 'none'; chipsEl.style.opacity = '0.55'; }

      addBubble(val, 'user');
      st.data[step.key] = val;
      st.step++;
      st.retries = 0;

      // Acuse de recibo
      if (step.ack) {
        await botMsg(step.ack(val));
      }

      await new Promise(r => setTimeout(r, 280));
      st.busy = false;
      renderStep();
    }

    btn.addEventListener('click', handleSubmit);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });

    row.appendChild(inp);
    row.appendChild(btn);
    $('ww-body').appendChild(row);
    scrollBot();
    setTimeout(() => inp.focus(), 120);

    return { inp, btn };
  }

  // Versión sin chipsEl (para re-renders tras error)
  function renderInputRowRaw(step, chipsEl) {
    return renderInputRow(step, chipsEl);
  }

  /* ─────────────────────────────────────────────────
     LÓGICA PRINCIPAL
  ───────────────────────────────────────────────── */
  async function renderStep() {
    const idx = st.step;
    if (idx >= STEPS.length) return showFinal();
    const step = STEPS[idx];
    updateProgress();

    // Mostrar mensajes de introducción en secuencia
    await botSay(step.intro);

    // Chips (si el paso los tiene)
    let chipsEl = null;
    if (step.quickReplies) {
      chipsEl = renderChips(step, (label) => {
        // Click en chip → simular envío de ese valor
        const fakeRow = document.querySelector('.ww-row:last-of-type');
        const fakeInp = fakeRow && fakeRow.querySelector('.ww-inp');
        if (fakeInp) { fakeInp.value = label; }
        // Buscar el botón en el último row y hacer click
        const fakeBtn = fakeRow && fakeRow.querySelector('.ww-sbtn');
        if (fakeBtn) fakeBtn.click();
      });
    }

    // Input
    renderInputRow(step, chipsEl);
  }

  async function showFinal() {
    updateProgress();
    const d = st.data;

    await botSay([
      () => pick([
        `¡Listo, *${d.name}*! 🎉 Ya tengo todo lo que necesito.`,
        `¡Perfecto, *${d.name}*! Con eso es más que suficiente 🙌`,
        `¡Genial, *${d.name}*! Esto es justo lo que necesitaba 🎯`,
      ]),
      () => {
        const e = productEmoji(d.product);
        return `${e} *${d.product}*\n📝 ${d.need}\n\nToca el botón y te respondemos en minutos 👇`;
      },
    ]);

    await new Promise(r => setTimeout(r, 300));

    const a = document.createElement('a');
    a.className = 'ww-cta';
    a.href      = waURL();
    a.target    = '_blank';
    a.rel       = 'noopener';
    a.innerHTML = `${SVG_WA}<span>Enviar pedido por WhatsApp</span>`;
    a.addEventListener('click', () => setTimeout(() => toggle(false), 400));
    $('ww-body').appendChild(a);

    const redo = document.createElement('button');
    redo.className   = 'ww-restart';
    redo.textContent = '↩ Empezar de nuevo';
    redo.addEventListener('click', () => {
      st.step = 0; st.data = {}; st.retries = 0; st.busy = false;
      $('ww-body').innerHTML = '';
      buildProgress();
      renderStep();
    });
    $('ww-body').appendChild(redo);
    scrollBot();
  }

  function waURL() {
    const d = st.data;
    const msg =
      `Hola ${CONFIG.agentName}!\n\n` +
      `📋 *Datos del cliente:*\n` +
      `• Nombre: ${d.name    || '–'}\n` +
      `• Teléfono: ${d.phone || '–'}\n\n` +
      `📦 *Producto:* ${d.product || '–'}\n\n` +
      `📝 *Detalle del pedido:*\n${d.need || '–'}\n\n` +
      `Por favor, envíenme precio y disponibilidad. ¡Gracias!`;
    return `https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(msg)}`;
  }

  /* ─────────────────────────────────────────────────
     TOGGLE
  ───────────────────────────────────────────────── */
  function toggle(forceOpen) {
    const root      = $('ww-root');
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !st.open;
    st.open         = shouldOpen;
    root.classList.toggle('ww-open', shouldOpen);
    syncTheme();
    const badge = $('ww-badge');
    if (badge) badge.style.display = shouldOpen ? 'none' : '';
    if (shouldOpen && $('ww-body').children.length === 0) {
      buildProgress();
      renderStep();
    }
  }

  /* ─────────────────────────────────────────────────
     SVGs
  ───────────────────────────────────────────────── */
  const SVG_WA = `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

  const SVG_SEND = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;

  const SVG_CLOSE = `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

  /* ─────────────────────────────────────────────────
     CSS
  ───────────────────────────────────────────────── */
  function injectStyles() {
    if ($('ww-styles')) return;
    const s = document.createElement('style');
    s.id = 'ww-styles';
    s.textContent = `
/* ══ WhatsApp Widget — Mark Publicidad v4.0 ══ */

#ww-root {
  --ww-panel-bg:     #ffffff;
  --ww-body-bg:      #ece5dd;
  --ww-bot-bg:       #ffffff;
  --ww-bot-text:     #1d1d1f;
  --ww-user-bg:      #dcf8c6;
  --ww-user-text:    #1d1d1f;
  --ww-err-bg:       #fff3cd;
  --ww-err-text:     #92400e;
  --ww-err-border:   #fde68a;
  --ww-inp-bg:       #ffffff;
  --ww-inp-text:     #1d1d1f;
  --ww-inp-border:   rgba(0,0,0,.18);
  --ww-inp-focus:    #25d366;
  --ww-inp-err:      #ef4444;
  --ww-footer-bg:    #f0f0f0;
  --ww-footer-text:  #aaa;
  --ww-hint-bg:      #ffffff;
  --ww-hint-text:    #1d1d1f;
  --ww-typing-bg:    #ffffff;
  --ww-typing-dot:   #aaa;
  --ww-chip-bg:      #f2f2f2;
  --ww-chip-text:    #1d1d1f;
  --ww-chip-border:  rgba(0,0,0,.12);
  --ww-shadow:       0 16px 50px rgba(0,0,0,.22);
  --ww-border:       rgba(0,0,0,.08);
  --ww-scroll:       rgba(0,0,0,.15);
}

#ww-root.ww-dark {
  --ww-panel-bg:     #1c1c1e;
  --ww-body-bg:      #0d1117;
  --ww-bot-bg:       #2c2c2e;
  --ww-bot-text:     #f2f2f7;
  --ww-user-bg:      #005c4b;
  --ww-user-text:    #e9edef;
  --ww-err-bg:       #3b2500;
  --ww-err-text:     #fcd34d;
  --ww-err-border:   #78350f;
  --ww-inp-bg:       #2c2c2e;
  --ww-inp-text:     #f2f2f7;
  --ww-inp-border:   rgba(255,255,255,.14);
  --ww-footer-bg:    #111111;
  --ww-footer-text:  #555;
  --ww-hint-bg:      #2c2c2e;
  --ww-hint-text:    #f2f2f7;
  --ww-typing-bg:    #2c2c2e;
  --ww-typing-dot:   #666;
  --ww-chip-bg:      #2c2c2e;
  --ww-chip-text:    #f2f2f7;
  --ww-chip-border:  rgba(255,255,255,.14);
  --ww-shadow:       0 16px 50px rgba(0,0,0,.55);
  --ww-border:       rgba(255,255,255,.08);
  --ww-scroll:       rgba(255,255,255,.12);
}

/* Root */
#ww-root {
  position:fixed !important; bottom:1.75rem !important; right:1.75rem !important;
  z-index:999999 !important;
  display:flex; flex-direction:column; align-items:flex-end; gap:.5rem;
  font-family:-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
}

/* Hint */
#ww-hint {
  background:var(--ww-hint-bg); color:var(--ww-hint-text);
  font-size:.82rem; font-weight:500;
  padding:.55rem 1rem; border-radius:16px 16px 4px 16px;
  box-shadow:var(--ww-shadow); border:1px solid var(--ww-border);
  cursor:pointer; white-space:nowrap;
  animation:wwSlide .35s ease; transition:opacity .4s;
}
@keyframes wwSlide { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }

/* FAB */
#ww-fab {
  width:56px; height:56px; border-radius:50%;
  background:#25d366; border:none; cursor:pointer;
  box-shadow:0 4px 22px rgba(37,211,102,.55);
  display:flex; align-items:center; justify-content:center;
  position:relative; transition:transform .2s, box-shadow .2s; flex-shrink:0;
}
#ww-fab:hover { transform:scale(1.09); box-shadow:0 6px 30px rgba(37,211,102,.68); }

#ww-badge {
  position:absolute; top:-4px; right:-4px;
  width:18px; height:18px; border-radius:50%;
  background:#e74c3c; color:white;
  font-size:.62rem; font-weight:700;
  display:flex; align-items:center; justify-content:center;
  border:2px solid #fff; animation:wwPulse 2.2s infinite;
}
@keyframes wwPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }

.ww-ico-open  { display:flex; }
.ww-ico-close { display:none; color:white; }
#ww-root.ww-open .ww-ico-open  { display:none; }
#ww-root.ww-open .ww-ico-close { display:flex; }

/* Panel */
#ww-panel {
  width:345px; max-width:calc(100vw - 2rem);
  border-radius:22px; overflow:hidden;
  box-shadow:var(--ww-shadow);
  background:var(--ww-panel-bg); border:1px solid var(--ww-border);
  transform:scale(.88) translateY(18px);
  transform-origin:bottom right; opacity:0; pointer-events:none;
  transition:transform .3s cubic-bezier(.34,1.56,.64,1), opacity .22s ease;
  order:-1;
}
#ww-root.ww-open #ww-panel { transform:scale(1) translateY(0); opacity:1; pointer-events:all; }

/* Header */
#ww-header {
  background:#075e54; padding:.9rem 1.1rem;
  display:flex; align-items:center; gap:.75rem; color:white;
}
#ww-root.ww-dark #ww-header { background:#0a1628; }
#ww-avatar {
  width:42px; height:42px; border-radius:50%;
  background:rgba(255,255,255,.15);
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
#ww-header strong { display:block; font-size:.9rem; font-weight:600; }
.ww-role { font-size:.72rem; opacity:.85; display:flex; align-items:center; gap:.3rem; }
.ww-dot  { width:7px; height:7px; border-radius:50%; background:#4ade80; animation:wwPulse 2s infinite; }
#ww-close-btn {
  background:none; border:none; cursor:pointer;
  padding:4px; opacity:.7; transition:opacity .2s;
  display:flex; align-items:center; margin-left:auto; color:white;
}
#ww-close-btn:hover { opacity:1; }

/* Barra de progreso */
#ww-progress {
  display:flex; align-items:center; justify-content:center; gap:6px;
  padding:.5rem; background:var(--ww-footer-bg);
  border-bottom:1px solid var(--ww-border);
}
.ww-prog-dot {
  width:7px; height:7px; border-radius:50%;
  background:var(--ww-typing-dot); opacity:.3;
  transition:all .35s cubic-bezier(.34,1.56,.64,1);
}
.ww-prog-dot--active { background:#25d366; opacity:1; transform:scale(1.4); }
.ww-prog-dot--done   { background:#25d366; opacity:.55; }

/* Body */
#ww-body {
  height:320px; overflow-y:auto;
  padding:.9rem .85rem; display:flex; flex-direction:column; gap:.5rem;
  scroll-behavior:smooth; background:var(--ww-body-bg); transition:background .3s;
}
#ww-body::-webkit-scrollbar { width:3px; }
#ww-body::-webkit-scrollbar-thumb { background:var(--ww-scroll); border-radius:2px; }

/* Burbujas */
.ww-bbl {
  max-width:84%; padding:.5rem .875rem;
  border-radius:12px; font-size:.84rem; line-height:1.58;
  word-break:break-word; white-space:pre-line;
  animation:wwPop .22s ease;
  box-shadow:0 1px 2px rgba(0,0,0,.08);
}
@keyframes wwPop {
  from{opacity:0;transform:scale(.93) translateY(7px)}
  to  {opacity:1;transform:scale(1) translateY(0)}
}
.ww-bbl--bot  { background:var(--ww-bot-bg);  color:var(--ww-bot-text);  align-self:flex-start; border-top-left-radius:3px; }
.ww-bbl--user { background:var(--ww-user-bg); color:var(--ww-user-text); align-self:flex-end;   border-top-right-radius:3px; }
.ww-bbl--error {
  background:var(--ww-err-bg); color:var(--ww-err-text);
  border:1px solid var(--ww-err-border);
  align-self:flex-start; border-top-left-radius:3px;
  font-size:.8rem; font-weight:500; max-width:92%; animation:wwPop .2s ease;
}

/* Typing */
.ww-typing {
  display:flex; gap:4px; align-items:center;
  background:var(--ww-typing-bg); padding:.55rem .875rem;
  border-radius:12px; border-top-left-radius:3px; align-self:flex-start;
  box-shadow:0 1px 2px rgba(0,0,0,.08);
}
.ww-typing span {
  width:6px; height:6px; border-radius:50%;
  background:var(--ww-typing-dot);
  animation:wwDot 1.1s ease infinite;
}
.ww-typing span:nth-child(2){ animation-delay:.18s; }
.ww-typing span:nth-child(3){ animation-delay:.36s; }
@keyframes wwDot {
  0%,80%,100%{ transform:translateY(0);    opacity:.4; }
  40%         { transform:translateY(-5px); opacity:1;  }
}

/* Chips */
.ww-chips {
  display:flex; flex-wrap:wrap; gap:.35rem;
  align-self:stretch; margin-top:.1rem;
  animation:wwPop .25s ease;
}
.ww-chip {
  padding:.35rem .8rem;
  border:1.5px solid var(--ww-chip-border);
  border-radius:99px;
  background:var(--ww-chip-bg); color:var(--ww-chip-text);
  font-size:.76rem; font-weight:500; cursor:pointer; font-family:inherit;
  transition:all .15s; white-space:nowrap;
}
.ww-chip:hover:not(:disabled) { border-color:#25d366; color:#075e54; background:rgba(37,211,102,.1); }
.ww-chip--sel  { border-color:#25d366; background:rgba(37,211,102,.18); color:#075e54; font-weight:600; }
.ww-chip:disabled { cursor:default; opacity:.55; }

/* Input row */
.ww-row { display:flex; gap:.35rem; align-self:stretch; animation:wwPop .22s ease; margin-top:.1rem; }
.ww-inp {
  flex:1; padding:.52rem .9rem;
  border:1.5px solid var(--ww-inp-border); border-radius:22px;
  font-size:.84rem; outline:none;
  transition:border-color .2s, box-shadow .2s;
  background:var(--ww-inp-bg); color:var(--ww-inp-text); font-family:inherit;
}
.ww-inp::placeholder { color:var(--ww-typing-dot); opacity:1; }
.ww-inp:focus { border-color:var(--ww-inp-focus); box-shadow:0 0 0 3px rgba(37,211,102,.15); }
.ww-inp--error { border-color:var(--ww-inp-err) !important; box-shadow:0 0 0 3px rgba(239,68,68,.15) !important; }

@keyframes wwShake {
  0%,100%{ transform:translateX(0); }
  20%{ transform:translateX(-7px); }
  40%{ transform:translateX(7px); }
  60%{ transform:translateX(-4px); }
  80%{ transform:translateX(4px); }
}
.ww-shake { animation:wwShake .45s ease; }

.ww-sbtn {
  width:36px; height:36px; border-radius:50%;
  background:#25d366; color:white; border:none; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0; transition:background .2s, transform .15s, opacity .25s;
}
.ww-sbtn:hover { background:#1ebe5a; transform:scale(1.08); }

/* CTA final */
.ww-cta {
  display:flex; align-items:center; justify-content:center; gap:.5rem;
  background:#25d366; color:white; text-decoration:none;
  border-radius:14px; padding:.85rem; font-size:.88rem; font-weight:700;
  align-self:stretch; margin-top:.3rem;
  transition:background .2s, transform .15s;
  animation:wwPop .28s ease;
  box-shadow:0 4px 18px rgba(37,211,102,.42);
  letter-spacing:.2px;
}
.ww-cta:hover { background:#1ebe5a; color:white; transform:scale(1.02); }

/* Reiniciar */
.ww-restart {
  align-self:center; background:none; border:none;
  color:var(--ww-footer-text); font-size:.74rem; cursor:pointer;
  text-decoration:underline; padding:.3rem; font-family:inherit;
  transition:color .2s;
}
.ww-restart:hover { color:var(--ww-bot-text); }

/* Footer */
#ww-footer {
  background:var(--ww-footer-bg); color:var(--ww-footer-text);
  text-align:center; font-size:.67rem; padding:.45rem;
  transition:background .3s, color .3s;
}

/* Responsive */
@media (max-width:480px) {
  #ww-root  { right:.75rem; bottom:calc(64px + .75rem); }
  #ww-panel { width:calc(100vw - 1.5rem); }
  #ww-body  { height:270px; }
}
    `;
    document.head.appendChild(s);
  }

  /* ─────────────────────────────────────────────────
     CREAR DOM
  ───────────────────────────────────────────────── */
  function createDOM() {
    const root = document.createElement('div');
    root.id = 'ww-root';

    const panel = document.createElement('div');
    panel.id = 'ww-panel';
    panel.innerHTML = `
      <div id="ww-header">
        <div id="ww-avatar">
          <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div>
          <strong>${CONFIG.agentName}</strong>
          <div class="ww-role"><span class="ww-dot"></span>${CONFIG.agentRole}</div>
        </div>
        <button id="ww-close-btn" aria-label="Cerrar">${SVG_CLOSE}</button>
      </div>
      <div id="ww-progress"></div>
      <div id="ww-body"></div>
      <div id="ww-footer">🔒 Tus datos solo se usan para contactarte</div>
    `;

    const hint = document.createElement('div');
    hint.id = 'ww-hint';
    hint.textContent = CONFIG.hintText;

    const fab = document.createElement('button');
    fab.id = 'ww-fab';
    fab.setAttribute('aria-label', 'Abrir chat WhatsApp');
    fab.innerHTML = `
      <span id="ww-badge">1</span>
      <span class="ww-ico-open">
        <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </span>
      <span class="ww-ico-close">${SVG_CLOSE}</span>
    `;

    root.appendChild(panel);
    root.appendChild(hint);
    root.appendChild(fab);
    document.body.appendChild(root);

    fab.addEventListener('click', () => toggle());
    hint.addEventListener('click', () => toggle(true));
    $('ww-close-btn').addEventListener('click', () => toggle(false));

    // Ocultar hint después de 8s
    setTimeout(() => {
      hint.style.opacity = '0';
      setTimeout(() => { if (hint.parentNode) hint.remove(); }, 500);
    }, 8000);

    if (CONFIG.openDelay > 0) {
      setTimeout(() => { if (!st.open) toggle(true); }, CONFIG.openDelay);
    }

    // Observar cambios de tema
    const obs = new MutationObserver(syncTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    obs.observe(document.body,             { attributes: true, attributeFilter: ['data-theme'] });
    syncTheme();
  }

  /* ─────────────────────────────────────────────────
     INIT
  ───────────────────────────────────────────────── */
  function init() {
    if ($('ww-root')) return;
    injectStyles();
    createDOM();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
