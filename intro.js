/* Crucible Ventures — the opening animation (home page only), Oct 2026.
   Resolve: the first screen of the page is typed out as ASCII in its exact layout (the headline as
   letters, smaller text as line blocks, buttons as blocks, the logo and the ASCII crucible as
   themselves), then it resolves into the real page cell by cell, each cell flickering once before it
   flips, loosely top to bottom. The real page is already in place underneath the whole time, so there
   is no seam between intro and page. Drawn on one canvas from a time t that main.js runs on a GSAP
   timeline, so a replay is exact. The paper cover is a one-pixel-per-cell map scaled up without
   smoothing, so its edges are always whole character cells. (Four other versions, Burn, Print,
   Through and Rain, were tried on 17 Oct 2026 and dropped.) */
window.cvIntro = (() => {
  const d = document.documentElement;
  const $ = (s) => document.querySelector(s);
  const cv = $('.intro-glyphs');
  if (!cv) return null;
  const FONT = '"Fragment Mono", ui-monospace, Menlo, monospace';
  const RAMP = ' .:-=+*', NOISE = '.:-=+*~/\\|<>';
  const MARK_C = 'M532.64 314H391A84 84 0 0 0 391 482H511.61L533.94 440H395A42 42 0 0 1 395 356H554.97Z';
  const MARK_V = 'M510.92 369L561.88 369L587 416.24L641.36 314L692.33 314L603 482L571 482Z';
  const VB = [300, 307, 399.33, 182];
  const hash = (a, b, c = 0) => {
    let h = Math.imul((a * 374761393 + b * 668265263 + c * 1274126177) | 0, 1103515245);
    h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
  };
  const g = cv.getContext('2d');
  const map = document.createElement('canvas'), mg = map.getContext('2d');      // the cover, one pixel per cell
  let W, H, dpr, fs, cw, ch, cols, rows, N, ink, blue, paper, img;
  let chr, alp, isBlue, born, seed;                                               // what each cell shows when covered
  let contentReady;

  /* ---------- Grid and drawing ---------- */
  const grid = () => {
    W = innerWidth; H = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    fs = W < 640 ? 9 : 11;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.font = `${fs}px ${FONT}`;
    cw = g.measureText('M').width; ch = fs * 1.2;
    cols = Math.ceil(W / cw); rows = Math.ceil(H / ch); N = cols * rows;
    map.width = cols; map.height = rows; img = mg.createImageData(cols, rows);
    const cs = getComputedStyle(d);
    ink = cs.getPropertyValue('--ink').trim() || '#121316';
    blue = cs.getPropertyValue('--blue').trim() || '#4F6AED';
    paper = cs.getPropertyValue('--paper').trim() || '#EFEDE8';
    const p = parseInt(paper.slice(1), 16);
    for (let i = 0; i < N; i++) { img.data[i * 4] = p >> 16; img.data[i * 4 + 1] = (p >> 8) & 255; img.data[i * 4 + 2] = p & 255; }
    chr = new Array(N).fill(''); alp = new Float32Array(N); isBlue = new Uint8Array(N); born = new Float32Array(N); seed = new Float32Array(N);
    for (let i = 0; i < N; i++) seed[i] = hash(i % cols, i / cols | 0, 7);
  };
  // Draw something in page pixels and get back how much of each cell it covers, and how much of that is blue.
  const sample = (paint, S = 3) => {
    const o = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    o.canvas.width = cols * S; o.canvas.height = rows * S;
    o.setTransform(S / cw, 0, 0, S / ch, 0, 0);
    paint(o);
    const px = o.getImageData(0, 0, cols * S, rows * S).data, cov = new Float32Array(N), bl = new Uint8Array(N);
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      let a = 0, b = 0;
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        const q = ((row * S + j) * cols * S + col * S + i) * 4;
        a += px[q + 3]; b += Math.max(0, px[q + 2] - px[q]) * px[q + 3] / 255;
      }
      cov[row * cols + col] = a / (S * S * 255);
      bl[row * cols + col] = b > a * .35 ? 1 : 0;
    }
    return { cov, bl };
  };
  let qx = [], qy = [], qa = [], qc = [], qb = [];
  const put = (x, y, c, a, b) => { if (a > .01 && c) { qx.push(x); qy.push(y); qc.push(c); qa.push(a); qb.push(b); } };
  const flush = () => {
    g.font = `${fs}px ${FONT}`; g.textBaseline = 'top';
    for (const pass of [0, 1]) {
      g.fillStyle = pass ? blue : ink;
      for (let k = 0; k < qx.length; k++) if (qb[k] === pass) { g.globalAlpha = qa[k]; g.fillText(qc[k], qx[k], qy[k]); }
    }
    g.globalAlpha = 1;
    qx = []; qy = []; qa = []; qc = []; qb = [];
  };
  const cover = (alpha) => {                                     // alpha(i) → 0..1, paper over that cell
    for (let i = 0; i < N; i++) img.data[i * 4 + 3] = alpha(i) * 255;
    mg.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(map, 0, 0, cols, rows, 0, 0, cols * cw, rows * ch);
  };
  const clear = () => { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); };
  // A covered cell's own glyph, flickering through noise for a moment after it is born.
  const glyph = (i, t, flick = .16) => {
    const p = (t - born[i]) / flick;
    if (!chr[i] || p <= 0) return null;
    if (p < 1) return [NOISE[hash(i, t * 22 | 0) * NOISE.length | 0], .12 + .4 * p];
    return [chr[i], alp[i]];
  };

  /* ---------- What the cover carries ---------- */
  // The page as type: the nav and the hero, read from the live layout. Big words are drawn as letters,
  // smaller text as solid line blocks (at this size it reads as text either way), dark buttons as
  // dense blocks, the logo and the ASCII crucible as themselves.
  const page = () => {
    const vis = (r) => r.width > 0 && r.bottom > 0 && r.top < H;
    const { cov, bl } = sample((o) => {
      const roots = [$('.nav'), $('.hero')].filter(Boolean);
      for (const root of roots) {
        const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = tw.nextNode(); n; n = tw.nextNode()) {
          if (!n.textContent.trim()) continue;
          const el = n.parentElement, cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || el.closest('.btn-ink, .menu-btn, .sr, [aria-hidden="true"]')) continue;
          o.fillStyle = el.closest('.hero-title .hl') ? '#00f' : '#f00';
          if (el.classList.contains('wi')) {
            const r = el.parentElement.getBoundingClientRect();
            if (!vis(r)) continue;
            o.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; o.textBaseline = 'middle';
            o.fillText(n.textContent, r.left, r.top + r.height * .52);
            continue;
          }
          const range = document.createRange(); range.selectNodeContents(n);
          o.globalAlpha = .55;
          for (const r of range.getClientRects()) if (vis(r)) o.fillRect(r.left, r.top + r.height * .28, r.width, r.height * .44);
          o.globalAlpha = 1;
        }
        root.querySelectorAll('.btn-ink').forEach((b) => { const r = b.getBoundingClientRect(); if (vis(r)) { o.fillStyle = '#f00'; o.fillRect(r.left, r.top, r.width, r.height); } });
        root.querySelectorAll('.btn:not(.btn-ink)').forEach((b) => { const r = b.getBoundingClientRect(); if (vis(r)) { o.strokeStyle = '#f00'; o.lineWidth = ch * .5; o.strokeRect(r.left, r.top, r.width, r.height); } });
      }
      const meta = $('.hero-meta');
      if (meta) { const r = meta.getBoundingClientRect(); o.fillStyle = '#f00'; o.globalAlpha = .3; o.fillRect(r.left, r.bottom - ch * .2, r.width, ch * .4); o.globalAlpha = 1; }
      const bm = $('.nav .brand-mark');
      if (bm) {
        const r = bm.getBoundingClientRect(), k = r.width / VB[2];
        o.save(); o.transform(k, 0, 0, k, r.left - VB[0] * k, r.top - VB[1] * k);
        o.fillStyle = '#f00'; o.fill(new Path2D(MARK_C)); o.fillStyle = '#00f'; o.fill(new Path2D(MARK_V)); o.restore();
      }
      const asc = $('.hero-obj canvas');
      if (asc && asc.width && getComputedStyle(asc.parentElement).display !== 'none') {
        const r = asc.getBoundingClientRect();
        o.globalAlpha = 1; o.drawImage(asc, r.left, r.top, r.width, r.height);
      }
    });
    for (let i = 0; i < N; i++) {
      const c = cov[i];
      if (c < .06) continue;
      chr[i] = RAMP[1 + Math.min(RAMP.length - 2, c * (RAMP.length - 1) * 1.15 | 0)];
      alp[i] = .4 + .5 * Math.min(1, c * 1.3); isBlue[i] = bl[i];
    }
    return cov;
  };

  /* ---------- Resolve ---------- */
  const R = {
    T: 1.5,
    setup() { contentReady = false; },
    draw(t) {
      if (!contentReady && t > .04) {
        page();
        for (let i = 0; i < N; i++) born[i] = .06 + ((i / cols | 0) / rows) * .35 + ((i % cols) / cols) * .06 + seed[i] * .04;
        contentReady = true;
      }
      const out = (i) => .78 + ((i / cols | 0) / rows) * .3 + seed[i] * .32;
      cover((i) => (t < out(i) ? 1 : 0));
      for (let i = 0; i < N; i++) {
        if (!chr[i] || t >= out(i)) continue;
        const x = (i % cols) * cw, y = (i / cols | 0) * ch;
        if (t > out(i) - .07) { put(x, y, NOISE[hash(i, t * 30 | 0) * NOISE.length | 0], .4, isBlue[i]); continue; }
        const gl = glyph(i, t, .12);
        if (gl) put(x, y, gl[0], gl[1], isBlue[i]);
      }
    },
  };

  return {
    start() {
      grid();
      R.setup();
      return { T: R.T, heroStatic: true, draw(t) { clear(); R.draw(t); flush(); } };
    },
  };
})();
