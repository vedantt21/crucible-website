const intro = document.querySelector("[data-scroll-intro]");
const introGlow = document.querySelector("[data-intro-glow]");
const aboutIntro = document.querySelector("[data-about-intro]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const body = document.body;
const versionToggles = [...document.querySelectorAll("[data-version-toggle]")];
const versionStatuses = [...document.querySelectorAll("[data-version-status]")];
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const versionStorageKey = "crucible-site-version";
const investorVersion = "investor";
const entrepreneurVersion = "entrepreneur";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const smoothstep = (start, end, value) => {
  const progress = clamp((value - start) / (end - start), 0, 1);

  return progress * progress * (3 - 2 * progress);
};
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
  const activeLabel = isEntrepreneur ? "Founder" : "Investor";
  const nextLabel = isEntrepreneur ? "investor" : "founder";

  body.dataset.siteVersion = nextVersion;

  versionToggles.forEach((toggle) => {
    toggle.dataset.activeVersion = nextVersion;
    toggle.setAttribute("aria-pressed", String(isEntrepreneur));
    toggle.setAttribute(
      "aria-label",
      activeLabel + " version selected. Switch to " + nextLabel + " version"
    );
  });

  versionStatuses.forEach((status) => {
    status.textContent = activeLabel + " version selected";
  });

  if (shouldStore) {
    storeVersion(nextVersion);
  }
};

setSiteVersion(getStoredVersion(), false);

versionToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const nextVersion =
      body.dataset.siteVersion === entrepreneurVersion
        ? investorVersion
        : entrepreneurVersion;

    if (document.startViewTransition && !prefersReducedMotion.matches) {
      document.startViewTransition(() => setSiteVersion(nextVersion));
    } else {
      setSiteVersion(nextVersion);
    }
  });
});

let mobileMenuCloseTimer = 0;

