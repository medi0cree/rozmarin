/* =============================================================================
   menu.js — СТРАНИЦА МЕНЮ
   -----------------------------------------------------------------------------
     • строит разделы и карточки блюд из menu-data.js;
     • раздел «Популярное» собирается из блюд с меткой «hit»;
     • поиск по названию и фильтры «Хит», «Мангал», «Без мяса» (работают вместе);
     • липкая панель категорий подсвечивает активный раздел (IntersectionObserver);
     • модалка блюда с фото, счётчиком и кнопкой «В корзину».
   ============================================================================= */
(function () {
  "use strict";
  var R = window.ROZ;
  if (!R) return;
  var $ = R.$, $$ = R.$$, esc = R.esc, rub = R.rub, ic = R.ic;
  var root = $("[data-menu]"), nav = $("[data-cat-nav]");
  var dishes = R.DISHES;

  /* Разделы: «Популярное» + категории из menu-data.js */
  var sections = [{ id: "popular", title: "Популярное", ids: Object.keys(dishes).filter(function (id) { return dishes[id].tags.indexOf("hit") >= 0; }) }]
    .concat(window.MENU.map(function (c) { return { id: c.id, title: c.title, ids: Object.keys(dishes).filter(function (id) { return dishes[id].cat === c.id; }) }; }));

  var state = { q: "", tags: [] };
  var plural = function (n) { var m10 = n % 10, m100 = n % 100; return n + (m10 === 1 && m100 !== 11 ? " позиция" : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? " позиции" : " позиций"); };

  /* Карточка блюда */
  function card(d) {
    return '<article class="m-card">' +
      (d.tags.indexOf("hit") >= 0 ? '<span class="tag-hit">Хит</span>' : "") +
      '<button class="mc-open" type="button" data-open="' + d.id + '" aria-label="Подробнее: ' + esc(d.name) + '">' + R.dishMedia(d) + "<h3>" + esc(d.name) + "</h3></button>" +
      '<div class="mc-foot"><span class="price">' + rub(d.price) + '</span><button class="plus-btn" type="button" data-add="' + d.id + '" aria-label="В корзину: ' + esc(d.name) + '">' + ic("plus") + "</button></div></article>";
  }

  /* Отрисовка с учётом поиска и фильтров */
  function render() {
    var q = state.q.toLowerCase().replace(/ё/g, "е");
    var html = "", navHtml = "", total = 0;
    sections.forEach(function (s) {
      /* «Популярное» прячем при поиске/фильтрах, чтобы не дублировать карточки */
      if (s.id === "popular" && (q || state.tags.length)) return;
      var ids = s.ids.filter(function (id) {
        var d = dishes[id];
        if (q && d.name.toLowerCase().replace(/ё/g, "е").indexOf(q) < 0) return false;
        return state.tags.every(function (t) { return d.tags.indexOf(t) >= 0; });
      });
      if (!ids.length) return;
      total += ids.length;
      navHtml += '<li><a href="#' + s.id + '">' + esc(s.title) + "</a></li>";
      html += '<section class="menu-section" id="' + s.id + '" aria-labelledby="h-' + s.id + '"><h2 id="h-' + s.id + '">' + esc(s.title) + " <small>" + plural(ids.length) + '</small></h2><div class="menu-grid">' + ids.map(function (id) { return card(dishes[id]); }).join("") + "</div></section>";
    });
    root.innerHTML = total ? html : '<div class="menu-empty">Ничего не нашли. Попробуйте другое слово или снимите фильтры.</div>';
    nav.innerHTML = navHtml;
    R.guardImages(root);
    observe();
  }

  /* Подсветка активной категории в липкой панели */
  var io;
  function observe() {
    if (io) io.disconnect();
    if (!("IntersectionObserver" in window)) return;
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        $$("a", nav).forEach(function (a) {
          var on = a.getAttribute("href") === "#" + e.target.id;
          a.classList.toggle("is-active", on);
          if (on) a.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
        });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    $$(".menu-section", root).forEach(function (s) { io.observe(s); });
  }

  /* Плавный переход к разделу с учётом высоты шапки и панели */
  function goTo(id, instant) {
    var el = document.getElementById(id);
    if (!el) return;
    var off = -(($(".header") || {}).offsetHeight || 70) - (nav.parentNode.parentNode.offsetHeight || 60) - 8;
    if (R.lenis && !instant) R.lenis.scrollTo(el, { offset: off });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + off, behavior: instant ? "auto" : "smooth" });
  }
  nav.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a) return;
    e.preventDefault();
    goTo(a.getAttribute("href").slice(1));
  });

  /* Поиск и фильтры */
  var searchTimer;
  $("[data-menu-search]").addEventListener("input", function (e) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { state.q = e.target.value.trim(); render(); }, 120);
  });
  $$("[data-filter]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.getAttribute("data-filter");
      var on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", on);
      state.tags = on ? state.tags.concat(t) : state.tags.filter(function (x) { return x !== t; });
      render();
    });
  });

  /* Модалка блюда */
  var modal = $("#dish-modal"), box = $("[data-dish-modal]");
  function openDish(id) {
    var d = dishes[id];
    if (!d) return;
    var qty = 1;
    var tags = [];
    if (d.tags.indexOf("hit") >= 0) tags.push("Хит");
    if (d.tags.indexOf("grill") >= 0 && d.cat !== "grill") tags.push("На мангале");
    if (d.tags.indexOf("veg") >= 0) tags.push("Без мяса");
    box.innerHTML = '<div class="dish-modal">' + R.dishMedia(d) +
      '<div class="dm-body"><span class="dm-cat">' + esc(d.catTitle) + (tags.length ? " · " + tags.join(" · ") : "") + "</span>" +
      '<h3 id="dm-title">' + esc(d.name) + '</h3><span class="price">' + rub(d.price) + "</span>" +
      '<p class="dm-note">Состав и вес уточняйте у администратора — с радостью подскажем и учтём пожелания.</p>' +
      '<div class="dm-actions"><div class="qty" role="group" aria-label="Количество"><button type="button" data-mq="-1" aria-label="Меньше">' + ic("minus") + "</button><output data-mqv>1</output>" +
      '<button type="button" data-mq="1" aria-label="Больше">' + ic("plus") + "</button></div>" +
      '<button class="btn btn-primary" type="button" data-madd>В корзину · <span data-msum>' + rub(d.price) + "</span></button></div></div></div>";
    R.guardImages(box);
    box.onclick = function (e) {
      var q = e.target.closest("[data-mq]");
      if (q) {
        qty = Math.max(1, Math.min(99, qty + (+q.getAttribute("data-mq"))));
        $("[data-mqv]", box).textContent = qty;
        $("[data-msum]", box).textContent = rub(d.price * qty);
      }
      var add = e.target.closest("[data-madd]");
      if (add) { R.addToCart(d.id, qty, add); setTimeout(function () { R.closeModal(modal); }, 350); }
    };
    R.openModal(modal);
  }
  root.addEventListener("click", function (e) {
    var o = e.target.closest("[data-open]");
    if (o) openDish(o.getAttribute("data-open"));
  });

  render();
  /* Переход по ссылке вида menu.html#lemonades */
  if (location.hash) setTimeout(function () { goTo(location.hash.slice(1), true); }, 60);
})();
