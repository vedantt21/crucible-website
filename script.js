const intro = document.querySelector("[data-scroll-intro]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const body = document.body;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

if (intro && !prefersReducedMotion.matches) {
  let ticking = false;
  let headerTimer = null;
  let pastIntro = false;

  const clearHeaderTimer = () => {
    if (headerTimer) {
      window.clearTimeout(headerTimer);
      headerTimer = null;
    }
  };

  const engageHeader = () => {
    if (!pastIntro) {
      return;
    }

    body.classList.add("header-visible");
    clearHeaderTimer();
    headerTimer = window.setTimeout(() => {
      body.classList.remove("header-visible");
    }, 2600);
  };

  const updatePageState = () => {
    const rect = intro.getBoundingClientRect();
    const scrollable = Math.max(intro.offsetHeight - window.innerHeight, 1);
    const progress = clamp(-rect.top / scrollable, 0, 1);
    const nextPastIntro = progress > 0.62;

    intro.style.setProperty("--intro-progress", progress.toFixed(4));

    if (nextPastIntro !== pastIntro) {
      pastIntro = nextPastIntro;

      if (pastIntro) {
        engageHeader();
      } else {
        clearHeaderTimer();
        body.classList.remove("header-visible");
      }
    }

    ticking = false;
  };

  const requestTick = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(updatePageState);
  };

  updatePageState();
  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("scroll", engageHeader, { passive: true });
  window.addEventListener("resize", requestTick);
  window.addEventListener("pointermove", engageHeader, { passive: true });
  window.addEventListener("pointerdown", engageHeader, { passive: true });
  window.addEventListener("touchstart", engageHeader, { passive: true });
  window.addEventListener("keydown", engageHeader);
} else if (intro) {
  intro.style.setProperty("--intro-progress", "1");
  body.classList.add("header-visible");
}
