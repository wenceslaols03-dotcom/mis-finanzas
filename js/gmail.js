// Lee de tu Gmail los avisos de compra de BBVA y Wells Fargo, directo de Google a este dispositivo.
// Permiso de solo lectura (gmail.readonly). El permiso vive en memoria mientras la app está abierta y no se guarda.
(() => {
  const S = () => window.Store;
  const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
  const API = 'https://gmail.googleapis.com/gmail/v1/users/me';
  // remitentes de los avisos; se puede ampliar en Ajustes
  const FROM = ['bbva.mx', 'bbva.com', 'bancomer.com', 'wellsfargo.com', 'notify.wellsfargo.com'];

  let token = null, expires = 0, client = null;

  function loadGIS() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    return new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.onload = ok; s.onerror = () => fail(new Error('No se pudo cargar el inicio de sesión de Google. Revisa tu conexión.'));
      document.head.appendChild(s);
    });
  }

  // pide el permiso; tiene que llamarse desde un toque del usuario para que Safari deje abrir la ventana de Google
  async function authorize() {
    if (token && Date.now() < expires - 60000) return token;
    const id = S().state.settings.gmailClientId;
    if (!id) throw new Error('Falta el ID de cliente de Google. Ponlo en Ajustes → Gmail.');
    await loadGIS();
    return new Promise((ok, fail) => {
      client = google.accounts.oauth2.initTokenClient({
        client_id: id, scope: SCOPE, login_hint: S().state.settings.gmailAccount || undefined,
        callback: (r) => {
          if (r.error) return fail(new Error(r.error === 'access_denied' ? 'No diste permiso para leer tu Gmail.' : `Google respondió: ${r.error_description || r.error}`));
          token = r.access_token; expires = Date.now() + (Number(r.expires_in) || 3600) * 1000; ok(token);
        },
        error_callback: (e) => fail(new Error(e.type === 'popup_closed' ? 'Se cerró la ventana de Google antes de terminar.' : 'No se pudo abrir la ventana de Google. Permite ventanas emergentes para esta página.')),
      });
      client.requestAccessToken();
    });
  }

  async function api(path) {
    const r = await fetch(`${API}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 401) { token = null; throw new Error('El permiso de Google caducó. Toca "Revisar Gmail" otra vez.'); }
    if (!r.ok) throw new Error(`Gmail respondió ${r.status}.`);
    return r.json();
  }

  // ---------- del correo de Gmail a texto plano ----------
  const b64 = (s) => { const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/')); return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))); };
  function htmlToText(html) {
    // las tablas de los bancos ponen "Comercio" y su valor en celdas distintas: cada celda en su línea
    const marked = html.replace(/<(br|\/p|\/div|\/tr|\/li|\/h\d)[^>]*>/gi, '\n').replace(/<\/t[dh]>/gi, ': ');
    const doc = new DOMParser().parseFromString(marked, 'text/html');
    doc.querySelectorAll('style,script,head').forEach((n) => n.remove());
    return (doc.body?.textContent || '').replace(/[ \t]+/g, ' ').replace(/(:\s*){2,}/g, ': ').replace(/\n\s*\n+/g, '\n').trim();
  }
  function bodyOf(part) {
    const plain = [], html = [];
    (function walk(p) {
      if (!p) return;
      if (p.mimeType === 'text/plain' && p.body?.data) plain.push(b64(p.body.data));
      else if (p.mimeType === 'text/html' && p.body?.data) html.push(b64(p.body.data));
      (p.parts || []).forEach(walk);
    })(part);
    return plain.length ? plain.join('\n') : html.map(htmlToText).join('\n');
  }

  async function fetchAlerts() {
    await authorize();
    const st = S().state;
    const last = st.settings.gmailLastSync ? Math.floor(new Date(st.settings.gmailLastSync).getTime() / 1000) - 86400 : null;
    const from = [...FROM, ...(st.settings.gmailExtraFrom || '').split(',').map((x) => x.trim()).filter(Boolean)];
    const q = `from:(${from.join(' OR ')}) ${last ? `after:${last}` : 'newer_than:30d'}`;
    const ids = [];
    let page = '';
    do {
      const r = await api(`messages?maxResults=100&q=${encodeURIComponent(q)}${page ? `&pageToken=${page}` : ''}`);
      (r.messages || []).forEach((m) => ids.push(m.id));
      page = r.nextPageToken || '';
    } while (page && ids.length < 300);

    const msgs = [];
    for (let i = 0; i < ids.length; i += 10) {
      const batch = await Promise.all(ids.slice(i, i + 10).map((id) => api(`messages/${id}?format=full`)));
      for (const m of batch) {
        const h = Object.fromEntries((m.payload?.headers || []).map((x) => [x.name.toLowerCase(), x.value]));
        const text = `De: ${h.from || ''}\nAsunto: ${h.subject || ''}\n${bodyOf(m.payload)}`;
        msgs.push({ id: m.id, text, subject: h.subject || '', date: S().iso(new Date(Number(m.internalDate))) });
      }
    }
    return { found: window.Correo.parseMessages(msgs), read: msgs.length, query: q };
  }

  function markSynced() { S().state.settings.gmailLastSync = new Date().toISOString(); S().save(); }
  function disconnect() { if (token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {}); token = null; }
  const ready = () => !!S().state.settings.gmailClientId;

  // se carga antes de que toques el botón: Safari solo abre la ventana de Google si se pide en el mismo toque
  const preload = () => { if (ready()) loadGIS().catch(() => {}); };
  window.Gmail = { fetchAlerts, markSynced, disconnect, ready, preload };
})();
