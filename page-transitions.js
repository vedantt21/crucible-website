const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const body = document.body;
const pageFrame = document.querySelector(".page-transition-frame");
const pageShell = document.querySelector(".page-transition-shell");
const aboutTransitionLinks = document.querySelectorAll('a[href$="about.html"]');

const ABOUT_TRANSITION_DURATION_MS = 880;

let aboutTransitionTimeoutId = 0;
let isAboutTransitionActive = false;

const clearAboutTransition = () => {
  isAboutTransitionActive = false;

  if (aboutTransitionTimeoutId) {
    window.clearTimeout(aboutTransitionTimeoutId);
    aboutTransitionTimeoutId = 0;
  }

  body.classList.remove("about-transition-active");
  body.style.removeProperty("--page-scroll-y");

  if (pageFrame) {
    pageFrame.style.removeProperty("--page-transition-height");
  }
};

const isSamePage = (link) => {
  const targetUrl = new URL(link.getAttribute("href"), window.location.href);
  return targetUrl.href === window.location.href;
};

const shouldHandleAboutTransition = (event, link) => {
  if (!pageFrame || !pageShell || prefersReducedMotion.matches) {
    return false;
  }

  if (isSamePage(link)) {
    return false;
  }

  if (event.defaultPrevented || event.button !== 0) {
    return false;
  }

  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  if (link.target && link.target !== "_self") {
    return false;
  }

  return !link.hasAttribute("download");
};

const buildTransitionUrl = (href) => {
  const targetUrl = new URL(href, window.location.href);
  targetUrl.searchParams.set("transition", "zoom");
  return targetUrl.href;
};

const startAboutTransition = (href) => {
  if (isAboutTransitionActive) {
    return;
  }

  isAboutTransitionActive = true;
  body.style.setProperty("--page-scroll-y", window.scrollY + "px");
  pageFrame.style.setProperty(
    "--page-transition-height",
    document.documentElement.scrollHeight + "px"
  );
  body.classList.add("about-transition-active");

  aboutTransitionTimeoutId = window.setTimeout(() => {
    window.location.assign(buildTransitionUrl(href));
  }, ABOUT_TRANSITION_DURATION_MS - 40);
};

aboutTransitionLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    if (!shouldHandleAboutTransition(event, link)) {
      return;
    }

    event.preventDefault();
    startAboutTransition(link.href);
  });
});

window.addEventListener("pageshow", clearAboutTransition);
