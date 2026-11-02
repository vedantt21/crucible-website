/* Crucible Ventures — annotation linework. Draft, Oct 2026.
   Thin leader lines, small node rings, boxed labels, framed regions and large faint arcs, laid over a
   photo like a technical poster, running off its edges. Each overlay (.lw[data-lw]) is described below in
   percent of its own box. Lines are a pixel-sized SVG; labels, dots and arcs are HTML so
   they never stretch. It draws itself in once it scrolls into view (instantly for reduced motion).

   Point:  [id, x, y, text?, flags?, w?, h?]
     flags: d dot · p plain text, no box · f filled box · l box left of the point · u box above it
            x x-ray window (w × h px; the photo shows through inverted) · s hidden on phones · v live digits
   Frame:  [id, x, y, w, h, top-left caption, bottom-right caption]; its corners are id.tl / .tr / .bl / .br
   Lines:  'a-b c-d …' between any two ids.   Arcs: [cx, cy, r], all in % of the overlay width. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SPECS = {
    // Home, beside "Why we exist": the molten pour (the photo itself stays duotone, so no x-ray windows).
    pour: {
      frames: [['f', 34, 51, 58, 19, 'foundry-pour.jpg', 'duo.only']],
      pts: [['e1', -8, 22], ['e2', 74, -8], ['e3', 108, 42], ['e4', 108, 96], ['e5', 36, 108], ['e6', -8, 64],
        ['a', 12, 10, '', 'd'], ['t1', 14, 27, '1538.0 °C', 'fv'], ['t2', 54, 13, '647.7468.89', 'ps'], ['t3', 44, 37, 'melt.point', 'd'],
        ['c', 90, 30, '', 'd'], ['d', 18, 85, '', 'ds'], ['t4', 22, 85, '-33.8688', 'ps'], ['e', 76, 88, '', 'd'], ['t5', 72, 88, 'pour.01', 'lf']],
      lines: 'e1-a a-t1 t1-t3 t1-e6 t3-f.tl t2-t3 t2-e2 t2-c c-e3 c-f.tr f.bl-d d-e5 f.br-e e-e4',
      arcs: [[100, 4, 48], [0, 100, 40]],
    },
    // What we do: grinding sparks.
    sparks: {
      frames: [['f', 58, 42, 26, 36, 'sparks.jpg', 'not.xray']],
      pts: [['e1', -6, 26], ['e2', 24, -10], ['e3', 106, 8], ['e4', 106, 62], ['e5', 80, 110], ['e6', -6, 70], ['e7', 46, 110],
        ['a', 12, 30, '', 'd'], ['t1', 30, 15, '28.7896.543', 'd'], ['c', 46, 34, '', 'd'], ['t2', 72, 14, '1243.254', 'd'], ['t4', 93, 30, '-16.18', 'lpd'],
        ['x', 33, 56, '.xray', 'x', 128, 92], ['t3', 5, 50, 'grind.01', 'dfs'], ['g', 52, 86, '', 'd'], ['t5', 92, 88, 'θ 15.04°', 'lpv']],
      lines: 'e1-a a-t1 t1-e2 t1-c c-t2 t2-e3 t2-t4 t4-e4 f.tr-t4 c-f.tl c-x a-t3 t3-e6 x-g g-e7 f.bl-g f.br-t5 t5-e5',
      arcs: [[100, 0, 24], [0, 100, 18]],
    },
    // Projects: circuit board.
    board: {
      frames: [['f', 58, 42, 28, 50, 'board.jpg', 'object.chip']],
      pts: [['e1', -6, 44], ['e2', 40, -10], ['e3', 106, 28], ['e4', 106, 90], ['e5', 44, 110], ['e6', -6, 8],
        ['x', 22, 10, '.xray', 'x', 124, 92], ['c', 44, 36, '', 'd'], ['t1', 47, 20, '-39.45673,54', 'df'], ['t2', 94, 16, 'not.found', 'ld'],
        ['t4', 93, 34, '1243.254 .569', 'lpsv'], ['a', 12, 52, '', 'd'], ['t5', 26, 70, 'trace.07', 'd'], ['d', 50, 86, '', 'd']],
      lines: 'e6-x x-c c-t1 t1-e2 t1-t2 t2-e3 t2-t4 t4-f.tr c-f.tl c-a a-e1 a-t5 t5-d d-e5 f.bl-d f.br-e4',
      arcs: [[0, 0, 22], [100, 100, 20]],
    },
  };

  const el = (tag, cls, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (css) Object.assign(e.style, css); return e; };
  const NS = 'http://www.w3.org/2000/svg';

  const build = (box, spec) => {
    const P = {}, frag = document.createDocumentFragment();
    let i = 0;
    for (const [cx, cy, r] of spec.arcs || []) {
      frag.append(el('i', 'lw-arc', { left: cx + '%', top: cy + '%', width: r * 2 + '%', '--i': i++ }));
    }
    for (const [id, x, y, w, h, tl, br] of spec.frames || []) {
      const f = el('div', 'lw-frame', { left: x + '%', top: y + '%', width: w + '%', height: h + '%', '--i': i++ });
      f.append(el('span', 'lw-cap'), el('span', 'lw-cap br'));
      f.children[0].textContent = tl; f.children[1].textContent = br;
      frag.append(f);
      Object.assign(P, { [id + '.tl']: [x, y], [id + '.tr']: [x + w, y], [id + '.bl']: [x, y + h], [id + '.br']: [x + w, y + h] });
    }
    for (const [id, x, y, text = '', flags = '', w, h] of spec.pts || []) {
      P[id] = [x, y];
      const hide = flags.includes('s') ? ' lw-s' : '';
      if (flags.includes('d')) frag.append(el('i', 'lw-dot' + hide, { left: x + '%', top: y + '%', '--i': i++ }));
      if (!text) continue;
      const cls = ['lw-tag'];
      for (const [f, c] of [['p', 'plain'], ['f', 'fill'], ['l', 'l'], ['u', 'u'], ['x', 'xray'], ['d', 'dotted']]) if (flags.includes(f)) cls.push(c);
      const t = el('span', cls.join(' ') + hide, { left: x + '%', top: y + '%', '--i': i++ });
      if (w) Object.assign(t.style, { width: w + 'px', height: h + 'px' });
      t.textContent = text;
      if (flags.includes('v')) t.dataset.live = text;
      frag.append(t);
    }
    // Lines live in a pixel-sized SVG (redrawn on resize) so each one can draw in by its true length.
    const svg = document.createElementNS(NS, 'svg');
    const small = new Set((spec.pts || []).filter((p) => (p[4] || '').includes('s')).map((p) => p[0]));
    const segs = (spec.lines || '').split(/\s+/).filter(Boolean).map((pair) => pair.split('-')).filter(([a, b]) => P[a] && P[b]);
    const lines = segs.map(([a, b], k) => {
      const ln = document.createElementNS(NS, 'line');
      ln.style.setProperty('--i', k);
      if (small.has(a) || small.has(b)) ln.classList.add('lw-s');
      svg.append(ln);
      return ln;
    });
    const place = () => {
      const W = box.clientWidth, H = box.clientHeight;
      if (!W || !H) return;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      segs.forEach(([a, b], k) => {
        const x1 = P[a][0] * W / 100, y1 = P[a][1] * H / 100, x2 = P[b][0] * W / 100, y2 = P[b][1] * H / 100;
        const ln = lines[k], len = Math.hypot(x2 - x1, y2 - y1);
        Object.entries({ x1, y1, x2, y2 }).forEach(([n, v]) => ln.setAttribute(n, v.toFixed(1)));
        ln.style.setProperty('--len', len.toFixed(1));
      });
    };
    new ResizeObserver(place).observe(box);
    place();
    box.append(svg, frag);
  };

  // Live labels: the last digit wanders while the overlay is on screen.
  const live = [];
  setInterval(() => {
    if (reduce) return;
    for (const t of live) {
      if (!t.closest('.lw').classList.contains('is-on')) continue;
      let n = 0;
      t.textContent = t.dataset.live.replace(/\d/g, (m, k, s) => {
        const left = (s.slice(k).match(/\d/g) || []).length;   // digits from here to the end
        return left <= 1 && ++n ? String(Math.floor(Math.random() * 10)) : m;
      });
    }
  }, 700);

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    e.target.classList.toggle('is-on', e.isIntersecting);
    if (e.isIntersecting) e.target.classList.add('is-in');
  }), { threshold: .25 });

  document.querySelectorAll('.lw[data-lw]').forEach((box) => {
    const spec = SPECS[box.dataset.lw];
    if (!spec) return;
    build(box, spec);
    live.push(...box.querySelectorAll('[data-live]'));
    if (reduce) box.classList.add('is-in');
    io.observe(box);
  });
})();
