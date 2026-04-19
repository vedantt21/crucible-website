const intro = document.querySelector("[data-scroll-intro]");
const aboutIntro = document.querySelector("[data-about-intro]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const body = document.body;
const versionToggle = document.querySelector("[data-version-toggle]");
const versionStatus = document.querySelector("[data-version-status]");
const versionStorageKey = "crucible-site-version";
const investorVersion = "investor";
const entrepreneurVersion = "entrepreneur";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const getNumericCssVariable = (name, fallback) => {
  const rawValue = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(name);
  const value = Number.parseFloat(rawValue);

  return Number.isFinite(value) ? value : fallback;
};

const normalizeWheelDelta = (delta, deltaMode) => {
  if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return delta * 16;
  }

  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return delta * window.innerHeight;
  }

  return delta;
};

const setupSlowerWheelScroll = () => {
  if (prefersReducedMotion.matches) {
    return;
  }

  const scrollSpeed = clamp(
    getNumericCssVariable("--site-scroll-speed", 1),
    0.1,
    4
  );

  if (Math.abs(scrollSpeed - 1) < 0.01) {
    return;
  }

  window.addEventListener(
    "wheel",
    (event) => {
      if (event.defaultPrevented || event.ctrlKey) {
        return;
      }

      event.preventDefault();
      window.scrollBy({
        left: normalizeWheelDelta(event.deltaX, event.deltaMode) * scrollSpeed,
        top: normalizeWheelDelta(event.deltaY, event.deltaMode) * scrollSpeed,
        behavior: "auto",
      });
    },
    { passive: false }
  );
};

setupSlowerWheelScroll();

const getStoredVersion = () => {
  try {
    return window.localStorage.getItem(versionStorageKey);
  } catch (error) {
    return null;
  }
};

const storeVersion = (version) => {
  try {
    window.localStorage.setItem(versionStorageKey, version);
  } catch (error) {
    // Browsers can disable storage; the toggle should still work for this page.
  }
};

const setSiteVersion = (version, shouldStore = true) => {
  const nextVersion =
    version === entrepreneurVersion ? entrepreneurVersion : investorVersion;
  const isEntrepreneur = nextVersion === entrepreneurVersion;

  body.dataset.siteVersion = nextVersion;

  if (versionToggle) {
    versionToggle.dataset.activeVersion = nextVersion;
    versionToggle.setAttribute("aria-pressed", String(isEntrepreneur));
    versionToggle.setAttribute(
      "aria-label",
      (isEntrepreneur ? "Founder" : "Investor") +
        " version selected. Switch to " +
        (isEntrepreneur ? "investor" : "founder") +
        " version"
    );
  }

  if (versionStatus) {
    versionStatus.textContent =
      (isEntrepreneur ? "Founder" : "Investor") + " version selected";
  }

  if (shouldStore) {
    storeVersion(nextVersion);
  }
};

setSiteVersion(getStoredVersion(), false);

if (versionToggle) {
  versionToggle.addEventListener("click", () => {
    const nextVersion =
      body.dataset.siteVersion === entrepreneurVersion
        ? investorVersion
        : entrepreneurVersion;

    setSiteVersion(nextVersion);
  });
}

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

if (aboutIntro && !prefersReducedMotion.matches) {
  let ticking = false;

  const updateAboutPageState = () => {
    const scrollable = Math.max(aboutIntro.offsetHeight * 0.72, 1);
    const progress = clamp(window.scrollY / scrollable, 0, 1);

    body.style.setProperty("--about-progress", progress.toFixed(4));
    body.classList.toggle("header-visible", progress < 0.78);
    ticking = false;
  };

  const requestAboutTick = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(updateAboutPageState);
  };

  updateAboutPageState();
  window.addEventListener("scroll", requestAboutTick, { passive: true });
  window.addEventListener("resize", requestAboutTick);
} else if (aboutIntro) {
  body.style.setProperty("--about-progress", "1");
  body.classList.add("header-visible");
}
