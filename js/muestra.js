// Datos de ejemplo para ver la app llena. Se generan relativos a la fecha de hoy, así siempre se ven actuales.
// En Ajustes → "Empezar con mis datos" se borran y quedan tus cuentas vacías.
(() => {
  const S = () => window.Store;

  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const ACCOUNTS = [
    { id: 'bbva-debito', name: 'BBVA Débito', bank: 'BBVA', country: 'MX', currency: 'MXN', type: 'debito', last4: '4821' },
    { id: 'bbva-credito', name: 'BBVA Azul (crédito)', bank: 'BBVA', country: 'MX', currency: 'MXN', type: 'credito', last4: '7730', cutDay: 18, payDay: 8, limit: 4500000 },
    { id: 'bbva-ahorro', name: 'BBVA Apartado', bank: 'BBVA', country: 'MX', currency: 'MXN', type: 'ahorro' },
    { id: 'efectivo', name: 'Efectivo', bank: 'Efectivo', country: 'MX', currency: 'MXN', type: 'efectivo' },
    { id: 'wf-checking', name: 'Wells Fargo Checking', bank: 'Wells Fargo', country: 'US', currency: 'USD', type: 'debito', last4: '0193' },
    { id: 'wf-savings', name: 'Wells Fargo Savings', bank: 'Wells Fargo', country: 'US', currency: 'USD', type: 'ahorro' },
  ];
  // saldo al día de hoy (centavos)
  const TARGET = { 'bbva-debito': 1843560, 'bbva-credito': -632940, 'bbva-ahorro': 4210000, efectivo: 120000, 'wf-checking': 241875, 'wf-savings': 382000 };

  const BILLS = [
    { id: 'renta', name: 'Renta', accountId: 'wf-checking', amount: 115000, currency: 'USD', day: 1, category: 'vivienda' },
    { id: 'remitly', name: 'Envío a mamá (Remitly)', accountId: 'wf-checking', amount: 30000, currency: 'USD', day: 3, category: 'envios' },
    { id: 'netflix', name: 'Netflix', accountId: 'wf-checking', amount: 1549, currency: 'USD', day: 8, category: 'suscripciones' },
    { id: 'tmobile', name: 'T-Mobile', accountId: 'wf-checking', amount: 6500, currency: 'USD', day: 12, category: 'servicios' },
    { id: 'spotify', name: 'Spotify', accountId: 'bbva-credito', amount: 12900, currency: 'MXN', day: 20, category: 'suscripciones' },
    { id: 'geico', name: 'Seguro del auto (GEICO)', accountId: 'wf-checking', amount: 11200, currency: 'USD', day: 26, category: 'salud' },
    { id: 'xfinity', name: 'Internet Xfinity', accountId: 'wf-checking', amount: 6000, currency: 'USD', day: 28, category: 'servicios' },
  ];

  const BUDGET = { vivienda: 2160000, super: 900000, transporte: 450000, servicios: 250000, salud: 220000, envios: 570000, restaurantes: 350000, suscripciones: 80000, compras: 300000, ocio: 250000, otros: 100000, ahorro: 1500000 };

  // gastos variables: [comercio, cuenta, categoría, mín, máx, veces por mes]
  const VARIABLE = [
    ['H-E-B', 'wf-checking', 'super', 6500, 14500, 3],
    ['Costco', 'wf-checking', 'super', 9000, 21000, 1],
    ['Walmart Supercenter', 'wf-checking', 'super', 3000, 8000, 2],
    ['Chevron', 'wf-checking', 'transporte', 3800, 5600, 4],
    ['Starbucks', 'wf-checking', 'restaurantes', 550, 950, 4],
    ['Chipotle', 'wf-checking', 'restaurantes', 1200, 1900, 2],
    ['Uber Eats', 'wf-checking', 'restaurantes', 2200, 4200, 2],
    ['Amazon.com', 'wf-checking', 'compras', 1800, 7500, 2],
    ['Uber', 'wf-checking', 'transporte', 1100, 2600, 1],
    ['CVS Pharmacy', 'wf-checking', 'salud', 900, 3200, 1],
    ['OXXO', 'bbva-credito', 'super', 4500, 18000, 2],
    ['Mercado Libre', 'bbva-credito', 'compras', 25000, 89000, 1],
    ['Tacos El Güero', 'efectivo', 'restaurantes', 9000, 22000, 1],
    ['Cinépolis', 'bbva-credito', 'ocio', 18000, 42000, 1],
  ];

  // tipo de cambio aproximado por mes (del más viejo al actual), solo para el ejemplo
  const FX = [17.9, 17.6, 17.4, 17.3, 17.4, 18.6];

  function build() {
    const St = S();
    const r = rng(20261023);
    const now = new Date(St.today() + 'T12:00:00');
    const todayDay = now.getDate();
    const tx = [];
    const push = (t) => tx.push({ id: St.uid(), source: 'ejemplo', note: '', ...t, country: t.country || ACCOUNTS.find((a) => a.id === t.accountId).country });

    for (let back = 5; back >= 0; back--) {
      const first = new Date(now.getFullYear(), now.getMonth() - back, 1);
      const y = first.getFullYear(), m = first.getMonth();
      const dim = St.daysInMonth(y, m);
      const last = back === 0 ? todayDay : dim;
      const fx = FX[5 - back];
      const date = (d) => St.iso(new Date(y, m, Math.min(d, dim)));
      const cur = (acc) => ACCOUNTS.find((a) => a.id === acc).currency;

      // ingresos
      for (const d of [15, dim]) if (d <= last) push({ date: date(d), amount: 185000, currency: 'USD', fx, accountId: 'wf-checking', category: 'ingreso', kind: 'ingreso', merchant: 'Nómina — Lone Star Logistics', incomeType: 'Sueldo' });
      if (5 <= last) push({ date: date(5), amount: 950000, currency: 'MXN', accountId: 'bbva-debito', category: 'ingreso', kind: 'ingreso', merchant: 'Renta depto. Monterrey', incomeType: 'Renta' });
      if (back % 2 === 0 && 21 <= last) push({ date: date(21), amount: 600000, currency: 'MXN', accountId: 'bbva-debito', category: 'ingreso', kind: 'ingreso', merchant: 'Proyecto freelance (SPEI)', incomeType: 'Freelance' });

      // pagos fijos
      for (const b of BILLS) if (b.day <= last) push({ date: date(b.day), amount: -b.amount, currency: b.currency, fx: b.currency === 'USD' ? fx : undefined, accountId: b.accountId, category: b.category, kind: 'gasto', merchant: b.name, billId: b.id });

      // gastos variables; este mes los restaurantes van más rápido de lo planeado
      for (const [merchant, acc, cat, min, max, times] of VARIABLE) {
        const n = back === 0 && cat === 'restaurantes' ? times + 2 : times;
        for (let i = 0; i < n; i++) {
          const d = 1 + Math.floor(r() * (back === 0 ? last : dim));
          if (d > last) continue;
          const amount = Math.round((min + r() * (max - min)) / 1) ;
          push({ date: date(d), amount: -amount, currency: cur(acc), fx: cur(acc) === 'USD' ? fx : undefined, accountId: acc, category: cat, kind: 'gasto', merchant });
        }
      }

      // ahorro: el 16 pasa US$300 a Savings; el 6 aparta $3,000 en BBVA
      if (16 <= last) {
        const pair = St.uid();
        push({ date: date(16), amount: -30000, currency: 'USD', fx, accountId: 'wf-checking', category: 'transferencia', kind: 'transferencia', merchant: 'A Wells Fargo Savings', pair });
        push({ date: date(16), amount: 30000, currency: 'USD', fx, accountId: 'wf-savings', category: 'transferencia', kind: 'transferencia', merchant: 'De Wells Fargo Checking', pair });
      }
      if (6 <= last) {
        const pair = St.uid();
        push({ date: date(6), amount: -300000, currency: 'MXN', accountId: 'bbva-debito', category: 'transferencia', kind: 'transferencia', merchant: 'A BBVA Apartado', pair });
        push({ date: date(6), amount: 300000, currency: 'MXN', accountId: 'bbva-ahorro', category: 'transferencia', kind: 'transferencia', merchant: 'De BBVA Débito', pair });
      }
    }
    tx.sort((a, b) => a.date.localeCompare(b.date));

    const accounts = ACCOUNTS.map((a) => {
      const sum = tx.filter((t) => t.accountId === a.id).reduce((s, t) => s + t.amount, 0);
      return { ...a, opening: TARGET[a.id] - sum };
    });

    return {
      version: 1,
      sample: true,
      settings: { base: 'MXN', alertBelow: 18.2, alertAbove: 19.2, alertMove: 1, notify: false, expectedIncome: 0, expectedIncomeCur: 'MXN' },
      accounts,
      tx,
      bills: BILLS,
      budget: { ...BUDGET },
      goals: [
        { id: 'oaxaca', name: 'Viaje a Oaxaca en diciembre', target: 2500000, saved: 1150000, currency: 'MXN', due: St.iso(new Date(now.getFullYear(), 11, 15)) },
        { id: 'auto', name: 'Enganche del auto', target: 500000, saved: 180000, currency: 'USD', due: St.iso(new Date(now.getFullYear() + 1, 5, 30)) },
      ],
      fx: { last: null, history: [], alerts: [] },
      emails: [],
    };
  }

  // tus cuentas reales, vacías: BBVA y Wells Fargo ya dados de alta, saldos en cero
  function empty(prev) {
    return {
      version: 1,
      sample: false,
      settings: { ...prev.settings },
      accounts: ACCOUNTS.map((a) => ({ ...a, opening: 0, last4: '' })),
      tx: [],
      bills: [],
      budget: Object.fromEntries(Object.keys(BUDGET).map((k) => [k, 0])),
      goals: [],
      fx: prev.fx,
      emails: [],
    };
  }

  window.Muestra = { build, empty };
})();
