/**
 * =====================================================
 * MARK PUBLICIDAD — WhatsApp Chat Widget v2.0
 * Validación de campos · Modo oscuro · Diseño glass
 * =====================================================
 */
(function () {
  'use strict';

  /* ── CONFIGURACIÓN ───────────────────────────────── */
  const CONFIG = {
    phone:     '593996884150',
    agentName: 'Mark Publicidad',
    agentRole: 'Respondemos en minutos',
    openDelay: 0,
    hintText:  '¿Necesitas un presupuesto? Escríbenos.',
  };

  /* ── PASOS + VALIDACIONES ────────────────────────── */
  const STEPS = [
    {
      key:         'name',
      bot:         '¡Hola! Soy el asistente de *Mark Publicidad* 👋\n¿Cuál es tu nombre completo?',
      placeholder: 'Ej: Juan Pérez',
      validate(v) {
        if (!v || v.length < 2) return 'Por favor ingresa tu nombre (mínimo 2 caracteres).';
        if (/\d/.test(v))       return 'El nombre no debe contener números.';
        return null;
      },
    },
    {
      key:         'phone',
      bot:         'Mucho gusto, {name} 😊\n¿Cuál es tu número de teléfono?',
      placeholder: 'Ej: 0987 654 321',
      type:        'tel',
      validate(v) {
        const digits = v.replace(/\D/g, '');
        if (digits.length < 7) return 'Ingresa un número de teléfono válido (mínimo 7 dígitos).';
        return null;
      },
    },
    {
      key:         'need',
      bot:         '¡Perfecto! ¿Qué necesitas? Cuéntame tu pedido brevemente.',
      placeholder: 'Ej: 500 flyers tamaño A5 a todo color...',
      validate(v) {
        if (!v || v.length < 5) return 'Por favor describe tu pedido (mínimo 5 caracteres).';
        return null;
      },
    },
  ];

  /* ── ESTADO ─────────────────────────────────────── */
  const st = { open: false, step: 0, data: {} };

  /* ── HELPERS ─────────────────────────────────────── */
  const $  = id => document.getElementById(id);
  const isDark = () =>
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.body.getAttribute('data-theme') === 'dark';

  function syncTheme() {
    const root = $('ww-root');
    if (!root) return;
    root.classList.toggle('ww-dark', isDark());
  }

  function fill(s) {
    return s.replace(/\{(\w+)\}/g, (_, k) => st.data[k] || '');
  }

  function waURL() {
    const d = st.data;
    const msg =
      `Hola ${CONFIG.agentName}!\n\n` +
      `📋 *Datos del cliente:*\n` +
      `• Nombre: ${d.name  || '–'}\n` +
      `• Teléfono: ${d.phone || '–'}\n\n` +
      `📦 *Pedido:*\n${d.need || '–'}\n\n` +
      `Por favor, envíenme precio y disponibilidad. ¡Gracias!`;
    return `https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(msg)}`;
  }

  function scrollBot() {
    const b = $('ww-body');
    if (b) requestAnimationFrame(() => { b.scrollTop = b.scrollHeight; });
  }

  function addBubble(html, who) {
    const d = document.createElement('div');
    d.className = `ww-bbl ww-bbl--${who}`;

    if (who === 'user') {
      // Evitamos inyección de HTML desde el input del usuario
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

  function addError(msg) {
    // Eliminar errores anteriores
    $('ww-body').querySelectorAll('.ww-bbl--error').forEach(e => e.remove());
    const d = document.createElement('div');
    d.className = 'ww-bbl ww-bbl--error';
    d.innerHTML = `⚠️ ${msg}`;
    $('ww-body').appendChild(d);
    scrollBot();
    setTimeout(() => { if (d.parentNode) d.remove(); }, 4000);
  }

  function showTyping() {
    const t = document.createElement('div');
    t.className = 'ww-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    $('ww-body').appendChild(t);
    scrollBot();
    return t;
  }

  /* ── LÓGICA DE PASOS ─────────────────────────────── */
  function renderStep() {
    const idx  = st.step;
    if (idx >= STEPS.length) return showFinal();
    const step = STEPS[idx];

    const typing = showTyping();
    setTimeout(() => {
      typing.remove();
      addBubble(fill(step.bot), 'bot');

      const row = document.createElement('div');
      row.className = 'ww-row';

      const inp = document.createElement('input');
      inp.type         = step.type || 'text';
      inp.className    = 'ww-inp';
      inp.placeholder  = step.placeholder;
      inp.maxLength    = 160;
      inp.autocomplete = step.key === 'phone' ? 'tel' : 'off';

      const btn = document.createElement('button');
      btn.className = 'ww-sbtn';
      btn.setAttribute('aria-label', 'Enviar');
      btn.innerHTML = SVG_SEND;

      function submit() {
        const val = inp.value.trim();
        const err = step.validate(val);

        if (err) {
          inp.classList.add('ww-shake');
          inp.classList.add('ww-inp--error');
          setTimeout(() => {
            inp.classList.remove('ww-shake');
            inp.classList.remove('ww-inp--error');
          }, 600);
          addError(err);
          inp.focus();
          return;
        }

        row.style.pointerEvents = 'none';
        row.style.opacity = '0.5';
        addBubble(val, 'user');
        st.data[step.key] = val;
        st.step++;
        setTimeout(renderStep, 500);
      }

      btn.addEventListener('click', submit);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });

      row.appendChild(inp);
      row.appendChild(btn);
      $('ww-body').appendChild(row);
      scrollBot();
      setTimeout(() => inp.focus(), 100);
    }, 700);
  }

  function showFinal() {
    const typing = showTyping();
    setTimeout(() => {
      typing.remove();
      addBubble(
        `¡Listo, ${st.data.name || 'amigo'}! 🎉\nTenemos todo lo que necesitamos.\nToca el botón para hablar con nuestro equipo ahora mismo.`,
        'bot'
      );

      setTimeout(() => {
        const a = document.createElement('a');
        a.className = 'ww-cta';
        a.href      = waURL();
        a.target    = '_blank';
        a.rel       = 'noopener';
        a.innerHTML = `${SVG_WA}<span>Abrir WhatsApp ahora</span>`;
        a.addEventListener('click', () => setTimeout(() => toggle(false), 400));
        $('ww-body').appendChild(a);

        const redo = document.createElement('button');
        redo.className   = 'ww-restart';
        redo.textContent = '↩ Empezar de nuevo';
        redo.addEventListener('click', () => {
          st.step = 0; st.data = {};
          $('ww-body').innerHTML = '';
          renderStep();
        });
        $('ww-body').appendChild(redo);
        scrollBot();
      }, 350);
    }, 700);
  }

  /* ── TOGGLE ──────────────────────────────────────── */
  function toggle(forceOpen) {
    const root       = $('ww-root');
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !st.open;
    st.open          = shouldOpen;
    root.classList.toggle('ww-open', shouldOpen);
    syncTheme();

    const badge = $('ww-badge');
    if (badge) badge.style.display = shouldOpen ? 'none' : '';

    if (shouldOpen && $('ww-body').children.length === 0) renderStep();
  }

  /* ── SVGs ────────────────────────────────────────── */
  const SVG_WA = `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

  const SVG_SEND = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;

  const SVG_CLOSE = `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

  /* ── CSS ─────────────────────────────────────────── */
  function injectStyles() {
    if ($('ww-styles')) return;
    const s = document.createElement('style');
    s.id = 'ww-styles';
    s.textContent = `
/* ══════════════════════════════════════════════════
   WhatsApp Widget — Mark Publicidad v2.0
   Variables modo claro y oscuro
═══════════════════════════════════════════════════ */

/* ── Modo claro (por defecto) ── */
#ww-root {
  --ww-panel-bg:    #ffffff;
  --ww-body-bg:     #ece5dd;
  --ww-bot-bg:      #ffffff;
  --ww-bot-text:    #1d1d1f;
  --ww-user-bg:     #dcf8c6;
  --ww-user-text:   #1d1d1f;
  --ww-err-bg:      #fff3cd;
  --ww-err-text:    #92400e;
  --ww-err-border:  #fde68a;
  --ww-inp-bg:      #ffffff;
  --ww-inp-text:    #1d1d1f;
  --ww-inp-border:  rgba(0,0,0,0.18);
  --ww-inp-focus:   #25d366;
  --ww-inp-err:     #ef4444;
  --ww-footer-bg:   #f0f0f0;
  --ww-footer-text: #aaa;
  --ww-hint-bg:     #ffffff;
  --ww-hint-text:   #1d1d1f;
  --ww-typing-bg:   #ffffff;
  --ww-typing-dot:  #aaa;
  --ww-shadow:      0 16px 50px rgba(0,0,0,0.20);
  --ww-border:      rgba(0,0,0,0.08);
  --ww-scroll:      rgba(0,0,0,0.15);
}

/* ── Modo oscuro ── */
#ww-root.ww-dark {
  --ww-panel-bg:    #1c1c1e;
  --ww-body-bg:     #0d1117;
  --ww-bot-bg:      #2c2c2e;
  --ww-bot-text:    #f2f2f7;
  --ww-user-bg:     #005c4b;
  --ww-user-text:   #e9edef;
  --ww-err-bg:      #3b2500;
  --ww-err-text:    #fcd34d;
  --ww-err-border:  #78350f;
  --ww-inp-bg:      #2c2c2e;
  --ww-inp-text:    #f2f2f7;
  --ww-inp-border:  rgba(255,255,255,0.14);
  --ww-inp-focus:   #25d366;
  --ww-inp-err:     #f87171;
  --ww-footer-bg:   #111111;
  --ww-footer-text: #555;
  --ww-hint-bg:     #2c2c2e;
  --ww-hint-text:   #f2f2f7;
  --ww-typing-bg:   #2c2c2e;
  --ww-typing-dot:  #666;
  --ww-shadow:      0 16px 50px rgba(0,0,0,0.55);
  --ww-border:      rgba(255,255,255,0.08);
  --ww-scroll:      rgba(255,255,255,0.12);
}

/* ── Root container ── */
#ww-root {
  position: fixed !important;
  bottom: 1.75rem !important;
  right: 1.75rem !important;
  z-index: 999999 !important;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: .5rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
}

/* ── Burbuja hint ── */
#ww-hint {
  background: var(--ww-hint-bg);
  color: var(--ww-hint-text);
  font-size: .82rem;
  font-weight: 500;
  padding: .55rem 1rem;
  border-radius: 16px 16px 4px 16px;
  box-shadow: var(--ww-shadow);
  border: 1px solid var(--ww-border);
  cursor: pointer;
  white-space: nowrap;
  animation: wwSlide .35s ease;
  transition: opacity .4s;
}
@keyframes wwSlide {
  from { opacity:0; transform:translateX(10px); }
  to   { opacity:1; transform:translateX(0); }
}

/* ── FAB ── */
#ww-fab {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: #25d366;
  border: none; cursor: pointer;
  box-shadow: 0 4px 20px rgba(37,211,102,.5);
  display: flex; align-items: center; justify-content: center;
  position: relative;
  transition: transform .2s, box-shadow .2s;
  flex-shrink: 0;
}
#ww-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 28px rgba(37,211,102,.65);
}

#ww-badge {
  position: absolute; top: -4px; right: -4px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #e74c3c; color: white;
  font-size: .62rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #fff;
  animation: wwPulse 2.2s infinite;
}
@keyframes wwPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }

.ww-ico-open  { display: flex; }
.ww-ico-close { display: none; color: white; }
#ww-root.ww-open .ww-ico-open  { display: none; }
#ww-root.ww-open .ww-ico-close { display: flex; }

/* ── Panel ── */
#ww-panel {
  width: 330px;
  max-width: calc(100vw - 2rem);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--ww-shadow);
  background: var(--ww-panel-bg);
  border: 1px solid var(--ww-border);
  transform: scale(.88) translateY(16px);
  transform-origin: bottom right;
  opacity: 0;
  pointer-events: none;
  transition: transform .3s cubic-bezier(.34,1.56,.64,1), opacity .22s ease;
  order: -1;
}
#ww-root.ww-open #ww-panel {
  transform: scale(1) translateY(0);
  opacity: 1;
  pointer-events: all;
}

/* ── Header ── */
#ww-header {
  background: #075e54;
  padding: .9rem 1.1rem;
  display: flex; align-items: center; gap: .75rem;
  color: white;
}
#ww-root.ww-dark #ww-header { background: #0a1628; }

#ww-avatar {
  width: 42px; height: 42px; border-radius: 50%;
  background: rgba(255,255,255,.15);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
#ww-header strong { display:block; font-size:.9rem; font-weight:600; }
.ww-role { font-size:.72rem; opacity:.85; display:flex; align-items:center; gap:.3rem; }
.ww-dot {
  width:7px; height:7px; border-radius:50%; background:#4ade80;
  animation: wwPulse 2s infinite;
}
#ww-close-btn {
  background:none; border:none; cursor:pointer;
  padding:4px; opacity:.7; transition:opacity .2s;
  display:flex; align-items:center; margin-left:auto;
  color: white;
}
#ww-close-btn:hover { opacity:1; }

/* ── Body ── */
#ww-body {
  height: 300px;
  overflow-y: auto;
  padding: .85rem;
  display: flex; flex-direction: column; gap: .45rem;
  scroll-behavior: smooth;
  background: var(--ww-body-bg);
  transition: background .3s;
}
#ww-body::-webkit-scrollbar { width: 3px; }
#ww-body::-webkit-scrollbar-thumb {
  background: var(--ww-scroll); border-radius: 2px;
}

/* ── Burbujas ── */
.ww-bbl {
  max-width: 82%;
  padding: .5rem .85rem;
  border-radius: 12px;
  font-size: .84rem; line-height: 1.55;
  word-break: break-word;
  white-space: pre-line;
  animation: wwPop .22s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,.08);
}
@keyframes wwPop {
  from { opacity:0; transform:scale(.93) translateY(6px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}

.ww-bbl--bot {
  background: var(--ww-bot-bg);
  color: var(--ww-bot-text);
  align-self: flex-start;
  border-top-left-radius: 2px;
}
.ww-bbl--user {
  background: var(--ww-user-bg);
  color: var(--ww-user-text);
  align-self: flex-end;
  border-top-right-radius: 2px;
}

/* ── Burbuja de error ── */
.ww-bbl--error {
  background: var(--ww-err-bg);
  color: var(--ww-err-text);
  border: 1px solid var(--ww-err-border);
  align-self: flex-start;
  border-top-left-radius: 2px;
  font-size: .8rem;
  font-weight: 500;
  max-width: 90%;
  animation: wwPop .2s ease;
}

/* ── Typing ── */
.ww-typing {
  display:flex; gap:4px; align-items:center;
  background: var(--ww-typing-bg);
  padding:.55rem .85rem; border-radius:12px; border-top-left-radius:2px;
  align-self:flex-start;
  box-shadow: 0 1px 2px rgba(0,0,0,.08);
}
.ww-typing span {
  width:6px; height:6px; border-radius:50%;
  background: var(--ww-typing-dot);
  animation: wwDot 1.1s ease infinite;
}
.ww-typing span:nth-child(2){ animation-delay:.18s; }
.ww-typing span:nth-child(3){ animation-delay:.36s; }
@keyframes wwDot {
  0%,80%,100%{ transform:translateY(0);    opacity:.4; }
  40%         { transform:translateY(-5px); opacity:1;  }
}

/* ── Input row ── */
.ww-row {
  display:flex; gap:.35rem; align-self:stretch;
  animation: wwPop .22s ease;
  margin-top: .15rem;
}
.ww-inp {
  flex:1; padding:.5rem .85rem;
  border: 1.5px solid var(--ww-inp-border);
  border-radius: 22px;
  font-size: .84rem; outline: none;
  transition: border-color .2s, box-shadow .2s;
  background: var(--ww-inp-bg);
  color: var(--ww-inp-text);
  font-family: inherit;
}
.ww-inp::placeholder { color: var(--ww-typing-dot); opacity: 1; }
.ww-inp:focus {
  border-color: var(--ww-inp-focus);
  box-shadow: 0 0 0 3px rgba(37,211,102,.15);
}
.ww-inp--error {
  border-color: var(--ww-inp-err) !important;
  box-shadow: 0 0 0 3px rgba(239,68,68,.15) !important;
}

/* Shake animation */
@keyframes wwShake {
  0%,100%{ transform:translateX(0); }
  20%    { transform:translateX(-6px); }
  40%    { transform:translateX(6px); }
  60%    { transform:translateX(-4px); }
  80%    { transform:translateX(4px); }
}
.ww-shake { animation: wwShake .45s ease; }

.ww-sbtn {
  width:36px; height:36px; border-radius:50%;
  background:#25d366; color:white; border:none;
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  flex-shrink:0; transition:background .2s, transform .15s;
}
.ww-sbtn:hover { background:#1ebe5a; transform:scale(1.08); }

/* ── CTA final ── */
.ww-cta {
  display:flex; align-items:center; justify-content:center; gap:.5rem;
  background:#25d366; color:white; text-decoration:none;
  border-radius:12px; padding:.75rem; font-size:.87rem; font-weight:600;
  align-self:stretch; margin-top:.25rem;
  transition:background .2s, transform .15s;
  animation: wwPop .25s ease;
  box-shadow: 0 4px 14px rgba(37,211,102,.35);
}
.ww-cta:hover { background:#1ebe5a; color:white; transform:scale(1.02); }

/* ── Reiniciar ── */
.ww-restart {
  align-self:center; background:none; border:none;
  color: var(--ww-footer-text); font-size:.74rem; cursor:pointer;
  text-decoration:underline; padding:.3rem; font-family:inherit;
  transition: color .2s;
}
.ww-restart:hover { color: var(--ww-bot-text); }

/* ── Footer ── */
#ww-footer {
  background: var(--ww-footer-bg);
  color: var(--ww-footer-text);
  text-align:center; font-size:.67rem;
  padding:.4rem; transition: background .3s, color .3s;
}

/* ── Responsive ── */
@media (max-width: 480px) {
  #ww-root { right: .75rem; bottom: calc(64px + .75rem); }
  #ww-panel { width: calc(100vw - 1.5rem); }
  #ww-body  { height: 260px; }
}
    `;
    document.head.appendChild(s);
  }

  /* ── DOM ─────────────────────────────────────────── */
  function createDOM() {
    const root = document.createElement('div');
    root.id = 'ww-root';

    /* Panel */
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
      <div id="ww-body"></div>
      <div id="ww-footer">Tus datos solo se usan para contactarte · WhatsApp</div>
    `;

    /* Hint */
    const hint = document.createElement('div');
    hint.id = 'ww-hint';
    hint.textContent = CONFIG.hintText;

    /* FAB */
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

    /* Eventos */
    fab.addEventListener('click', () => toggle());
    hint.addEventListener('click', () => toggle(true));
    document.getElementById('ww-close-btn').addEventListener('click', () => toggle(false));

    /* Ocultar hint tras 8s */
    setTimeout(() => {
      hint.style.opacity = '0';
      setTimeout(() => { if (hint.parentNode) hint.remove(); }, 500);
    }, 8000);

    /* Auto-abrir */
    if (CONFIG.openDelay > 0) {
      setTimeout(() => { if (!st.open) toggle(true); }, CONFIG.openDelay);
    }

    /* Observar cambios de tema en tiempo real */
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    observer.observe(document.body,             { attributes: true, attributeFilter: ['data-theme'] });

    /* Sync inicial */
    syncTheme();
  }

  /* ── INIT ─────────────────────────────────────────── */
  function init() {
    if ($('ww-root')) return;
    injectStyles();
    createDOM();
    console.log('✅ WhatsApp Widget v2.0 — Mark Publicidad');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
