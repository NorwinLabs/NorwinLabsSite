// Mobile nav toggle
const navToggle = document.getElementById("nav-toggle");
const navMenu = document.getElementById("nav-menu");
if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const open = navMenu.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  navMenu.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      navMenu.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

// Reveal sections on scroll
const animated = document.querySelectorAll(".section-animate");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  animated.forEach((el) => observer.observe(el));
} else {
  animated.forEach((el) => el.classList.add("visible"));
}

// Highlight the nav link for the section in view
const navLinks = document.querySelectorAll(".nav-link");
if ("IntersectionObserver" in window && navLinks.length) {
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) =>
          link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id),
        );
      });
    },
    { rootMargin: "-40% 0px -55% 0px" },
  );
  document.querySelectorAll("main section[id]").forEach((s) => spy.observe(s));
}

// Header shadow once scrolled
const header = document.querySelector(".site-header");
if (header) {
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// Footer year
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// Service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// Featured carousel: arrows, keyboard, and a gentle auto-advance
const track = document.getElementById("track");
if (track) {
  const slides = track.querySelectorAll(".slide");
  const step = () => (slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth);
  const atEnd = () => track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
  const go = (dir) => {
    if (dir > 0 && atEnd()) track.scrollTo({ left: 0, behavior: "smooth" });
    else track.scrollBy({ left: dir * step(), behavior: "smooth" });
  };
  const prev = document.getElementById("car-prev");
  const next = document.getElementById("car-next");
  const pauseBtn = document.getElementById("car-pause");
  let timer = null;
  const stop = () => {
    clearInterval(timer);
    timer = null;
  };
  const setPause = (paused) => {
    if (!pauseBtn) return;
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.setAttribute("aria-label", paused ? "Play automatic scrolling" : "Pause automatic scrolling");
    pauseBtn.textContent = paused ? "\u25B6" : "\u23F8";
  };
  let userPaused = false;
  const calmMotionCar = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = () => {
    if (userPaused) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && !timer) timer = setInterval(() => go(1), 5000);
  };
  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      userPaused = !userPaused;
      setPause(userPaused);
      if (userPaused) stop();
      else start();
    });
    if (calmMotionCar) pauseBtn.hidden = true;
  }
  if (prev) prev.addEventListener("click", () => { stop(); go(-1); });
  if (next) next.addEventListener("click", () => { stop(); go(1); });
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); stop(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); stop(); go(-1); }
  });
  ["pointerdown", "wheel", "focusin", "mouseenter"].forEach((evt) =>
    track.addEventListener(evt, stop, { passive: true }),
  );
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : null));
  start();
}

// ===== Games page =====
const fireflies = document.getElementById("fireflies");
const calmMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (fireflies && !calmMotion) {
  const colors = ["#bef264", "#fbbf24", "#4ade80", "#fb923c", "#7dd3fc"];
  const count = window.innerWidth < 700 ? 14 : 28;
  for (let i = 0; i < count; i++) {
    const fly = document.createElement("span");
    fly.className = "g-fly";
    fly.style.left = Math.random() * 100 + "%";
    fly.style.setProperty("--s", 3 + Math.random() * 4 + "px");
    fly.style.setProperty("--c", colors[i % colors.length]);
    fly.style.setProperty("--d", 9 + Math.random() * 10 + "s");
    fly.style.setProperty("--dl", -Math.random() * 18 + "s");
    fly.style.setProperty("--x", (Math.random() * 140 - 70).toFixed(0) + "px");
    fireflies.appendChild(fly);
  }
}

// Floating islands drift with the pointer
const islands = document.querySelectorAll(".g-island");
const gHero = document.querySelector(".g-hero");
if (gHero && islands.length && !calmMotion) {
  gHero.addEventListener("pointermove", (e) => {
    const r = gHero.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;
    const dy = (e.clientY - r.top) / r.height - 0.5;
    islands.forEach((el, i) => {
      const depth = (i + 1) * 14;
      el.style.transform = "translate(" + dx * depth + "px, " + dy * depth + "px)";
    });
  });
}

// Screenshot tiles: 3D tilt and lightbox
const lightbox = document.getElementById("lightbox");
document.querySelectorAll(".g-tile").forEach((tile) => {
  const inner = tile.querySelector(".g-tile-inner");
  if (!calmMotion) {
    tile.addEventListener("pointermove", (e) => {
      const r = tile.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      inner.style.setProperty("--rx", (x * 8).toFixed(2) + "deg");
      inner.style.setProperty("--ry", (-y * 8).toFixed(2) + "deg");
    });
    tile.addEventListener("pointerleave", () => {
      inner.style.setProperty("--rx", "0deg");
      inner.style.setProperty("--ry", "0deg");
    });
  }
  tile.addEventListener("click", () => {
    if (!lightbox || !lightbox.showModal) return;
    const img = document.getElementById("lb-img");
    img.src = tile.dataset.full;
    img.alt = tile.querySelector("img").alt;
    document.getElementById("lb-cap").textContent = tile.dataset.cap || "";
    lightbox.showModal();
  });
});
if (lightbox) {
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target.id === "lb-close") lightbox.close();
  });
}

// Day-to-night scrubber
const dn = document.getElementById("dn");
const dnRange = document.getElementById("dn-range");
if (dn && dnRange) {
  const frame = dn.querySelector(".g-dn-frame");
  const label = document.getElementById("dn-label");
  const render = (v) => {
    const dusk = v <= 50 ? v / 50 : 1;
    const night = v > 50 ? (v - 50) / 50 : 0;
    frame.style.setProperty("--dusk", dusk.toFixed(3));
    frame.style.setProperty("--night", night.toFixed(3));
    frame.style.setProperty("--p", (v / 100).toFixed(3));
    const dark = v > 60;
    frame.style.setProperty("--orb", dark ? "#e0e7ff" : "#fbbf24");
    frame.style.setProperty("--orb-glow", dark ? "rgba(199,210,254,0.5)" : "rgba(251,191,36,0.55)");
    label.textContent = v < 25 ? "Morning" : v < 62 ? "Golden hour" : v < 85 ? "Dusk" : "Night";
    dnRange.value = v;
  };
  let auto = !calmMotion;
  let visible = false;
  let pos = 0;
  let dir = 1;
  let last = 0;
  const tick = (t) => {
    if (auto && visible) {
      const dt = Math.min(t - last, 60);
      pos += dir * dt * 0.0075;
      if (pos >= 100) {
        pos = 100;
        dir = -1;
      }
      if (pos <= 0) {
        pos = 0;
        dir = 1;
      }
      render(pos);
    }
    last = t;
    requestAnimationFrame(tick);
  };
  dnRange.addEventListener("input", () => {
    auto = false;
    pos = Number(dnRange.value);
    render(pos);
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    }).observe(dn);
  } else {
    visible = true;
  }
  render(0);
  if (auto) requestAnimationFrame(tick);
}
