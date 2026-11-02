/* Crucible Ventures — partner board, Oct 2026.
   The teams Crucible works with, drawn as a board: Crucible in the middle, a junction for each kind of partner
   (portfolio, early-stage startups, incubator teams, hackathon) and a card for each team, joined by wires.
   The cards are plain links in the HTML (a simple list when this script doesn't run); this script places them and
   draws the wires in the Circuit look (picked 2026-10-26): micrographic, straight hairlines, rulers and codes, on a
   Warm graphite section. Wide boards use a hand-placed layout. Narrow ones (phones) get one tall layout with a bus
   down the left. window.cvBoard.render() redraws. */
(() => {
  const boards = [...document.querySelectorAll('.pboard')];
  if (!boards.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const f1 = (n) => Math.round(n * 10) / 10;
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // The wide layout, in percent of the board: the hub, each group junction (g) and each team card (n).
  // h is the board's height as a share of its width.
  const WIDE = { h: .56, hub: [50, 50],
    g: { portfolio: [32, 30], startups: [70, 32], incubator: [64, 72], hack: [30, 55] },
    n: { after8: [14, 18], tampkit: [42, 12], hailstrum: [76, 14], casecrest: [88, 47], macrochef: [78, 82],
      passionfruitfy: [46, 90], h4h: [14, 72] } };
  const NARROW = 700;     // below this board width, the tall layout

  /* ---------- Geometry ---------- */
  const rect = (x, y, w, h) => ({ x, y, w, h, l: x - w / 2, r: x + w / 2, t: y - h / 2, b: y + h / 2 });
  // Where the line from a box's centre towards a point leaves the box.
  const exit = (R, p, pad = 0) => {
    const dx = p.x - R.x, dy = p.y - R.y;
    if (!dx && !dy) return { x: R.x, y: R.y };
    const s = Math.min(dx ? (R.w / 2 + pad) / Math.abs(dx) : Infinity, dy ? (R.h / 2 + pad) / Math.abs(dy) : Infinity);
    return { x: R.x + dx * s, y: R.y + dy * s };
  };
  // A wire: one straight hairline.
  const line = (p, q) => ({ d: `M${f1(p.x)} ${f1(p.y)}L${f1(q.x)} ${f1(q.y)}` });

  // Push overlapping cards apart. Fixed boxes (hub, junction labels) don't move.
  const relax = (items, W, H, gap) => {
    for (let it = 0; it < 80; it++) {
      let moved = false;
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const A = items[i], B = items[j];
        if (A.fixed && B.fixed) continue;
        const ox = (A.w + B.w) / 2 + gap - Math.abs(A.x - B.x), oy = (A.h + B.h) / 2 + gap - Math.abs(A.y - B.y);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        const share = A.fixed || B.fixed ? 1 : .5;
        if (ox < oy) { const s = (Math.sign(B.x - A.x) || 1) * ox * share; if (!A.fixed) A.x -= s; if (!B.fixed) B.x += s; }
        else { const s = (Math.sign(B.y - A.y) || 1) * oy * share; if (!A.fixed) A.y -= s; if (!B.fixed) B.y += s; }
      }
      items.forEach((I) => {
        if (I.fixed) return;
        I.x = Math.min(W - I.w / 2 - 2, Math.max(I.w / 2 + 2, I.x));
        I.y = Math.min(H - I.h / 2 - 2, Math.max(I.h / 2 + 2, I.y));
      });
      if (!moved) break;
    }
  };

  /* ---------- One board ---------- */
  const setup = (board) => {
    const hub = board.querySelector('.pb-hub');
    const groups = [...board.querySelectorAll('.pb-grp')];
    const nodes = [...board.querySelectorAll('.pb-node')];
    const svg = svgEl('svg', { class: 'pb-svg', 'aria-hidden': 'true' });
    board.prepend(svg);
    board.classList.add('pb-live');
    const sec = board.closest('section');
    const S = { wires: [], seen: false, inView: false, ticks: null, tall: false };
    if (sec) sec.classList.add('tone-graphite');                  // the board's section turns Warm graphite

    const place = (el, x, y) => { el.style.left = `${f1(x)}px`; el.style.top = `${f1(y)}px`; };

    const render = () => {
      const W = board.clientWidth;
      const tall = S.tall = W < NARROW;
      board.classList.toggle('pb-tall', tall);

      // Sizes first: the cards don't depend on where they sit.
      const size = (el) => ({ w: el.offsetWidth, h: el.offsetHeight });
      const hubS = size(hub);
      const items = {};
      let H;

      if (tall) {
        // One column of rows: the hub, then each group's label on the bus with its teams below, staggered.
        const bus = 14, pad = 12;
        let y = hubS.h / 2 + 4, k = 0;
        items.hub = { ...hubS, x: W / 2, y, fixed: true };
        y += hubS.h / 2 + 30;
        groups.forEach((g) => {
          const key = g.dataset.g, gs = size(g);
          items['g:' + key] = { ...gs, x: bus, y, fixed: true, pt: true };
          y += 20;
          nodes.filter((n) => n.dataset.g === key).forEach((n) => {
            const ns = size(n), x = W * (k++ % 2 ? .6 : .52);
            y += ns.h / 2 + pad;
            items['n:' + n.dataset.n] = { ...ns, x: Math.min(W - ns.w / 2 - 2, Math.max(bus + 34 + ns.w / 2, x)), y };
            y += ns.h / 2 + pad;
          });
          y += 22;
        });
        H = y;
      } else {
        H = Math.max(660, W * WIDE.h);
        const at = (p) => ({ x: p[0] / 100 * W, y: p[1] / 100 * H });
        items.hub = { ...hubS, ...at(WIDE.hub), fixed: true };
        groups.forEach((g) => { items['g:' + g.dataset.g] = { ...size(g), ...at(WIDE.g[g.dataset.g]), fixed: true, pt: true }; });
        nodes.forEach((n) => { items['n:' + n.dataset.n] = { ...size(n), ...at(WIDE.n[n.dataset.n]) }; });
      }
      // Junction labels sit just above their point, so treat them as their own box for spacing.
      const boxes = Object.values(items).map((I) => (!I.pt ? I : { ...I, y: I.y - I.h / 2 - 8, fixed: true }));
      if (!tall) relax(boxes, W, H, 14);

      board.style.height = `${Math.ceil(H)}px`;
      svg.setAttribute('viewBox', `0 0 ${W} ${Math.ceil(H)}`);
      place(hub, items.hub.x, items.hub.y);
      groups.forEach((g) => { const I = items['g:' + g.dataset.g]; place(g, I.x, I.y); });
      nodes.forEach((n) => { const I = items['n:' + n.dataset.n]; place(n, I.x, I.y); });
      S.items = items;
      draw(W, H);
      if (pop.node) placePop();
    };

    /* ---------- Wires and the drawing under them ---------- */
    const draw = (W, H) => {
      svg.textContent = '';
      const tall = S.tall, I = S.items;
      const deco = svgEl('g', { class: 'pb-deco' }, svg);
      const wiresG = svgEl('g', { class: 'pb-wires' }, svg);
      const marks = svgEl('g', { class: 'pb-marks' }, svg);
      S.wires = [];
      S.ticks = null;
      const R = (k) => rect(I[k].x, I[k].y, I[k].w, I[k].h);
      const P = (k) => ({ x: I[k].x, y: I[k].y });

      const wire = (from, to, shape, extra = '') => {
        const path = svgEl('path', { class: `pb-wire ${extra}`.trim(), d: shape.d }, wiresG);
        S.wires.push({ from, to, path });
        return path;
      };

      // Decoration under the wires: crosshair, registration marks, a ruler, rings round the hub and a barcode
      const txt = (x, y, str, anchor = 'start', cls = 'pb-silk') => { const t = svgEl('text', { class: cls, x: f1(x), y: f1(y), 'text-anchor': anchor }, deco); t.textContent = str; };
      const pad = (n) => String(Math.round(n)).padStart(4, '0');
      // Faint crosshair through the hub
      const h = P('hub');
      svgEl('path', { class: 'pb-cross', d: `M0 ${f1(h.y)}H${W}M${f1(h.x)} 0V${H}` }, deco);
      // Registration marks in the corners, with their coordinates
      const m = 14;
      [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
        svgEl('circle', { class: 'pb-reg', cx: x, cy: y, r: 4.5 }, deco);
        svgEl('path', { class: 'pb-reg', d: `M${x - 9} ${y}H${x + 9}M${x} ${y - 9}V${y + 9}` }, deco);
        if (!tall || sy > 0) txt(x + sx * 14, y + sy * 3 + 3, `X${pad(x)} Y${pad(y)}`, sx > 0 ? 'start' : 'end');
      });
      // A fine ruler down the left edge
      let r = '';
      for (let y = 40; y < H - 40; y += 8) { const k = Math.round(y / 8) % 5 ? 3 : 7; r += `M0 ${y}H${k}`; }
      svgEl('path', { class: 'pb-rule', d: r }, deco);
      if (!tall) {
        // Rings round the hub; the inner one's ticks turn slowly (see loop())
        const r0 = Math.hypot(I.hub.w, I.hub.h) / 2 + 18;
        svgEl('circle', { class: 'pb-ring', cx: f1(h.x), cy: f1(h.y), r: f1(r0) }, deco);
        svgEl('circle', { class: 'pb-ring pb-ring-dot', cx: f1(h.x), cy: f1(h.y), r: f1(r0 + 46) }, deco);
        [[0, '000'], [90, '090'], [180, '180'], [270, '270']].forEach(([a, t]) => {
          const c = Math.cos(a * Math.PI / 180), sn = Math.sin(a * Math.PI / 180);
          txt(h.x + c * (r0 + 58), h.y + sn * (r0 + 58) + 3, t, 'middle');
        });
        S.ticks = { g: svgEl('g', { class: 'pb-ticks' }, deco), O: { cx: h.x, cy: h.y, rx: r0, ry: r0 }, k: 1, n: 144, phase: 0 };
        drawTicks();
        // Scale bar, sheet note and a barcode along the bottom
        const sx = 32, sy = H - 42;
        svgEl('path', { class: 'pb-rule', d: `M${sx} ${sy}H${sx + 120}` + [0, 30, 60, 90, 120].map((d, k) => `M${sx + d} ${sy}V${sy - (k % 2 ? 3 : 6)}`).join('') }, deco);
        txt(sx, sy + 11, '0', 'middle'); txt(sx + 120, sy + 11, '120 PX', 'middle');
        txt(32, H - 76, 'CV-PARTNERS / SHEET 01'); txt(32, H - 64, `REV 2  ·  ${nodes.length} NODES  ·  ${groups.length} GROUPS`);
        let bx = W - 190, bar = '';   // sits above the corner coordinates
        for (let k = 0; k < 46; k++) { const w = rnd(k) > .62 ? 2 : 1; bar += `M${bx + w / 2} ${H - 62}v14`; bx += w + (rnd(k + 99) > .5 ? 2 : 1); }
        svgEl('path', { class: 'pb-bar', d: bar }, deco);
        txt(W - 190, H - 38, 'CV-PTN-0010');
      }

      // Hub to junctions
      const hubR = R('hub');
      if (tall) {
        const keys = groups.map((g) => 'g:' + g.dataset.g), last = P(keys[keys.length - 1]), first = P(keys[0]);
        const bus = svgEl('path', { class: 'pb-wire pb-bus', d: `M${f1(hubR.l)} ${f1(hubR.y)}H${f1(first.x)}V${f1(last.y)}` }, wiresG);
        keys.forEach((k) => S.wires.push({ from: 'hub', to: k, path: bus, shared: true }));
      } else {
        groups.forEach((g) => {
          const k = 'g:' + g.dataset.g, q = P(k);
          wire('hub', k, line(exit(hubR, q, 3), q));
        });
      }

      // Junctions to cards
      nodes.forEach((n) => {
        const gk = 'g:' + n.dataset.g, nk = 'n:' + n.dataset.n, N = R(nk), g = P(gk);
        wire(gk, nk, tall ? line(g, { x: N.l, y: N.y }) : line(g, exit(N, g, 3)));
      });

      // A dot where each wire meets its card, and an index code halfway along the longer ones
      S.wires.filter((w) => w.to.startsWith('n:')).forEach((w, i) => {
        const L = w.path.getTotalLength(), e = w.path.getPointAtLength(L), a = w.path.getPointAtLength(L * .5), b = w.path.getPointAtLength(L * .5 + 1);
        svgEl('circle', { class: 'pb-end', cx: f1(e.x), cy: f1(e.y), r: 1.8 }, marks);
        if (L < 70) return;
        const nx = -(b.y - a.y), ny = b.x - a.x, t = svgEl('text', { class: 'pb-code', x: f1(a.x + nx * 7), y: f1(a.y + ny * 7 + 3), 'text-anchor': 'middle' }, marks);
        t.textContent = `N${String(i + 1).padStart(2, '0')}`;
      });

      // A small square pad at each junction
      groups.forEach((g) => {
        const k = 'g:' + g.dataset.g;
        svgEl('rect', { class: 'pb-pad', x: f1(I[k].x - 2.5), y: f1(I[k].y - 2.5), width: 5, height: 5 }, marks);
      });
    };

    const drawTicks = () => {
      const T = S.ticks; if (!T) return;
      T.g.textContent = '';
      const { O } = T, k = T.k || .93;
      for (let i = 0; i < T.n; i++) {
        const a = (i / T.n) * 360 + T.phase, rad = a * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
        const L = i % 10 ? 4 : 9;
        svgEl('line', { x1: f1(O.cx + c * O.rx * k), y1: f1(O.cy + s * O.ry * k), x2: f1(O.cx + c * (O.rx * k + L)), y2: f1(O.cy + s * (O.ry * k + L * O.ry / O.rx)) }, T.g);
      }
    };

    /* ---------- Pulses along the wires ---------- */
    const chain = (nk) => {
      const n = S.wires.find((w) => w.to === nk);
      if (!n) return [];
      const g = S.wires.find((w) => w.to === n.from);
      return g ? [g, n] : [n];
    };
    const pulse = (path, dur, cls, done, from = 0, to = 1) => {
      const len = path.getTotalLength();
      const dot = svgEl('circle', { class: `pb-pulse ${cls || ''}`.trim(), r: 1.7 }, svg);
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const p = path.getPointAtLength(len * (from + (to - from) * e));
        dot.setAttribute('cx', f1(p.x)); dot.setAttribute('cy', f1(p.y));
        if (k < 1 && dot.isConnected) requestAnimationFrame(step);
        else { dot.remove(); if (done && k >= 1) done(); }
      };
      requestAnimationFrame(step);
    };
    // Along the shared bus (phones), only run as far as this team's junction.
    const runChain = (ws, cls) => {
      const go = (i) => {
        const w = ws[i]; if (!w) return;
        let to = 1;
        if (w.shared) {
          const L = w.path.getTotalLength(), y = S.items[w.to].y;
          let lo = 0, hi = L;
          for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (w.path.getPointAtLength(m).y < y) lo = m; else hi = m; }
          to = hi / L;
        }
        pulse(w.path, 260 + w.path.getTotalLength() * to * 1.6, cls, () => go(i + 1), 0, to);
      };
      go(0);
    };

    /* ---------- Hover: light the route from Crucible to the team ---------- */
    const light = (keys) => {
      if (!keys && pop.node) keys = new Set(['n:' + pop.node.dataset.n, 'g:' + pop.node.dataset.g]);   // an open pop-up keeps its team lit
      board.classList.toggle('is-focus', !!keys);
      // The phone bus is one path shared by every group, so it is lit if any of them is.
      const lit = new Set(keys ? S.wires.filter((w) => keys.has(w.to)).map((w) => w.path) : []);
      S.wires.forEach((w) => w.path.classList.toggle('on', lit.has(w.path)));
      groups.forEach((g) => g.classList.toggle('on', !!keys && keys.has('g:' + g.dataset.g)));
      nodes.forEach((n) => n.classList.toggle('on', !!keys && keys.has('n:' + n.dataset.n)));
    };
    nodes.forEach((n) => {
      const nk = 'n:' + n.dataset.n, gk = 'g:' + n.dataset.g;
      const on = () => { light(new Set([nk, gk])); if (!reduce) runChain(chain(nk), 'is-hot'); };
      n.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') on(); });
      n.addEventListener('pointerleave', () => light(null));
      n.addEventListener('focusin', on);
      n.addEventListener('focusout', () => light(null));
    });
    groups.forEach((g) => {
      const gk = 'g:' + g.dataset.g;
      g.addEventListener('pointerenter', () => light(new Set([gk, ...nodes.filter((n) => n.dataset.g === g.dataset.g).map((n) => 'n:' + n.dataset.n)])));
      g.addEventListener('pointerleave', () => light(null));
    });

    /* ---------- Teams without a site: a small pop-up with their blurb ---------- */
    // It sits beside the card (right if there's room, else left, else below); on phones it's a sheet at the bottom of
    // the screen. Esc, the close button or a click anywhere else closes it, and focus goes back to the card.
    const pop = { el: null, node: null };
    const box = document.createElement('div');
    box.className = 'pb-pop';
    box.setAttribute('role', 'dialog');
    box.hidden = true;
    board.appendChild(box);
    pop.el = box;
    const closePop = (refocus) => {
      if (!pop.node) return;
      const btn = pop.node.querySelector('.pb-card');
      btn.setAttribute('aria-expanded', 'false');
      pop.node.classList.remove('is-open');
      pop.node = null;
      box.hidden = true;
      light(null);
      if (refocus) btn.focus({ preventScroll: true });
    };
    const placePop = () => {
      if (!pop.node) return;
      const phone = innerWidth <= 640;
      box.classList.toggle('is-sheet', phone);
      if (phone) { box.style.left = box.style.top = ''; return; }
      const b = board.getBoundingClientRect(), c = pop.node.querySelector('.pb-card').getBoundingClientRect();
      const w = box.offsetWidth, h = box.offsetHeight, gap = 14;
      let x, y = c.top - b.top + c.height / 2 - h / 2;
      if (c.right - b.left + gap + w <= b.width) x = c.right - b.left + gap;
      else if (c.left - b.left - gap - w >= 0) x = c.left - b.left - gap - w;
      else { x = c.left - b.left + c.width / 2 - w / 2; y = c.bottom - b.top + gap; }
      box.style.left = `${f1(Math.max(0, Math.min(b.width - w, x)))}px`;
      box.style.top = `${f1(Math.max(-40, y))}px`;
    };
    const openPop = (n) => {
      if (pop.node === n) { closePop(true); return; }
      closePop(false);
      const btn = n.querySelector('.pb-card'), id = `pb-pop-${n.dataset.n}`;
      box.innerHTML = `<div class="pb-pop-head"><span class="lbl">${btn.querySelector('.pb-tag').textContent}</span>`
        + `<button class="pb-pop-x" type="button" aria-label="Close">×</button></div>`
        + `<h3 class="pb-pop-name" id="${id}">${btn.querySelector('.pb-name').textContent}</h3>${n.querySelector('.pb-more').innerHTML}`;
      box.setAttribute('aria-labelledby', id);
      box.hidden = false;
      pop.node = n;
      n.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      placePop();
      light(null);
      if (!reduce) box.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.1,1)' });
      box.querySelector('.pb-pop-x').focus({ preventScroll: true });
    };
    board.addEventListener('click', (e) => {
      if (e.target.closest('.pb-pop-x')) { closePop(true); return; }
      const btn = e.target.closest('button.pb-card');
      if (btn) openPop(btn.closest('.pb-node'));
    });
    document.addEventListener('pointerdown', (e) => { if (pop.node && !box.contains(e.target) && !pop.node.contains(e.target)) closePop(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && pop.node) closePop(true); });
    addEventListener('resize', placePop);

    /* ---------- Reveal: the wires draw out from Crucible, then the cards come in ---------- */
    const reveal = () => {
      if (S.seen) return;
      S.seen = true;
      board.classList.remove('pb-pre');
      if (reduce) return;
      const order = (k) => (k === 'hub' ? 0 : k.startsWith('g:') ? 1 : 2);
      const seenPaths = new Set();
      S.wires.forEach((w) => {
        if (seenPaths.has(w.path)) return; seenPaths.add(w.path);
        const L = w.path.getTotalLength(), delay = order(w.from) * 420 + Math.random() * 160;
        w.path.animate([{ strokeDasharray: `${L} ${L}`, strokeDashoffset: L }, { strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 }], { duration: 900, delay, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'backwards' });
      });
      svg.querySelectorAll('.pb-deco, .pb-marks').forEach((g) => g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 250, fill: 'backwards' }));
      hub.animate([{ opacity: 0, transform: 'translate(-50%, -50%) scale(.94)' }, { opacity: 1, transform: 'translate(-50%, -50%)' }], { duration: 700, easing: 'cubic-bezier(.2,.7,.1,1)', fill: 'backwards' });
      groups.forEach((g, i) => g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 420 + i * 60, fill: 'backwards' }));
      nodes.forEach((n, i) => n.firstElementChild.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 700, delay: 800 + i * 55, easing: 'cubic-bezier(.2,.7,.1,1)', fill: 'backwards' }));
      // A first pulse out to every team once they are in.
      setTimeout(() => nodes.forEach((n, i) => setTimeout(() => runChain(chain('n:' + n.dataset.n)), i * 90)), 1500);
    };
    if (document.documentElement.classList.contains('anim') && !reduce) board.classList.add('pb-pre');
    new IntersectionObserver((es) => es.forEach((e) => {
      S.inView = e.isIntersecting;
      if (e.isIntersecting && e.intersectionRatio > .15) reveal();
    }), { threshold: [0, .15, .3] }).observe(board);

    /* ---------- Idle motion: the odd pulse, and the ticks turning round the hub ---------- */
    let last = 0, nextPulse = 0;
    const loop = (t) => {
      requestAnimationFrame(loop);
      if (!S.inView || !S.seen || reduce || document.hidden) return;
      if (S.ticks && t - last > 50) { S.ticks.phase = (S.ticks.phase + .12) % 360; drawTicks(); last = t; }
      if (t > nextPulse && !board.classList.contains('is-focus')) {
        const n = nodes[Math.floor(Math.random() * nodes.length)];
        runChain(chain('n:' + n.dataset.n), 'is-idle');
        nextPulse = t + 1100 + Math.random() * 1400;
      }
    };
    requestAnimationFrame(loop);

    new ResizeObserver(() => render()).observe(board);
    render();
    return render;
  };

  const renders = boards.map(setup);
  const all = () => renders.forEach((r) => r());
  if (document.fonts) document.fonts.ready.then(all);
  window.cvBoard = { render: all };
})();
