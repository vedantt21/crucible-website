/* Crucible Ventures — redesign. Motion: Lenis + GSAP ScrollTrigger. */
(() => {
  const d = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  if (!hasGSAP) d.classList.remove('anim', 'intro-on');
  if (hasGSAP) { gsap.registerPlugin(ScrollTrigger); gsap.config({ nullTargetWarn: false }); }

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({
      duration: 1.35,                                           // the slower glide
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.9,
    });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  window.__lenis = lenis; // handy for testing in devtools
  const scrollToEl = (el, opts = {}) => {
    if (lenis) lenis.scrollTo(el, { offset: -8, duration: 1.6, ...opts });
    else (typeof el === 'number' ? window.scrollTo(0, el) : el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }));
  };

  /* ---------- Nav: always there. Frosted glass once the page moves; dark glass over dark sections (2026-10-23) ---------- */
  // What's under the middle of the bar decides: a photo band counts as dark, otherwise the nearest solid background's
  // brightness does. Crucible's feedback asked for a see-through header rather than one that disappears.
  const nav = $('.nav');
  const lumOf = (el) => {
    for (; el && el !== document.documentElement; el = el.parentElement) {
      if (el.closest('.band')) return 0;
      const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
      if (m && (m[3] == null || +m[3] > .5)) return (.2126 * m[0] + .7152 * m[1] + .0722 * m[2]) / 255;
    }
    return 1;
  };
  let navTick = false;
  const navTone = () => {
    navTick = false;
    const y = nav.offsetHeight / 2, under = document.elementsFromPoint(innerWidth / 2, y).find((el) => !el.closest('.nav, .menu, .cur'));
    nav.classList.toggle('is-dark', lumOf(under) < .4);
  };
  const onScroll = (y) => {
    nav.classList.toggle('is-solid', y > 24);
    if (!navTick) { navTick = true; requestAnimationFrame(navTone); }
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  addEventListener('load', () => onScroll(scrollY));
  onScroll(scrollY);

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('.menu-btn');
  const setMenu = (open) => {
    d.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open);
    $('#menu').setAttribute('aria-hidden', !open);
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  menuBtn.addEventListener('click', () => setMenu(!d.classList.contains('menu-open')));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Anchor links ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    const wasOpen = d.classList.contains('menu-open');
    setMenu(false);
    if (a.dataset.audience && $('#f-who')) $('#f-who').value = a.dataset.audience;   // home page: pre-fill "I'm a"
    setTimeout(() => scrollToEl(target), wasOpen ? 350 : 0);
    if (id === '#contact' && $('#f-name')) setTimeout(() => $('#f-name').focus({ preventScroll: true }), 1700);
  });

  /* ---------- "What's included" toggles ---------- */
  $$('.incl-btn').forEach((btn) => btn.addEventListener('click', () => {
    const step = btn.closest('.step');
    const open = !step.classList.contains('is-open');
    step.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open);
    if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 600);
  }));

  /* ---------- "Seven ways in" rows (open on every screen size) ---------- */
  $$('.svc-row').forEach((btn) => btn.addEventListener('click', () => {
    const row = btn.closest('li');
    const open = !row.classList.contains('is-open');
    row.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open);
    if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 600);
  }));

  /* ---------- Contact form: email delivery through FormSubmit ---------- */
  const form = $('.contact-form');
  let sending = false;
  const who = new URLSearchParams(location.search).get('who');   // set by the "Who we work with" links
  if (form && who && $(`#f-who option[value="${CSS.escape(who)}"]`)) $('#f-who').value = who;
  if (form) form.noValidate = true; // Keep native validation available if JavaScript does not load.
  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending || form.elements.namedItem('_honey').value) return;
    const msg = $('.form-msg', form);
    const fields = $$('input[required], select[required], textarea[required]', form);
    let firstBad = null;
    fields.forEach((f) => {
      if (f.tagName !== 'SELECT') f.value = f.value.trim();
      const bad = !f.checkValidity();
      f.setAttribute('aria-invalid', bad);
      if (bad && !firstBad) firstBad = f;
    });
    if (firstBad) {
      msg.textContent = firstBad.type === 'email' && firstBad.value ? 'That email address looks wrong.' : 'Please fill in every field.';
      firstBad.focus();
      return;
    }

    const button = $('button[type="submit"]', form);
    const label = $('span', button);
    const originalLabel = label.textContent;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const data = new FormData(form);
    const audience = form.elements.namedItem('who');
    data.set('who', audience.selectedOptions[0].textContent);
    data.set('_replyto', form.elements.namedItem('email').value);
    data.set('_url', location.href.split('#')[0]);
    const endpoint = new URL(form.action);
    endpoint.pathname = '/ajax' + endpoint.pathname;
    sending = true;
    button.disabled = true;
    label.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    msg.textContent = 'Sending your message…';

    try {
      const response = await fetch(endpoint.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(data)),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || (result.success !== true && result.success !== 'true')) throw new Error('Submission was not accepted.');
      form.innerHTML = '<div class="form-done" role="status" tabindex="-1"><p class="h3">Thanks, your message has been submitted.</p><p>We\'ll reply within a few days. If it\'s urgent, email <a href="mailto:admin@crucibleventures.vc">admin@crucibleventures.vc</a>.</p></div>';
      $('.form-done', form).focus({ preventScroll: true });
      if (hasGSAP) ScrollTrigger.refresh();
    } catch {
      msg.textContent = 'Your message could not be sent. Please try again or email admin@crucibleventures.vc directly.';
    } finally {
      clearTimeout(timeout);
      sending = false;
      button.disabled = false;
      label.textContent = originalLabel;
      form.removeAttribute('aria-busy');
    }
  });

  /* ---------- Custom cursor: the frame (styles.css) ---------- */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const cur = document.createElement('div');
    cur.className = 'cur';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<i class="cur-a"></i><i class="cur-b"></i><i class="cur-l"><span class="cur-lbl"></span></i>';
    document.body.appendChild(cur);
    d.classList.add('cursor-on');
    const [ca, cb, cl] = cur.children;
    const lbl = $('.cur-lbl', cur);
    const LAG = 0.42;                                       // share of the gap the trailing square closes each frame
    let mx = -100, my = -100, bx = mx, by = my, last = performance.now();

    const read = (t) => {                                   // what is under the pointer
      t = t instanceof Element ? t : null;
      const drag = !!t?.closest('.gallery-track.is-marquee');
      cur.classList.toggle('is-drag', drag);
      cur.classList.toggle('is-link', !drag && !!t?.closest('a, button, label, select, [role="button"]'));
      cur.classList.toggle('is-dark', !!t?.closest('.footer, .fig, .btn-ink, .btn-blue, .tone-night, .tone-blue, .tone-graphite, .band, .contact'));
      cur.classList.toggle('is-text', !!t?.closest('input, textarea'));
      lbl.textContent = drag ? 'Drag' : '';
    };
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (!cur.classList.contains('is-on')) { bx = mx; by = my; cur.classList.add('is-on'); }
      read(e.target);
    }, { passive: true });
    addEventListener('scroll', () => read(document.elementFromPoint(mx, my)), { passive: true });   // the page moved under a still mouse
    d.addEventListener('mouseleave', () => cur.classList.remove('is-on'));
    addEventListener('pagehide', () => { try { sessionStorage.setItem('cv-cur', `${mx},${my}`); } catch (e) {} });
    try {                                                   // arrived from another page: start where the mouse was
      const [sx, sy] = (sessionStorage.getItem('cv-cur') || '').split(',').map(Number);
      if (sx > 0 && sy > 0) { mx = bx = sx; my = by = sy; cur.classList.add('is-on'); read(document.elementFromPoint(mx, my)); }
    } catch (e) {}
    addEventListener('pointerdown', () => cur.classList.add('is-down'));
    addEventListener('pointerup', () => cur.classList.remove('is-down'));

    const tick = (now) => {
      const dt = Math.max(1, Math.min(64, now - last)); last = now;
      const k = reduce ? 1 : 1 - Math.pow(1 - LAG, dt / 16.7);
      bx += (mx - bx) * k; by += (my - by) * k;
      ca.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      cb.style.transform = `translate3d(${bx}px, ${by}px, 0)`;
      cl.style.transform = cb.style.transform;               // the label rides with the square
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ================= Motion ================= */
  if (!hasGSAP) return;

  // Wrap each word in a mask so it can rise into place.
  const splitWords = (el) => {
    if (!el.dataset.splitDone) {
      el.dataset.splitDone = '1';
      const walk = (node) => {
        [...node.childNodes].forEach((n) => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              const o = document.createElement('span'); o.className = 'w';
              const i = document.createElement('span'); i.className = 'wi'; i.textContent = part;
              o.appendChild(i); frag.appendChild(o);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1) walk(n);
        });
      };
      walk(el);
    }
    return $$('.wi', el);
  };

  if (reduce) {
    gsap.set('[data-split], [data-hero-title]', { visibility: 'visible' });
    return;
  }

  /* ---------- Hero entrance ---------- */
  const heroTitle = $('[data-hero-title]');               // the home hero, or a page's title
  const heroWords = heroTitle ? splitWords(heroTitle) : [];
  const heroIn = () => {
    gsap.set(heroTitle, { visibility: 'visible' });
    const tl = gsap.timeline();
    tl.fromTo(heroWords, { yPercent: 115 }, { yPercent: 0, duration: 1.25, ease: 'expo.out', stagger: 0.06 })
      .to('.hl', { '--hl': 1, duration: 0.9, ease: 'expo.inOut' }, 0.55)
      .fromTo('[data-hero]', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.1 }, 0.35);
    return tl;
  };
  const heroReset = () => {
    gsap.set(heroWords, { yPercent: 115 });
    gsap.set('[data-hero]', { opacity: 0 });
    gsap.set('.hl', { '--hl': 0 });
  };

  /* ---------- Opening animation (home only; drawn by intro.js) ---------- */
  const intro = $('#intro');
  const heroShow = () => {                                // the hero in its final state, for versions that uncover it as it is
    gsap.set(heroTitle, { visibility: 'visible' });
    gsap.set(heroWords, { yPercent: 0 });
    gsap.set('.hl', { '--hl': 1 });
    gsap.set('[data-hero]', { opacity: 1, y: 0 });
  };
  let introTl = null;
  const playIntro = () => {
    if (introTl) introTl.kill();
    const run = window.cvIntro && window.cvIntro.start();
    if (!run) { d.classList.remove('intro-on'); heroIn(); return; }
    d.classList.add('intro-on');
    if (lenis) lenis.stop();
    if (run.heroStatic) heroShow();
    const st = { t: 0 };
    run.draw(0);
    d.classList.add('intro-live');                        // the canvas now carries the paper, so the panel's own can go
    const tl = introTl = gsap.timeline();
    tl.to(st, { t: run.T, duration: run.T, ease: 'none', onUpdate: () => run.draw(st.t) });
    if (!run.heroStatic) tl.add(() => heroIn(), run.heroAt);
    tl.add(() => {
      d.classList.remove('intro-on', 'intro-live');
      try { sessionStorage.setItem('cv-intro', '1'); } catch (e) {}
      if (lenis) lenis.start();
      ScrollTrigger.refresh();
      removeSkip();
    }, run.T);

    // A scroll, tap or key plays the rest quickly rather than cutting it, so it still lands cleanly.
    const skip = (e) => {
      if (e && e.type === 'keydown' && e.key === 'Tab') return;
      tl.timeScale(5);
    };
    const btn = $('.intro-skip');
    const removeSkip = () => {
      btn.removeEventListener('click', skip);
      ['wheel', 'touchstart', 'keydown'].forEach((t) => removeEventListener(t, skip));
    };
    btn.addEventListener('click', skip);
    ['wheel', 'touchstart', 'keydown'].forEach((t) => addEventListener(t, skip, { passive: true }));
  };

  const startPage = () => {
    if (intro && d.classList.contains('intro-on')) playIntro();
    else if (heroTitle) gsap.delayedCall(intro ? 0 : 0.55, heroIn);   // other pages: let the new page slide most of the way in first
  };
  // Wait for fonts so word masks are measured with the real typeface.
  (document.fonts ? Promise.all([document.fonts.ready, document.fonts.load('10px "Fragment Mono"').catch(() => {})]) : Promise.resolve()).then(startPage);

  /* ---------- Scroll reveals ---------- */
  // Headings: words rise out of a mask.
  $$('[data-split]').forEach((el) => {
    const words = splitWords(el);
    gsap.set(el, { visibility: 'visible' });
    gsap.set(words, { yPercent: 115 });
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: 0.045 }),
    });
  });

  // Everything else: a quiet fade up.
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.08 }),
  });

  // Statement: words light up as you read down.
  const scrub = $('[data-scrub]');
  if (scrub) gsap.fromTo(splitWords(scrub), { opacity: 0.14 }, {
    opacity: 1, ease: 'none', stagger: 0.1,
    scrollTrigger: { trigger: scrub, start: 'top 78%', end: 'bottom 52%', scrub: 0.6 },
  });

  // Project drawings: the sheet opens, the object draws itself, then the blue part,
  // the dimensions and the numbered callouts come in. Layers come from build_drawings.py.
  $$('[data-clip]').forEach((fig) => {
    const svg = $('svg', fig);
    const ink = $$('.s-ink :is(path, line, polyline, rect, circle, ellipse)', svg).filter((s) => !s.classList.contains('mask'));
    ink.forEach((s) => {
      const l = Math.ceil(s.getTotalLength ? s.getTotalLength() : 400) + 1;
      gsap.set(s, { strokeDasharray: l, strokeDashoffset: l });
    });
    const pts = $$('.pts circle', svg);
    const notes = $$('.s-note > *', svg);
    gsap.set([$('.s-sheet', svg), ...$$('.s-fill > :not(.pts)', svg), ...pts, ...notes], { opacity: 0 });
    gsap.set(fig, { clipPath: 'inset(0% 0% 100% 0%)' });
    ScrollTrigger.create({
      trigger: fig, start: 'top 82%', once: true,
      onEnter: () => {
        gsap.timeline()
          .to(fig, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut' })
          .to($('.s-sheet', svg), { opacity: 1, duration: 0.8 }, 0.5)
          .to(ink, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: 0.035 }, 0.6)
          .to($$('.s-fill > :not(.pts)', svg), { opacity: 1, duration: 0.9, ease: 'power1.out' }, 1.7)
          .to(pts, { opacity: 1, duration: 0.25, stagger: 0.025 }, 1.8)
          .to(notes, { opacity: 1, duration: 0.5, stagger: 0.05 }, 2);
      },
    });
  });

  // Image bands: the picture drifts a little slower than the page.
  $$('.band img, .statement-ph img').forEach((img) => gsap.fromTo(img, { yPercent: -6 }, {
    yPercent: 6, ease: 'none',
    scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
  }));

  // Community: the photo strip drifts sideways on its own and loops, all the time. It never pins the page.
  // A sideways trackpad swipe or a drag takes over; when the hand lets go it coasts, then the drift picks up again.
  const track = $('.gallery-track');
  if (track && !reduce) {
    const SPEED = 26;                                   // px per second
    const RESUME = 900;                                 // ms after the last touch before drifting again
    const originals = [...track.children];
    originals.forEach((el) => {                         // one copy of the set, so the loop has no seam
      const copy = el.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      $$('img', copy).forEach((img) => { img.alt = ''; });
      track.appendChild(copy);
    });
    track.classList.add('is-marquee');
    track.scrollLeft = 0;

    let x = 0, speed = SPEED, fling = 0, held = 0, loop = 0, onScreen = false, drag = null;
    const measure = () => { loop = track.children[originals.length].offsetLeft - originals[0].offsetLeft; };
    const wrap = (v) => (loop ? ((v % loop) - loop) % loop : v);
    const touch = () => { held = performance.now() + RESUME; speed = 0; };
    measure();
    addEventListener('resize', measure);
    addEventListener('load', measure);
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(track);

    gsap.ticker.add((time, dt) => {
      if (!onScreen || !loop) return;
      const s = Math.min(dt, 50) / 1000;
      if (!drag) {
        x += fling * s;                                 // coast after a drag
        fling *= Math.pow(0.03, s);
        if (performance.now() > held) speed += (SPEED - speed) * Math.min(1, s * 1.5);   // ease back up to the drift
        x -= speed * s;
      }
      x = wrap(x);
      track.style.transform = `translate3d(${x}px, 0, 0)`;
    });

    // Sideways wheel / trackpad swipe moves the strip. Up-and-down scrolling is left alone, so the page never sticks.
    track.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      x -= e.deltaX;
      fling = 0;
      touch();
    }, { passive: false });

    track.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      drag = { from: e.clientX, x0: x, id: e.pointerId, lastX: e.clientX, lastT: performance.now(), v: 0 };
      fling = 0;
      touch();
      track.classList.add('is-dragging');
    });
    track.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!track.hasPointerCapture(e.pointerId) && Math.abs(e.clientX - drag.from) > 4) track.setPointerCapture(e.pointerId);
      const now = performance.now();
      drag.v = (e.clientX - drag.lastX) / Math.max(1, now - drag.lastT) * 1000;
      drag.lastX = e.clientX; drag.lastT = now;
      x = drag.x0 + (e.clientX - drag.from);
      touch();
    });
    const release = () => {
      if (!drag) return;
      if (performance.now() - drag.lastT < 80) fling = Math.max(-2500, Math.min(2500, drag.v));
      drag = null;
      track.classList.remove('is-dragging');
      touch();
    };
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);

    gsap.from(originals, {
      opacity: 0, y: 40, duration: 1.1, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: track, start: 'top 85%', once: true },
    });
  }

  // Re-measure once images have loaded.
  addEventListener('load', () => ScrollTrigger.refresh());
})();
