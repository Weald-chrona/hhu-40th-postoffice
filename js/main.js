/* =========================================================
   四秩砺行 · 信领新途 —— 交互脚本
   原生 JavaScript，无任何第三方依赖
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. 导航：滚动变色 ---------- */
  var nav = document.getElementById("nav");
  var toTop = document.getElementById("toTop");
  var progress = document.getElementById("progress");

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;

    if (nav) {
      nav.classList.toggle("is-scrolled", y > 20);
    }
    if (toTop) {
      toTop.classList.toggle("is-visible", y > 600);
    }
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (y / max) * 100 : 0;
      progress.style.width = pct + "%";
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- 2. 移动端菜单 ---------- */
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");

  function closeMenu() {
    if (!navLinks || !navToggle) return;
    navLinks.classList.remove("is-open");
    navToggle.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "展开菜单");
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var open = navLinks.classList.toggle("is-open");
      navToggle.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "收起菜单" : "展开菜单");
    });

    navLinks.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  /* ---------- 3. 回到顶部 ---------- */
  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- 4. 滚动入场 ---------- */
  var revealItems = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    revealItems.forEach(function (el) {
      // 同一组元素依次出现，形成错落感
      var siblings = Array.prototype.filter.call(
        el.parentElement.children,
        function (c) { return c.classList.contains("reveal"); }
      );
      var i = siblings.indexOf(el);
      if (i > 0) el.style.transitionDelay = Math.min(i * 0.09, 0.45) + "s";
      revealObserver.observe(el);
    });
  } else {
    revealItems.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- 5. 数字滚动 ---------- */
  var counters = Array.prototype.slice.call(document.querySelectorAll(".stat-num"));

  function runCounter(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var suffix = el.getAttribute("data-suffix") || "";

    if (reduceMotion) {
      el.textContent = target + suffix;
      return;
    }

    var duration = 1500;
    var startTime = null;

    function tick(now) {
      if (startTime === null) startTime = now;
      var p = Math.min((now - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  if (counters.length) {
    if ("IntersectionObserver" in window) {
      var countObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            runCounter(entry.target);
            countObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.6 }
      );
      counters.forEach(function (el) { countObserver.observe(el); });
    } else {
      counters.forEach(runCounter);
    }
  }

  /* ---------- 6. 轮播 ---------- */
  var carousel = document.getElementById("carousel");
  var track = document.getElementById("carouselTrack");

  if (carousel && track && track.children.length) {
    var slides = Array.prototype.slice.call(track.children);
    var dotsBox = document.getElementById("carouselDots");
    var btnPrev = document.getElementById("carouselPrev");
    var btnNext = document.getElementById("carouselNext");
    var current = 0;
    var timer = null;
    var INTERVAL = 5000;

    function renderDots() {
      if (!dotsBox) return;
      dotsBox.innerHTML = "";
      slides.forEach(function (_, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("role", "tab");
        b.setAttribute("aria-label", "第 " + (i + 1) + " 张");
        b.addEventListener("click", function () {
          goTo(i);
          restart();
        });
        dotsBox.appendChild(b);
      });
    }

    function update() {
      track.style.transform = "translateX(-" + current * 100 + "%)";
      if (!dotsBox) return;
      Array.prototype.forEach.call(dotsBox.children, function (dot, i) {
        dot.classList.toggle("is-active", i === current);
        dot.setAttribute("aria-selected", String(i === current));
      });
    }

    function goTo(i) {
      current = (i + slides.length) % slides.length;
      update();
    }

    function restart() {
      if (timer) clearInterval(timer);
      if (reduceMotion) return;
      timer = setInterval(function () { goTo(current + 1); }, INTERVAL);
    }

    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    renderDots();
    update();
    restart();

    if (btnPrev) btnPrev.addEventListener("click", function () { goTo(current - 1); restart(); });
    if (btnNext) btnNext.addEventListener("click", function () { goTo(current + 1); restart(); });

    carousel.addEventListener("mouseenter", stop);
    carousel.addEventListener("mouseleave", restart);
    carousel.addEventListener("focusin", stop);
    carousel.addEventListener("focusout", restart);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else restart();
    });

    // 触摸滑动
    var startX = 0;
    var startY = 0;
    var dragging = false;

    carousel.addEventListener("touchstart", function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dragging = true;
      stop();
    }, { passive: true });

    carousel.addEventListener("touchend", function (e) {
      if (!dragging) return;
      dragging = false;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy)) {
        goTo(current + (dx < 0 ? 1 : -1));
      }
      restart();
    }, { passive: true });

    // 键盘左右键
    carousel.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { goTo(current - 1); restart(); }
      if (e.key === "ArrowRight") { goTo(current + 1); restart(); }
    });
  }

  /* ---------- 7. 页脚年份 ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();

/* ---------- 8. 照片带：复制内容，实现无缝横向滚动 ---------- */
(function () {
  var track = document.getElementById("photoTrack");
  if (!track || !track.children.length) return;

  var originals = Array.prototype.slice.call(track.children);
  var rounds = 1;

  while (track.scrollWidth < window.innerWidth * 2 && rounds < 8) {
    originals.forEach(function (node) {
      track.appendChild(node.cloneNode(true));
    });
    rounds *= 2;
  }

  var half = track.scrollWidth / 2;
  track.style.animationDuration = Math.max(18, half / 90) + "s";
})();

