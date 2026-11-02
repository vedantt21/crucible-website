/* Crucible Ventures — the ASCII layer. Draft, Oct 2026.
   Glyph objects (.asc[data-asc]): small 3D shapes drawn as text on a grid. Each shape is a point cloud
   with normals; every frame it is turned, lit and z-buffered into character cells. Used for the CV mark,
   in the home hero and in the footer. Canvas only, aria-hidden, paused off screen, drawn once
   and still for reduced motion. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FONT = '"Fragment Mono", ui-monospace, Menlo, monospace';
  const TAU = Math.PI * 2;
  const hash = (a, b, c = 0) => {                                   // stable 0..1 noise per cell (and per time step)
    let h = Math.imul((a * 374761393 + b * 668265263 + c * 1274126177) | 0, 1103515245);
    h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
  };

  /* ---------- Shapes: point clouds with normals. Kind 1 marks the blue accent part. ---------- */
  const Cloud = () => {
    const p = [], n = [], k = [];
    return {
      add(x, y, z, nx, ny, nz, kind = 0) { p.push(x, y, z); n.push(nx, ny, nz); k.push(kind); },
      done() { return { p: Float32Array.from(p), n: Float32Array.from(n), k: Uint8Array.from(k), len: k.length }; },
    };
  };
  const MARK_C = 'M532.64 314H391A84 84 0 0 0 391 482H511.61L533.94 440H395A42 42 0 0 1 395 356H554.97Z';
  const MARK_V = 'M510.92 369L561.88 369L587 416.24L641.36 314L692.33 314L603 482L571 482Z';

  const SHAPES = {
    // The CV mark, extruded: filled pixels make the two faces, edge pixels make the sides.
    logo(ds) {
      const c = Cloud(), VB = [300, 307, 399.33, 182], unit = 1.1 / VB[2], px = Math.max(.5, ds / unit);
      const W = Math.ceil(VB[2] / px), H = Math.ceil(VB[3] / px);
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.setTransform(1 / px, 0, 0, 1 / px, -VB[0] / px, -VB[1] / px);
      g.fillStyle = '#f00'; g.fill(new Path2D(MARK_C));
      g.fillStyle = '#00f'; g.fill(new Path2D(MARK_V));
      const data = g.getImageData(0, 0, W, H).data;
      const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H || data[(y * W + x) * 4 + 3] < 128 ? 0 : data[(y * W + x) * 4 + 2] > 127 ? 2 : 1);
      const depth = .16, nz = Math.ceil(depth / ds);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const v = at(x, y); if (!v) continue;
        const X = (x - W / 2) * px * unit, Y = -(y - H / 2) * px * unit, kind = v === 2 ? 1 : 0;
        c.add(X, Y, -depth / 2, 0, 0, -1, kind); c.add(X, Y, depth / 2, 0, 0, 1, kind);
        const r = at(x + 1, y) ? 1 : 0, l = at(x - 1, y) ? 1 : 0, b = at(x, y + 1) ? 1 : 0, t = at(x, y - 1) ? 1 : 0;
        if (r && l && b && t) continue;
        let nx = l - r, ny = b - t; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        for (let k = 1; k < nz; k++) c.add(X, Y, -depth / 2 + depth * k / nz, nx, ny, 0, kind);
      }
      return c.done();
    },
  };

  /* ---------- Orbiter: a small satellite that circles the hero mark, for a deep tech feel (2026-10-23) ----------
     Drawn as thin line art, not glyphs, filled with the page colour so they cover the mark where they pass in front
     of it, and hidden where they pass behind it. Each orbit is a circle of radius R at height y0, tipped by inc about
     the x axis; w is its speed (negative goes the other way), a0 where it starts. Radii stay inside the box width. */
  const ORBITERS = {
    satellite: [{ is: 'satellite', R: .6, y0: -.04, inc: -.18, w: .36, a0: 2 }],
  };
  // Where a body is on its orbit at angle a: position, direction of travel, up, and outward. The orbit is a circle of
  // radius R at height y0, tipped by inc about the x axis.
  const orbitAt = (o, a) => {
    const ci = Math.cos(o.inc), si = Math.sin(o.inc), ca = Math.cos(a), sa = Math.sin(a), dir = Math.sign(o.w) || 1;
    const P = [o.R * ca, o.y0 + o.R * sa * si, o.R * sa * ci];
    const T = [-sa * dir, ca * si * dir, ca * ci * dir], U = [0, ci, -si];
    const N = [T[1] * U[2] - T[2] * U[1], T[2] * U[0] - T[0] * U[2], T[0] * U[1] - T[1] * U[0]];
    return { P, T, U, N };
  };

  /* ---------- Glyph objects ---------- */
  const mouse = { x: 0, y: 0, on: false };
  addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; } }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.on = false; });
  const RAMP = ' .:-=+*';             // light to heavy ink (kept light: no #, % or @)
  const MELT = '-~=+*%';               // the blue accent (the V), shimmering
  const SOLID = '.:-=+*#%@';           // the solid look (data-asc-solid): the full ramp, so faces read as filled
  const SOLID_MELT = '=+*#%@';
  const L = [-.45, .62, -.64];         // light from upper left, in front
  const deg = (a) => ((a % TAU + TAU) % TAU) * 180 / Math.PI;

  class GlyphObject {
    constructor(host) {
      this.host = host;
      this.read();
      this.spin = hash(this.shape.length, 7) * TAU;
      this.dx = this.dy = this.tx = this.ty = this.boost = 0;
      this.last = 0; this.prevT = 0; this.visible = false;
      this.hov = 0; this.mx = this.my = -1e4;                       // cursor hover: strength 0..1, position in the box
      this.cv = document.createElement('canvas');
      host.appendChild(this.cv);
      this.g = this.cv.getContext('2d');
      new ResizeObserver(() => this.resize()).observe(host);
    }
    // Settings come from the data-asc-* attributes. Call reset() after changing them to rebuild in place.
    read() {
      const ds = this.host.dataset;
      this.shape = ds.asc;
      this.notes = ds.ascNotes || '';
      this.tilt = +(ds.ascTilt || -.42);
      this.speed = +(ds.ascSpeed || .32);
      this.fit = +(ds.ascFit || .74);
      this.swing = +(ds.ascSwing || 0);                           // rock back and forth by this much instead of spinning
      this.dark = 'ascDark' in ds;                                 // on a dark ground, lit faces carry more glyph
      this.fps = +(ds.ascFps || 30);
      this.solid = 'ascSolid' in ds;                               // heavier glyphs, drawn twice for a bolder stroke
      this.orbit = ORBITERS[ds.ascOrbit] ? ds.ascOrbit : '';         // what circles it
      this.orbs = null;
    }
    reset() { this.read(); this.cloud = null; this.resize(); }
    resize() {
      const W = this.host.clientWidth, H = this.host.clientHeight;
      if (!W || !H) return;
      const dpr = Math.min(2, devicePixelRatio || 1), cs = getComputedStyle(this.host), g = this.g;
      Object.assign(this, { W, H, dpr });
      this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
      this.fs = parseFloat(cs.fontSize);
      this.ink = cs.color;
      this.accent = cs.getPropertyValue('--asc-accent').trim() || '#4F6AED';
      this.k = parseFloat(cs.getPropertyValue('--asc-ink')) || 1;     // CSS can darken the glyphs and readouts per piece
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.font = `${this.fs}px ${FONT}`;
      this.cw = g.measureText('M').width; this.ch = this.fs * 1.16;
      this.cols = Math.floor(W / this.cw); this.rows = Math.floor(H / this.ch);
      this.ox = (W - this.cols * this.cw) / 2; this.oy = (H - this.rows * this.ch) / 2;
      this.cx = W * (parseFloat(cs.getPropertyValue('--asc-x')) || +(this.host.dataset.ascX || .5)); this.cy = H * (parseFloat(cs.getPropertyValue('--asc-y')) || +(this.host.dataset.ascY || .5));
      this.S = Math.min(W, H) * (parseFloat(cs.getPropertyValue('--asc-fit')) || this.fit);   // CSS can override the fit per breakpoint
      const ds = Math.max(.004, this.cw * .5 / this.S);
      if (!this.cloud || Math.abs(ds - this.ds) / this.ds > .15) { this.cloud = SHAPES[this.shape](ds); this.ds = ds; }
      if (!this.orbs) this.orbs = (ORBITERS[this.orbit] || []).map((o) => ({ ...o }));
      // The page colour behind the piece, to fill the line drawings with.
      for (let el = this.host; el; el = el.parentElement) {
        const bg = getComputedStyle(el).backgroundColor;
        if (!/rgba\(.*,\s*0\)$/.test(bg) && bg !== 'transparent') { this.paper = bg; break; }
      }
      // A sparse field of stars behind the mark, for the orbiter looks.
      this.stars = this.orbs.length ? Array.from({ length: Math.round(W * H / 9000) }, (_, i) => [hash(i, 21) * W, hash(i, 23) * H, hash(i, 29) * TAU, hash(i, 31)]) : [];
      const n = this.cols * this.rows;
      this.zb = new Float32Array(n); this.lum = new Float32Array(n); this.kd = new Uint8Array(n);
      this.draw(performance.now());
    }
    project(x, y, z, r) {                                            // object space → screen, with the current turn
      const x1 = x * r.cY + z * r.sY, z1 = -x * r.sY + z * r.cY;
      const y2 = y * r.cX - z1 * r.sX, z2 = y * r.sX + z1 * r.cX, w = 4 / (4 + z2);
      return [this.cx + x1 * this.S * w, this.cy - y2 * this.S * w, z2, x1, z1];
    }
    draw(now) {
      if (!this.W || !this.cloud) return;
      const t = now / 1000, dt = this.prevT ? Math.min(.1, t - this.prevT) : 0;
      this.prevT = t;
      this.boost *= .92;
      if (!reduce) this.spin += this.speed * (1 + this.boost) * dt;
      this.dx += (this.tx - this.dx) * .08; this.dy += (this.ty - this.dy) * .08;
      const ry = (this.swing ? Math.sin(this.spin) * this.swing : this.spin) + this.dx, rx = this.tilt + this.dy;
      const r = { cY: Math.cos(ry), sY: Math.sin(ry), cX: Math.cos(rx), sX: Math.sin(rx) };
      const { g, cols, rows, cw, ch, zb, lum, kd, ox, oy, S, cx, cy } = this, { p, n, k, len } = this.cloud;
      zb.fill(0);
      for (let i = 0, j = 0; i < len; i++, j += 3) {
        const nx = n[j], ny = n[j + 1], nz = n[j + 2];
        const nx1 = nx * r.cY + nz * r.sY, nz1 = -nx * r.sY + nz * r.cY;
        const ny2 = ny * r.cX - nz1 * r.sX, nz2 = ny * r.sX + nz1 * r.cX;
        if (nz2 > .3) continue;                                       // facing away
        const x = p[j], y = p[j + 1], z = p[j + 2];
        const x1 = x * r.cY + z * r.sY, z1 = -x * r.sY + z * r.cY;
        const y2 = y * r.cX - z1 * r.sX, z2 = y * r.sX + z1 * r.cX, w = 4 / (4 + z2);
        const col = Math.floor((cx + x1 * S * w - ox) / cw), row = Math.floor((cy - y2 * S * w - oy) / ch);
        if (col < 0 || row < 0 || col >= cols || row >= rows) continue;
        const c = row * cols + col;
        if (w <= zb[c]) continue;
        zb[c] = w; kd[c] = k[i];
        lum[c] = nx1 * L[0] + ny2 * L[1] + nz2 * L[2];
      }

      // Hover: glyphs within HR of the cursor are nudged away and inked a step heavier. Only with a mouse.
      const HR = Math.max(48, Math.min(110, Math.min(this.W, this.H) * .18)), HR2 = HR * HR;
      let hv = 0, mx = -1e4, my = -1e4;
      if (mouse.on) {
        const b = this.host.getBoundingClientRect();
        mx = mouse.x - b.left; my = mouse.y - b.top;
        hv = mx > -HR && my > -HR && mx < this.W + HR && my < this.H + HR ? 1 : 0;
        if (!this.ownLean) { this.tx = hv * (mx / this.W - .5) * .3; this.ty = hv * (my / this.H - .5) * .14; }
      }
      this.hov += (hv - this.hov) * .12;
      if (this.hov > .01 && hv) { this.mx = mx; this.my = my; }
      const hov = this.hov, hx = this.mx, hy = this.my, ccw = cw / 2, cch = ch / 2;

      g.clearRect(0, 0, this.W, this.H);
      g.font = `${this.fs}px ${FONT}`; g.textBaseline = 'top';
      const boxes = [], hair = 1 / this.dpr;
      // Ink first, then the accent, so fillStyle changes twice a frame rather than per glyph.
      for (const pass of [0, 1]) {
        g.fillStyle = pass ? this.accent : this.ink;
        for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
          const c = row * cols + col;
          if (!zb[c] || (kd[c] ? 1 : 0) !== pass) continue;
          let x = ox + col * cw, y = oy + row * ch, f = 0;
          if (hov > .01) {
            const ddx = x + ccw - hx, ddy = y + cch - hy, d2 = ddx * ddx + ddy * ddy;
            if (d2 < HR2) {
              const d = Math.sqrt(d2) || 1; f = (1 - d / HR); f *= f * hov;
              x += ddx / d * f * 5; y += ddy / d * f * 4;
            }
          }
          if (pass) {
            const q = .5 + .25 * Math.sin(col * .9 + t * 2.6) + .25 * Math.sin(row * 1.7 - t * 1.9 + col * .3), M = this.solid ? SOLID_MELT : MELT;
            g.globalAlpha = Math.min(1, (this.solid ? .82 + .18 * q : .5 + .45 * q) + f * .4);
            this.put(M[Math.min(M.length - 1, (q + f * .5) * M.length | 0)], x, y);
            if (hash(col, row, t * 1.3 | 0) < .06) boxes.push(x, y, 1);
          } else if (this.solid) {
            // Solid: every face carries real ink. Lit faces start at a mid glyph instead of a dot.
            const s = Math.min(1, .38 + .62 * (1 - Math.max(0, lum[c])) + f * .3);
            g.globalAlpha = Math.min(1, .62 + .38 * s + f * .3);
            this.put(SOLID[Math.min(SOLID.length - 1, s * SOLID.length | 0)], x, y);
            if (hash(col, row, t * .7 | 0) < .01) boxes.push(x, y, 0);
          } else {
            const s = Math.min(1, (this.dark ? .15 + .85 * Math.max(0, lum[c]) : 1 - Math.max(0, lum[c])) + f * .45);   // on paper, shadowed faces carry more ink
            g.globalAlpha = Math.min(1, (.16 + .4 * s) * this.k + f * .3);
            g.fillText(RAMP[1 + Math.min(RAMP.length - 2, s * (RAMP.length - 1) | 0)], x, y);
            if (hash(col, row, t * .7 | 0) < .01) boxes.push(x, y, 0);
          }
        }
      }
      // A few cells get a hairline box, like a scan catching on them.
      g.lineWidth = hair;
      for (let i = 0; i < boxes.length; i += 3) {
        g.strokeStyle = boxes[i + 2] ? this.accent : this.ink;
        g.globalAlpha = boxes[i + 2] ? .65 : .3;
        g.strokeRect(boxes[i] - 1 + hair / 2, boxes[i + 1] + hair / 2, cw + 2 - hair, ch - hair);
      }
      if (this.notes === 'full') this.drawNotes(t, r, ry);
      if (this.notes === 'mini') this.drawMini(ry);
      g.globalAlpha = 1;
    }
    // A glyph; in the solid look it is drawn twice, a hair apart, for a bolder stroke than the mono face has.
    put(ch_, x, y) {
      this.g.fillText(ch_, x, y);
      if (this.solid) this.g.fillText(ch_, x + .55, y);
    }
    // Hero readouts: twinkling stars, the orbit ring and its satellite, and the angle the mark is turned to.
    drawNotes(t, r, ry) {
      const { g, W, H, dpr } = this, hair = 1 / dpr, lf = Math.max(9, Math.round(this.fs * .95));
      g.lineWidth = hair; g.strokeStyle = this.ink; g.fillStyle = this.ink;
      // Stars: tiny dots and the odd fine cross, twinkling, only where the mark isn't.
      const free = (x, y) => { const col = Math.floor((x - this.ox) / this.cw), row = Math.floor((y - this.oy) / this.ch); return col < 0 || row < 0 || col >= this.cols || row >= this.rows || !this.zb[row * this.cols + col]; };
      g.fillStyle = this.ink;
      for (const [x, y, ph, kind] of this.stars) {
        if (!free(x, y)) continue;
        const tw = .5 + .5 * Math.sin(t * 1.3 + ph);
        g.globalAlpha = .12 + .38 * tw * tw;
        if (kind > .85) { g.beginPath(); g.moveTo(x - 2.5, y); g.lineTo(x + 2.5, y); g.moveTo(x, y - 2.5); g.lineTo(x, y + 2.5); g.stroke(); }
        else { g.beginPath(); g.arc(x, y, kind > .5 ? .9 : .6, 0, TAU); g.fill(); }
      }
      // Orbit rings: solid in front, dotted behind.
      for (const o of this.orbs) {
        const ring = [];
        for (let i = 0; i <= 120; i++) ring.push(this.project(...orbitAt(o, i / 120 * TAU).P, r));
        for (const front of [true, false]) {
          g.beginPath(); g.globalAlpha = (front ? .34 : .16) * Math.min(this.k, 1.6); g.setLineDash(front ? [] : [1.5, 3.5]);
          for (let i = 1; i < ring.length; i++) {
            if ((ring[i][2] + ring[i - 1][2] < 0) !== front) continue;
            g.moveTo(ring[i - 1][0], ring[i - 1][1]); g.lineTo(ring[i][0], ring[i][1]);
          }
          g.stroke();
        }
      }
      g.setLineDash([]);
      for (const o of this.orbs) this.drawOrbiter(o, t, r, free);
      g.fillStyle = this.ink;

      // The angle readout, boxed, near the top right.
      const text = `θ ${deg(ry).toFixed(1).padStart(5, '0')}°`;
      g.font = `${lf}px ${FONT}`;
      const bw = g.measureText(text).width + 10, bh = lf + 8;
      const bx = Math.max(1, Math.min(W - bw - 1, .8 * W)), by = Math.max(1, Math.min(H - bh - 1, .06 * H - bh / 2));
      g.globalAlpha = Math.min(1, .55 * this.k); g.strokeRect(Math.round(bx) + hair / 2, Math.round(by) + hair / 2, Math.round(bw), Math.round(bh));
      g.globalAlpha = Math.min(1, .82 * this.k); g.fillText(text, bx + 5, by + 4.5);
    }
    // One orbiter as thin line art. On the far side of its orbit it is hidden wherever the mark covers it, and drawn
    // a little fainter elsewhere; on the near side it is filled with the page colour, so it covers the glyphs.
    drawOrbiter(o, t, r, free) {
      const { g, dpr } = this, a = o.a0 + (reduce ? 0 : t * o.w), q = orbitAt(o, a);
      const [x, y, z] = this.project(...q.P, r), back = z > 0;
      if (back && !free(x, y)) return;
      const sc = 4 / (4 + z), lw = Math.max(1 / dpr, .9);
      // Direction of travel on screen, and how foreshortened it is (short when flying toward or away from us).
      const e = .04, [x2, y2] = this.project(q.P[0] + q.T[0] * e, q.P[1] + q.T[1] * e, q.P[2] + q.T[2] * e, r);
      const ang = Math.atan2(y2 - y, x2 - x), fore = Math.max(.3, Math.min(1, Math.hypot(x2 - x, y2 - y) / (e * this.S * sc)));
      const alpha = back ? .55 : 1;
      g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round';
      g.save();
      g.translate(x, y); g.rotate(ang); g.scale(sc, sc);
      g.globalAlpha = alpha; g.strokeStyle = this.ink; g.fillStyle = this.paper || '#EFEDE8';
      const shape = (fn, stroke = this.ink) => { g.beginPath(); fn(); g.fill(); g.strokeStyle = stroke; g.stroke(); };
      if (o.is === 'satellite') {
        g.scale(fore, 1);
        g.strokeStyle = this.ink; g.beginPath(); g.moveTo(3, 0); g.lineTo(9, 0); g.stroke();       // antenna
        g.beginPath(); g.arc(10, 0, 1.2, 0, TAU); g.stroke();
        for (const sd of [-1, 1]) {
          g.beginPath(); g.moveTo(0, sd * 3); g.lineTo(0, sd * 4.5); g.stroke();                  // panel arm
          shape(() => g.rect(-2.6, sd > 0 ? 4.5 : -13.5, 5.2, 9), this.accent);
          g.beginPath(); for (const k of [1, 2]) { const yy = sd * (4.5 + k * 3); g.moveTo(-2.6, yy); g.lineTo(2.6, yy); } g.moveTo(0, sd * 4.5); g.lineTo(0, sd * 13.5); g.stroke();
        }
        shape(() => g.rect(-3, -3, 6, 6));
      }
      g.restore();
    }
    drawMini(ry) {
      const { g, H } = this, lf = Math.max(9, Math.round(this.fs * 1.25));
      g.font = `${lf}px ${FONT}`; g.fillStyle = this.ink; g.globalAlpha = .55; g.textBaseline = 'bottom';
      g.fillText(`θ ${deg(ry).toFixed(1).padStart(5, '0')}°`, 0, H - 1);
      g.textBaseline = 'top';
    }
  }

  /* ---------- Start up: one shared loop, each piece throttled and paused off screen ---------- */
  const items = [];
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const it = e.target.__asc; if (!it) return;
    it.visible = e.isIntersecting;
    if (e.isIntersecting && !it.seen) { it.seen = performance.now(); if (reduce) it.draw(it.seen); }
  }), { rootMargin: '80px' });

  const start = () => {
    document.querySelectorAll('.asc[data-asc]').forEach((el) => {
      const it = new GlyphObject(el); el.__asc = it; items.push(it); io.observe(el);
    });

    // Desktop: the hero mark gets exactly the space the words leave, right of the headline's lower lines and of the
    // intro, and below the headline's first line. The canvas can't draw outside its box, so no glyph reaches the text.
    // The headline is measured from an untransformed copy, because its words are moved while they rise in.
    const fitHero = () => {
      const host = document.querySelector('.hero .hero-obj');
      if (!host) return;
      ['left', 'top', 'width', 'height', 'right', '--asc-x', '--asc-y', '--asc-fit'].forEach((k) => host.style.removeProperty(k));
      if (innerWidth <= 900) return;
      const wrap = host.parentElement, title = wrap.querySelector('.hero-title'), intro = wrap.querySelector('.hero-intro');
      const Wr = wrap.getBoundingClientRect(), inR = Wr.right - parseFloat(getComputedStyle(wrap).paddingRight);
      const T = title.getBoundingClientRect();
      const copy = title.cloneNode(true);
      copy.querySelectorAll('*').forEach((e) => { e.style.transform = 'none'; });
      Object.assign(copy.style, { position: 'absolute', visibility: 'hidden', margin: '0', left: `${T.left - Wr.left}px`, top: `${T.top - Wr.top}px`, width: `${T.width}px` });
      wrap.appendChild(copy);
      const C = copy.getBoundingClientRect(), lh = parseFloat(getComputedStyle(copy).lineHeight), n = Math.max(1, Math.round(C.height / lh));
      const range = document.createRange(); range.selectNodeContents(copy);
      const right = Array(n).fill(C.left);
      [...range.getClientRects()].filter((r) => r.width > 1).forEach((r) => {
        const i = Math.min(n - 1, Math.max(0, Math.floor((r.top + r.height / 2 - C.top) / lh)));
        right[i] = Math.max(right[i], r.right);
      });
      copy.remove();
      const gap = 40, I = intro.getBoundingClientRect();
      const x0 = Math.max(...right.slice(1), I.right) + gap, x1 = inR;
      const y0 = C.top + lh * 1.18, y1 = Wr.bottom;           // 1.18: clear of the first line's descenders
      const w = x1 - x0, h = Math.min(y1 - y0, w * .62);
      if (w < 220) { host.style.width = '0px'; return; }      // no room: leave the mark out rather than crowd the words
      Object.assign(host.style, { right: 'auto', left: `${x0 - Wr.left}px`, top: `${y0 - Wr.top + (y1 - y0 - h) / 2}px`, width: `${w}px`, height: `${h}px` });
      host.style.setProperty('--asc-x', '.5'); host.style.setProperty('--asc-y', '.52');
      // Size by the mark itself: its orbits (1.2 wide) just fit the box width, so the mark is as big as it was before
      // it was moved clear of the words (Darius, 2026-10-23).
      const S = Math.min(w / 1.24, h / .6);
      host.style.setProperty('--asc-fit', (S / Math.min(w, h)).toFixed(3));
    };
    fitHero();
    let fr; addEventListener('resize', () => { clearTimeout(fr); fr = setTimeout(fitHero, 120); });

    // The hero mark leans toward the pointer, can be spun with a drag, and spins faster while scrolling.
    const hero = document.querySelector('.hero .asc');
    if (hero && !reduce) {
      const it = hero.__asc, sec = hero.closest('.hero');
      it.ownLean = true;                                           // it leans across the whole hero, not just its box
      sec.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const b = sec.getBoundingClientRect();
        it.tx = ((e.clientX - b.left) / b.width - .5) * .5;
        it.ty = ((e.clientY - b.top) / b.height - .5) * .22;
      });
      sec.addEventListener('pointerleave', () => { it.tx = it.ty = 0; });
      let drag = null;
      hero.addEventListener('pointerdown', (e) => { drag = e.clientX; hero.setPointerCapture(e.pointerId); });
      hero.addEventListener('pointermove', (e) => { if (drag == null) return; it.spin += (e.clientX - drag) * .012; drag = e.clientX; });
      hero.addEventListener('pointerup', () => { drag = null; });
      hero.addEventListener('pointercancel', () => { drag = null; });
      let lastY = scrollY;
      addEventListener('scroll', () => { it.boost = Math.min(4, it.boost + Math.abs(scrollY - lastY) * .01); lastY = scrollY; }, { passive: true });
    }

    if (reduce) return;
    const tick = (now) => {
      requestAnimationFrame(tick);
      for (const it of items) {
        if (!it.visible || now - it.last < 1000 / it.fps - 3) continue;
        it.last = now;
        it.draw(now);
      }
    };
    requestAnimationFrame(tick);
  };

  // Wait for the mono face so the first frame measures the right glyph width.
  const ready = document.fonts && document.fonts.load ? document.fonts.load(`10px ${FONT}`).catch(() => {}) : Promise.resolve();
  Promise.race([ready, new Promise((r) => setTimeout(r, 1500))]).then(start);
})();
