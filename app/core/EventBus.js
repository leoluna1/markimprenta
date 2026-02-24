/**
 * EventBus — Pub/Sub singleton
 * Desacopla Modelos, Vistas y Controladores
 */
const EventBus = (() => {
  const _map = new Map();

  return {
    on(evt, fn) {
      if (!_map.has(evt)) _map.set(evt, new Set());
      _map.get(evt).add(fn);
      return this;
    },

    emit(evt, data = null) {
      _map.get(evt)?.forEach(fn => {
        try { fn(data); } catch (e) { console.error(`[EventBus] ${evt}`, e); }
      });
      return this;
    },

    off(evt, fn) {
      _map.get(evt)?.delete(fn);
      return this;
    },

    once(evt, fn) {
      const wrapper = d => { fn(d); this.off(evt, wrapper); };
      return this.on(evt, wrapper);
    },
  };
})();

export default EventBus;