const setMobileMenuOpen = (isOpen) => {
  if (!menuToggle || !mobileMenu) {
    return;
  }

  if (mobileMenuCloseTimer) {
    window.clearTimeout(mobileMenuCloseTimer);
    mobileMenuCloseTimer = 0;
  }

  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  menuToggle.classList.toggle("is-open", isOpen);
  body.classList.toggle("menu-open", isOpen);

  if (isOpen) {
    mobileMenu.hidden = false;
    body.classList.add("header-visible");
    window.requestAnimationFrame(() => {
      mobileMenu.classList.add("is-open");
    });
    return;
  }

  mobileMenu.classList.remove("is-open");
  mobileMenuCloseTimer = window.setTimeout(() => {
    mobileMenu.hidden = true;
  }, prefersReducedMotion.matches ? 0 : 220);
};

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener("click", () => {
    setMobileMenuOpen(!body.classList.contains("menu-open"));
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      setMobileMenuOpen(false);
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMobileMenuOpen(false);
    }
  });

  window
    .matchMedia("(min-width: 861px)")
    .addEventListener("change", (event) => {
      if (event.matches) {
        setMobileMenuOpen(false);
      }
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
  };

  const updatePageState = () => {
    const rect = intro.getBoundingClientRect();
    const scrollable = Math.max(intro.offsetHeight - window.innerHeight, 1);
    const progress = clamp(-rect.top / scrollable, 0, 1);
    const nextPastIntro = progress > 0.7;
    const titleOpacity = 1 - smoothstep(0.14, 0.48, progress);
    const resolutionOpacity = smoothstep(0.42, 0.68, progress);
    const farOpacity = smoothstep(0.08, 0.3, progress);
    const midOpacity = smoothstep(0.34, 0.58, progress);
    const foreOpacity = smoothstep(0.64, 0.9, progress);

    intro.style.setProperty("--intro-progress", progress.toFixed(4));
    intro.style.setProperty("--intro-title-opacity", titleOpacity.toFixed(4));
    intro.style.setProperty(
      "--intro-resolution-opacity",
      resolutionOpacity.toFixed(4)
    );
    intro.style.setProperty("--intro-far-opacity", farOpacity.toFixed(4));
    intro.style.setProperty("--intro-mid-opacity", midOpacity.toFixed(4));
    intro.style.setProperty("--intro-fore-opacity", foreOpacity.toFixed(4));

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
  intro.style.setProperty("--intro-title-opacity", "0");
  intro.style.setProperty("--intro-resolution-opacity", "1");
  intro.style.setProperty("--intro-far-opacity", "1");
  intro.style.setProperty("--intro-mid-opacity", "1");
  intro.style.setProperty("--intro-fore-opacity", "1");
  body.classList.add("header-visible");
}

if (intro && introGlow && !prefersReducedMotion.matches) {
  let glowFrame = 0;
  let glowX = window.innerWidth * 0.72;
  let glowY = window.innerHeight * 0.16;
  let glowHalfSize = introGlow.getBoundingClientRect().width / 2;

  const positionGlow = () => {
    introGlow.style.transform = `translate3d(${glowX - glowHalfSize}px, ${glowY - glowHalfSize}px, 0)`;
    glowFrame = 0;
  };

  intro.addEventListener(
    "pointermove",
    (event) => {
      glowX = event.clientX;
      glowY = event.clientY;

      if (!glowFrame) {
        glowFrame = window.requestAnimationFrame(positionGlow);
      }
    },
    { passive: true }
  );

  window.addEventListener("resize", () => {
    glowHalfSize = introGlow.getBoundingClientRect().width / 2;
  });

  positionGlow();
}

if (aboutIntro && !prefersReducedMotion.matches) {
  let ticking = false;

  const updateAboutPageState = () => {
    const scrollable = Math.max(aboutIntro.offsetHeight * 0.72, 1);
    const progress = clamp(window.scrollY / scrollable, 0, 1);

    body.style.setProperty("--about-progress", progress.toFixed(4));
    body.classList.add("header-visible");
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

const revealSelectors = [
  ".hero-copy",
  ".hero-visual",
  ".stat-item",
  ".section-copy-block",
  ".thesis-card",
  ".section-header-row",
  ".focus-card",
  ".team-preview-card",
  ".final-cta",
  ".page-hero-layout > *",
  ".about-hero-layout > *",
  ".editorial-feature > *",
  ".process-card",
  ".principle-card",
  ".about-member-link",
  ".profile-layout > *",
  ".profile-panel",
  ".contact-layout > *",
  ".contact-prompt-grid article",
];

const revealItems = [...document.querySelectorAll(revealSelectors.join(","))];

revealItems.forEach((item, index) => {
  item.dataset.reveal = "";
  item.dataset.revealDelay = String((index % 3) * 70);
});

if (revealItems.length) {
  document.documentElement.classList.add("motion-ready");

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          revealObserver.unobserve(entry.target);
          window.setTimeout(() => {
            entry.target.classList.add("is-visible");
          }, Number(entry.target.dataset.revealDelay) || 0);
        });
      },
      {
        rootMargin: "0px 0px -10%",
        threshold: 0.12,
      }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }
}

const tiltCards = [...document.querySelectorAll("[data-tilt-card]")];
const canUseTilt =
  !prefersReducedMotion.matches &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (canUseTilt) {
  tiltCards.forEach((card) => {
    let tiltFrame = 0;
    let tiltX = 0;
    let tiltY = 0;
    let tiltBounds = null;

    const renderTilt = () => {
      card.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
      tiltFrame = 0;
    };

    card.addEventListener("pointerenter", () => {
      tiltBounds = card.getBoundingClientRect();
    });

    card.addEventListener("pointermove", (event) => {
      const bounds = tiltBounds || card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;

      tiltX = y * -3.2;
      tiltY = x * 3.2;

      if (!tiltFrame) {
        tiltFrame = window.requestAnimationFrame(renderTilt);
      }
    });

    card.addEventListener("pointerleave", () => {
      tiltX = 0;
      tiltY = 0;
      tiltBounds = null;

      if (!tiltFrame) {
        tiltFrame = window.requestAnimationFrame(renderTilt);
      }
    });

    window.addEventListener("resize", () => {
      tiltBounds = null;
    });
  });
}
