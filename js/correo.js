// Lee los correos de aviso de compra de BBVA y Wells Fargo (o de cualquier banco) y saca el monto, el comercio,
// la fecha y la tarjeta. Funciona con el texto que copias del correo; nada sale de tu dispositivo.
(() => {
  const S = () => window.Store;
  const MESES_ES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
  const MONTHS_EN = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12, jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

  function split(text) {
    const parts = text.split(/\n\s*(?:-{3,}|={3,}|_{3,})\s*\n|\n(?=\s*(?:De|From)\s*:)/i).map((p) => p.trim()).filter((p) => p.length > 20);
    return parts.length ? parts : [text.trim()];
  }

  const pad = (n) => String(n).padStart(2, '0');
  function findDate(t, english) {
    let m;
    if ((m = t.match(/(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
    if ((m = t.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de|del)?\s*(\d{4})/i)) && MESES_ES[m[2].toLowerCase()]) return `${m[3]}-${pad(MESES_ES[m[2].toLowerCase()])}-${pad(m[1])}`;
    if ((m = t.match(/([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/)) && MONTHS_EN[m[1].toLowerCase()]) return `${m[3]}-${pad(MONTHS_EN[m[1].toLowerCase()])}-${pad(m[2])}`;
    if ((m = t.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})/))) {
      let [a, b, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (y < 100) y += 2000;
      const [mo, d] = english ? (a > 12 ? [b, a] : [a, b]) : (b > 12 ? [a, b] : [b, a]);
      return `${y}-${pad(mo)}-${pad(d)}`;
    }
    return S().today();
  }

  function findAmount(t) {
    // el primer monto junto a una palabra de monto; si no hay, el primer monto con signo de pesos o dólares
    const re = /(US\$|USD\s*\$?|MXN\s*\$?|\$)\s?([\d]{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)\s*(MXN|USD|M\.?N\.?|pesos|d[oó]lares)?/gi;
    const all = [...t.matchAll(re)];
    if (!all.length) return null;
    const near = all.find((m) => /(monto|importe|cargo|total|amount|purchase|compra|por)\W{0,20}$/i.test(t.slice(Math.max(0, m.index - 30), m.index))) || all[0];
    const sym = near[1].toUpperCase(), suf = (near[3] || '').toUpperCase();
    let currency = null;
    if (sym.startsWith('US') || suf.startsWith('USD') || suf.startsWith('D')) currency = 'USD';
    else if (sym.startsWith('MXN') || suf.startsWith('MXN') || suf.startsWith('M') || suf.startsWith('P')) currency = 'MXN';
    return { cents: Math.round(parseFloat(near[2].replace(/,/g, '')) * 100), currency };
  }

  function findMerchant(t) {
    let m;
    if ((m = t.match(/(?:Comercio|Establecimiento|Negocio|Merchant(?:\s+detail)?|Merchant name|Lugar|Description)\s*[:\-]\s*([^\n]+)/i))) return clean(m[1]);
    if ((m = t.match(/\b(?:at|en)\s+([A-Z0-9][A-Za-z0-9&'.\-*# ]{2,40}?)(?=\s+(?:on|el|con|using|with|por|from)\b|[.,;\n]|$)/))) return clean(m[1]);
    return '';
  }
  const clean = (s) => s.replace(/[*#]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 48);

  function parseOne(text) {
    const t = text.replace(/\r/g, '').replace(/ /g, ' ');
    const english = /wells fargo|purchase|ending in|you made|debit card|merchant/i.test(t);
    const amount = findAmount(t);
    if (!amount) return null;
    const bank = /bbva|bancomer/i.test(t) ? 'BBVA' : /wells\s*fargo/i.test(t) ? 'Wells Fargo' : null;
    const last4 = (t.match(/(?:terminaci[oó]n|terminada en|termina en|ending in|ends in|con terminaci[oó]n|\*{2,}|x{2,}|•{2,})\s*(\d{4})/i) || [])[1] || '';
    const income = /dep[oó]sito|abono|recibiste|te transfirieron|direct deposit|deposit (?:of|received)|payroll/i.test(t) && !/compra|purchase|cargo/i.test(t);
    const merchant = findMerchant(t) || (income ? 'Depósito' : '');

    // la cuenta: por la terminación de la tarjeta, si no por el banco y la moneda
    const accs = S().state.accounts;
    let acc = last4 && accs.find((a) => a.last4 === last4);
    const currency = amount.currency || (bank === 'Wells Fargo' ? 'USD' : 'MXN');
    if (!acc && bank) acc = accs.find((a) => a.bank === bank && a.currency === currency && (/cr[eé]dito|credit card/i.test(t) ? a.type === 'credito' : a.type === 'debito')) || accs.find((a) => a.bank === bank && a.currency === currency);
    if (!acc) acc = accs.find((a) => a.currency === currency && a.type === 'debito') || accs[0];

    const date = findDate(t, english);
    return {
      key: `${date}|${amount.cents}|${merchant.toLowerCase()}`,
      date, amount: income ? amount.cents : -amount.cents, currency, merchant, last4, bank,
      accountId: acc?.id, category: income ? 'ingreso' : S().guessCategory(merchant), kind: income ? 'ingreso' : 'gasto',
    };
  }

  function parse(text) {
    const seen = new Set(S().state.tx.filter((t) => t.emailId).map((t) => t.emailId));
    return split(text).map(parseOne).filter(Boolean).map((p) => ({ ...p, duplicate: seen.has(p.key) }));
  }

  // ejemplos para probar el lector sin tener que copiar un correo real
  const EJEMPLO = `De: BBVA México <notificaciones@bbva.mx>
Asunto: Compra aprobada con tu tarjeta
Hola, realizaste una compra con tu tarjeta con terminación 7730.
Comercio: FARMACIAS GUADALAJARA SUC 214
Monto: $386.50 MXN
Fecha: 22/10/2026 18:42 h
-----
From: Wells Fargo Alerts <alerts@notify.wellsfargo.com>
Subject: You made a purchase
You made a debit card purchase of $54.21 at TRADER JOE'S #512 on 10/22/2026 using card ending in 0193.`;

  window.Correo = { parse, EJEMPLO };
})();
