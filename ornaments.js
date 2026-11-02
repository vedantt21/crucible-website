/* Crucible Ventures — ASCII ornaments, Oct 2026.
   Line-drawn motifs in mono text (dots, ticks and strokes, never solid blocks) that sit just above each numbered
   section label, at the right end of a wide label or the left end of a narrow one. Six motifs, taken in turn down a
   page: an orbit, a wireframe cube, a ruler, a constellation, a radar sweep and a plotting grid with a crosshair.
   Each one is drawn on a grid sized to the space it has: as wide as the column allows, up to its full size. A label
   without enough room above it is pushed down to make room. They move slowly while on screen, speed up a little
   under the mouse, hold still for reduced motion, and are aria-hidden. window.cvOrn.place() redoes the layout. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  const hash = (a, b) => { let h = Math.imul((a * 374761393 + b * 668265263) | 0, 1103515245); h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
  const grid = (W, H) => Array.from({ length: H }, () => Array(W).fill(' '));
  const put = (g, x, y, c) => { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c; };
  const text = (g, x, y, s) => { for (let i = 0; i < s.length; i++) put(g, x + i, y, s[i]); };
  const out = (g) => g.map((r) => r.join('').replace(/\s+$/, '')).join('\n');
  // A line through the grid as strokes: / and \ where it climbs or falls, - and _ where it runs flat.
  // Where it climbs or falls more than a row per column, the stroke fills the rows in between so it stays joined.
  const plot = (g, f) => {
    let prev = null;
    for (let x = 0; x < g[0].length; x++) {
      const y = f(x), d = f(x + .5) - f(x - .5), r = Math.round(y), c = d < -.45 ? '/' : d > .45 ? '\\' : y - r > .18 ? '_' : y - r < -.18 ? "'" : '-';
      put(g, x, r, c);
      if (prev != null && Math.abs(r - prev) > 1) {
        const k = Math.sign(r - prev);                               // the half nearer the last column goes in it
        for (let j = prev + k; j !== r; j += k) put(g, Math.abs(j - prev) < Math.abs(j - r) ? x - 1 : x, j, c);
      }
      prev = r;
    }
  };
  const ring = (g, cx, cy, rx, ry, ch, step = 1.6) => {
    const n = Math.round(TAU * Math.max(rx, ry * 2) / step);
    for (let i = 0; i < n; i++) { const u = i / n * TAU; put(g, cx + rx * Math.cos(u), cy + ry * Math.sin(u), typeof ch === 'function' ? ch(u) : ch); }
  };

  // Each motif draws at any size W × H cells. FULL is its full size, SMALL the smallest it is drawn.
  const MOTIFS = [
    // A dotted orbit with a smaller one inside it, a point riding each, and the outer point's angle.
    { full: [66, 13], small: [34, 7], draw: (t, k, W, H) => {
      const g = grid(W, H), a = t * .7, cx = (W - 6) / 2, cy = (H - 1) / 2, rx = cx - 1, ry = cy - .2;
      ring(g, cx, cy, rx, ry, (u) => (Math.sin(u) < 0 ? '·' : '.'));
      if (H >= 9) { ring(g, cx, cy, rx * .45, ry * .45, ':', 2.4); put(g, cx + rx * .45 * Math.cos(-a * 1.6), cy + ry * .45 * Math.sin(-a * 1.6), 'x'); }
      put(g, cx, cy, 'o');
      put(g, cx + rx * Math.cos(a), cy + ry * Math.sin(a), '+');
      text(g, W - 4, 0, String(Math.round((a * 180 / Math.PI) % 360)).padStart(3, '0') + '°');
      return g;
    } },
    // A wireframe cube turning slowly: front edges as strokes, the three edges at the far corner dotted, corners as +.
    { full: [46, 13], small: [26, 7], draw: (t, k, W, H) => {
      // Sized to fit the grid both ways at every angle (half-width 2.97s, half-height 1.56s), on rows 1 and down, so
      // no corner is cut off or lands on the readout's row.
      const g = grid(W, H), a = t * .35 + .6, b = .5, s = Math.min((H - 2) / 2 / 1.56, (W - 3) / 2 / 2.97), cx = s * 2.97 + 1, cy = H / 2;
      const P = [];
      for (let i = 0; i < 8; i++) {
        const x = i & 1 ? 1 : -1, y = i & 2 ? 1 : -1, z = i & 4 ? 1 : -1;
        const x1 = x * Math.cos(a) + z * Math.sin(a), z1 = z * Math.cos(a) - x * Math.sin(a);
        const y2 = y * Math.cos(b) - z1 * Math.sin(b), z2 = z1 * Math.cos(b) + y * Math.sin(b);
        P.push([cx + x1 * s * 2.1, cy + y2 * s, z2]);
      }
      const far = P.reduce((m, p, i) => (p[2] > P[m][2] ? i : m), 0), edges = [];
      for (let i = 0; i < 8; i++) for (const m of [1, 2, 4]) if (!(i & m)) edges.push([i, i | m, i === far || (i | m) === far]);
      edges.sort((e, f) => f[2] - e[2]);                              // dotted ones first, so the strokes draw over them
      for (const [i, j, back] of edges) {
        const [x0, y0] = P[i], [x1, y1] = P[j], dx = x1 - x0, dy = (y1 - y0) * 2, n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)));
        const sl = Math.abs(dy) / (Math.abs(dx) + 1e-6), ch = back ? '·' : sl < .5 ? '-' : sl > 2.4 ? '|' : dx * dy > 0 ? '\\' : '/';
        for (let q = 1; q < n; q += back ? 2 : 1) put(g, x0 + (x1 - x0) * q / n, y0 + (y1 - y0) * q / n, ch);
      }
      P.forEach(([x, y]) => put(g, x, y, '+'));
      if (W - 5 > cx + s * 2.97 + 1) text(g, W - 4, 0, String(Math.round((a * 180 / Math.PI) % 360)).padStart(3, '0') + '°');
      return g;
    } },
    // A ruler with a marker drifting along it; at the large size a finer scale runs under it.
    { full: [74, 5], small: [36, 3], draw: (t, k, W, H) => {
      const g = grid(W, H), L = Math.max(10, Math.floor((W - 6) / 10) * 10), p = 1 + (L - 1) * (.5 + .5 * Math.sin(t * .45));
      for (let x = 0; x <= L; x++) put(g, x, 1, x % 10 === 0 ? '|' : x % 5 === 0 ? ':' : '.');
      for (let x = 0; x <= L; x += 10) text(g, x, 0, String(x));
      put(g, p, 2, '^'); text(g, p + 2, 2, (p / 10).toFixed(2));
      if (H >= 5) { const q = p * 4 % 10; for (let x = 0; x <= L; x++) put(g, x, 4, Math.abs(x - q * L / 10) < .6 ? '+' : x % 2 ? ' ' : '·'); }
      return g;
    } },
    // Stars joined by dotted lines; one twinkles at a time.
    { full: [64, 12], small: [32, 6], draw: (t, k, W, H) => {
      const g = grid(W, H), n = Math.max(4, Math.round(W / 5.6)), pts = [], sx = (W - 5) / n;
      for (let i = 0; i < n; i++) pts.push([2 + i * sx + hash(k, i) * sx * .55, .5 + hash(i, k + 3) * (H - 1.5)]);
      for (let i = 1; i < n; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], m = Math.ceil(Math.hypot(x1 - x0, (y1 - y0) * 2));
        for (let s = 2; s < m - 1; s += 2) put(g, x0 + (x1 - x0) * s / m, y0 + (y1 - y0) * s / m, '.');
      }
      const tw = Math.floor(t * 1.2) % n;
      pts.forEach(([x, y], i) => put(g, x, y, i === tw ? '*' : '+'));
      return g;
    } },
    // A radar: a dotted ring, a sweeping arm, and a blip that fades after the arm passes it.
    { full: [54, 13], small: [30, 7], draw: (t, k, W, H) => {
      const ry = (H - 1) / 2, rx = Math.min(ry * 2.5, (W - 12) / 2), cx = rx + .5, cy = ry, a = t * 1.3, ba = -.9;
      const g = grid(W, H);
      ring(g, cx, cy, rx, ry, '.');
      if (H >= 9) ring(g, cx, cy, rx * .5, ry * .5, '·', 2.2);
      const ch = ['-', '\\', '|', '/'][Math.round(((a % Math.PI) + Math.PI) % Math.PI / (Math.PI / 4)) % 4];
      for (let r = 1; r <= rx - 1.5; r += .7) put(g, cx + r * Math.cos(a), cy + r * ry / rx * Math.sin(a), ch);
      put(g, cx, cy, '+');
      const since = ((a - ba) % TAU + TAU) % TAU;
      if (since < 2.4) put(g, cx + rx * .66 * Math.cos(ba), cy + ry * .66 * Math.sin(ba), since < .8 ? 'o' : '.');
      text(g, Math.round(2 * rx + 4), Math.round(cy), 'r ' + (12 + 4 * Math.sin(t * .3)).toFixed(1));
      return g;
    } },
    // A dotted plotting grid with a crosshair drifting across it and its coordinates beside it.
    { full: [72, 9], small: [38, 5], draw: (t, k, W, H) => {
      const g = grid(W, H), gx = 4, gy = 2;
      for (let y = 0; y < H; y += gy) for (let x = 0; x < W; x += gx) put(g, x, y, x % (gx * 4) === 0 && y % (gy * 2) === 0 ? '+' : '·');
      const u = .5 + .42 * Math.sin(t * .23 + k), v = .5 + .4 * Math.sin(t * .37 + k * 2), px = Math.round(u * (W - 16)), py = Math.round(v * (H - 1));
      for (let x = px - 5; x <= px + 5; x++) if (x !== px) put(g, x, py, '-');
      for (let y = py - 2; y <= py + 2; y++) if (y !== py) put(g, px, y, '|');
      put(g, px, py, 'o');
      text(g, px + 6, py === 0 ? 1 : py - 1, ' ' + u.toFixed(2) + ', ' + v.toFixed(2) + ' ');
      return g;
    } },
  ];

  const items = [];
  document.querySelectorAll('main p.label').forEach((label, i) => {
    if (!label.querySelector('.lbl-n')) return;                      // only the numbered section heads
    const el = document.createElement('pre');
    el.className = 'orn'; el.setAttribute('aria-hidden', 'true');
    label.classList.add('has-orn'); label.appendChild(el);
    items.push({ el, label, mo: MOTIFS[i % MOTIFS.length], k: i, t: hash(i, 9) * 40, h: 0, on: false });
  });
  const draw = (it) => { it.el.textContent = out(it.mo.draw(it.t, it.k, it.W, it.H)); };
  // Where each one goes and how big it is depend on the layout, so they are worked out again when the window changes size.
  const place = () => {
    const phone = innerWidth <= 640;
    items.forEach((it) => {
      const { el, label } = it;
      label.style.marginTop = '';
      el.className = 'orn'; el.textContent = 'MMMMMMMMMM';
      const cw = el.offsetWidth / 10, lh = el.offsetHeight;
      const r = label.getBoundingClientRect(), sec = label.closest('section') || label.parentElement;
      // The first section starts under the fixed nav, so its room above the label is less than it looks.
      const nav = sec === document.querySelector('main section') ? (document.querySelector('.nav') || label).getBoundingClientRect().height : 0;
      // A photo band at the top of the section (home Community) is part of the section but not room for the ornament.
      const band = sec.querySelector(':scope > .band'), top = band ? band.getBoundingClientRect().bottom : sec.getBoundingClientRect().top;
      const room = r.top - top - (band ? 0 : nav), wrap = (label.closest('.wrap') || sec).getBoundingClientRect().width;
      const [fw, fh] = it.mo.full;
      // No wider than half the page, or than the label's own column, so it never runs over the headline beside it.
      it.W = Math.min(fw, Math.floor(Math.min(wrap * (phone ? .94 : .5), r.width) / cw));
      it.H = Math.max(it.mo.small[1], Math.round(fh * Math.min(1, it.W / fw)));
      const need = it.H * lh + (phone ? 30 : 46);                    // the gap under it, plus clear space above it
      if (room < need) label.style.marginTop = parseFloat(getComputedStyle(label).marginTop) + need - room + 'px';
      el.classList.toggle('orn-left', phone || r.width < wrap * .6);
      draw(it);
      // A label in a sticky column (What we do) carries its ornament above it, so the column has to stick lower by
      // the ornament's height or the ornament slides under the nav. If it then won't fit the screen, it stops sticking.
      const col = label.closest('.services-side, .reach-side');
      if (col) {
        col.style.top = ''; col.style.position = '';
        if (getComputedStyle(col).position === 'sticky') {
          const navH = (document.querySelector('.nav') || label).getBoundingClientRect().height;
          // ornament plus its gap, less the part that already sits in the label's own top margin inside the column
          const above = label.getBoundingClientRect().top - el.getBoundingClientRect().top;
          const top = navH + 24 + Math.max(0, above - parseFloat(getComputedStyle(label).marginTop));
          if (top + col.offsetHeight > innerHeight - 16) col.style.position = 'static';
          else col.style.top = `${Math.ceil(top)}px`;
        }
      }
    });
  };
  window.cvOrn = { place };
  place();
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(place, 200); });
  if (!items.length || reduce) return;

  const mouse = { x: -1e4, y: -1e4 };
  addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; } }, { passive: true });
  const io = new IntersectionObserver((es) => es.forEach((e) => { e.target.__orn.on = e.isIntersecting; }), { rootMargin: '60px' });
  items.forEach((it) => { it.el.__orn = it; io.observe(it.el); });

  let last = 0;
  const tick = (now) => {
    requestAnimationFrame(tick);
    if (now - last < 1000 / 12) return;                               // twelve frames a second is plenty for text
    const dt = Math.min(.2, (now - last) / 1000); last = now;
    for (const it of items) {
      if (!it.on) continue;
      const b = it.el.getBoundingClientRect(), near = mouse.x > b.left - 40 && mouse.x < b.right + 40 && mouse.y > b.top - 40 && mouse.y < b.bottom + 40;
      it.h += ((near ? 1 : 0) - it.h) * .2;
      it.t += dt * (1 + 2.5 * it.h);                                  // a little faster under the mouse
      draw(it);
      it.el.classList.toggle('near', it.h > .5);
    }
  };
  requestAnimationFrame(tick);
})();