/* ---------- 9. 板块切换：点导航切换内容，不再整页滚动 ---------- */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var HASH_BY_TAB = {
    home: "#top",
    history: "#history",
    achievements: "#achievements",
    alumni: "#alumni",
    postoffice: "#blessings"
  };

  var TAB_BY_HASH = {
    "#top": "home",
    "#history": "history",
    "#achievements": "achievements",
    "#alumni": "alumni",
    "#blessings": "postoffice"
  };

  var panels = Array.prototype.slice.call(document.querySelectorAll("[data-panel]"));
  var links = Array.prototype.slice.call(document.querySelectorAll("a[data-tab]"));
  var nav = document.getElementById("nav");

  // about.html 上没有这些面板，直接跳过，不影响其他页面
  if (!panels.length || !links.length) return;

  var current = null;

  /* 切换时重播入场动画：先清掉状态，再按次序加回来，形成错落感 */
  function playReveal(scope) {
    var items = Array.prototype.slice.call(scope.querySelectorAll(".reveal"));
    if (!items.length) return;

    items.forEach(function (el, i) {
      el.classList.remove("is-visible");
      el.style.transitionDelay = Math.min(i * 0.07, 0.5) + "s";
    });

    void scope.offsetHeight;

    requestAnimationFrame(function () {
      items.forEach(function (el) { el.classList.add("is-visible"); });
    });
  }

  /* 数字滚动：每个数字只在第一次切到该板块时跑一次 */
  function playCounters(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll(".stat-num"), function (el) {
      if (el.getAttribute("data-counted") === "1") return;
      el.setAttribute("data-counted", "1");

      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      var suffix = el.getAttribute("data-suffix") || "";

      if (reduceMotion) {
        el.textContent = target + suffix;
        return;
      }

      var start = null;
      var duration = 1200;

      function tick(now) {
        if (start === null) start = now;
        var p = Math.min((now - start) / duration, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    });
  }

  function show(name, pushHash) {
    if (!HASH_BY_TAB[name]) name = "home";
    if (name === current) return;
    current = name;

    var shown = [];

    panels.forEach(function (p) {
      var on = p.getAttribute("data-panel") === name;
      p.classList.toggle("is-hidden", !on);
      if (on) shown.push(p);
    });

    links.forEach(function (a) {
      var on = a.getAttribute("data-tab") === name;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });

    // 首页封面是深色大图，导航透明才好看；切到板块后要变实心，否则白底上看不清
    if (nav) nav.classList.toggle("is-solid", name !== "home");

    window.scrollTo(0, 0);

    shown.forEach(function (p) {
      playReveal(p);
      playCounters(p);
    });

    var hash = HASH_BY_TAB[name];
    if (pushHash !== false && location.hash !== hash) {
      try {
        history.pushState(null, "", hash);
      } catch (err) {
        location.hash = hash;
      }
    }
  }

  links.forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      show(a.getAttribute("data-tab"), true);
    });
  });

  window.addEventListener("hashchange", function () {
    var tab = TAB_BY_HASH[location.hash];
    if (tab && tab !== current) show(tab, false);
  });

  window.addEventListener("popstate", function () {
    var tab = TAB_BY_HASH[location.hash] || "home";
    if (tab !== current) show(tab, false);
  });

  // 首次进入：地址栏带 #history 就直接打开那个板块
  show(TAB_BY_HASH[location.hash] || "home", false);
})();
