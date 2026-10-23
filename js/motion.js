// Mis Finanzas — movimiento.
// Solo donde ayuda a entender qué pasó: el cambio de pantalla, la hoja que sube y baja, el movimiento nuevo que
// llega a la lista y la cifra que cambia. Nada se mueve por adorno, y nada sobre datos que estás leyendo.
// Todo es transform y opacity (WAAPI), con las curvas de styles.css. Con "reducir movimiento" quedan solo fundidos.
(() => {
  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSheet = () => matchMedia('(max-width: 760px)').matches;
  const run = (el, frames, opts) => { try { return el.animate(frames, { fill: 'both', ...opts }); } catch { return null; } };

  // ---------- cambio de pantalla: decenas de veces al día, así que casi imperceptible ----------
  function screen(el) {
    run(el, reduced() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: EASE_OUT })?.finished.then((a) => a?.cancel?.()).catch(() => {});
  }

  // ---------- diálogo: modal centrado en la computadora, hoja que sube desde abajo en el iPhone ----------
  let closing = false;
  function openDialog(d) {
    d.showModal();
    closing = false;
    const sheet = isSheet();
    const frames = reduced() ? [{ opacity: 0 }, { opacity: 1 }]
      : sheet ? [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }]
      : [{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'scale(1)' }];
    const a = run(d, frames, { duration: sheet ? 420 : 250, easing: sheet ? EASE_DRAWER : EASE_OUT });
    a?.finished.then(() => a.cancel()).catch(() => {});
    run(d, [{ opacity: 0 }, { opacity: 1 }], { duration: sheet ? 420 : 250, easing: EASE_OUT, pseudoElement: '::backdrop' });
    if (sheet && !reduced()) dragToDismiss(d);
  }

  // sale por donde entró; from = cuánto ya se arrastró hacia abajo
  function closeDialog(d, from = 0) {
    if (!d.open || closing) return;
    closing = true;
    const sheet = isSheet();
    const dur = sheet ? 300 : 200;
    const frames = reduced() ? [{ opacity: 1 }, { opacity: 0 }]
      : sheet ? [{ transform: `translateY(${from}px)` }, { transform: 'translateY(100%)' }]
      : [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.96)' }];
    const a = run(d, frames, { duration: dur, easing: sheet ? EASE_DRAWER : EASE_OUT });
    run(d, [{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: EASE_OUT, pseudoElement: '::backdrop' });
    const done = () => { d.style.transform = ''; d.close(); d.getAnimations?.().forEach((x) => x.cancel()); closing = false; };
    a ? a.finished.then(done).catch(done) : done();
  }

  // arrastrar la hoja hacia abajo para cerrarla: por distancia o por un jalón rápido
  function dragToDismiss(d) {
    const handle = d.querySelector('.grab') || d.querySelector('.dlg-head');
    if (!handle || handle._drag) return;
    handle._drag = true;
    let startY = 0, startT = 0, dy = 0, dragging = false, id = null;
    handle.addEventListener('pointerdown', (e) => {
      if (dragging || e.target.closest('button')) return; // un solo dedo; los botones siguen siendo botones
      dragging = true; id = e.pointerId; startY = e.clientY; startT = Date.now(); dy = 0;
      handle.setPointerCapture(id);
      d.getAnimations?.().forEach((x) => x.cancel());
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== id) return;
      const raw = e.clientY - startY;
      dy = raw >= 0 ? raw : -Math.sqrt(-raw) * 2; // hacia arriba cede poco, como algo que topa
      d.style.transform = `translateY(${dy}px)`;
    });
    const end = (e) => {
      if (!dragging || e.pointerId !== id) return;
      dragging = false;
      const v = Math.abs(dy) / Math.max(1, Date.now() - startT);
      if (dy > 120 || (dy > 24 && v > 0.11)) { closeDialog(d, dy); return; }
      const back = run(d, [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], { duration: 300, easing: EASE_DRAWER });
      d.style.transform = '';
      back?.finished.then(() => back.cancel()).catch(() => {});
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  // ---------- un movimiento nuevo llega a la lista ----------
  function arrive(els) {
    els.slice(0, 6).forEach((el, i) => {
      run(el, reduced() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: i * 50, easing: EASE_OUT })?.finished.then((a) => a.cancel()).catch(() => {});
      // un instante de fondo para que el ojo lo encuentre, y se va solo
      run(el, [{ backgroundColor: 'var(--accent-soft)' }, { backgroundColor: 'transparent' }], { duration: 1200, delay: 200 + i * 50, easing: 'ease', fill: 'none' });
    });
  }

  // ---------- una cifra que cambia rueda del valor anterior al nuevo ----------
  // la curva es la misma --ease-out de styles.css, resuelta como cubic-bezier
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t, dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => { let t = x; for (let i = 0; i < 6; i++) { const e = sx(t) - x; const d = dx(t); if (Math.abs(e) < 1e-5 || !d) break; t -= e / d; } return sy(Math.min(1, Math.max(0, t))); };
  }
  const easeOut = bezier(0.23, 1, 0.32, 1);
  function tween(el, from, to, format, duration = 300) {
    if (reduced() || from === to) { el.innerHTML = format(to); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      el.innerHTML = format(Math.round(from + (to - from) * easeOut(p)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  window.Motion = { screen, openDialog, closeDialog, arrive, tween, reduced };
})();
