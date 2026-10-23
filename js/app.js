// Mis Finanzas — pantallas.
(() => {
  const S = window.Store;
  const C = window.Charts;
  S.load();

  // ---------- utilidades ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const B = () => S.base();
  const m0 = (c, cur = B()) => S.money(c, cur, { decimals: false });
  const m2 = (c, cur = B()) => S.money(c, cur);
  // una cifra grande con los centavos más chicos y en gris
  const big = (c, cur = B()) => { const s = S.money(c, cur); const i = s.lastIndexOf('.'); return `${esc(s.slice(0, i))}<small>${esc(s.slice(i))}</small>`; };
  const curLabel = (cur) => (cur === 'USD' ? 'dólares' : 'pesos');
  const pct = (v) => `${Math.round(v * 100)}%`;
  const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

  const I = {
    inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    cuentas: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><path d="M16 15h2"/><path d="M7 6V4.5h10V6"/>',
    movimientos: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    ingresos: '<path d="M12 3v11"/><path d="m7.5 9.5 4.5 4.5 4.5-4.5"/><path d="M4 16v4h16v-4"/>',
    presupuesto: '<path d="M20.5 13A8.5 8.5 0 1 1 11 3.5V13z"/><path d="M14.5 3.6A8.5 8.5 0 0 1 20.4 9.5h-5.9z"/>',
    ajustes: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    swap: '<path d="M7 7h13l-3-3"/><path d="M17 17H4l3 3"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

  const ROUTES = [
    ['inicio', 'Inicio'], ['cuentas', 'Cuentas'], ['movimientos', 'Movimientos'], ['ingresos', 'Ingresos'], ['presupuesto', 'Presupuesto'], ['ajustes', 'Ajustes'],
  ];
  const route = () => (location.hash.replace(/^#\/?/, '').split('?')[0] || 'inicio');

  function renderNav() {
    const r = route();
    $('#nav').innerHTML = ROUTES.map(([id, label], i) => `${i === 5 ? '<div class="spacer"></div>' : ''}<a class="nav" href="#/${id}" data-tip="${label}" aria-label="${label}" ${r === id ? 'aria-current="page"' : ''}>${icon(id)}<span>${label}</span></a>`).join('');
  }

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  const avatarOf = (acc) => {
    if (!acc) return '<span class="avatar cash">?</span>';
    if (acc.type === 'efectivo') return '<span class="avatar cash" aria-hidden="true">$</span>';
    const cls = acc.country === 'US' ? 'us' : 'mx';
    const ini = acc.bank === 'Wells Fargo' ? 'WF' : acc.bank === 'BBVA' ? 'BB' : acc.bank.slice(0, 2).toUpperCase();
    return `<span class="avatar ${cls}" aria-hidden="true">${esc(ini)}</span>`;
  };
  const TYPE = { debito: 'Débito', credito: 'Crédito', ahorro: 'Ahorro', efectivo: 'Efectivo' };
  const GROUP = { necesidad: 'Necesidad', gusto: 'Gusto', ahorro: 'Ahorro' };
  const SRC = { correo: 'Correo', manual: 'Manual', ejemplo: 'Ejemplo', importado: 'Importado' };
  const catName = (t) => (t.kind === 'ingreso' ? (t.incomeType || 'Ingreso') : t.kind === 'transferencia' ? 'Transferencia' : S.catById(t.category).name);

  // una fila de movimiento: el monto en su moneda; si es en dólares, lo que valió en la moneda base
  function txAmount(t) {
    const cls = t.amount > 0 && t.kind === 'ingreso' ? 'pos' : '';
    const main = S.money(t.amount, t.currency, { sign: t.kind === 'ingreso' });
    const eq = t.currency !== B() ? `<span class="sub">≈ ${m0(Math.abs(S.inBase(t.amount, t.currency, t.fx)))}</span>` : '';
    return `<span class="${cls}">${esc(main)}</span>${eq}`;
  }
  function txRow(t) {
    const acc = S.accById(t.accountId);
    return `<li class="row tap" data-act="edit-tx" data-id="${t.id}" tabindex="0">${avatarOf(acc)}<div style="min-width:0"><span class="name">${esc(t.merchant || catName(t))}</span><span class="sub">${esc(catName(t))} · ${esc(S.relDate(t.date))}</span></div><div class="amt">${txAmount(t)}</div></li>`;
  }

  const sampleNote = () => S.state.sample ? `<div class="sample-note"><span>Estás viendo datos de ejemplo. Cuando quieras, bórralos y empieza con tus cuentas reales.</span><button class="btn small" data-act="start-real">Empezar con mis datos</button></div>` : '';

  // ======================================================================
  // INICIO
  // ======================================================================
  function viewInicio() {
    const A = S.advisor();
    const m = S.month();
    const st = S.state;
    const monthLabel = S.MESES[new Date().getMonth()];
    const free = Math.max(0, A.free);
    const used = A.planSpend ? Math.min(1, A.spentSpend / A.planSpend) : 0;
    const com = A.planSpend ? Math.min(1 - used, A.committed / A.planSpend) : 0;
    const top = A.findings[0];

    const fx = st.fx;
    const rate = fx.last?.value;
    const prev = fx.history.length > 1 ? fx.history.at(-2) : null;
    const ch = rate && prev ? rate - prev.value : null;
    const fxTime = fx.last ? new Date(fx.last.at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';

    const bills = S.upcoming(A.daysLeft);
    const recent = [...st.tx].filter((t) => t.kind !== 'transferencia').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    const incMX = m.tx.filter((t) => t.kind === 'ingreso' && (t.country || S.accById(t.accountId)?.country) === 'MX');
    const incUS = m.tx.filter((t) => t.kind === 'ingreso' && (t.country || S.accById(t.accountId)?.country) === 'US');
    const usdUS = incUS.reduce((s, t) => s + (t.currency === 'USD' ? t.amount : S.toUSD(t.amount, t.currency, t.fx)), 0);
    const mxnMX = incMX.reduce((s, t) => s + (t.currency === 'MXN' ? t.amount : S.toMXN(t.amount, t.currency, t.fx)), 0);

    // consejos del asesor: lo urgente primero, luego lo que va bien
    const advice = [];
    for (const f of A.findings.slice(0, 2)) advice.push(f);
    if (A.emergency) advice.push({ level: A.emergency >= 3 ? 'ok' : 'warn', text: `Tu ahorro cubre ${A.emergency.toFixed(1)} meses de gastos${A.emergency >= 3 ? '. El mínimo recomendable son 3; vas bien.' : '. Lo recomendable son al menos 3 meses.'}` });
    const saveRate = A.rule[2].value;
    advice.push({ level: saveRate >= 0.2 ? 'ok' : 'warn', text: `Este mes llevas ahorrado el ${pct(saveRate)} de tus ingresos. La meta es 20%.` });

    return `
    <div class="wrap">
      ${sampleNote()}
      <div class="title-row">
        <div><h1>Resumen de ${monthLabel}</h1><p class="sub">${A.free >= 0 ? `Te quedan ${m0(free)} libres en tu plan para ${plural(A.daysLeft, 'día', 'días')}.` : `Ya gastaste ${m0(-A.free)} más de lo que tenías planeado este mes.`}</p></div>
        <div class="actions"><button class="btn" data-act="paste-email">${icon('mail')}Pegar correos</button><button class="btn primary keep" data-act="add-expense">${icon('plus')}Agregar gasto</button></div>
      </div>

      <div class="grid">
        <div class="stack s7">
          <section class="card" style="--o:1">
            <header><h2>Puedes gastar hoy</h2><span class="meta">Plan de ${monthLabel}</span></header>
            <div class="today">
              <div>
                <div class="figure lead" data-tween="perday" data-v="${A.perDay}" data-cur="${B()}">${big(A.perDay)}</div>
                <p class="label">al día durante los ${plural(A.daysLeft, 'día', 'días')} que quedan, contando hoy</p>
              </div>
              <div class="meter">
                <div class="meter-track" role="img" aria-label="Gastado ${m0(A.spentSpend)}, comprometido ${m0(A.committed)}, libre ${m0(free)} de ${m0(A.planSpend)}">
                  <span class="spent" style="width:${(used * 100).toFixed(1)}%"></span><span class="committed" style="width:${(com * 100).toFixed(1)}%"></span>
                </div>
                <div class="meter-key num"><span><i></i>Gastado ${m0(A.spentSpend)}</span><span><i class="c"></i>Pagos fijos por venir ${m0(A.committed)}</span><span><i class="f"></i>Libre ${m0(free)}</span><span>Plan ${m0(A.planSpend)}</span></div>
              </div>
              ${top ? `<div class="finding ${top.level === 'warn' ? 'warn' : ''}"><span>${esc(top.text)}</span><a class="card-link" href="#/presupuesto">Ver presupuesto${icon('chevron')}</a></div>`
                : `<div class="finding ok"><span>Vas dentro del plan en todas las categorías.</span><a class="card-link" href="#/presupuesto">Ver presupuesto${icon('chevron')}</a></div>`}
            </div>
          </section>

          <section class="card" style="--o:3">
            <header><h2>Presupuesto de ${monthLabel}</h2><a class="card-link" href="#/presupuesto">Ver las ${A.rows.length} categorías${icon('chevron')}</a></header>
            <div id="plan-chart"></div>
          </section>

          <section class="card" style="--o:6">
            <header><h2>Últimos movimientos</h2><a class="card-link" href="#/movimientos">Ver todos${icon('chevron')}</a></header>
            ${recent.length ? `<ul class="rows">${recent.map(txRow).join('')}</ul>` : '<div class="empty">Todavía no hay movimientos. Agrega un gasto o pega un correo de tu banco.</div>'}
          </section>
        </div>

        <div class="stack s5">
          <section class="card" style="--o:2">
            <header><h2>Dólar hoy</h2><span class="meta">${fx.status === 'error' && !rate ? 'Sin conexión' : fx.last ? `<span class="src">${esc(fx.last.source)} · </span>${fxTime}` : '<span class="skeleton">Cargando</span>'} <button class="icon-btn" style="display:inline-grid;vertical-align:middle;width:28px;height:28px" data-act="fx-refresh" aria-label="Actualizar tipo de cambio">${icon('refresh')}</button></span></header>
            ${rate ? `
            <div class="fx-head"><span class="figure" data-tween="fx" data-v="${Math.round(rate * 100)}" data-cur="MXN">${big(Math.round(rate * 100), 'MXN')}</span><span class="muted">por dólar</span></div>
            <p class="small muted num">${ch == null ? '—' : `${ch > 0 ? '+' : ch < 0 ? '−' : ''}${Math.abs(ch).toFixed(4)} (${ch > 0 ? '+' : ch < 0 ? '−' : ''}${Math.abs(ch / prev.value * 100).toFixed(2)}%) contra el cierre del ${S.shortDate(prev.date)}`}</p>
            <div id="fx-chart" class="chart" style="margin-top:12px"></div>
            <div class="convert">
              <div class="field"><label for="cv-usd">Dólares</label><div class="money-input"><input class="input" id="cv-usd" inputmode="decimal" value="100.00"><b>USD</b></div></div>
              <button class="btn swap" data-act="noop" tabindex="-1" aria-hidden="true">${icon('swap')}</button>
              <div class="field"><label for="cv-mxn">Pesos</label><div class="money-input"><input class="input" id="cv-mxn" inputmode="decimal" value="${(rate * 100).toFixed(2)}"><b>MXN</b></div></div>
            </div>
            <div class="thresholds"><span class="pill">Aviso abajo de $${st.settings.alertBelow.toFixed(2)}</span><span class="pill">Aviso arriba de $${st.settings.alertAbove.toFixed(2)}</span><a class="card-link" href="#/ajustes" style="margin-left:auto">Cambiar avisos${icon('chevron')}</a></div>
            ${fx.alerts.filter((a) => !a.read).slice(0, 1).map((a) => `<div class="finding warn" style="margin-top:12px"><span>${esc(a.text)}</span><button class="card-link" data-act="fx-read" data-id="${a.id}">Entendido</button></div>`).join('')}
            ` : fx.status === 'error' ? `<div class="empty">${esc(fx.error)} <button class="card-link" data-act="fx-refresh">Reintentar</button></div>` : `<div class="figure"><span class="skeleton">$18.00</span></div><div class="skeleton" style="display:block;height:150px;margin-top:12px"></div>`}
          </section>

          <section class="card" style="--o:4">
            <header><h2>Ingresos de ${monthLabel}</h2><a class="card-link" href="#/ingresos">Por país${icon('chevron')}</a></header>
            <div class="countries">
              <div class="tile mx"><div class="t-label"><span class="flag mx">MX</span>México</div><div class="figure num">${big(mxnMX, 'MXN')}</div><div class="t-sub">${plural(incMX.length, 'depósito', 'depósitos')} en BBVA</div></div>
              <div class="tile us"><div class="t-label"><span class="flag us">US</span>Estados Unidos</div><div class="figure num">${big(usdUS, 'USD')}</div><div class="t-sub">≈ ${m0(S.inBase(usdUS, 'USD'))} · ${plural(incUS.length, 'pago', 'pagos')}</div></div>
            </div>
            <div class="total-line"><span class="muted">Total del mes en ${curLabel(B())}</span><b class="num" style="font-weight:600">${m2(m.incomeTotal)}</b></div>
          </section>

          <section class="card" style="--o:5">
            <header><h2>Pagos fijos por venir</h2><span class="meta">${bills.length ? `${m0(bills.reduce((s, b) => s + b.amountBase, 0))} en total` : ''}</span></header>
            ${bills.length ? `<ul class="rows">${bills.slice(0, 4).map((b) => `<li class="row compact"><div style="min-width:0"><span class="name">${esc(b.name)}</span><span class="sub">${b.inDays === 0 ? 'Hoy' : b.inDays === 1 ? 'Mañana' : `En ${b.inDays} días, el ${S.shortDate(b.due)}`} · ${esc(S.accById(b.accountId)?.name || '')}</span></div><div class="amt" style="display:flex;align-items:center;gap:12px"><span class="num">${esc(m2(b.amount, b.currency))}</span><button class="btn small" data-act="pay-bill" data-id="${b.id}">Pagado</button></div></li>`).join('')}</ul>`
              : '<div class="empty">No quedan pagos fijos este mes.</div>'}
          </section>

          <section class="card" style="--o:7">
            <header><h2>Tu asesor</h2><span class="meta">Con tus datos de este mes</span></header>
            <ul class="advice">${advice.map((a) => `<li class="${a.level}">${esc(a.text)}</li>`).join('')}</ul>
            <h3 class="subhead">Regla 50/30/20 de tus ingresos</h3>
            <div id="rule-chart"></div>
            ${st.goals.length ? `<h3 class="subhead">Metas</h3>${st.goals.map((g) => { const p = S.goalPlan(g); return `<div class="goal"><div class="top"><span>${esc(g.name)}</span><span class="num">${esc(m0(g.saved, g.currency))} <span class="muted">de ${esc(m0(g.target, g.currency))}</span></span></div><div class="bar"><span style="width:${Math.min(100, p.pct * 100).toFixed(1)}%"></span></div><p class="small muted" style="margin-top:6px">Aparta ${esc(m0(p.perQuincena, g.currency))} por quincena durante ${plural(p.quincenas, 'quincena', 'quincenas')} para llegar al ${S.shortDate(g.due)}.</p></div>`; }).join('')}` : ''}
          </section>
        </div>
      </div>
    </div>`;
  }

  function afterInicio() {
    const A = S.advisor();
    const rows = [...A.rows].filter((r) => r.group !== 'ahorro').sort((a, b) => (b.spent / (b.planned || 1)) - (a.spent / (a.planned || 1))).slice(0, 7);
    const el = $('#plan-chart');
    if (el) C.plan(el, rows.map((r) => ({ label: r.label, planned: r.planned, spent: r.spent })), { format: (v) => m0(v) });
    const rule = $('#rule-chart');
    if (rule) C.bullet(rule, A.rule, { format: C.fmt.pct(0), max: 0.8 });

    const fx = S.state.fx;
    const chart = $('#fx-chart');
    if (chart && fx.history.length > 2) {
      const h = fx.history.slice(-90);
      const vals = h.map((p) => p.value);
      const lo = Math.min(...vals), hi = Math.max(...vals);
      const st = S.state.settings;
      const refs = [];
      if (st.alertBelow > lo - 0.6 && st.alertBelow < hi + 0.6) refs.push({ value: st.alertBelow, label: `Aviso ${st.alertBelow.toFixed(2)}` });
      if (st.alertAbove > lo - 0.6 && st.alertAbove < hi + 0.6) refs.push({ value: st.alertAbove, label: `Aviso ${st.alertAbove.toFixed(2)}` });
      const all = [...vals, ...refs.map((r) => r.value)];
      C.line(chart, { labels: h.map((p) => S.shortDate(p.date)), series: [{ name: 'Dólar en pesos', values: vals }], format: C.fmt.dec(2), height: 150, min: Math.floor(Math.min(...all) * 2) / 2, reference: refs });
    }
    // el convertidor: escribes en uno y el otro cambia al momento
    const usd = $('#cv-usd'), mxn = $('#cv-mxn');
    if (usd && mxn) {
      const r = () => S.rate();
      const num = (v) => parseFloat(String(v).replace(/[^0-9.]/g, '')) || 0;
      usd.addEventListener('input', () => { mxn.value = (num(usd.value) * r()).toFixed(2); });
      mxn.addEventListener('input', () => { usd.value = (num(mxn.value) / r()).toFixed(2); });
    }
  }

  // ======================================================================
  // CUENTAS
  // ======================================================================
  let accTab = 'todas';
  function viewCuentas() {
    const { rows, total } = S.netWorth();
    const shown = rows.filter((a) => accTab === 'todas' || (accTab === 'mx' ? a.country === 'MX' : a.country === 'US'));
    const mx = rows.filter((a) => a.country === 'MX').reduce((s, a) => s + S.toMXN(a.balance, a.currency), 0);
    const us = rows.filter((a) => a.country === 'US').reduce((s, a) => s + S.toUSD(a.balance, a.currency), 0);
    const credit = rows.filter((a) => a.type === 'credito');
    return `
    <div class="wrap">
      ${sampleNote()}
      <div class="title-row"><div><h1>Cuentas</h1><p class="sub">${plural(rows.length, 'cuenta', 'cuentas')} en México y Estados Unidos, al tipo de cambio de hoy ($${S.rate().toFixed(2)}).</p></div>
        <div class="actions"><button class="btn" data-act="add-account">${icon('plus')}Nueva cuenta</button></div></div>
      <div class="grid">
        <div class="stack s7">
          <section class="card balance-card">
            <div><h2 class="muted" style="font-size:16px;line-height:24px;font-weight:500">Lo que tienes hoy</h2><div class="figure lead" data-tween="networth" data-v="${total}" data-cur="${B()}">${big(total)}</div>
            <p class="small muted num">En México ${esc(m0(mx, 'MXN'))} · En Estados Unidos ${esc(m0(us, 'USD'))}${credit.length ? ` · Ya descuenta ${esc(m0(-credit.reduce((s, a) => s + S.inBase(a.balance, a.currency), 0)))} de tarjetas` : ''}</p></div>
            <div class="segmented" role="group" aria-label="Moneda para ver">${['MXN', 'USD'].map((c) => `<button data-act="set-base" data-cur="${c}" aria-pressed="${B() === c}">${c}</button>`).join('')}</div>
          </section>
          <div class="action-tiles" style="margin:0">
            <button class="action-tile" data-act="add-expense">${icon('minus')}Gasto</button>
            <button class="action-tile" data-act="add-income">${icon('down')}Ingreso</button>
            <button class="action-tile" data-act="paste-email">${icon('mail')}Pegar correo</button>
            <button class="action-tile" data-act="transfer">${icon('swap')}Pasar dinero</button>
          </div>
          <section class="card">
            <div class="tabs" role="tablist">${[['todas', 'Todas'], ['mx', 'México'], ['us', 'Estados Unidos']].map(([id, l]) => `<button role="tab" data-act="acc-tab" data-tab="${id}" aria-selected="${accTab === id}">${l}</button>`).join('')}</div>
            <ul class="rows">${shown.map((a) => `
              <li class="row tap" data-act="adjust" data-id="${a.id}" tabindex="0">${avatarOf(a)}
                <div style="min-width:0"><span class="name">${esc(a.name)}</span><span class="sub">${TYPE[a.type]}${a.last4 ? ` · •••• ${esc(a.last4)}` : ''} · ${a.currency}</span></div>
                <div class="amt"><span class="${a.balance < 0 ? '' : ''}" style="font-weight:500">${esc(m2(a.balance, a.currency))}</span>${a.currency !== B() ? `<span class="sub">≈ ${esc(m0(S.inBase(a.balance, a.currency)))}</span>` : `<span class="sub">${a.balance === 0 ? 'Sin saldo' : TYPE[a.type]}</span>`}</div>
              </li>`).join('')}</ul>
          </section>
        </div>
        <div class="stack s5">
          ${credit.map((a) => creditCard(a)).join('')}
          <section class="card">
            <header><h2>Por país</h2></header>
            <div class="countries">
              <div class="tile mx"><div class="t-label"><span class="flag mx">MX</span>México</div><div class="figure num">${big(mx, 'MXN')}</div><div class="t-sub">${plural(rows.filter((a) => a.country === 'MX').length, 'cuenta', 'cuentas')}</div></div>
              <div class="tile us"><div class="t-label"><span class="flag us">US</span>Estados Unidos</div><div class="figure num">${big(us, 'USD')}</div><div class="t-sub">≈ ${esc(m0(S.toMXN(us, 'USD'), 'MXN'))}</div></div>
            </div>
            <p class="small muted" style="margin-top:12px">Toca una cuenta para ajustar su saldo al que ves en la app de tu banco.</p>
          </section>
        </div>
      </div>
    </div>`;
  }
  // tarjeta de crédito: lo que hay que pagar para no generar intereses es el saldo a la fecha de corte
  function creditCard(a) {
    const now = new Date(S.today() + 'T12:00:00');
    let cut = new Date(now.getFullYear(), now.getMonth(), a.cutDay || 18);
    if (cut > now) cut = new Date(now.getFullYear(), now.getMonth() - 1, a.cutDay || 18);
    const pay = new Date(cut.getFullYear(), cut.getMonth() + 1, a.payDay || 8);
    const atCut = a.opening + S.state.tx.filter((t) => t.accountId === a.id && t.date <= S.iso(cut)).reduce((s, t) => s + t.amount, 0);
    const owe = Math.max(0, -atCut);
    const daysTo = Math.round((pay - new Date(S.today())) / 86400000);
    const used = a.limit ? Math.min(1, -a.balance / a.limit) : 0;
    return `<section class="card">
      <header><h2>${esc(a.name)}</h2><span class="meta">Corte el ${a.cutDay || 18} · pago el ${a.payDay || 8}</span></header>
      <p class="muted">Para no pagar intereses</p>
      <div class="figure">${big(owe, a.currency)}</div>
      <p class="small ${daysTo <= 5 && owe > 0 ? 'neg' : 'muted'}">${owe ? `Págalo antes del ${S.shortDate(S.iso(pay))}${daysTo >= 0 ? `, en ${plural(daysTo, 'día', 'días')}` : ''}.` : 'No debes nada del último corte.'}</p>
      ${a.limit ? `<div class="goal" style="margin-top:16px"><div class="top small"><span>Uso del límite</span><span class="num">${esc(m0(-a.balance, a.currency))} <span class="muted">de ${esc(m0(a.limit, a.currency))}</span></span></div><div class="bar"><span style="width:${(used * 100).toFixed(1)}%;${used > 0.3 ? 'background:#d97706' : ''}"></span></div><p class="small muted" style="margin-top:6px">${used > 0.3 ? `Usas el ${pct(used)}. Abajo del 30% cuida tu historial en Buró.` : `Usas el ${pct(used)}; abajo del 30% está bien.`}</p></div>` : ''}
    </section>`;
  }

  // ======================================================================
  // MOVIMIENTOS
  // ======================================================================
  const F = { month: S.monthKey(S.today()), account: '', category: '', q: '' };
  function viewMovimientos() {
    const months = [S.monthKey(S.today()), ...S.lastMonths(11)];
    const list = S.state.tx.filter((t) => (!F.month || S.monthKey(t.date) === F.month) && (!F.account || t.accountId === F.account) && (!F.category || t.category === F.category || (F.category === 'ingreso' && t.kind === 'ingreso')) && (!F.q || `${t.merchant} ${t.note}`.toLowerCase().includes(F.q.toLowerCase())))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const out = list.filter((t) => t.kind === 'gasto').reduce((s, t) => s + S.inBase(-t.amount, t.currency, t.fx), 0);
    const inc = list.filter((t) => t.kind === 'ingreso').reduce((s, t) => s + S.inBase(t.amount, t.currency, t.fx), 0);
    const shown = list.slice(0, 200);
    return `
    <div class="wrap">
      ${sampleNote()}
      <div class="title-row"><div><h1>Movimientos</h1><p class="sub num">${F.month ? S.monthName(F.month) : 'Todos'} · ${plural(list.length, 'movimiento', 'movimientos')} · gastos ${esc(m2(out))} · ingresos ${esc(m2(inc))}</p></div>
        <div class="actions"><button class="btn keep" data-act="paste-email">${icon('mail')}Pegar correos</button><button class="btn" data-act="add-income">${icon('down')}Ingreso</button><button class="btn primary keep" data-act="add-expense">${icon('plus')}Gasto</button></div></div>
      <section class="card">
        <div class="filters">
          <input class="input search" type="search" placeholder="Buscar comercio o nota" value="${esc(F.q)}" data-filter="q" aria-label="Buscar">
          <select class="input" data-filter="month" aria-label="Mes"><option value="">Todos los meses</option>${months.map((k) => `<option value="${k}" ${F.month === k ? 'selected' : ''}>${S.monthName(k)}</option>`).join('')}</select>
          <select class="input" data-filter="account" aria-label="Cuenta"><option value="">Todas las cuentas</option>${S.state.accounts.map((a) => `<option value="${a.id}" ${F.account === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
          <select class="input" data-filter="category" aria-label="Categoría"><option value="">Todas las categorías</option><option value="ingreso" ${F.category === 'ingreso' ? 'selected' : ''}>Ingresos</option>${S.CATEGORIAS.map((c) => `<option value="${c.id}" ${F.category === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select>
        </div>
        ${shown.length ? `
        <div class="table-wrap hide-phone"><table>
          <thead><tr><th>Fecha</th><th>Comercio</th><th>Cuenta</th><th>Entró por</th><th class="n">Monto</th></tr></thead>
          <tbody>${shown.map((t) => { const a = S.accById(t.accountId); return `<tr class="tap" data-act="edit-tx" data-id="${t.id}" tabindex="0"><td class="num" style="white-space:nowrap">${S.shortDate(t.date)}</td><td><div class="cell-id">${avatarOf(a)}<div style="min-width:0"><span>${esc(t.merchant || catName(t))}</span><span class="sub">${esc(catName(t))}</span></div></div></td><td>${esc(a?.name || '—')}<span class="sub">${a ? a.currency : ''}</span></td><td><span class="pill">${SRC[t.source] || 'Manual'}</span></td><td class="n num" style="white-space:nowrap">${txAmount(t)}</td></tr>`; }).join('')}</tbody>
        </table></div>
        <ul class="rows only-phone">${shown.map(txRow).join('')}</ul>
        ${list.length > shown.length ? `<p class="small muted" style="margin-top:12px">Se muestran los 200 más recientes de ${list.length}. Usa los filtros para ver otros.</p>` : ''}`
        : '<div class="empty">No hay movimientos con estos filtros.</div>'}
      </section>
    </div>`;
  }

  // ======================================================================
  // INGRESOS
  // ======================================================================
  function viewIngresos() {
    const year = new Date().getFullYear();
    const hist = S.incomeHistory(6);
    const yearTx = S.state.tx.filter((t) => t.kind === 'ingreso' && t.date.startsWith(String(year)));
    const cOf = (t) => t.country || S.accById(t.accountId)?.country || 'MX';
    const mxY = yearTx.filter((t) => cOf(t) === 'MX');
    const usY = yearTx.filter((t) => cOf(t) === 'US');
    const mxMXN = mxY.reduce((s, t) => s + S.toMXN(t.amount, t.currency, t.fx), 0);
    const usUSD = usY.reduce((s, t) => s + S.toUSD(t.amount, t.currency, t.fx), 0);
    const usMXN = usY.reduce((s, t) => s + S.toMXN(t.amount, t.currency, t.fx), 0);
    const recent = [...yearTx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    return `
    <div class="wrap">
      ${sampleNote()}
      <div class="title-row"><div><h1>Ingresos</h1><p class="sub">Lo que entra en México y en Estados Unidos en ${year}, con el tipo de cambio del día en que lo recibiste.</p></div>
        <div class="actions"><button class="btn primary keep" data-act="add-income">${icon('plus')}Agregar ingreso</button></div></div>
      <div class="grid">
        <div class="stack s7">
          <section class="card">
            <header><h2>Por mes</h2><span class="meta">Total en ${curLabel(B())}</span></header>
            <div id="inc-chart" class="chart"></div>
          </section>
          <section class="card">
            <header><h2>Detalle por mes</h2></header>
            <div class="table-wrap"><table>
              <thead><tr><th>Mes</th><th class="n">México</th><th class="n">EE.UU.</th><th class="n hide-phone">Dólar promedio</th><th class="n">Total</th></tr></thead>
              <tbody>${[...hist].reverse().map((r) => { const fxAvg = r.US.USD ? r.US.base && B() === 'MXN' ? (r.US.base / r.US.USD) : null : null; return `<tr><td>${S.monthName(r.key)}</td><td class="n num">${r.MX.MXN || r.MX.USD ? esc(m2(r.MX.MXN + S.toMXN(r.MX.USD, 'USD'), 'MXN')) : '<span class="muted">—</span>'}</td><td class="n num">${r.US.USD || r.US.MXN ? esc(m2(r.US.USD + S.toUSD(r.US.MXN, 'MXN'), 'USD')) : '<span class="muted">—</span>'}</td><td class="n num hide-phone">${fxAvg ? '$' + fxAvg.toFixed(2) : '<span class="muted">—</span>'}</td><td class="n num" style="font-weight:500">${esc(m2(r.total))}</td></tr>`; }).join('')}</tbody>
            </table></div>
          </section>
        </div>
        <div class="stack s5">
          <section class="card">
            <header><h2>En lo que va de ${year}</h2></header>
            <div class="countries">
              <div class="tile mx"><div class="t-label"><span class="flag mx">MX</span>México</div><div class="figure num">${big(mxMXN, 'MXN')}</div><div class="t-sub">${plural(mxY.length, 'ingreso', 'ingresos')} · para tu declaración del SAT</div></div>
              <div class="tile us"><div class="t-label"><span class="flag us">US</span>Estados Unidos</div><div class="figure num">${big(usUSD, 'USD')}</div><div class="t-sub">≈ ${esc(m0(usMXN, 'MXN'))} · para el IRS</div></div>
            </div>
            <p class="small muted" style="margin-top:12px">Si eres residente fiscal en un país, normalmente declaras ahí todos tus ingresos y acreditas el impuesto pagado en el otro, gracias al tratado entre México y EE.UU. Confírmalo con tu contador.</p>
          </section>
          <section class="card">
            <header><h2>Últimos ingresos</h2><a class="card-link" href="#/movimientos" data-act="filter-income">Ver todos${icon('chevron')}</a></header>
            ${recent.length ? `<ul class="rows">${recent.map((t) => { const a = S.accById(t.accountId); return `<li class="row tap" data-act="edit-tx" data-id="${t.id}" tabindex="0">${avatarOf(a)}<div style="min-width:0"><span class="name">${esc(t.merchant)}</span><span class="sub">${esc(t.incomeType || 'Ingreso')} · ${esc(S.relDate(t.date))}${t.fx ? ` · dólar a $${t.fx.toFixed(2)}` : ''}</span></div><div class="amt">${txAmount(t)}</div></li>`; }).join('')}</ul>` : '<div class="empty">Aún no registras ingresos este año.</div>'}
          </section>
        </div>
      </div>
    </div>`;
  }
  function afterIngresos() {
    const hist = S.incomeHistory(6);
    const el = $('#inc-chart');
    if (el) C.bars(el, { labels: hist.map((r) => S.MES_CORTO[Number(r.key.slice(5)) - 1]), values: hist.map((r) => r.total / 100), highlight: hist.length - 1, format: (v) => S.money(v * 100, B(), { decimals: false }), height: 220 });
  }

  // ======================================================================
  // PRESUPUESTO
  // ======================================================================
  function viewPresupuesto() {
    const A = S.advisor();
    const st = S.state;
    const plan = st.budget;
    const monthLabel = S.MESES[new Date().getMonth()];
    const totalPlan = S.CATEGORIAS.reduce((s, c) => s + (plan[c.id] || 0), 0);
    const exp = S.expectedIncome();
    return `
    <div class="wrap">
      ${sampleNote()}
      <div class="title-row"><div><h1>Presupuesto</h1><p class="sub num">Plan de ${monthLabel}: ${esc(m0(totalPlan))} de un ingreso esperado de ${esc(m0(exp))}${totalPlan > exp ? ` · <span class="neg">${esc(m0(totalPlan - exp))} más de lo que entra</span>` : ` · sin asignar ${esc(m0(exp - totalPlan))}`}</p></div>
        <div class="actions"><button class="btn keep" data-act="suggest">Sugerir con 50/30/20</button></div></div>
      <div class="grid">
        <div class="stack s7">
          <section class="card">
            <header><h2>Categorías</h2><span class="meta">Escribe tu plan; se guarda solo</span></header>
            <div class="table-wrap"><table>
              <thead><tr><th>Categoría</th><th class="n">Gastado</th><th class="n">Plan del mes</th><th class="n hide-phone">Al cierre, a este ritmo</th></tr></thead>
              <tbody>${S.CATEGORIAS.map((c) => { const spent = S.month().byCat[c.id] || 0; const p = plan[c.id] || 0; const r = A.rows.find((x) => x.id === c.id); const pace = r ? r.pace : 0; const over = p && spent > p; return `<tr><td>${esc(c.name)}<span class="sub">${GROUP[c.group]}</span></td><td class="n num ${over ? 'neg' : ''}">${spent ? esc(m0(spent)) : '<span class="muted">$0</span>'}</td><td class="n"><div class="money-input" style="width:130px;margin-left:auto"><input class="input" style="height:36px" inputmode="numeric" data-budget="${c.id}" value="${(p / 100).toFixed(0)}" aria-label="Plan para ${esc(c.name)}"><b>${B()}</b></div></td><td class="n num hide-phone ${p && pace > p && c.group !== 'ahorro' ? 'neg' : 'muted'}">${c.group === 'ahorro' ? '—' : pace ? esc(m0(pace)) : '$0'}</td></tr>`; }).join('')}</tbody>
            </table></div>
          </section>
        </div>
        <div class="stack s5">
          <section class="card">
            <header><h2>Regla 50/30/20</h2><span class="meta">De ${esc(m0(A.income))} de ingreso</span></header>
            <div id="rule-chart"></div>
            <p class="small muted" style="margin-top:16px">50% para necesidades (renta, súper, transporte, servicios), 30% para gustos y 20% para ahorro. La línea negra es la meta; la barra es lo que llevas este mes.</p>
          </section>
          <section class="card">
            <header><h2>Fondo de emergencia</h2></header>
            <div class="figure">${A.emergency.toFixed(1)} <small>meses</small></div>
            <p class="small muted">Tus cuentas de ahorro (${esc(m0(A.savingsBal))}) cubren ese tiempo de gastos, con tu promedio de ${esc(m0(A.avgSpend))} al mes. Lo recomendable es tener de 3 a 6 meses.</p>
          </section>
          <section class="card">
            <header><h2>Metas</h2><button class="card-link" data-act="add-goal">Nueva meta${icon('chevron')}</button></header>
            ${st.goals.length ? st.goals.map((g) => { const p = S.goalPlan(g); return `<div class="goal"><div class="top"><span>${esc(g.name)}</span><span class="num">${esc(m0(g.saved, g.currency))} <span class="muted">de ${esc(m0(g.target, g.currency))}</span></span></div><div class="bar"><span style="width:${Math.min(100, p.pct * 100).toFixed(1)}%"></span></div><div class="top small muted" style="margin-top:6px"><span>${esc(m0(p.perQuincena, g.currency))} por quincena hasta el ${S.shortDate(g.due)}</span><button class="card-link" data-act="edit-goal" data-id="${g.id}">Abonar</button></div></div>`; }).join('') : '<div class="empty">Ponle nombre y fecha a algo que quieras juntar, y te digo cuánto apartar cada quincena.</div>'}
          </section>
        </div>
      </div>
    </div>`;
  }
  function afterPresupuesto() {
    const A = S.advisor();
    const rule = $('#rule-chart');
    if (rule) C.bullet(rule, A.rule, { format: C.fmt.pct(0), max: 0.8 });
  }

  // ======================================================================
  // AJUSTES
  // ======================================================================
  function viewAjustes() {
    const st = S.state.settings;
    const notifState = !('Notification' in window) ? 'Este navegador no permite avisos.' : Notification.permission === 'denied' ? 'Bloqueaste los avisos para esta página; actívalos en la configuración del navegador.' : '';
    return `
    <div class="wrap settings">
      <div class="title-row"><div><h1>Ajustes</h1><p class="sub">Todo se guarda solo en este dispositivo.</p></div></div>

      <div class="set-row"><div><h2>Moneda para ver todo</h2><p>Los totales, el presupuesto y el asesor se calculan en esta moneda. Cada cuenta conserva la suya.</p></div>
        <div class="set-panel"><div class="segmented" role="group" aria-label="Moneda base">${['MXN', 'USD'].map((c) => `<button data-act="set-base" data-cur="${c}" aria-pressed="${st.base === c}">${c === 'MXN' ? 'Pesos (MXN)' : 'Dólares (USD)'}</button>`).join('')}</div></div></div>

      <div class="set-row"><div><h2>Avisos del dólar</h2><p>Revisamos el tipo de cambio al abrir la app y cada 10 minutos mientras está abierta. Hoy está en $${S.rate().toFixed(2)}.</p></div>
        <div class="set-panel">
          <div class="form-grid">
            <div class="field"><label for="al-below">Avisarme si baja de</label><div class="money-input"><input class="input" id="al-below" inputmode="decimal" data-setting="alertBelow" value="${st.alertBelow.toFixed(2)}"><b>MXN</b></div></div>
            <div class="field"><label for="al-above">Avisarme si sube de</label><div class="money-input"><input class="input" id="al-above" inputmode="decimal" data-setting="alertAbove" value="${st.alertAbove.toFixed(2)}"><b>MXN</b></div></div>
            <div class="field full"><label for="al-move">Avisarme si se mueve en un día más de</label><div class="money-input" style="max-width:200px"><input class="input" id="al-move" inputmode="decimal" data-setting="alertMove" value="${st.alertMove}"><b>%</b></div></div>
          </div>
          <div class="switch-row"><div><div class="t">Notificaciones en el dispositivo <span class="pill ${st.notify ? 'pos' : ''}">${st.notify ? 'Activadas' : 'Apagadas'}</span></div><div class="d">${notifState || 'Te llega un aviso aunque estés en otra pestaña. En iPhone funciona con la app instalada en la pantalla de inicio.'}</div></div><input type="checkbox" class="switch" data-act="toggle-notify" ${st.notify ? 'checked' : ''} aria-label="Notificaciones"></div>
          <div><button class="btn small" data-act="test-notify">Probar un aviso</button></div>
        </div></div>

      <div class="set-row"><div><h2>Ingreso que esperas al mes</h2><p>El asesor reparte tu presupuesto con esta cifra. Déjala en cero y usará el promedio de tus últimos 3 meses (${esc(m0(S.expectedIncome()))}).</p></div>
        <div class="set-panel"><div class="form-grid">
          <div class="field"><label for="exp-inc">Monto</label><div class="money-input"><input class="input" id="exp-inc" inputmode="numeric" data-setting="expectedIncome" value="${(st.expectedIncome / 100).toFixed(0)}"><b>${st.expectedIncomeCur}</b></div></div>
          <div class="field"><label for="exp-cur">Moneda</label><select class="input" id="exp-cur" data-setting="expectedIncomeCur"><option ${st.expectedIncomeCur === 'MXN' ? 'selected' : ''}>MXN</option><option ${st.expectedIncomeCur === 'USD' ? 'selected' : ''}>USD</option></select></div>
        </div></div></div>

      <div class="set-row"><div><h2>Pagos fijos</h2><p>Renta, suscripciones, seguros. El asesor los aparta de lo que puedes gastar antes de que lleguen.</p></div>
        <div class="set-panel">
          ${S.state.bills.length ? `<ul class="rows">${S.state.bills.map((b) => `<li class="row compact"><div style="min-width:0"><span class="name">${esc(b.name)}</span><span class="sub">Cada día ${b.day} · ${esc(S.accById(b.accountId)?.name || '')}</span></div><div class="amt" style="display:flex;gap:12px;align-items:center"><span class="num">${esc(m2(b.amount, b.currency))}</span><button class="icon-btn" data-act="del-bill" data-id="${b.id}" aria-label="Quitar ${esc(b.name)}">${icon('x')}</button></div></li>`).join('')}</ul>` : '<div class="empty">Sin pagos fijos.</div>'}
          <div><button class="btn small" data-act="add-bill">${icon('plus')}Agregar pago fijo</button></div>
        </div></div>

      <div class="set-row"><div><h2>Correos de tu banco</h2><p>BBVA y Wells Fargo te mandan un correo por cada compra. Cópialo de Gmail y pégalo aquí; la app saca el monto, el comercio, la fecha y la tarjeta.</p></div>
        <div class="set-panel">
          <ol class="steps"><li>En la app de BBVA: Menú → Configuración → Notificaciones → activa "Compras con tarjeta" por correo.</li><li>En Wells Fargo: Menu → Alerts → Account Alerts → activa "Purchases" por email.</li><li>En Gmail, abre el aviso, selecciona todo el texto y cópialo. Puedes pegar varios a la vez.</li></ol>
          <div><button class="btn small" data-act="paste-email">${icon('mail')}Pegar correos</button></div>
          <p class="small muted">Siguiente paso: conectar Gmail para que los avisos entren solos, sin copiar y pegar.</p>
        </div></div>

      <div class="set-row"><div><h2>Instalar en tu iPhone</h2><p>Se instala como app y funciona sin conexión. Tus datos de la computadora y del iPhone se pasan con un respaldo.</p></div>
        <div class="set-panel"><ol class="steps"><li>Abre la dirección de la app en Safari.</li><li>Toca Compartir y luego "Agregar a pantalla de inicio".</li><li>Para pasar tus datos: en la computadora toca "Descargar respaldo", mándate el archivo (AirDrop o correo) y en el iPhone toca "Cargar respaldo".</li></ol></div></div>

      <div class="set-row"><div><h2>Tus datos</h2><p>Guarda un respaldo de vez en cuando. Si borras los datos del navegador sin respaldo, se pierden.</p></div>
        <div class="set-panel">
          <div class="actions"><button class="btn small" data-act="export">Descargar respaldo</button><label class="btn small" style="cursor:pointer">Cargar respaldo<input type="file" accept="application/json,.json" data-act="import" class="sr"></label></div>
          ${S.state.sample ? `<div class="switch-row"><div><div class="t">Datos de ejemplo</div><div class="d">Bórralos y quedan tus cuentas de BBVA y Wells Fargo en cero, listas para tus saldos reales.</div></div><button class="btn small danger" data-act="start-real">Empezar con mis datos</button></div>` : ''}
        </div></div>
    </div>`;
  }

  // ======================================================================
  // DIÁLOGOS
  // ======================================================================
  const dlg = () => $('#dialog');
  function openDialog(html, onSubmit) {
    const d = dlg();
    d.innerHTML = '<div class="grab" aria-hidden="true"><span></span></div>' + html;
    window.Motion.openDialog(d);
    const form = $('form', d);
    if (form && onSubmit) form.addEventListener('submit', (e) => { e.preventDefault(); if (e.submitter?.value === 'cancel') return window.Motion.closeDialog(d); const ok = onSubmit(new FormData(form), e.submitter?.value); if (ok !== false) window.Motion.closeDialog(d); });
    $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => window.Motion.closeDialog(d)));
    setTimeout(() => $('[autofocus]', d)?.focus(), 30);
  }
  const head = (title, sub = '') => `<div class="dlg-head"><div><h2 id="dialog-title">${title}</h2>${sub ? `<p class="small muted">${sub}</p>` : ''}</div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${icon('x')}</button></div>`;
  const accOptions = (sel, filter = () => true) => S.state.accounts.filter(filter).map((a) => `<option value="${a.id}" ${a.id === sel ? 'selected' : ''}>${esc(a.name)} · ${a.currency}</option>`).join('');
  const catOptions = (sel) => S.CATEGORIAS.map((c) => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${c.name}</option>`).join('');

  function txDialog(kind, tx = null) {
    const isInc = kind === 'ingreso';
    const defAcc = tx?.accountId || (isInc ? 'wf-checking' : 'bbva-debito');
    const acc0 = S.accById(defAcc) || S.state.accounts[0];
    openDialog(`<form>${head(tx ? 'Editar movimiento' : isInc ? 'Agregar ingreso' : 'Agregar gasto', tx ? `Entró por: ${SRC[tx.source] || 'Manual'}` : '')}
      <div class="form-grid">
        <div class="field"><label for="f-amt">Monto</label><div class="money-input"><input class="input" id="f-amt" name="amount" inputmode="decimal" required autofocus value="${tx ? (Math.abs(tx.amount) / 100).toFixed(2) : ''}" placeholder="0.00"><b id="f-cur">${acc0.currency}</b></div></div>
        <div class="field"><label for="f-acc">Cuenta</label><select class="input" id="f-acc" name="accountId">${accOptions(acc0.id)}</select></div>
        <div class="field full"><label for="f-mer">${isInc ? 'De dónde viene' : 'Comercio o descripción'}</label><input class="input" id="f-mer" name="merchant" value="${esc(tx?.merchant || '')}" placeholder="${isInc ? 'Nómina, renta, freelance…' : 'OXXO, H-E-B, Uber…'}" autocomplete="off"></div>
        ${isInc ? `<div class="field"><label for="f-type">Tipo</label><select class="input" id="f-type" name="incomeType">${['Sueldo', 'Freelance', 'Renta', 'Negocio', 'Intereses', 'Regalo', 'Otro'].map((t) => `<option ${tx?.incomeType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label for="f-country">País del ingreso</label><select class="input" id="f-country" name="country"><option value="MX" ${(tx?.country || acc0.country) === 'MX' ? 'selected' : ''}>México</option><option value="US" ${(tx?.country || acc0.country) === 'US' ? 'selected' : ''}>Estados Unidos</option></select></div>`
        : `<div class="field"><label for="f-cat">Categoría</label><select class="input" id="f-cat" name="category">${catOptions(tx?.category || 'otros')}</select><span class="hint" id="f-guess">${tx ? '' : 'Se elige sola según el comercio.'}</span></div>`}
        <div class="field"><label for="f-date">Fecha</label><input class="input" id="f-date" type="date" name="date" value="${tx?.date || S.today()}" max="${S.today()}"></div>
        <div class="field full"><label for="f-note">Nota</label><input class="input" id="f-note" name="note" value="${esc(tx?.note || '')}" placeholder="Opcional"></div>
      </div>
      <div class="dlg-foot">${tx ? '<button class="btn danger left" value="delete">Borrar</button>' : ''}<button class="btn" value="cancel" formnovalidate>Cancelar</button><button class="btn primary" value="save">${tx ? 'Guardar' : 'Agregar'}</button></div>
    </form>`, (fd, action) => {
      if (action === 'delete') { if (!confirm(`¿Borrar "${tx.merchant || catName(tx)}" por ${S.money(tx.amount, tx.currency)}?`)) return false; S.removeTx(tx.id); toast('Movimiento borrado'); return; }
      const cents = S.toCents(fd.get('amount'));
      if (!cents || cents < 0) { toast('Escribe un monto válido'); return false; }
      const data = { amount: isInc ? cents : -cents, accountId: fd.get('accountId'), merchant: fd.get('merchant').trim(), date: fd.get('date') || S.today(), note: fd.get('note').trim(), kind, category: isInc ? 'ingreso' : fd.get('category'), incomeType: fd.get('incomeType') || undefined, country: fd.get('country') || undefined };
      if (tx) {
        const acc = S.accById(data.accountId);
        Object.assign(tx, data, { currency: acc.currency, country: data.country || acc.country });
        if (acc.currency === 'USD' && !tx.fx) tx.fx = S.rate();
        S.save(); toast('Guardado');
      } else {
        const t = S.addTx(data);
        if (isInc) Object.assign(t, { incomeType: data.incomeType }), S.save();
        toast(isInc ? 'Ingreso agregado' : 'Gasto agregado');
      }
    });
    const accSel = $('#f-acc'), cur = $('#f-cur'), mer = $('#f-mer'), cat = $('#f-cat'), guess = $('#f-guess');
    accSel.addEventListener('change', () => { const a = S.accById(accSel.value); cur.textContent = a.currency; const c = $('#f-country'); if (c) c.value = a.country; });
    if (cat && !tx) mer.addEventListener('input', () => { const g = S.guessCategory(mer.value); cat.value = g; guess.textContent = g === 'otros' ? 'Se elige sola según el comercio.' : `Elegida por el comercio: ${S.catById(g).name}.`; });
  }

  function transferDialog() {
    openDialog(`<form>${head('Pasar dinero', 'Entre tus cuentas, o de dólares a pesos.')}
      <div class="form-grid">
        <div class="field"><label for="t-from">De</label><select class="input" id="t-from" name="from">${accOptions('wf-checking')}</select></div>
        <div class="field"><label for="t-to">A</label><select class="input" id="t-to" name="to">${accOptions('bbva-debito')}</select></div>
        <div class="field"><label for="t-amt">Monto que sale</label><div class="money-input"><input class="input" id="t-amt" name="amount" inputmode="decimal" required autofocus placeholder="0.00"><b id="t-cur">USD</b></div></div>
        <div class="field"><label for="t-fx">Tipo de cambio que te dieron</label><div class="money-input"><input class="input" id="t-fx" name="fx" inputmode="decimal" value="${S.rate().toFixed(4)}"><b>MXN</b></div><span class="hint" id="t-recv"></span></div>
        <div class="field"><label for="t-date">Fecha</label><input class="input" id="t-date" type="date" name="date" value="${S.today()}" max="${S.today()}"></div>
      </div>
      <div class="dlg-foot"><button class="btn" value="cancel" formnovalidate>Cancelar</button><button class="btn primary" value="save">Pasar</button></div></form>`, (fd) => {
      const amount = S.toCents(fd.get('amount'));
      if (!amount || fd.get('from') === fd.get('to')) { toast('Revisa el monto y las cuentas'); return false; }
      S.transfer({ from: fd.get('from'), to: fd.get('to'), amount, date: fd.get('date'), fx: parseFloat(fd.get('fx')) || S.rate() });
      toast('Listo, dinero movido');
    });
    const upd = () => {
      const a = S.accById($('#t-from').value), b = S.accById($('#t-to').value), amt = S.toCents($('#t-amt').value || 0) || 0, r = parseFloat($('#t-fx').value) || S.rate();
      $('#t-cur').textContent = a.currency;
      const rec = a.currency === b.currency ? amt : a.currency === 'USD' ? Math.round(amt * r) : Math.round(amt / r);
      $('#t-recv').textContent = a.currency === b.currency ? 'Misma moneda, sin cambio.' : `Recibes ${S.money(rec, b.currency)} en ${b.name}.`;
    };
    ['#t-from', '#t-to', '#t-amt', '#t-fx'].forEach((s) => $(s).addEventListener('input', upd)); upd();
  }

  function emailDialog() {
    openDialog(`<div class="dlg">${head('Pegar correos del banco', 'Copia el aviso de compra de BBVA o Wells Fargo desde Gmail y pégalo aquí. Puedes pegar varios.')}
      <div class="field"><label for="e-text">Texto del correo</label><textarea class="input" id="e-text" placeholder="Pega aquí el correo completo…" autofocus></textarea><span class="hint">Nada sale de tu dispositivo: la lectura se hace aquí mismo.</span></div>
      <div class="actions"><button class="btn small" id="e-read">Leer correos</button><button class="btn small ghost" id="e-sample">Probar con un ejemplo</button></div>
      <div id="e-found"></div>
      <div class="dlg-foot"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="e-add" disabled>Agregar movimientos</button></div></div>`);
    let found = [];
    const draw = () => {
      const box = $('#e-found');
      if (!found.length) { box.innerHTML = '<div class="empty">No encontré ningún monto. Revisa que el texto tenga la cantidad con signo $.</div>'; $('#e-add').disabled = true; return; }
      box.innerHTML = `<p class="small muted" style="margin-bottom:8px">Encontré ${plural(found.length, 'movimiento', 'movimientos')}. Revisa la categoría y la cuenta antes de agregar.</p><div class="found">${found.map((f, i) => `
        <div class="found-row ${f.duplicate ? 'dup' : ''}"><input type="checkbox" data-i="${i}" ${f.duplicate ? '' : 'checked'} aria-label="Incluir">
          <div style="min-width:0"><div class="name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.merchant || 'Sin comercio')}</div><div class="small muted">${S.shortDate(f.date)} · ${esc(f.bank || 'Banco')}${f.last4 ? ` •••• ${esc(f.last4)}` : ''}${f.duplicate ? ' · ya registrado' : ''}</div></div>
          <select class="input" data-i="${i}" data-k="category" aria-label="Categoría">${f.kind === 'ingreso' ? '<option value="ingreso">Ingreso</option>' : catOptions(f.category)}</select>
          <div class="amt num ${f.amount > 0 ? 'pos' : ''}" style="text-align:right">${esc(S.money(f.amount, f.currency, { sign: f.amount > 0 }))}<div class="small muted">${esc(S.accById(f.accountId)?.name || '')}</div></div>
        </div>`).join('')}</div>`;
      $('#e-add').disabled = !found.some((f) => !f.duplicate);
      $$('select[data-k]', box).forEach((s) => s.addEventListener('change', () => { found[s.dataset.i].category = s.value; }));
      $$('input[type=checkbox]', box).forEach((c) => c.addEventListener('change', () => { found[c.dataset.i].skip = !c.checked; $('#e-add').disabled = found.every((f) => f.skip || (f.duplicate && !c.checked)); }));
    };
    const read = () => { found = window.Correo.parse($('#e-text').value); found.forEach((f) => { f.skip = f.duplicate; }); draw(); };
    $('#e-read').addEventListener('click', read);
    $('#e-sample').addEventListener('click', () => { $('#e-text').value = window.Correo.EJEMPLO; read(); });
    $('#e-add').addEventListener('click', () => {
      const add = found.filter((f) => !f.skip);
      for (const f of add) S.addTx({ amount: f.amount, accountId: f.accountId, merchant: f.merchant, date: f.date, category: f.category, kind: f.kind, source: 'correo', emailId: f.key });
      window.Motion.closeDialog(dlg());
      toast(`${plural(add.length, 'movimiento agregado', 'movimientos agregados')} desde tus correos`);
    });
  }

  function adjustDialog(acc) {
    const bal = S.balance(acc);
    openDialog(`<form>${head(esc(acc.name), `${TYPE[acc.type]} · ${acc.currency}`)}
      <div class="form-grid">
        <div class="field full"><label for="a-bal">Saldo de hoy</label><div class="money-input"><input class="input" id="a-bal" name="balance" inputmode="decimal" autofocus value="${(bal / 100).toFixed(2)}"><b>${acc.currency}</b></div><span class="hint">Pon el saldo que ves en la app de tu banco${acc.type === 'credito' ? ' (lo que debes, en negativo: −6329.40)' : ''}. Se ajusta sin tocar tus movimientos.</span></div>
        <div class="field"><label for="a-name">Nombre</label><input class="input" id="a-name" name="name" value="${esc(acc.name)}"></div>
        <div class="field"><label for="a-l4">Últimos 4 de la tarjeta</label><input class="input" id="a-l4" name="last4" inputmode="numeric" maxlength="4" value="${esc(acc.last4 || '')}" placeholder="Para reconocer los correos"></div>
      </div>
      <div class="dlg-foot">${S.state.tx.some((t) => t.accountId === acc.id) ? '' : '<button class="btn danger left" value="delete">Quitar cuenta</button>'}<button class="btn" value="cancel" formnovalidate>Cancelar</button><button class="btn primary" value="save">Guardar</button></div></form>`, (fd, action) => {
      if (action === 'delete') { S.state.accounts = S.state.accounts.filter((a) => a.id !== acc.id); S.save(); toast('Cuenta quitada'); return; }
      const nb = Math.round(parseFloat(String(fd.get('balance')).replace(/[^0-9.\-−]/g, '').replace('−', '-')) * 100);
      if (Number.isFinite(nb)) acc.opening += nb - bal;
      acc.name = fd.get('name').trim() || acc.name;
      acc.last4 = String(fd.get('last4')).replace(/\D/g, '').slice(0, 4);
      S.save(); toast('Saldo actualizado');
    });
  }

  function accountDialog() {
    openDialog(`<form>${head('Nueva cuenta')}
      <div class="form-grid">
        <div class="field full"><label for="n-name">Nombre</label><input class="input" id="n-name" name="name" required autofocus placeholder="Nu, Banorte, Chase…"></div>
        <div class="field"><label for="n-bank">Banco</label><input class="input" id="n-bank" name="bank" placeholder="BBVA, Wells Fargo…"></div>
        <div class="field"><label for="n-type">Tipo</label><select class="input" id="n-type" name="type">${Object.entries(TYPE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
        <div class="field"><label for="n-country">País</label><select class="input" id="n-country" name="country"><option value="MX">México</option><option value="US">Estados Unidos</option></select></div>
        <div class="field"><label for="n-cur">Moneda</label><select class="input" id="n-cur" name="currency"><option>MXN</option><option>USD</option></select></div>
        <div class="field full"><label for="n-bal">Saldo de hoy</label><input class="input" id="n-bal" name="balance" inputmode="decimal" placeholder="0.00"></div>
      </div>
      <div class="dlg-foot"><button class="btn" value="cancel" formnovalidate>Cancelar</button><button class="btn primary" value="save">Agregar cuenta</button></div></form>`, (fd) => {
      S.state.accounts.push({ id: S.uid(), name: fd.get('name').trim(), bank: fd.get('bank').trim() || fd.get('name').trim(), type: fd.get('type'), country: fd.get('country'), currency: fd.get('currency'), opening: S.toCents(fd.get('balance') || 0) || 0, last4: '' });
      S.save(); toast('Cuenta agregada');
    });
    $('#n-country').addEventListener('change', (e) => { $('#n-cur').value = e.target.value === 'US' ? 'USD' : 'MXN'; });
  }

  function goalDialog(g = null) {
    openDialog(`<form>${head(g ? esc(g.name) : 'Nueva meta', g ? 'Registra lo que ya apartaste.' : 'Te digo cuánto apartar cada quincena.')}
      <div class="form-grid">
        ${g ? '' : '<div class="field full"><label for="g-name">Para qué</label><input class="input" id="g-name" name="name" required autofocus placeholder="Viaje, enganche, computadora…"></div>'}
        <div class="field"><label for="g-target">Cuánto necesitas</label><input class="input" id="g-target" name="target" inputmode="decimal" required value="${g ? (g.target / 100).toFixed(0) : ''}"></div>
        <div class="field"><label for="g-cur">Moneda</label><select class="input" id="g-cur" name="currency"><option ${g?.currency === 'MXN' ? 'selected' : ''}>MXN</option><option ${g?.currency === 'USD' ? 'selected' : ''}>USD</option></select></div>
        <div class="field"><label for="g-saved">Ya tienes</label><input class="input" id="g-saved" name="saved" inputmode="decimal" ${g ? 'autofocus' : ''} value="${g ? (g.saved / 100).toFixed(0) : '0'}"></div>
        <div class="field"><label for="g-due">Para cuándo</label><input class="input" id="g-due" type="date" name="due" required value="${g?.due || ''}" min="${S.today()}"></div>
      </div>
      <div class="dlg-foot">${g ? '<button class="btn danger left" value="delete">Borrar meta</button>' : ''}<button class="btn" value="cancel" formnovalidate>Cancelar</button><button class="btn primary" value="save">Guardar</button></div></form>`, (fd, action) => {
      if (action === 'delete') { S.state.goals = S.state.goals.filter((x) => x.id !== g.id); S.save(); return; }
      const data = { target: S.toCents(fd.get('target')), saved: S.toCents(fd.get('saved') || 0) || 0, currency: fd.get('currency'), due: fd.get('due') };
      if (g) Object.assign(g, data); else S.state.goals.push({ id: S.uid(), name: fd.get('name').trim(), ...data });
      S.save(); toast('Meta guardada');
    });
  }

  function billDialog() {
    openDialog(`<form>${head('Agregar pago fijo')}
      <div class="form-grid">
        <div class="field full"><label for="b-name">Nombre</label><input class="input" id="b-name" name="name" required autofocus placeholder="Renta, Netflix, seguro…"></div>
        <div class="field"><label for="b-amt">Monto</label><input class="input" id="b-amt" name="amount" inputmode="decimal" required></div>
        <div class="field"><label for="b-day">Día del mes</label><input class="input" id="b-day" name="day" type="number" min="1" max="31" required value="1"></div>
        <div class="field"><label for="b-acc">Cuenta</label><select class="input" id="b-acc" name="accountId">${accOptions()}</select></div>
        <div class="field"><label for="b-cat">Categoría</label><select class="input" id="b-cat" name="category">${catOptions('vivienda')}</select></div>
      </div>
      <div class="dlg-foot"><button class="btn" value="cancel" formnovalidate>Cancelar</button><button class="btn primary" value="save">Agregar</button></div></form>`, (fd) => {
      const acc = S.accById(fd.get('accountId'));
      S.state.bills.push({ id: S.uid(), name: fd.get('name').trim(), amount: S.toCents(fd.get('amount')), currency: acc.currency, accountId: acc.id, day: Number(fd.get('day')), category: fd.get('category') });
      S.save(); toast('Pago fijo agregado');
    });
  }

  // ======================================================================
  // ACCIONES
  // ======================================================================
  const ACT = {
    'add-expense': () => txDialog('gasto'),
    'add-income': () => txDialog('ingreso'),
    'paste-email': () => emailDialog(),
    transfer: () => transferDialog(),
    'add-account': () => accountDialog(),
    adjust: (el) => adjustDialog(S.accById(el.dataset.id)),
    'edit-tx': (el) => { const t = S.state.tx.find((x) => x.id === el.dataset.id); if (t && t.kind !== 'transferencia') txDialog(t.kind, t); else if (t) toast('Las transferencias se borran desde Movimientos'); },
    'acc-tab': (el) => { accTab = el.dataset.tab; render(); },
    'set-base': (el) => { S.state.settings.base = el.dataset.cur; S.save(); },
    'fx-refresh': async () => { toast('Consultando el tipo de cambio…'); await window.FX.refresh(); },
    'fx-read': (el) => { const a = S.state.fx.alerts.find((x) => x.id === el.dataset.id); if (a) a.read = true; S.save(); },
    'pay-bill': (el) => { const b = S.state.bills.find((x) => x.id === el.dataset.id); S.addTx({ amount: -b.amount, accountId: b.accountId, merchant: b.name, category: b.category, billId: b.id }); toast(`${b.name} marcado como pagado`); },
    'del-bill': (el) => { S.state.bills = S.state.bills.filter((b) => b.id !== el.dataset.id); S.save(); },
    'add-bill': () => billDialog(),
    'add-goal': () => goalDialog(),
    'edit-goal': (el) => goalDialog(S.state.goals.find((g) => g.id === el.dataset.id)),
    suggest: () => { if (!confirm('¿Reemplazar tu plan con uno sugerido por la regla 50/30/20, según lo que ganas y en qué gastas?')) return; S.state.budget = S.suggestBudget(); S.save(); toast('Plan sugerido listo; ajústalo a tu gusto'); },
    'filter-income': () => { F.category = 'ingreso'; F.month = ''; },
    'start-real': () => { if (!confirm('Se borrarán todos los datos de ejemplo. Tus cuentas de BBVA y Wells Fargo quedarán en cero para que pongas tus saldos. ¿Continuar?')) return; S.resetEmpty(); location.hash = '#/cuentas'; toast('Listo. Toca cada cuenta para poner su saldo.'); },
    'toggle-notify': async (el) => {
      if (el.checked && 'Notification' in window && Notification.permission !== 'granted') {
        const p = await Notification.requestPermission();
        if (p !== 'granted') { el.checked = false; toast('No diste permiso para avisos'); }
      }
      S.state.settings.notify = el.checked; S.save();
    },
    'test-notify': async () => {
      if (!('Notification' in window)) return toast('Este navegador no permite avisos');
      if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return toast('No diste permiso para avisos');
      const reg = await navigator.serviceWorker?.getRegistration();
      const body = `El dólar está en $${S.rate().toFixed(2)}. Así se verán tus avisos.`;
      if (reg) reg.showNotification('Mis Finanzas · Tipo de cambio', { body, icon: 'icons/icon-192.png' }); else new Notification('Mis Finanzas · Tipo de cambio', { body });
    },
    export: () => {
      const blob = new Blob([S.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mis-finanzas-${S.today()}.json`; a.click(); URL.revokeObjectURL(a.href);
    },
    noop: () => {},
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.tagName === 'INPUT') return;
    const fn = ACT[el.dataset.act];
    if (fn) { if (el.tagName === 'BUTTON' || el.tagName === 'LI' || el.tagName === 'TR') e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = e.target.closest('li[data-act], tr[data-act]');
    if (el && el === e.target) { e.preventDefault(); ACT[el.dataset.act]?.(el); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.act === 'toggle-notify') return ACT['toggle-notify'](el);
    if (el.dataset.act === 'import' && el.files[0]) {
      el.files[0].text().then((t) => { try { S.importJSON(t); toast('Respaldo cargado'); } catch (err) { toast(err.message); } });
      return;
    }
    if (el.dataset.filter) { F[el.dataset.filter] = el.value; render(); return; }
    if (el.dataset.budget) { S.state.budget[el.dataset.budget] = Math.max(0, S.toCents(el.value || 0) || 0); S.save(); return; }
    if (el.dataset.setting) {
      const k = el.dataset.setting;
      const v = k === 'expectedIncomeCur' ? el.value : k === 'expectedIncome' ? Math.max(0, S.toCents(el.value || 0) || 0) : parseFloat(el.value) || 0;
      S.state.settings[k] = v; S.save(); toast('Guardado');
    }
  });
  document.addEventListener('input', (e) => {
    if (e.target.dataset.filter === 'q') { F.q = e.target.value; clearTimeout(render.q); render.q = setTimeout(() => { render(); const s = $('[data-filter="q"]'); s?.focus(); s?.setSelectionRange(s.value.length, s.value.length); }, 250); }
  });

  // ======================================================================
  // RENDER
  // ======================================================================
  const VIEWS = { inicio: [viewInicio, afterInicio], cuentas: [viewCuentas], movimientos: [viewMovimientos], ingresos: [viewIngresos, afterIngresos], presupuesto: [viewPresupuesto, afterPresupuesto], ajustes: [viewAjustes] };
  let lastRoute = null;
  function render() {
    const r = VIEWS[route()] ? route() : 'inicio';
    renderNav();
    const [v, after] = VIEWS[r];
    const main = $('#view');
    const y = r === lastRoute ? window.scrollY : 0;
    const same = r === lastRoute;
    // lo que había antes, para saber qué llegó nuevo y qué cifra cambió
    const seen = new Set($$('[data-id]', main).map((el) => el.dataset.id));
    const before = Object.fromEntries($$('[data-tween]', main).map((el) => [el.dataset.tween + el.dataset.cur, Number(el.dataset.v)]));
    main.innerHTML = v();
    after?.();
    if (!same) window.Motion.screen(main);
    else {
      window.Motion.arrive($$('li[data-id], tr[data-id]', main).filter((el) => !seen.has(el.dataset.id)));
      for (const el of $$('[data-tween]', main)) { const k = el.dataset.tween + el.dataset.cur; if (k in before && before[k] !== Number(el.dataset.v)) window.Motion.tween(el, before[k], Number(el.dataset.v), (c) => big(c, el.dataset.cur)); }
    }
    if (r !== lastRoute) { window.scrollTo(0, 0); document.title = `${ROUTES.find((x) => x[0] === r)[1]} · Mis Finanzas`; } else window.scrollTo(0, y);
    lastRoute = r;
  }
  // no repintar mientras escribes en un campo de la pantalla; se repinta al salir de él
  let pending = false;
  S.onChange(() => {
    const a = document.activeElement;
    if (dlg().open || (a && a.closest('#view') && /INPUT|SELECT|TEXTAREA/.test(a.tagName) && a.type !== 'checkbox')) { pending = true; return; }
    render();
  });
  document.addEventListener('focusout', () => setTimeout(() => { const a = document.activeElement; if (pending && !dlg().open && !(a && a.closest('#view') && /INPUT|SELECT|TEXTAREA/.test(a.tagName))) { pending = false; render(); } }, 0));
  dlg().addEventListener('cancel', (e) => { e.preventDefault(); window.Motion.closeDialog(dlg()); });
  dlg().addEventListener('close', () => { if (pending) { pending = false; render(); } });

  window.addEventListener('hashchange', render);
  render();
  window.FX.start();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
