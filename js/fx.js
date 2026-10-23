// Tipo de cambio USD → MXN. Fuentes gratuitas, sin llave:
//   Frankfurter (Banco Central Europeo, se publica una vez al día hábil) para el histórico y el cierre;
//   ExchangeRate-API como segunda fuente. Se consulta al abrir la app y cada 10 minutos mientras está abierta.
(() => {
  const S = () => window.Store;
  const EVERY = 10 * 60 * 1000;

  async function getJSON(url) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  }

  async function latest() {
    try {
      const j = await getJSON('https://api.frankfurter.dev/v1/latest?from=USD&to=MXN');
      return { value: j.rates.MXN, date: j.date, source: 'Frankfurter (BCE)' };
    } catch {
      const j = await getJSON('https://open.er-api.com/v6/latest/USD');
      return { value: j.rates.MXN, date: S().iso(new Date(j.time_last_update_unix * 1000)), source: 'ExchangeRate-API' };
    }
  }

  async function history(days = 90) {
    const from = S().iso(new Date(Date.now() - days * 86400000));
    const j = await getJSON(`https://api.frankfurter.dev/v1/${from}..?from=USD&to=MXN`);
    return Object.entries(j.rates).map(([date, r]) => ({ date, value: r.MXN }));
  }

  // avisos: por debajo / por encima de tu límite, o un movimiento de más de X% contra el cierre anterior
  function check(fx, settings) {
    const out = [];
    const v = fx.last.value;
    const prev = fx.history.length > 1 ? fx.history.at(-2).value : null;
    if (settings.alertBelow && v <= settings.alertBelow) out.push({ id: `below-${fx.last.date}`, text: `El dólar bajó a $${v.toFixed(2)}, debajo de tu límite de $${settings.alertBelow.toFixed(2)}. Buen momento para comprar dólares.` });
    if (settings.alertAbove && v >= settings.alertAbove) out.push({ id: `above-${fx.last.date}`, text: `El dólar subió a $${v.toFixed(2)}, arriba de tu límite de $${settings.alertAbove.toFixed(2)}. Buen momento para mandar dólares a México.` });
    if (prev && settings.alertMove) {
      const ch = (v - prev) / prev * 100;
      if (Math.abs(ch) >= settings.alertMove) out.push({ id: `move-${fx.last.date}`, text: `El dólar ${ch > 0 ? 'subió' : 'bajó'} ${Math.abs(ch).toFixed(1)}% contra el cierre anterior ($${prev.toFixed(2)} → $${v.toFixed(2)}).` });
    }
    return out;
  }

  async function notify(text) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) reg.showNotification('Mis Finanzas · Tipo de cambio', { body: text, icon: 'icons/icon-192.png', tag: 'fx' });
      else new Notification('Mis Finanzas · Tipo de cambio', { body: text });
    } catch { /* sin notificaciones en este navegador */ }
  }

  async function refresh() {
    const st = S().state;
    st.fx.status = 'cargando';
    try {
      const [l, h] = await Promise.all([latest(), st.fx.history.length && st.fx.historyAt === S().today() ? Promise.resolve(null) : history(90).catch(() => null)]);
      if (h) { st.fx.history = h; st.fx.historyAt = S().today(); }
      if (st.fx.history.length && st.fx.history.at(-1).date !== l.date) st.fx.history.push({ date: l.date, value: l.value });
      st.fx.last = { ...l, at: new Date().toISOString() };
      st.fx.status = 'ok';
      const seen = new Set(st.fx.alerts.map((a) => a.id));
      for (const a of check(st.fx, st.settings)) {
        if (seen.has(a.id)) continue;
        st.fx.alerts.unshift({ ...a, at: new Date().toISOString(), read: false });
        if (st.settings.notify) notify(a.text);
      }
      st.fx.alerts = st.fx.alerts.slice(0, 20);
    } catch (e) {
      st.fx.status = 'error';
      st.fx.error = 'No se pudo consultar el tipo de cambio. Revisa tu conexión.';
    }
    S().save();
  }

  function start() { refresh(); setInterval(refresh, EVERY); }

  window.FX = { refresh, start, check };
})();
