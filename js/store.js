// Mis Finanzas — datos y cálculos.
// Todo vive en este dispositivo (localStorage). Nada se envía a ningún servidor; lo único que sale a internet
// es la consulta del tipo de cambio, que no lleva ningún dato tuyo.
(() => {
  const KEY = 'misfinanzas.v1';
  const DAY = 86400000;

  // ---------- fechas ----------
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const today = () => iso(new Date());
  const monthKey = (s) => s.slice(0, 7);
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const monthName = (key) => { const [y, m] = key.split('-').map(Number); return `${MESES[m - 1]} ${y}`; };
  const shortDate = (s) => { const [, m, d] = s.split('-').map(Number); return `${d} ${MES_CORTO[m - 1]}`; };
  const relDate = (s) => {
    const diff = Math.round((new Date(today()) - new Date(s)) / DAY);
    return diff === 0 ? 'Hoy' : diff === 1 ? 'Ayer' : diff < 7 ? `Hace ${diff} días` : shortDate(s);
  };

  // ---------- dinero ----------
  // Se guarda en centavos para que las sumas cuadren exactas.
  const nf2 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
  const money = (cents, cur = 'MXN', { decimals = true, sign = false } = {}) => {
    const v = Math.abs(cents) / 100;
    const s = (decimals ? nf2 : nf0).format(decimals ? v : Math.round(v));
    const pre = cents < 0 ? '−' : sign && cents > 0 ? '+' : '';
    return `${pre}${cur === 'USD' ? 'US$' : '$'}${s}`;
  };
  const toCents = (v) => Math.round(parseFloat(String(v).replace(/[^0-9.\-]/g, '')) * 100);

  // ---------- categorías ----------
  // grupo: necesidad / gusto / ahorro (la regla 50/30/20)
  const CATEGORIAS = [
    { id: 'vivienda', name: 'Vivienda', group: 'necesidad', words: ['renta', 'rent', 'hipoteca', 'mortgage', 'predial'] },
    { id: 'super', name: 'Súper y despensa', group: 'necesidad', words: ['walmart', 'soriana', 'chedraui', 'heb', 'h-e-b', 'costco', 'sams', "sam's", 'la comer', 'superama', 'safeway', 'kroger', 'target', 'aldi', 'trader joe', 'whole foods', 'oxxo', '7-eleven', 'seven eleven'] },
    { id: 'transporte', name: 'Transporte y gasolina', group: 'necesidad', words: ['uber', 'didi', 'lyft', 'pemex', 'gasolin', 'shell', 'chevron', 'exxon', 'bp ', 'arco', 'mobil', 'valero', 'caseta', 'iave', 'parking', 'estacionamiento', 'metro'] },
    { id: 'servicios', name: 'Luz, agua, internet y cel', group: 'necesidad', words: ['cfe', 'telmex', 'izzi', 'totalplay', 'megacable', 'telcel', 'at&t', 'att ', 't-mobile', 'verizon', 'comcast', 'xfinity', 'spectrum', 'agua', 'water', 'electric', 'pg&e', 'edison'] },
    { id: 'salud', name: 'Salud y seguros', group: 'necesidad', words: ['farmacia', 'pharmacy', 'cvs', 'walgreens', 'similares', 'guadalajara', 'benavides', 'hospital', 'doctor', 'seguro', 'insurance', 'gnp', 'axa', 'geico', 'progressive'] },
    { id: 'restaurantes', name: 'Restaurantes y café', group: 'gusto', words: ['restaurant', 'starbucks', 'cafe', 'café', 'tacos', 'taqueria', 'pizza', 'mcdonald', 'burger', 'subway', 'chipotle', 'rappi', 'uber eats', 'ubereats', 'doordash', 'didi food', 'vips', 'sanborns', 'toks', 'wingstop', 'panda express', 'in-n-out', 'chick-fil-a'] },
    { id: 'suscripciones', name: 'Suscripciones', group: 'gusto', words: ['netflix', 'spotify', 'disney', 'hbo', 'max.com', 'prime video', 'amazon prime', 'apple.com', 'icloud', 'youtube', 'google one', 'xbox', 'playstation', 'chatgpt', 'claude', 'anthropic', 'paramount'] },
    { id: 'compras', name: 'Compras', group: 'gusto', words: ['amazon', 'mercado libre', 'mercadolibre', 'liverpool', 'palacio de hierro', 'coppel', 'shein', 'zara', 'h&m', 'best buy', 'home depot', 'ikea', 'nike', 'adidas', 'apple store'] },
    { id: 'ocio', name: 'Salidas y viajes', group: 'gusto', words: ['cinepolis', 'cinemex', 'amc', 'ticketmaster', 'airbnb', 'hotel', 'volaris', 'aeromexico', 'viva aerobus', 'southwest', 'american airlines', 'united', 'delta', 'bar ', 'cerveceria'] },
    { id: 'ahorro', name: 'Ahorro e inversión', group: 'ahorro', words: ['ahorro', 'savings', 'cetes', 'gbm', 'nu cajita', 'fidelity', 'vanguard', 'schwab', 'robinhood'] },
    { id: 'envios', name: 'Envíos a México', group: 'necesidad', words: ['remitly', 'western union', 'wise', 'xoom', 'ria '] },
    { id: 'otros', name: 'Otros', group: 'gusto', words: [] },
  ];
  const catById = (id) => CATEGORIAS.find((c) => c.id === id) || CATEGORIAS.at(-1);
  const guessCategory = (merchant = '') => {
    const m = ` ${merchant.toLowerCase()} `;
    return (CATEGORIAS.find((c) => c.words.some((w) => m.includes(w))) || catById('otros')).id;
  };

  // ---------- estado ----------
  const uid = () => Math.random().toString(36).slice(2, 10);
  let state = null;
  const listeners = new Set();

  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY)); } catch { state = null; }
    if (!state || !state.version) state = window.Muestra.build();
    return state;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('No se pudo guardar', e); }
    listeners.forEach((fn) => fn(state));
  }
  const onChange = (fn) => listeners.add(fn);

  // ---------- tipo de cambio ----------
  // USD → MXN. El de cada movimiento en dólares se guarda con el movimiento (tx.fx), para saber cuánto valía ese día.
  const rate = () => state.fx.last?.value || 18.5;
  const toMXN = (cents, cur, fx = rate()) => (cur === 'USD' ? Math.round(cents * fx) : cents);
  const toUSD = (cents, cur, fx = rate()) => (cur === 'MXN' ? Math.round(cents / fx) : cents);
  const inBase = (cents, cur, fx) => (state.settings.base === 'USD' ? toUSD(cents, cur, fx) : toMXN(cents, cur, fx));
  const base = () => state.settings.base;

  // ---------- cuentas ----------
  const accById = (id) => state.accounts.find((a) => a.id === id);
  const balance = (acc) => acc.opening + state.tx.filter((t) => t.accountId === acc.id).reduce((s, t) => s + t.amount, 0);
  function netWorth() {
    const rows = state.accounts.map((a) => ({ ...a, balance: balance(a) }));
    const total = rows.reduce((s, a) => s + inBase(a.balance, a.currency), 0);
    return { rows, total };
  }

  // ---------- el mes ----------
  function month(key = monthKey(today())) {
    const tx = state.tx.filter((t) => monthKey(t.date) === key);
    const isTransfer = (t) => t.kind === 'transferencia';
    const spentTx = tx.filter((t) => t.amount < 0 && !isTransfer(t));
    const incomeTx = tx.filter((t) => t.amount > 0 && !isTransfer(t));
    const byCat = {};
    for (const t of spentTx) byCat[t.category] = (byCat[t.category] || 0) + inBase(-t.amount, t.currency, t.fx);
    const income = { MX: 0, US: 0 };
    const incomeOrig = { MXN: 0, USD: 0 };
    for (const t of incomeTx) {
      const country = t.country || accById(t.accountId)?.country || 'MX';
      income[country] += inBase(t.amount, t.currency, t.fx);
      incomeOrig[t.currency] += t.amount;
    }
    const spent = Object.values(byCat).reduce((s, v) => s + v, 0);
    return { key, tx, byCat, spent, income, incomeOrig, incomeTotal: income.MX + income.US };
  }

  // ---------- el asesor ----------
  // Presupuesto: cada categoría tiene un plan mensual (en la moneda base). "Sugerir" lo reparte con 50/30/20
  // sobre el ingreso esperado, respetando el peso que cada categoría ha tenido en tus últimos 3 meses.
  function suggestBudget() {
    const income = expectedIncome();
    const months = lastMonths(3).map((k) => month(k));
    const avg = {};
    for (const m of months) for (const [c, v] of Object.entries(m.byCat)) avg[c] = (avg[c] || 0) + v / months.length;
    const split = { necesidad: 0.5, gusto: 0.3, ahorro: 0.2 };
    const out = {};
    for (const g of Object.keys(split)) {
      const cats = CATEGORIAS.filter((c) => c.group === g);
      const totalG = cats.reduce((s, c) => s + (avg[c.id] || 0), 0);
      for (const c of cats) {
        const share = totalG ? (avg[c.id] || 0) / totalG : 1 / cats.length;
        out[c.id] = Math.round((income * split[g] * share) / 10000) * 10000; // redondeado a $100
      }
    }
    return out;
  }
  function expectedIncome() {
    if (state.settings.expectedIncome) return inBase(state.settings.expectedIncome, state.settings.expectedIncomeCur);
    const ms = lastMonths(3).map((k) => month(k).incomeTotal);
    return Math.round(ms.reduce((s, v) => s + v, 0) / (ms.length || 1));
  }
  function lastMonths(n, from = monthKey(today())) {
    const [y, m] = from.split('-').map(Number);
    const out = [];
    for (let i = 1; i <= n; i++) { const d = new Date(y, m - 1 - i, 1); out.push(iso(d).slice(0, 7)); }
    return out;
  }

  function advisor() {
    const now = new Date(today() + 'T12:00:00');
    const dim = daysInMonth(now.getFullYear(), now.getMonth());
    const day = now.getDate();
    const daysLeft = dim - day + 1; // hoy cuenta
    const m = month();
    const plan = state.budget;
    const spendCats = CATEGORIAS.filter((c) => c.group !== 'ahorro');
    const planSpend = spendCats.reduce((s, c) => s + (plan[c.id] || 0), 0);
    const spentSpend = spendCats.reduce((s, c) => s + (m.byCat[c.id] || 0), 0);
    // lo fijo que falta por cobrar este mes (renta, suscripciones) ya está comprometido
    const committed = upcoming(daysLeft).reduce((s, b) => s + b.amountBase, 0);
    const free = planSpend - spentSpend - committed;
    const perDay = Math.max(0, Math.floor(free / daysLeft));

    // a este ritmo, al cierre: lo variable se proyecta por día; los pagos fijos cuentan una vez (pagados o por venir)
    const due = upcoming(daysLeft);
    const rows = CATEGORIAS.filter((c) => plan[c.id] || m.byCat[c.id]).map((c) => {
      const spent = m.byCat[c.id] || 0;
      const planned = plan[c.id] || 0;
      const fixed = m.tx.filter((t) => t.billId && t.category === c.id && t.amount < 0).reduce((s, t) => s + inBase(-t.amount, t.currency, t.fx), 0);
      const coming = due.filter((b) => b.category === c.id).reduce((s, b) => s + b.amountBase, 0);
      const pace = Math.round(fixed + coming + ((spent - fixed) / day) * dim);
      return { id: c.id, label: c.name, group: c.group, planned, spent, pace };
    });

    // hallazgos: lo que más necesita atención, ordenado
    const findings = [];
    for (const r of rows) {
      if (r.group === 'ahorro') continue;
      if (r.spent > r.planned && r.planned > 0) findings.push({ level: 'neg', weight: r.spent - r.planned, text: `${r.label}: llevas ${money(r.spent - r.planned, base(), { decimals: false })} más de lo planeado este mes.` });
      else if (r.pace > r.planned * 1.1 && r.planned > 0 && day >= 5) findings.push({ level: 'warn', weight: r.pace - r.planned, text: `${r.label}: a este ritmo cierras el mes en ${money(r.pace, base(), { decimals: false })}, ${money(r.pace - r.planned, base(), { decimals: false })} sobre el plan.` });
    }
    // primero lo que ya se pasó, luego lo que va a pasarse
    findings.sort((a, b) => (a.level === b.level ? b.weight - a.weight : a.level === 'neg' ? -1 : 1));

    // 50/30/20 real contra objetivo
    // a media quincena todavía no entra todo el sueldo: se compara contra lo que esperas ganar en el mes
    const income = Math.max(m.incomeTotal, expectedIncome());
    const byGroup = { necesidad: 0, gusto: 0, ahorro: 0 };
    for (const r of rows) byGroup[r.group] += r.spent;
    const saved = savingsThisMonth();
    byGroup.ahorro = Math.max(byGroup.ahorro, saved);
    // el rojo solo cuando la desviación es mala: gastar de más en necesidades o gustos, o ahorrar de menos
    const share = (v) => (income ? v / income : 0);
    const rule = [
      { label: 'Necesidades', value: share(byGroup.necesidad), target: 0.5, good: 'below' },
      { label: 'Gustos', value: share(byGroup.gusto), target: 0.3, good: 'below' },
      { label: 'Ahorro', value: share(byGroup.ahorro), target: 0.2, good: 'above' },
    ].map((r) => ({ ...r, tolerance: (r.good === 'below' ? r.value <= r.target : r.value >= r.target) ? Infinity : 0.02 }));

    // fondo de emergencia: meses de gasto que cubren tus cuentas de ahorro
    const avgSpend = lastMonths(3).map((k) => month(k).spent).reduce((s, v) => s + v, 0) / 3;
    const savingsBal = state.accounts.filter((a) => a.type === 'ahorro').reduce((s, a) => s + inBase(balance(a), a.currency), 0);
    const emergency = avgSpend ? savingsBal / avgSpend : 0;

    return { day, dim, daysLeft, planSpend, spentSpend, committed, free, perDay, rows, findings, rule, income, emergency, savingsBal, avgSpend };
  }
  function savingsThisMonth() {
    const k = monthKey(today());
    return state.tx.filter((t) => monthKey(t.date) === k && t.kind === 'transferencia' && t.amount > 0 && accById(t.accountId)?.type === 'ahorro')
      .reduce((s, t) => s + inBase(t.amount, t.currency, t.fx), 0);
  }

  // pagos fijos que faltan en lo que queda del mes
  function upcoming(daysLeft = 31) {
    const now = new Date(today() + 'T12:00:00');
    const k = monthKey(today());
    return state.bills.map((b) => {
      const paid = state.tx.some((t) => monthKey(t.date) === k && t.billId === b.id);
      const due = new Date(now.getFullYear(), now.getMonth(), Math.min(b.day, daysInMonth(now.getFullYear(), now.getMonth())));
      const inDays = Math.round((due - new Date(today())) / DAY);
      return { ...b, paid, due: iso(due), inDays, amountBase: inBase(b.amount, b.currency) };
    }).filter((b) => !b.paid && b.inDays >= 0 && b.inDays < daysLeft).sort((a, b) => a.inDays - b.inDays);
  }

  // metas: cuánto apartar por quincena
  function goalPlan(g) {
    const left = Math.max(0, g.target - g.saved);
    const days = Math.max(1, Math.round((new Date(g.due) - new Date(today())) / DAY));
    const quincenas = Math.max(1, Math.ceil(days / 15.2));
    return { left, quincenas, perQuincena: Math.ceil(left / quincenas / 100) * 100, pct: g.target ? g.saved / g.target : 0 };
  }

  // ingresos por mes y país (para el SAT y el IRS)
  function incomeHistory(n = 6) {
    const keys = [...lastMonths(n - 1).reverse(), monthKey(today())];
    return keys.map((k) => {
      const tx = state.tx.filter((t) => monthKey(t.date) === k && t.amount > 0 && t.kind !== 'transferencia');
      const row = { key: k, MX: { MXN: 0, USD: 0, base: 0 }, US: { MXN: 0, USD: 0, base: 0 } };
      for (const t of tx) {
        const c = t.country || accById(t.accountId)?.country || 'MX';
        row[c][t.currency] += t.amount;
        row[c].base += inBase(t.amount, t.currency, t.fx);
      }
      row.total = row.MX.base + row.US.base;
      return row;
    });
  }

  // ---------- escribir ----------
  function addTx(t) {
    const acc = accById(t.accountId);
    const tx = { id: uid(), date: t.date || today(), amount: t.amount, currency: acc.currency, accountId: acc.id, category: t.category || (t.amount > 0 ? 'ingreso' : guessCategory(t.merchant)), merchant: t.merchant || '', note: t.note || '', source: t.source || 'manual', kind: t.kind || (t.amount > 0 ? 'ingreso' : 'gasto'), country: t.country || acc.country };
    if (acc.currency === 'USD') tx.fx = t.fx || rate();
    if (t.billId) tx.billId = t.billId;
    if (t.emailId) tx.emailId = t.emailId;
    state.tx.push(tx);
    save();
    return tx;
  }
  function removeTx(id) { state.tx = state.tx.filter((t) => t.id !== id); save(); }
  function transfer({ from, to, amount, date, fx }) {
    // amount en la moneda de la cuenta origen; si cambian de moneda, se convierte al tipo que tú pongas
    const a = accById(from), b = accById(to);
    const r = fx || rate();
    const received = a.currency === b.currency ? amount : a.currency === 'USD' ? Math.round(amount * r) : Math.round(amount / r);
    const pair = uid();
    state.tx.push({ id: uid(), date, amount: -amount, currency: a.currency, accountId: a.id, category: 'transferencia', merchant: `A ${b.name}`, kind: 'transferencia', pair, fx: r, source: 'manual' });
    state.tx.push({ id: uid(), date, amount: received, currency: b.currency, accountId: b.id, category: 'transferencia', merchant: `De ${a.name}`, kind: 'transferencia', pair, fx: r, source: 'manual' });
    save();
  }

  function resetEmpty() {
    state = window.Muestra.empty(state);
    save();
  }
  function exportJSON() { return JSON.stringify(state, null, 2); }
  function importJSON(text) {
    const s = JSON.parse(text);
    if (!s.version || !Array.isArray(s.tx)) throw new Error('Este archivo no es un respaldo de Mis Finanzas.');
    state = s; save();
  }

  window.Store = {
    load, save, onChange, get state() { return state; },
    iso, today, monthKey, monthName, shortDate, relDate, daysInMonth, MESES, MES_CORTO,
    money, toCents, CATEGORIAS, catById, guessCategory, uid,
    rate, toMXN, toUSD, inBase, base, accById, balance, netWorth,
    month, advisor, upcoming, goalPlan, incomeHistory, expectedIncome, suggestBudget, lastMonths,
    addTx, removeTx, transfer, resetEmpty, exportJSON, importJSON,
  };
})();
