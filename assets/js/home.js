/* =============================================================================
   home.js — АНИМАЦИИ ГЛАВНОЙ СТРАНИЦЫ
   -----------------------------------------------------------------------------
     1. Прелоадер: веточка → логотип → логотип «уезжает» в шапку (≤1.2 c)
     2. Hero: заголовок появляется по буквам (SplitText), «искры мангала» (canvas)
     3. Атмосфера: закреплённая секция, 3 кадра сменяются при скролле
     4. Фирменные блюда: горизонтальный скролл + 3D-наклон карточек
     5. Завтраки: стрелки часов идут от 9:00 к 12:00 по мере прокрутки
     6. Напитки: параллакс «плавающих» стаканов
     7. Отзывы: бесконечная лента + счётчик рейтинга 0 → 5.0
   Все эффекты выключаются при prefers-reduced-motion и не мешают
   работе сайта, если внешние библиотеки не загрузились.
   ============================================================================= */
(function () {
  "use strict";
  var R = window.ROZ;
  if (!R) return;
  var $ = R.$, $$ = R.$$;
  var isDesktop = function () { return window.matchMedia("(min-width: 901px)").matches; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------- 1. ПРЕЛОАДЕР ---------- */
  function runPreloader(onReveal) {
    var pl = $("#preloader");
    var curtain = $("#curtain");
    var seen = false;
    try { seen = sessionStorage.getItem("roz-pl") === "1"; sessionStorage.setItem("roz-pl", "1"); } catch (e) {}
    /* Не показываем повторно в рамках визита, при переходе со шторкой и при «меньше движения» */
    if (!pl || seen || R.reduceMotion || (curtain && curtain.classList.contains("is-in"))) {
      if (pl) pl.remove();
      onReveal();
      return;
    }
    setTimeout(function () {
      var logo = pl.querySelector(".pl-logo");
      var target = $(".header .logo svg");
      /* FLIP: переносим логотип прелоадера в точку логотипа шапки */
      if (logo && target && logo.animate) {
        var a = logo.getBoundingClientRect(), b = target.getBoundingClientRect();
        var s = b.width / a.width;
        var dx = b.left + b.width / 2 - (a.left + a.width / 2);
        var dy = b.top + b.height / 2 - (a.top + a.height / 2);
        logo.animate([{ transform: "none" }, { transform: "translate(" + dx + "px," + dy + "px) scale(" + s + ")" }],
          { duration: 380, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" });
      }
      pl.classList.add("is-done");
      onReveal();
      setTimeout(function () { pl.remove(); }, 420);
    }, 780);
  }

  /* ---------- 2. HERO ---------- */
  /* SplitText: разбиваем заголовок на слова и буквы, сохраняя теги (<em>) */
  function splitText(el) {
    var chars = [];
    var label = el.textContent.replace(/\s+/g, " ").trim();
    var walk = function (src, dst) {
      Array.prototype.forEach.call(src.childNodes, function (n) {
        if (n.nodeType === 3) {
          /* Неразрывный пробел (&nbsp;) не считаем разделителем — «с душой» не разрывается */
          n.textContent.split(/([ \t\r\n]+)/).forEach(function (part) {
            if (!part) return;
            if (/^[ \t\r\n]+$/.test(part)) { dst.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span");
            w.className = "w";
            Array.from(part).forEach(function (c) {
              var s = document.createElement("span");
              s.className = "ch"; s.textContent = c;
              w.appendChild(s); chars.push(s);
            });
            dst.appendChild(w);
          });
        } else if (n.nodeType === 1) {
          var clone = n.cloneNode(false);
          dst.appendChild(clone);
          walk(n, clone);
        }
      });
    };
    var holder = document.createElement("span");
    holder.setAttribute("aria-hidden", "true");
    walk(el, holder);
    el.innerHTML = "";
    el.appendChild(holder);
    el.setAttribute("aria-label", label);
    el.classList.add("split");
    return chars;
  }
  function heroIntro() {
    if (!R.hasGsap) return;
    var h1 = $("[data-split]");
    if (h1) {
      var chars = splitText(h1);
      gsap.from(chars, { yPercent: 110, opacity: 0, rotate: 7, duration: 1.05, ease: "power3.out", stagger: 0.035 });
    }
    gsap.from(".hero .badge, [data-hero-fade]", { y: 30, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.1, delay: 0.35 });
    /* Фото hero уходит чуть медленнее скролла — глубина */
    gsap.to(".hero-media", { yPercent: 12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  }

  /* «Искры мангала»: частицы на canvas. Выключаются на слабых устройствах,
     в режиме экономии трафика и при «меньше движения». Пауза вне экрана. */
  function weakDevice() {
    var c = navigator.connection || {};
    return R.reduceMotion || c.saveData || (navigator.hardwareConcurrency || 8) < 4 || (navigator.deviceMemory || 8) < 4;
  }
  function embers(canvas, opts) {
    if (!canvas || !canvas.getContext || weakDevice()) return;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(1.5, window.devicePixelRatio || 1);
    var W = 0, H = 0, parts = [], running = false, raf = 0;
    var count = opts.count || 36;
    /* Заранее рисуем «светящуюся точку» — дешевле, чем shadowBlur на каждом кадре */
    var sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    var sc = sprite.getContext("2d");
    var g = sc.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,214,150,1)");
    g.addColorStop(0.35, "rgba(232,161,90,.75)");
    g.addColorStop(1, "rgba(194,105,62,0)");
    sc.fillStyle = g; sc.fillRect(0, 0, 32, 32);
    var resize = function () {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    var spawn = function (p, initial) {
      p.x = Math.random() * W;
      p.y = initial ? Math.random() * H : H + 10;
      p.vy = -(0.25 + Math.random() * (opts.speed || 0.9));
      p.vx = (Math.random() - 0.5) * 0.3;
      p.s = 3 + Math.random() * 9;
      p.life = 0;
      p.max = 160 + Math.random() * 220;
      p.w = Math.random() * Math.PI * 2;
      return p;
    };
    for (var i = 0; i < count; i++) parts.push(spawn({}, true));
    var tick = function () {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      parts.forEach(function (p) {
        p.life++; p.w += 0.03;
        p.x += p.vx + Math.sin(p.w) * 0.25;
        p.y += p.vy;
        var a = Math.sin(Math.PI * clamp(p.life / p.max, 0, 1));
        ctx.globalAlpha = a * (opts.alpha || 0.8);
        ctx.drawImage(sprite, p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
        if (p.life > p.max || p.y < -20) spawn(p, false);
      });
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    resize();
    window.addEventListener("resize", resize);
    new IntersectionObserver(function (en) {
      var vis = en[0].isIntersecting;
      if (vis && !running) { running = true; tick(); }
      if (!vis && running) { running = false; cancelAnimationFrame(raf); }
    }).observe(canvas);
  }

  /* ---------- Общий цикл прокрутки (один rAF на все эффекты) ---------- */
  var scrollFx = [];
  var ticking = false;
  var runFx = function () { ticking = false; scrollFx.forEach(function (f) { f(); }); };
  var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(runFx); } };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { scrollFx.forEach(function (f) { f(true); }); });

  /* ---------- 3. АТМОСФЕРА ---------- */
  function initAtmo() {
    var track = $("[data-atmo]");
    if (!track) return;
    var texts = $$(".atmo-text", track), frames = $$(".atmo-frame", track), bars = $$(".atmo-progress i", track);
    var current = -1;
    scrollFx.push(function () {
      if (!isDesktop()) return;
      var r = track.getBoundingClientRect();
      var p = clamp(-r.top / (r.height - window.innerHeight), 0, 1);
      var idx = Math.min(texts.length - 1, Math.floor(p * texts.length * 0.9999));
      bars.forEach(function (b, i) { b.style.setProperty("--p", clamp(p * texts.length - i, 0, 1)); });
      if (idx === current) return;
      current = idx;
      texts.forEach(function (t, i) { t.classList.toggle("is-active", i === idx); });
      frames.forEach(function (f, i) { f.classList.toggle("is-active", i === idx); f.classList.toggle("was-active", i < idx); });
    });
  }

  /* ---------- 4. ФИРМЕННЫЕ БЛЮДА: горизонтальный скролл ---------- */
  function initSignature() {
    var track = $("[data-sig]"), row = $("[data-sig-row]");
    if (!track || !row) return;
    var dist = 0;
    var measure = function () {
      if (!isDesktop() || R.reduceMotion) { track.style.height = ""; row.style.transform = ""; dist = 0; return; }
      var last = row.lastElementChild;
      var gutter = Math.max(16, (window.innerWidth - 1240) / 2);
      dist = Math.max(0, last.offsetLeft + last.offsetWidth - window.innerWidth + gutter);
      track.style.height = (window.innerHeight + dist) + "px";   // высота = путь по горизонтали + экран
    };
    measure();
    window.addEventListener("load", measure);
    scrollFx.push(function (resized) {
      if (resized) measure();
      if (!dist) return;
      var r = track.getBoundingClientRect();
      var p = clamp(-r.top / (r.height - window.innerHeight), 0, 1);
      row.style.transform = "translate3d(" + (-p * dist).toFixed(1) + "px,0,0)";
    });
    /* 3D-наклон карточек при наведении мышью */
    if (R.finePointer && !R.reduceMotion) {
      $$("[data-tilt]").forEach(function (card) {
        card.addEventListener("pointermove", function (e) {
          var b = card.getBoundingClientRect();
          var x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
          card.style.transform = "perspective(900px) rotateX(" + (-y * 9).toFixed(2) + "deg) rotateY(" + (x * 11).toFixed(2) + "deg) translateY(-6px)";
        });
        card.addEventListener("pointerleave", function () { card.style.transform = ""; });
      });
    }
  }

  /* ---------- 5. ЧАСЫ ЗАВТРАКОВ ---------- */
  function initClock() {
    var clock = $("[data-clock]");
    if (!clock) return;
    var hh = $(".hand-h", clock), mm = $(".hand-m", clock), sec = $("#breakfast");
    var set = function (minutes) {
      hh.style.transform = "rotate(" + ((minutes / 60) % 12) * 30 + "deg)";
      mm.style.transform = "rotate(" + (minutes % 60) * 6 + "deg)";
    };
    set(9 * 60);
    if (R.reduceMotion) return;
    scrollFx.push(function () {
      var r = sec.getBoundingClientRect();
      var p = clamp((window.innerHeight - r.top) / (r.height + window.innerHeight * 0.4), 0, 1);
      set(9 * 60 + p * 180);   // от 09:00 до 12:00
    });
  }

  /* ---------- 6. ПАРАЛЛАКС СТАКАНОВ ---------- */
  function initDrinks() {
    var items = $$("[data-speed]");
    if (!items.length || R.reduceMotion) return;
    scrollFx.push(function () {
      if (!isDesktop()) { items.forEach(function (el) { el.style.transform = ""; }); return; }
      var vh = window.innerHeight;
      items.forEach(function (el) {
        var r = el.parentNode.getBoundingClientRect();
        var off = (r.top + r.height / 2 - vh / 2) / vh;      // -1…1 относительно центра экрана
        el.style.transform = "translate3d(0," + (off * +el.getAttribute("data-speed") * 6).toFixed(1) + "px,0)";
      });
    });
  }

  /* ---------- 7. ОТЗЫВЫ ---------- */
  function initReviews() {
    var list = (R.SITE.reviews || []);
    var half = Math.ceil(list.length / 2);
    $$("[data-rev-belt]").forEach(function (belt) {
      var n = +belt.getAttribute("data-rev-belt");
      var items = n === 0 ? list.slice(0, half) : list.slice(half);
      var row = '<div class="rev-row">' + items.map(function (r) {
        return '<figure class="rev-card" style="margin:0"><blockquote>«' + R.esc(r.text) + '»</blockquote><figcaption><b>' + R.esc(r.name) + "</b><span>★★★★★ · Яндекс Карты</span></figcaption></figure>";
      }).join("") + "</div>";
      /* Два одинаковых ряда подряд — лента бесконечная без «шва» */
      belt.innerHTML = row + row.replace('class="rev-row"', 'class="rev-row" aria-hidden="true"');
    });
    /* Счётчики 0 → значение, когда блок появляется на экране */
    var els = $$("[data-count-to]");
    if (R.reduceMotion || !("IntersectionObserver" in window)) return;
    els.forEach(function (el) {
      var to = parseFloat(el.getAttribute("data-count-to")), dec = +el.getAttribute("data-decimals") || 0;
      el.textContent = (0).toFixed(dec);
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        io.disconnect();
        var t0 = performance.now(), dur = 1600;
        (function step(t) {
          var k = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
          el.textContent = (to * e).toFixed(dec);
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      }, { threshold: 0.4 });
      io.observe(el);
    });
  }

  /* ---------- Старт ---------- */
  initReviews();
  initAtmo();
  initSignature();
  initClock();
  initDrinks();
  embers($(".hero-embers"), { count: 34, speed: 0.9, alpha: 0.85 });
  embers($(".grill-canvas"), { count: 46, speed: 1.1, alpha: 0.7 });
  runFx();
  runPreloader(heroIntro);
  if (R.hasGsap) window.addEventListener("load", function () { ScrollTrigger.refresh(); runFx(); });
})();
