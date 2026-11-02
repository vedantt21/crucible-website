/* Crucible Ventures — section separators, Oct 2026. Draw-in (picked 2026-10-26): each section's top rule draws
   across the page, led by a short blue head, the first time the section comes up the screen. */
(() => {
  const main = document.querySelector('main');
  if (!main) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Everything after the first block (hero or page head) gets a line, sections and the next-page link alike.
  [...main.children].slice(1).filter((el) => el.matches('section, .next')).forEach((el) => {
    const sep = document.createElement('div');
    sep.className = 'sep';
    sep.setAttribute('aria-hidden', 'true');
    sep.innerHTML = '<i class="sep-line"></i>';
    el.prepend(sep);
    el.classList.add('has-sep');
  });

  // Each line draws across once, the first time its section comes up the screen.
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.sep').forEach((s) => (reduce ? s.classList.add('is-in') : io.observe(s)));
})();
