/* =============================================================================
   core.js — ОБЩИЙ КОД ДЛЯ ВСЕХ СТРАНИЦ сайта «Розмарин»
   -----------------------------------------------------------------------------
   Что делает этот файл:
     • рисует шапку, мобильное меню, футер, корзину, cookie-баннер,
       плавающие кнопки и шторку переходов (данные берутся из config.js);
     • хранит корзину (localStorage) и отправляет заказ в WhatsApp
       или на ваш обработчик (SITE.formEndpoint);
     • проверяет все формы, включая обязательное согласие на обработку ПДн (152-ФЗ);
     • управляет согласием на cookie: Метрика и карты грузятся только после него;
     • включает плавный скролл Lenis + GSAP ScrollTrigger и анимации появления;
     • показывает бейдж «Открыто / Закрыто» по московскому времени.

   Если GSAP или Lenis не загрузились (нет интернета), сайт остаётся рабочим:
   весь контент виден, просто без «дорогих» анимаций.
   ============================================================================= */
(function () {
  "use strict";

  var SITE = window.SITE || {};
  var MENU = window.MENU || [];
  var PHOTOS = window.MENU_PHOTOS || {};

  /* ---------- Мелкие помощники ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  /* Формат цены: 1800 → «1 800 ₽» */
  var rub = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽"; };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var page = document.body.getAttribute("data-page") || "";

  /* Безопасная работа с localStorage (в приватном режиме может бросать ошибку) */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var session = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Иконки (тонкая линия, в духе lucide) ---------- */
  var ICON_PATHS = {
    arrow: "M5 12h14M13 6l6 6-6 6",
    plus: "M12 5v14M5 12h14",
    minus: "M5 12h14",
    x: "M6 6l12 12M18 6L6 18",
    bag: "M5.5 8h13l-1.2 12.2a1 1 0 0 1-1 .8H7.7a1 1 0 0 1-1-.8L5.5 8zM9 8V7a3 3 0 0 1 6 0v1",
    phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
    wa: "M3.5 20.5l1.3-4.2A8.6 8.6 0 1 1 8 19.3l-4.5 1.2zM9.2 8.4c-.3 0-.8.1-1 .6-.3.6-.4 1.6.4 2.9 1 1.6 2.6 3 4.3 3.6 1.2.4 2 .2 2.4-.3.3-.4.3-.9.2-1.1l-1.6-.8c-.2-.1-.4 0-.6.2l-.5.6c-.6-.2-1.8-1-2.4-2.3l.5-.6c.1-.2.2-.4.1-.6l-.7-1.7c-.1-.3-.3-.5-.6-.5h-.5z",
    pin: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
    star: "M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z",
    search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20.5 20.5l-4.3-4.3",
    menu: "M4 7h16M4 12h16M4 17h10",
    flame: "M12 22c4 0 7-2.8 7-6.8 0-3.5-2.4-5.7-3.6-8.2-.4 2-1.6 3.2-2.9 3.6.4-3.3-1.2-6.4-4-8.6.2 3.6-3.5 6.3-3.5 10.8C5 19.2 8 22 12 22z",
    leaf: "M5 20c-1-9 4-15 15-15 .5 10-5 15.5-13 15M5 20c2.5-4 5.5-7 9-9",
    sun: "M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9zM12 12v9M8 21h8",
    kids: "M12 2.5a5 5 0 0 1 5 5c0 3.6-2.9 6.5-5 6.5S7 11.1 7 7.5a5 5 0 0 1 5-5zM11 14h2l-.6 1.5h-.8L11 14zM12 15.5c0 2 1.5 2.5 1.5 4.5S12 22 12 22",
    truck: "M2.5 6.5h11v10h-11zM13.5 9.5h4l3 3v4h-7M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
    wifi: "M5 12.6a10 10 0 0 1 14 0M8.5 16.1a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0M12 19.6h.01",
    parking: "M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5zM9.5 17V7h3.5a3 3 0 0 1 0 6H9.5",
    cup: "M4 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6V8zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 2.5v3M12.5 2.5v3",
    card: "M3 6h18v12H3zM3 10h18M7 15h4",
    sofa: "M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M2 12a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2zM5 17v2M19 17v2",
    party: "M8 3h8l-1 7a3 3 0 0 1-6 0zM12 13v7M8 21h8",
    check: "M5 12.5l4.5 4.5L19 7.5",
    vk: "M3.5 7h3c.4 3.8 1.9 5.9 3.7 6.4V7h3v3.6c1.5-.3 3-2 3.5-3.6h3c-.5 2.5-2.5 4.4-3.9 5.2 1.5.6 3.5 2.4 4.2 4.8h-3.3c-.6-1.7-2-3-3.5-3.2V17h-.5C7.3 17 4 13.5 3.5 7z",
    route: "M3 11l18-8-8 18-2-8-8-2z",
    fish: "M2.5 12c3-4 7-5 11-5 3 0 5.5 2 7.5 5-2 3-4.5 5-7.5 5-4 0-8-1-11-5zM2.5 12L1.5 9M2.5 12l-1 3M16.5 11.2h.01",
    meat: "M7 2.5v7a2 2 0 0 0 2 2v10M11 2.5v7a2 2 0 0 1-2 2M9 2.5v5.5M17 21.5V2.5c-2 1-3.2 3.6-3.2 7.2 0 3.3 1.2 4.8 3.2 4.8",
    pizza: "M12 3L3 18.5a17 17 0 0 0 18 0L12 3zM9.5 11.5h.01M14 14h.01M10.5 16h.01M6 13.5a14 14 0 0 0 12 0",
    roll: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    pasta: "M3 11h18a9 9 0 0 1-18 0zM7 8c1-2 3-2 4 0s3 2 4 0 2.5-1.5 3-1",
    bowl: "M3 11h18a9 9 0 0 1-18 0zM9 3.5c-1 1.5 1 2.5 0 4.5M14 3.5c-1 1.5 1 2.5 0 4.5",
    drop: "M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11z",
    bread: "M5 10.5A4 4 0 0 1 7 3h10a4 4 0 0 1 2 7.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z",
    cake: "M4 21h16M5 21v-8h14v8M12 13V9.5M12 7a1.5 1.5 0 0 1 0-3.5c0 1.6 1.5 1.8 0 3.5zM5 16.5c2 1 3 1 4.5 0s3-1 4.5 0 3 1 5 0",
    glass: "M7 3h10l-1.6 17.1a1 1 0 0 1-1 .9H9.6a1 1 0 0 1-1-.9zM7.5 8.5h9M15 3l2.5-1.5",
    users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-5-6",
    music: "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
    award: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 14l-1.5 7.5 5-3 5 3-1.5-7.5"
  };
  /* ic('phone') → строка <svg> для вставки в разметку */
  function ic(name, extra) {
    var filled = name === "star";
    return '<svg viewBox="0 0 24 24" ' + (extra || "") + ' fill="' + (filled ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="' + (filled ? 0 : 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + ICON_PATHS[name] + '"/></svg>';
  }

  /* ---------- Логотип (векторизован из исходного логотипа кафе) ----------
     Пропись — цветом текста (currentColor), роза — фирменным розовым. */
  var LOGO_INK = "M 34 7 C 26 9, 16 15, 16 16 C 16 18, 17 17, 26 13 C 34 9, 43 6, 46 7 C 49 8, 49 16, 46 29 C 45 36, 44 39, 39 47 C 34 55, 31 60, 23 74 C 3 111, -1 134, 11 138 C 22 141, 34 130, 43 107 C 50 91, 53 76, 56 48 C 56 38, 58 29, 58 28 C 61 22, 76 11, 83 10 C 99 8, 91 41, 73 51 C 67 54, 67 55, 72 57 C 80 60, 80 63, 80 97 C 80 126, 80 127, 82 134 C 86 146, 94 153, 103 151 C 108 151, 108 149, 104 149 C 94 148, 90 134, 92 110 C 95 68, 95 62, 86 57 L 82 54 89 47 C 100 37, 103 29, 100 18 C 96 8, 89 4, 78 8 C 74 9, 64 16, 62 18 C 60 21, 58 20, 57 16 C 55 4, 50 1, 34 7 M 541 47 C 539 48, 538 52, 540 54 C 542 56, 549 55, 551 53 C 554 47, 547 43, 541 47 M 491 49 C 482 55, 480 73, 486 83 C 489 87, 489 86, 482 103 C 476 120, 466 131, 461 128 C 459 127, 459 125, 459 108 C 459 83, 458 77, 453 79 C 452 79, 452 80, 449 90 C 448 93, 446 97, 444 100 C 443 102, 440 108, 438 111 C 430 126, 423 132, 420 126 C 417 120, 419 99, 425 87 C 431 73, 444 68, 443 79 C 443 84, 445 86, 447 82 C 451 75, 446 68, 438 70 C 425 72, 415 83, 410 101 C 408 106, 405 114, 402 119 C 391 139, 387 131, 391 96 C 392 84, 392 81, 389 77 C 384 72, 375 76, 367 88 C 361 96, 359 96, 360 86 C 360 79, 360 78, 358 76 C 352 70, 344 74, 331 92 C 328 97, 326 94, 326 85 C 326 71, 323 67, 318 72 C 316 75, 315 80, 313 95 C 311 107, 308 113, 299 122 C 293 128, 290 130, 285 130 C 280 130, 278 128, 277 119 C 276 109, 277 107, 284 102 C 302 88, 307 77, 298 72 C 292 69, 288 71, 275 84 C 269 90, 262 96, 259 98 L 254 101 252 99 C 250 98, 247 93, 245 89 L 241 80 245 73 C 251 65, 253 58, 251 55 C 247 49, 239 50, 233 58 C 227 64, 227 71, 230 83 C 231 88, 231 88, 229 94 C 226 104, 227 107, 231 98 C 234 92, 235 92, 239 98 C 245 107, 245 108, 239 113 C 237 116, 234 118, 234 118 C 232 118, 224 130, 224 133 C 224 137, 229 141, 235 141 C 248 141, 258 128, 257 112 L 256 105 261 101 C 268 95, 269 95, 267 101 C 262 121, 266 135, 279 137 C 287 138, 297 133, 304 124 C 308 118, 309 118, 309 127 C 310 134, 311 136, 315 136 C 319 136, 320 135, 322 125 C 323 120, 325 114, 326 111 C 328 101, 343 81, 348 81 C 349 81, 349 80, 346 101 C 342 123, 342 133, 345 134 C 352 137, 355 133, 357 120 C 359 106, 362 98, 373 86 C 381 78, 383 79, 381 91 C 376 112, 375 126, 378 131 C 386 139, 397 136, 404 123 C 405 120, 407 120, 407 123 C 407 126, 410 132, 413 134 C 421 141, 430 136, 438 118 C 444 105, 446 105, 446 116 C 446 130, 450 136, 458 136 C 470 136, 479 124, 489 97 C 491 89, 491 89, 494 89 C 500 91, 501 92, 497 100 C 487 122, 490 135, 505 135 C 513 135, 517 132, 523 122 C 525 119, 527 117, 527 118 C 527 118, 527 121, 527 124 C 528 141, 547 141, 557 124 C 565 112, 566 112, 564 121 C 561 130, 562 134, 564 136 C 568 140, 571 137, 575 125 C 579 110, 588 94, 598 85 C 607 76, 608 79, 604 97 C 598 123, 601 136, 615 138 C 627 141, 646 132, 673 110 C 691 95, 696 95, 700 105 C 702 109, 704 111, 707 110 C 712 107, 708 98, 701 95 C 692 92, 683 96, 662 112 C 648 124, 625 134, 618 131 C 613 130, 612 122, 614 110 C 617 92, 617 80, 614 77 C 608 71, 600 74, 590 88 C 586 92, 582 96, 582 96 C 581 95, 580 92, 580 84 C 580 72, 580 71, 575 71 C 571 71, 570 74, 568 88 C 566 108, 553 130, 544 130 C 538 130, 538 128, 542 105 C 547 80, 547 75, 543 72 C 539 70, 538 72, 534 86 C 528 113, 512 135, 505 127 C 502 125, 503 120, 507 108 C 513 91, 512 86, 505 86 C 501 86, 496 83, 496 80 C 496 80, 498 75, 500 71 C 506 60, 506 54, 502 50 C 499 46, 495 46, 491 49 M 40 52 C 35 57, 14 98, 11 109 C 8 119, 7 130, 10 133 C 20 143, 32 113, 41 57 C 42 50, 42 49, 40 52 M 495 53 C 491 57, 490 71, 493 73 C 497 75, 504 58, 501 53 C 500 50, 497 50, 495 53 M 241 58 C 237 62, 235 68, 237 72 C 238 76, 241 75, 244 70 C 250 60, 247 50, 241 58 M 288 77 C 282 81, 276 96, 278 99 C 280 100, 280 100, 283 98 C 289 94, 296 87, 297 83 C 299 77, 293 73, 288 77 M 238 118 C 227 127, 225 138, 234 138 C 243 138, 251 124, 246 116 C 245 113, 244 113, 238 118 M 56 169 C 54 169, 51 170, 48 170 C 33 173, 3 194, 11 197 C 11 197, 15 194, 19 191 C 47 168, 69 166, 108 183 C 135 195, 142 196, 158 191 L 165 189 168 192 C 181 203, 198 203, 234 190 C 248 184, 251 183, 262 181 C 281 176, 291 175, 304 178 C 316 180, 317 177, 305 174 C 290 170, 274 173, 242 183 C 208 194, 207 194, 192 194 C 179 195, 179 194, 175 191 C 170 188, 169 186, 172 182 C 175 179, 175 174, 172 172 C 167 168, 162 172, 162 179 C 162 182, 162 184, 162 185 C 162 185, 159 187, 155 188 C 144 191, 135 191, 122 185 C 91 171, 84 169, 68 169 C 62 168, 57 168, 56 169 M 591 169 C 581 171, 569 175, 556 182 C 536 191, 528 192, 515 188 L 508 186 508 180 C 508 175, 508 174, 506 172 C 499 166, 492 176, 499 183 L 501 186 498 190 C 488 198, 472 197, 435 185 C 408 176, 400 174, 388 173 C 376 172, 358 174, 358 178 C 358 179, 358 179, 369 177 C 382 174, 405 178, 428 186 C 473 203, 489 204, 502 192 L 505 189 513 191 C 528 196, 536 194, 563 183 C 581 175, 590 173, 605 173 C 623 173, 634 177, 652 191 C 659 197, 661 198, 661 195 C 661 194, 657 190, 649 184 C 631 170, 614 166, 591 169 M 331 172 C 326 177, 329 184, 337 184 C 341 184, 345 180, 345 177 C 345 170, 337 168, 331 172 M 168 175 C 167 175, 167 177, 167 178 C 167 183, 170 182, 171 177 C 171 174, 170 173, 168 175 M 499 177 C 499 179, 500 181, 501 181 C 503 181, 503 181, 503 178 C 503 176, 502 174, 501 174 C 499 174, 499 174, 499 177 M 344 213 C 339 216, 338 218, 333 230 C 327 242, 324 241, 323 226 C 323 220, 322 216, 322 216 C 321 216, 319 219, 318 222 C 315 229, 315 229, 316 230 C 317 231, 318 232, 318 235 C 318 243, 324 245, 330 239 C 333 235, 334 234, 335 236 C 336 239, 341 241, 343 240 C 347 238, 347 239, 345 245 C 343 252, 342 255, 345 250 C 348 243, 349 244, 349 254 C 348 263, 346 270, 344 271 C 342 271, 341 266, 341 261 C 342 257, 342 257, 341 260 C 339 267, 340 274, 344 274 C 349 274, 353 265, 355 248 C 355 241, 356 239, 359 241 C 361 243, 365 241, 368 237 C 369 234, 371 231, 372 230 C 373 229, 374 228, 373 228 C 373 228, 372 225, 372 222 C 371 215, 369 211, 365 211 C 363 211, 362 211, 362 212 C 361 213, 356 213, 352 212 C 348 210, 348 210, 344 213 M 273 213 C 271 216, 269 229, 269 235 C 269 241, 269 242, 271 242 C 273 242, 273 241, 274 235 C 275 230, 279 225, 280 226 C 281 226, 281 228, 281 231 C 281 240, 285 244, 291 241 C 292 240, 292 240, 291 240 C 288 240, 287 237, 287 231 C 287 227, 286 224, 285 222 C 284 220, 284 220, 287 217 C 289 215, 290 214, 290 213 C 289 213, 286 215, 283 218 C 276 225, 276 225, 276 218 C 277 211, 275 209, 273 213 M 310 212 C 306 213, 302 219, 299 229 L 297 235 300 239 C 304 244, 309 243, 313 235 C 314 233, 314 232, 314 231 C 313 231, 313 231, 313 232 C 313 234, 309 238, 307 238 C 302 238, 304 222, 310 215 C 312 213, 316 212, 316 215 C 316 215, 316 216, 317 216 C 318 216, 318 215, 318 214 C 317 211, 315 211, 310 212 M 390 213 C 394 215, 390 224, 385 224 C 382 224, 383 222, 385 218 C 387 213, 387 213, 386 213 C 385 213, 375 226, 376 227 C 377 227, 377 229, 377 232 C 377 245, 391 246, 398 233 C 400 228, 399 228, 394 234 C 388 241, 384 241, 383 234 C 382 230, 382 230, 387 224 C 395 217, 396 212, 390 212 C 389 212, 389 212, 390 213 M 346 216 C 342 220, 338 231, 340 235 C 343 241, 349 236, 351 226 C 354 215, 351 210, 346 216 M 361 216 C 359 218, 358 220, 357 225 C 356 234, 356 235, 358 235 C 358 235, 359 235, 359 234 C 359 234, 360 233, 362 232 C 365 230, 367 225, 367 220 C 367 213, 365 212, 361 216 M 360 234 C 358 237, 360 240, 363 237 C 364 236, 365 234, 365 234 C 365 232, 361 233, 360 234";
  var LOGO_ROSE = "M 149 56 C 138 58, 127 71, 126 84 C 125 92, 127 92, 135 82 C 140 76, 149 72, 163 70 C 172 68, 172 68, 172 66 C 172 63, 170 61, 164 58 C 158 55, 157 55, 149 56 M 187 68 C 177 71, 176 71, 176 72 C 176 73, 177 73, 179 74 C 198 78, 210 92, 204 103 C 201 110, 202 115, 208 113 C 216 112, 218 105, 214 90 C 208 69, 202 63, 187 68 M 160 75 C 156 76, 158 78, 164 80 C 167 81, 170 83, 171 84 C 172 84, 173 85, 173 85 C 175 85, 182 92, 182 93 C 182 94, 181 93, 179 91 C 175 88, 172 87, 170 90 C 169 91, 168 91, 167 88 C 165 85, 164 85, 160 85 C 157 85, 156 85, 156 83 C 156 79, 147 78, 140 82 C 128 88, 126 110, 137 121 C 142 126, 147 125, 145 120 C 144 119, 144 118, 144 118 C 144 117, 144 116, 143 116 C 142 115, 139 107, 139 103 C 138 97, 140 92, 146 89 C 151 86, 151 86, 150 91 C 149 93, 148 95, 148 95 C 149 95, 148 96, 147 98 C 144 102, 145 108, 149 109 C 150 110, 150 110, 150 111 C 149 111, 149 111, 148 110 C 147 109, 147 110, 146 112 C 145 116, 146 118, 151 121 C 152 121, 154 123, 154 125 C 156 131, 163 131, 176 124 C 180 121, 181 121, 183 122 C 186 124, 196 116, 196 112 C 196 112, 197 110, 199 109 C 212 96, 183 70, 160 75 M 115 82 C 115 82, 113 85, 111 87 C 107 93, 106 97, 110 109 C 112 116, 112 116, 117 107 C 125 93, 123 76, 115 82 M 169 95 C 169 97, 169 98, 170 99 C 171 99, 171 103, 170 104 C 169 104, 166 104, 164 104 C 159 104, 159 104, 160 106 C 162 109, 161 111, 156 111 L 152 111 155 113 C 158 114, 159 114, 162 113 C 168 111, 170 115, 165 119 C 163 121, 163 121, 165 121 C 171 121, 174 113, 172 102 C 171 95, 169 91, 169 95 M 184 98 C 184 100, 184 104, 184 108 C 184 114, 184 114, 185 113 C 188 110, 188 104, 186 99 C 184 94, 182 94, 184 98 M 153 102 C 153 103, 155 104, 157 104 C 158 104, 158 103, 157 103 C 156 101, 153 100, 153 102 M 119 111 C 114 126, 117 139, 129 144 C 133 146, 142 147, 145 147 C 147 146, 148 142, 146 142 C 146 142, 143 139, 141 136 C 138 132, 135 129, 134 128 C 132 126, 129 118, 128 113 C 127 110, 124 106, 122 106 C 122 106, 120 108, 119 111 M 193 124 C 191 127, 189 132, 188 133 C 187 135, 186 140, 187 142 C 189 145, 199 141, 201 136 C 201 134, 203 132, 204 131 C 213 124, 211 117, 201 117 C 197 117, 197 117, 193 124 M 175 130 C 168 133, 159 135, 155 134 C 152 134, 151 134, 150 135 C 148 137, 148 138, 154 145 C 162 155, 166 155, 174 148 C 177 146, 180 143, 181 142 C 182 140, 183 138, 184 137 C 186 134, 185 129, 182 128 C 181 128, 179 128, 175 130";
  /* full=true — с подписью «кафе», иначе только надпись Rosemarin */
  function logoSVG(full) {
    return '<svg viewBox="0 0 713 ' + (full ? 280 : 205) + '" role="img" aria-label="Rosemarin — кафе Розмарин"><path class="logo-ink" d="' + LOGO_INK + '"/><path class="logo-rose" d="' + LOGO_ROSE + '"/></svg>';
  }

  /* ---------- Веточка розмарина (SVG-генератор) ----------
     Стебель — кривая Безье, листочки — узкие капли вдоль стебля.
     pathLength="1" позволяет анимировать «рисование» через stroke-dashoffset. */
  function branchSVG(opts) {
    opts = opts || {};
    var n = opts.leaves || 16;
    var P = [[6, 44], [70, 40], [140, 30], [234, 20]];            // опорные точки стебля
    var bez = function (t, i) { var u = 1 - t; return u * u * u * P[0][i] + 3 * u * u * t * P[1][i] + 3 * u * t * t * P[2][i] + t * t * t * P[3][i]; };
    var leaves = "";
    for (var k = 0; k < n; k++) {
      var t = 0.08 + (k / (n - 1)) * 0.88;
      var x = bez(t, 0), y = bez(t, 1);
      var x2 = bez(Math.min(1, t + 0.01), 0), y2 = bez(Math.min(1, t + 0.01), 1);
      var dir = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI;           // направление стебля
      var side = k % 2 ? 1 : -1;
      var len = 22 - t * 9;                                           // к кончику листья мельче
      var ang = dir + side * (48 - t * 18);
      leaves += '<path class="leaf" pathLength="1" style="--i:' + k + '" transform="translate(' + x.toFixed(1) + " " + y.toFixed(1) + ") rotate(" + ang.toFixed(1) + ')" d="M0 0 C ' + (len * .25).toFixed(1) + " -3.4, " + (len * .7).toFixed(1) + " -3.2, " + len.toFixed(1) + " 0 C " + (len * .7).toFixed(1) + " 2.6, " + (len * .25).toFixed(1) + ' 2.6, 0 0 Z"/>';
    }
    return '<svg class="branch ' + (opts.cls || "") + '" viewBox="0 -6 240 64" aria-hidden="true" focusable="false"><path class="stem" pathLength="1" d="M6 44 C 70 40, 140 30, 234 20"/>' + leaves + "</svg>";
  }

  /* ---------- Время по Москве и бейдж «Открыто сейчас» ---------- */
  function moscowMinutes() {
    try {
      var parts = new Intl.DateTimeFormat("ru-RU", { timeZone: SITE.timezone || "Europe/Moscow", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
      var h = 0, m = 0;
      parts.forEach(function (p) { if (p.type === "hour") h = +p.value; if (p.type === "minute") m = +p.value; });
      return h * 60 + m;
    } catch (e) { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  }
  var toMin = function (s) { var a = String(s).split(":"); return (+a[0]) * 60 + (+a[1] || 0); };
  function isOpenNow(range) {
    if (!range) return false;
    var now = moscowMinutes(), o = toMin(range.open), c = toMin(range.close);
    return c > o ? (now >= o && now < c) : (now >= o || now < c);   // поддержка работы после полуночи
  }
  function updateOpenBadges() {
    var hall = SITE.hours && SITE.hours.hall;
    if (!hall) return;
    var open = isOpenNow(hall);
    $$("[data-open-badge]").forEach(function (el) {
      el.classList.toggle("is-open", open);
      el.querySelector("span").textContent = open ? "Открыто до " + hall.close : "Закрыто · откроемся в " + hall.open;
    });
  }

  /* ---------- Подстановка данных из config.js в разметку ----------
     <span data-cfg="operator.inn"></span> → значение SITE.operator.inn.
     Незаполненные плейсхолдеры {{...}} подсвечиваются на юридических страницах. */
  function fillConfig(root) {
    $$("[data-cfg]", root).forEach(function (el) {
      var v = el.getAttribute("data-cfg").split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, SITE);
      if (v == null) return;
      el.textContent = v;
      if (/\{\{.+\}\}/.test(String(v))) el.classList.add("cfg-missing");
    });
    $$("[data-cfg-href]", root).forEach(function (el) {
      var key = el.getAttribute("data-cfg-href");
      var map = { tel: "tel:" + SITE.phoneRaw, wa: waLink(), vk: SITE.vk, route: routeLink(), email: "mailto:" + (SITE.operator && SITE.operator.email) };
      if (map[key]) el.setAttribute("href", map[key]);
    });
    $$("[data-img]", root).forEach(function (img) {
      var src = SITE.images && SITE.images[img.getAttribute("data-img")];
      if (src && img.getAttribute("src") !== src) img.setAttribute("src", src);
    });
  }
  function waLink(text) { return "https://wa.me/" + SITE.whatsapp + (text ? "?text=" + encodeURIComponent(text) : ""); }
  function routeLink() { return "https://yandex.ru/maps/org/rozmarin/" + SITE.yandexOrgId + "/"; }

  /* ---------- Фото с фирменной заглушкой ----------
     Если картинка не загрузилась (нет сети, ссылка устарела) —
     вместо «битой» иконки показываем веточку и подпись. */
  function guardImages(root) {
    $$(".ph img", root).forEach(function (img) {
      if (img.__guard) return;
      img.__guard = true;
      var fail = function () {
        if (img.classList.contains("is-broken")) return;
        img.classList.add("is-broken");
        var fb = document.createElement("div");
        fb.className = "ph-fallback";
        fb.innerHTML = "<div>" + branchSVG({ leaves: 12 }) + "<div>" + esc(img.getAttribute("data-fallback") || img.alt || "Розмарин") + "</div></div>";
        img.parentNode.appendChild(fb);
      };
      img.addEventListener("error", fail);
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) fail();
    });
  }

  /* =========================================================================
     КОРЗИНА (Zustand-подобное хранилище на чистом JS + localStorage)
     ========================================================================= */
  /* Индекс блюд: id → {id, name, price, cat, catTitle, tags, img, icon} */
  var DISHES = {};
  MENU.forEach(function (cat) {
    cat.items.forEach(function (it, i) {
      var id = cat.id + "-" + (i + 1);
      var tags = (it[2] || "").split(/\s+/).filter(Boolean);
      if (cat.id === "grill" && tags.indexOf("grill") < 0) tags.push("grill");
      DISHES[id] = { id: id, name: it[0], price: it[1], tags: tags, img: it[3] ? PHOTOS[it[3]] : "", cat: cat.id, catTitle: cat.title, icon: cat.icon };
    });
  });
  /* Поиск блюда по названию (для кнопок «+» на главной) */
  function findDish(name) {
    for (var k in DISHES) if (DISHES[k].name === name) return DISHES[k];
    return null;
  }

  var CART_KEY = "roz-cart-v1";
  var Cart = {
    items: store.get(CART_KEY, {}),               // { id: количество }
    save: function () {
      store.set(CART_KEY, this.items);
      document.dispatchEvent(new CustomEvent("cart:change"));
    },
    add: function (id, q) { if (!DISHES[id]) return; this.items[id] = (this.items[id] || 0) + (q || 1); this.save(); },
    set: function (id, q) { if (q <= 0) delete this.items[id]; else this.items[id] = Math.min(99, q); this.save(); },
    clear: function () { this.items = {}; this.save(); },
    lines: function () { var self = this; return Object.keys(this.items).filter(function (id) { return DISHES[id]; }).map(function (id) { return { dish: DISHES[id], qty: self.items[id] }; }); },
    count: function () { return this.lines().reduce(function (s, l) { return s + l.qty; }, 0); },
    total: function () { return this.lines().reduce(function (s, l) { return s + l.qty * l.dish.price; }, 0); }
  };

  /* Заглушка-иллюстрация для блюда без фото */
  function dishMedia(d, cls) {
    if (d.img) return '<div class="ph ' + (cls || "") + '"><img src="' + esc(d.img) + '" alt="' + esc(d.name) + '" loading="lazy" decoding="async" data-fallback="' + esc(d.name) + '"></div>';
    return '<div class="ph ' + (cls || "") + '"><div class="menu-ill">' + ic(d.icon || "leaf") + "<span>Розмарин</span></div></div>";
  }

  /* Анимация «полёта» блюда в иконку корзины */
  function flyToCart(fromEl, src) {
    var target = $$("[data-cart-open]").filter(function (b) { return b.offsetParent !== null; })[0];
    var count = $(".cart-count");
    var bump = function () { if (!count) return; count.classList.remove("bump"); void count.offsetWidth; count.classList.add("bump"); };
    if (!fromEl || !target || reduceMotion || !document.body.animate) { bump(); return; }
    var a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
    var dot = document.createElement("div");
    dot.className = "fly-dot";
    dot.innerHTML = src ? '<img src="' + esc(src) + '" alt="">' : "";
    dot.style.left = (a.left + a.width / 2 - 28) + "px";
    dot.style.top = (a.top + a.height / 2 - 28) + "px";
    document.body.appendChild(dot);
    var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    var anim = dot.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: "translate(" + dx * 0.5 + "px," + (dy * 0.5 - 120) + "px) scale(.8)", opacity: 1, offset: 0.5 },
      { transform: "translate(" + dx + "px," + dy + "px) scale(.2)", opacity: .6 }
    ], { duration: 750, easing: "cubic-bezier(.5,0,.3,1)" });
    anim.onfinish = function () { dot.remove(); bump(); };
  }

  /* Глобальная функция «в корзину» — используется на главной и в меню */
  function addToCart(id, qty, fromEl) {
    var d = DISHES[id];
    if (!d) return;
    Cart.add(id, qty || 1);
    /* Показываем шапку (если спрятана при скролле), чтобы было видно, куда «летит» блюдо */
    var hdr = $("#header");
    if (hdr && hdr.classList.contains("is-hidden")) { hdr.classList.remove("is-hidden"); setTimeout(function () { flyToCart(fromEl, d.img); }, 350); }
    else flyToCart(fromEl, d.img);
    if (fromEl) { fromEl.classList.add("added"); setTimeout(function () { fromEl.classList.remove("added"); }, 900); }
    announce("«" + d.name + "» добавлено в корзину");
  }
  /* Живой регион для экранных дикторов */
  function announce(msg) { var r = $("#sr-live"); if (r) { r.textContent = ""; setTimeout(function () { r.textContent = msg; }, 30); } }

  /* =========================================================================
     РАЗМЕТКА ОБЩИХ БЛОКОВ
     ========================================================================= */
  var NAV = [
    { href: "index.html", label: "Главная", page: "home" },
    { href: "menu.html", label: "Меню и доставка", page: "menu" },
    { href: "about.html", label: "О кафе", page: "about" },
    { href: "contacts.html", label: "Контакты", page: "contacts" }
  ];

  function headerHTML() {
    return '<a class="skip-link" href="#main">Перейти к содержанию</a>' +
      '<header class="header" id="header"><div class="wrap">' +
      '<a class="logo" href="index.html" aria-label="Розмарин — на главную">' + logoSVG(false) + "</a>" +
      '<nav class="nav" aria-label="Основное меню">' + NAV.map(function (n) { return '<a href="' + n.href + '"' + (n.page === page ? ' aria-current="page"' : "") + ">" + n.label + "</a>"; }).join("") + "</nav>" +
      '<div class="header-right">' +
      '<span class="open-badge" data-open-badge><i></i><span>…</span></span>' +
      '<a class="header-phone" href="tel:' + SITE.phoneRaw + '">' + esc(SITE.phone) + "</a>" +
      '<button class="icon-btn" type="button" data-cart-open aria-label="Открыть корзину">' + ic("bag") + '<span class="cart-count" aria-hidden="true">0</span></button>' +
      '<button class="icon-btn burger" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobile-menu">' + ic("menu") + "</button>" +
      "</div></div></header>" +
      '<div class="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Меню сайта">' +
      '<button class="icon-btn mm-close" type="button" aria-label="Закрыть меню">' + ic("x") + "</button>" +
      "<nav>" + NAV.map(function (n) { return '<a href="' + n.href + '">' + n.label + "</a>"; }).join("") + "</nav>" +
      '<div class="mm-foot"><a href="tel:' + SITE.phoneRaw + '">' + esc(SITE.phone) + "</a><span>" + esc(SITE.address) + '</span><span data-open-badge class="open-badge"><i></i><span>…</span></span></div></div>';
  }

  function footerHTML() {
    var h = SITE.hours || {};
    var op = SITE.operator || {};
    return '<footer class="footer"><div class="wrap">' +
      '<div class="footer-top">' +
      '<div><a class="logo" href="index.html" aria-label="Розмарин — на главную">' + logoSVG(true) + "</a>" +
      '<p style="margin-top:18px;max-width:30ch">Кафе европейской и восточной кухни в Избербаше. Халяль.</p>' +
      '<div class="socials"><a href="' + SITE.vk + '" target="_blank" rel="noopener" aria-label="ВКонтакте">' + ic("vk") + '</a><a href="' + waLink() + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + ic("wa") + '</a><a href="tel:' + SITE.phoneRaw + '" aria-label="Позвонить">' + ic("phone") + "</a></div></div>" +
      "<div><h4>Контакты</h4><ul><li>" + esc(SITE.address) + '</li><li><a href="tel:' + SITE.phoneRaw + '">' + esc(SITE.phone) + '</a></li><li><a href="' + waLink() + '" target="_blank" rel="noopener">WhatsApp</a></li><li><a href="' + routeLink() + '" target="_blank" rel="noopener">Маршрут в Яндекс Картах</a></li></ul></div>' +
      "<div><h4>Часы работы</h4><ul>" + ["hall", "breakfast", "delivery"].map(function (k) { return h[k] ? "<li>" + h[k].label + ": " + h[k].open + "–" + h[k].close + "</li>" : ""; }).join("") + "<li>Средний чек " + esc(SITE.avgCheck) + "</li></ul></div>" +
      '<div><h4>Новости и акции</h4>' +
      '<form class="form sub-form" data-form="subscribe" novalidate>' +
      '<div class="field"><label for="sub-email" class="visually-hidden">E-mail</label><input id="sub-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="Ваш e-mail" data-required data-type="email"><span class="field-error" aria-live="polite"></span></div>' +
      consentHTML("sub") +
      '<label class="consent"><input type="checkbox" name="marketing"><span>Согласен получать рекламные рассылки (необязательно)</span></label>' +
      '<button class="btn btn-primary btn-sm" type="submit" disabled>Подписаться ' + ic("arrow") + "</button>" +
      '<div class="form-success" role="status"></div></form></div>' +
      "</div>" +
      '<div class="footer-legal">' +
      '<a href="privacy.html">Политика конфиденциальности</a><a href="consent.html">Согласие на обработку ПДн</a><a href="cookies.html">Политика cookie</a>' +
      '<button type="button" data-cookie-settings>Настройки cookie</button>' +
      "<span>© " + new Date().getFullYear() + " Кафе «Розмарин», Избербаш</span>" +
      '<span class="footer-req">Оператор ПДн: ' + esc(op.name) + " · ИНН " + esc(op.inn) + " · ОГРН " + esc(op.ogrn) + " · " + esc(op.address) + " · " + esc(op.email) + "</span>" +
      '</div><div class="footer-big" aria-hidden="true">Rosemarin</div></div></footer>';
  }

  /* Чекбокс согласия на обработку ПДн (152-ФЗ). ВАЖНО: по умолчанию НЕ отмечен. */
  function consentHTML(prefix) {
    return '<label class="consent" for="' + prefix + '-consent"><input type="checkbox" id="' + prefix + '-consent" name="consent" data-consent>' +
      '<span>Я даю <a href="consent.html" target="_blank">согласие на обработку персональных данных</a> и принимаю условия <a href="privacy.html" target="_blank">Политики конфиденциальности</a></span></label>';
  }

  function cartSheetHTML() {
    return '<div class="sheet" id="cart" role="dialog" aria-modal="true" aria-labelledby="cart-title">' +
      '<div class="modal-backdrop" data-cart-close></div>' +
      '<aside class="sheet-panel">' +
      '<div class="sheet-head"><h2 id="cart-title">Корзина</h2><button class="icon-btn" type="button" data-cart-close aria-label="Закрыть корзину">' + ic("x") + "</button></div>" +
      '<div class="sheet-body"><div data-cart-lines></div>' +
      '<form class="form" data-form="order" novalidate hidden style="padding-top:14px">' +
      '<button type="button" class="btn btn-line btn-sm" data-cart-back style="justify-self:start">← К списку блюд</button>' +
      '<div class="field"><label for="o-name">Имя</label><input id="o-name" name="name" autocomplete="name" data-required data-type="name"><span class="field-error"></span></div>' +
      '<div class="field"><label for="o-phone">Телефон</label><input id="o-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" data-required data-type="phone" data-mask="phone"><span class="field-error"></span></div>' +
      '<div class="field"><span class="label">Получение</span><div class="seg"><label><input type="radio" name="mode" value="Доставка" checked><span>Доставка</span></label><label><input type="radio" name="mode" value="Самовывоз"><span>Самовывоз</span></label></div></div>' +
      '<div class="field" data-address-field><label for="o-addr">Адрес доставки</label><input id="o-addr" name="address" autocomplete="street-address" placeholder="Улица, дом, квартира" data-required-if="delivery"><span class="field-error"></span></div>' +
      '<div class="field"><span class="label">Когда</span><div class="seg"><label><input type="radio" name="when" value="now" checked><span>Как можно скорее</span></label><label><input type="radio" name="when" value="time"><span>Ко времени</span></label></div></div>' +
      '<div class="field" data-time-field hidden><label for="o-time">Время</label><input id="o-time" name="time" type="time" min="10:00" max="22:00"><span class="field-error"></span></div>' +
      '<div class="field"><span class="label">Оплата</span><div class="seg"><label><input type="radio" name="pay" value="Картой при получении" checked><span>Картой</span></label><label><input type="radio" name="pay" value="Наличными"><span>Наличными</span></label><label><input type="radio" name="pay" value="Онлайн (перевод)"><span>Онлайн</span></label></div></div>' +
      '<div class="field"><label for="o-comment">Комментарий</label><textarea id="o-comment" name="comment" placeholder="Подъезд, домофон, пожелания к блюдам"></textarea></div>' +
      '<p class="cart-hint" data-delivery-hint></p>' +
      consentHTML("o") +
      '<div class="form-success" role="status"></div>' +
      "</form></div>" +
      '<div class="sheet-foot"><div class="cart-total"><span>Итого</span><b data-cart-total>0 ₽</b></div>' +
      '<button class="btn btn-primary" type="button" data-cart-next>Оформить заказ ' + ic("arrow") + "</button>" +
      '<p class="cart-hint">Заказ уйдёт в WhatsApp кафе — администратор подтвердит его и время. Доставка ' + (SITE.hours && SITE.hours.delivery ? SITE.hours.delivery.open + "–" + SITE.hours.delivery.close : "") + ".</p></div>" +
      "</aside></div>";
  }

  function cookieHTML() {
    return '<div class="cookie" id="cookie" role="region" aria-label="Уведомление о cookie">' +
      '<p>Мы используем файлы cookie и метаданные (данные о посещениях, IP-адрес, тип устройства) для работы сайта и аналитики. Подробнее — в <a href="cookies.html">Политике cookie</a>.</p>' +
      '<div class="cookie-actions"><button class="btn btn-primary btn-sm" type="button" data-cookie="all">Принять все</button><button class="btn btn-line btn-sm" type="button" data-cookie="necessary">Только необходимые</button><button class="btn btn-line btn-sm" type="button" data-cookie="settings">Настроить</button></div></div>' +
      '<div class="modal" id="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="cm-title"><div class="modal-backdrop" data-modal-close></div>' +
      '<div class="modal-panel" style="width:min(560px,100%);padding:32px"><button class="icon-btn modal-close" type="button" data-modal-close aria-label="Закрыть">' + ic("x") + "</button>" +
      '<h2 id="cm-title" style="font-size:38px;margin-bottom:10px">Настройки cookie</h2><p class="form-note">Выберите, какие файлы cookie разрешить. Изменить выбор можно в любой момент по ссылке «Настройки cookie» внизу сайта.</p>' +
      '<div class="toggle-row"><div><b>Необходимые</b><p>Корзина, выбор cookie, работа форм. Без них сайт не работает.</p></div><label class="switch"><input type="checkbox" checked disabled aria-label="Необходимые cookie — всегда включены"><span></span></label></div>' +
      '<div class="toggle-row"><div><b>Аналитика</b><p>Яндекс Метрика: статистика посещений, чтобы улучшать сайт.</p></div><label class="switch"><input type="checkbox" data-consent-key="a" aria-label="Аналитика"><span></span></label></div>' +
      '<div class="toggle-row"><div><b>Карты</b><p>Яндекс Карты на страницах «Контакты» и «Как нас найти».</p></div><label class="switch"><input type="checkbox" data-consent-key="m" aria-label="Карты"><span></span></label></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:22px"><button class="btn btn-primary btn-sm" type="button" data-cookie="save">Сохранить выбор</button><button class="btn btn-line btn-sm" type="button" data-cookie="all">Принять все</button></div>' +
      "</div></div>";
  }

  function fabHTML() {
    return '<div class="fab" aria-label="Быстрая связь"><a class="fab-wa" href="' + waLink() + '" target="_blank" rel="noopener" aria-label="Написать в WhatsApp">' + ic("wa") + '</a><a class="fab-call" href="tel:' + SITE.phoneRaw + '" aria-label="Позвонить">' + ic("phone") + "</a></div>";
  }

  function mountChrome() {
    var top = document.createElement("div");
    top.innerHTML = headerHTML();
    while (top.firstChild) document.body.insertBefore(top.firstChild, document.body.firstChild);
    var bottom = document.createElement("div");
    bottom.innerHTML = footerHTML() + cartSheetHTML() + cookieHTML() + fabHTML() +
      '<div class="curtain" id="curtain" aria-hidden="true">' + branchSVG({ leaves: 14 }) + "</div>" +
      '<div id="sr-live" class="visually-hidden" aria-live="polite"></div>' +
      (finePointer && !reduceMotion ? '<div class="cursor" aria-hidden="true"></div><div class="cursor-ring" aria-hidden="true"></div>' : "");
    while (bottom.firstChild) document.body.appendChild(bottom.firstChild);
  }

  /* =========================================================================
     МОДАЛКИ (общая логика открытия/закрытия, Esc, возврат фокуса)
     ========================================================================= */
  var openStack = [];
  function lockScroll(on) {
    document.documentElement.style.overflow = on ? "hidden" : "";
    if (window.ROZ && ROZ.lenis) on ? ROZ.lenis.stop() : ROZ.lenis.start();
  }
  function openModal(el) {
    if (!el) return;
    el.__return = document.activeElement;
    el.classList.add("is-open");
    openStack.push(el);
    lockScroll(true);
    var f = el.querySelector("input:not([disabled]):not([type=hidden]), button, a[href]");
    setTimeout(function () { f && f.focus({ preventScroll: true }); }, 60);
  }
  function closeModal(el) {
    if (!el) return;
    el.classList.remove("is-open");
    openStack = openStack.filter(function (x) { return x !== el; });
    if (!openStack.length) lockScroll(false);
    if (el.__return && el.__return.focus) el.__return.focus({ preventScroll: true });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openStack.length) closeModal(openStack[openStack.length - 1]);
  });
  document.addEventListener("click", function (e) {
    var c = e.target.closest("[data-modal-close]");
    if (c) closeModal(c.closest(".modal"));
  });

  /* =========================================================================
     КОРЗИНА: отрисовка и оформление
     ========================================================================= */
  function renderCart() {
    var lines = Cart.lines();
    var box = $("[data-cart-lines]");
    var form = $('[data-form="order"]');
    var next = $("[data-cart-next]");
    var count = Cart.count();
    $$(".cart-count").forEach(function (c) { c.textContent = count; c.classList.toggle("has-items", count > 0); });
    $$("[data-cart-open]").forEach(function (b) { b.setAttribute("aria-label", "Открыть корзину, товаров: " + count); });
    $("[data-cart-total]").textContent = rub(Cart.total());
    if (!box) return;
    if (!lines.length) {
      box.innerHTML = '<div class="cart-empty">' + branchSVG({ leaves: 12 }) + '<p>Корзина пока пуста.<br>Загляните в меню — там мангал, паста и авторские лимонады.</p><a class="btn btn-dark btn-sm" href="menu.html">Открыть меню</a></div>';
      form.hidden = true; box.hidden = false;
      next.hidden = true;
      return;
    }
    next.hidden = false;
    if (next.getAttribute("data-step") !== "send") next.disabled = false;
    box.innerHTML = lines.map(function (l) {
      var d = l.dish;
      return '<div class="cart-line">' + dishMedia(d) +
        "<div><h4>" + esc(d.name) + '</h4><span class="cl-price">' + rub(d.price * l.qty) + "</span></div>" +
        '<div class="qty sm" role="group" aria-label="Количество: ' + esc(d.name) + '"><button type="button" data-q="-1" data-id="' + d.id + '" aria-label="Убрать одну">' + ic("minus") + "</button><output>" + l.qty + '</output><button type="button" data-q="1" data-id="' + d.id + '" aria-label="Добавить ещё">' + ic("plus") + "</button></div></div>";
    }).join("");
    guardImages(box);
  }

  function initCart() {
    var sheet = $("#cart");
    var form = $('[data-form="order"]');
    var box = $("[data-cart-lines]");
    var next = $("[data-cart-next]");
    var showForm = function (on) {
      form.hidden = !on; box.hidden = on;
      next.innerHTML = on ? "Отправить заказ в WhatsApp " + ic("arrow") : "Оформить заказ " + ic("arrow");
      next.setAttribute("data-step", on ? "send" : "list");
      syncConsentButton(form);
    };
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-cart-open]")) { showForm(false); renderCart(); openModal(sheet); }
      if (e.target.closest("[data-cart-close]")) closeModal(sheet);
      var q = e.target.closest("[data-q]");
      if (q) { var id = q.getAttribute("data-id"); Cart.set(id, (Cart.items[id] || 0) + (+q.getAttribute("data-q"))); }
      var add = e.target.closest("[data-add]");
      if (add) { e.preventDefault(); e.stopPropagation(); addToCart(add.getAttribute("data-add"), 1, add); }
      var addName = e.target.closest("[data-add-name]");
      if (addName) { e.preventDefault(); var d = findDish(addName.getAttribute("data-add-name")); if (d) addToCart(d.id, 1, addName); }
    });
    $("[data-cart-back]").addEventListener("click", function () { showForm(false); });
    next.addEventListener("click", function () {
      if (next.getAttribute("data-step") === "send") { form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true })); }
      else showForm(true);
    });
    /* Переключатели «Доставка/Самовывоз» и «Ко времени» */
    form.addEventListener("change", function () {
      var delivery = form.mode.value === "Доставка";
      $("[data-address-field]", form).hidden = !delivery;
      $("[data-time-field]", form).hidden = form.when.value !== "time";
      var hint = $("[data-delivery-hint]", form);
      var dh = SITE.hours.delivery;
      hint.textContent = delivery && form.when.value === "now" && !isOpenNow(dh) ? "Сейчас доставка не работает (" + dh.open + "–" + dh.close + "). Выберите «Ко времени» — привезём к удобному часу." : "";
      syncConsentButton(form);
    });
    document.addEventListener("cart:change", renderCart);
    renderCart();
  }

  /* Текст заказа для WhatsApp */
  function orderMessage(data) {
    var lines = Cart.lines().map(function (l, i) { return (i + 1) + ". " + l.dish.name + " × " + l.qty + " = " + rub(l.dish.price * l.qty); });
    return [
      "Здравствуйте! Заказ с сайта кафе «Розмарин»:",
      lines.join("\n"),
      "Итого: " + rub(Cart.total()),
      "",
      "Имя: " + data.name,
      "Телефон: " + data.phone,
      "Получение: " + data.mode + (data.mode === "Доставка" ? " — " + data.address : ""),
      "Когда: " + (data.when === "time" && data.time ? "к " + data.time : "как можно скорее"),
      "Оплата: " + data.pay,
      data.comment ? "Комментарий: " + data.comment : ""
    ].filter(function (s, i, a) { return s !== "" || i < a.length - 1; }).join("\n");
  }

  /* =========================================================================
     ФОРМЫ: валидация, маска телефона, согласие, отправка
     ========================================================================= */
  /* Маска +7 (XXX) XXX-XX-XX */
  function maskPhone(v) {
    var d = v.replace(/\D/g, "");
    if (!d) return "";
    if (d[0] === "8") d = "7" + d.slice(1);
    if (d[0] !== "7") d = "7" + d;
    d = d.slice(0, 11);
    var r = "+7";
    if (d.length > 1) r += " (" + d.slice(1, 4);
    if (d.length >= 4) r += ")";
    if (d.length > 4) r += " " + d.slice(4, 7);
    if (d.length > 7) r += "-" + d.slice(7, 9);
    if (d.length > 9) r += "-" + d.slice(9, 11);
    return r;
  }
  /* Кнопка отправки неактивна, пока не отмечено согласие */
  function syncConsentButton(form) {
    var cb = form.querySelector("[data-consent]");
    var btn = form.querySelector('button[type="submit"]') || (form.getAttribute("data-form") === "order" ? $("[data-cart-next]") : null);
    if (!btn || !cb) return;
    if (form.getAttribute("data-form") === "order" && btn.getAttribute("data-step") !== "send") { btn.disabled = !Cart.count(); return; }
    btn.disabled = !cb.checked;
    btn.title = cb.checked ? "" : "Отметьте согласие на обработку персональных данных";
  }
  function setError(field, msg) {
    var wrap = field.closest(".field") || field.closest(".consent");
    if (!wrap) return;
    wrap.classList.toggle("has-error", !!msg);
    var e = wrap.querySelector(".field-error");
    if (e) e.textContent = msg || "";
    field.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  function validate(form) {
    var ok = true, first = null;
    $$("input, textarea, select", form).forEach(function (f) {
      if (f.closest("[hidden]")) { setError(f, ""); return; }
      var v = (f.value || "").trim(), msg = "";
      var req = f.hasAttribute("data-required") || (f.getAttribute("data-required-if") === "delivery" && form.mode && form.mode.value === "Доставка");
      if (req && !v) msg = "Заполните это поле";
      else if (v && f.getAttribute("data-type") === "phone" && v.replace(/\D/g, "").length !== 11) msg = "Введите номер полностью: +7 (XXX) XXX-XX-XX";
      else if (v && f.getAttribute("data-type") === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = "Проверьте e-mail";
      else if (v && f.getAttribute("data-type") === "name" && v.length < 2) msg = "Укажите имя";
      if (f.name === "time" && form.when && form.when.value === "time" && !v) msg = "Укажите время";
      if (f.type !== "checkbox" && f.type !== "radio") setError(f, msg);
      if (msg) { ok = false; first = first || f; }
    });
    var cb = form.querySelector("[data-consent]");
    if (cb && !cb.checked) { ok = false; cb.closest(".consent").classList.add("has-error"); first = first || cb; }
    if (first) first.focus();
    return ok;
  }
  function formData(form) {
    var o = {};
    $$("input, textarea, select", form).forEach(function (f) {
      if (!f.name || f.closest("[hidden]")) return;
      if ((f.type === "radio" || f.type === "checkbox") && !f.checked) { if (f.type === "checkbox") o[f.name] = false; return; }
      o[f.name] = f.type === "checkbox" ? true : f.value.trim();
    });
    return o;
  }
  /* Тексты сообщений для WhatsApp по типу формы */
  var FORM_TITLES = { booking: "Бронирование стола", callback: "Заказ обратного звонка", banquet: "Заявка на банкет", subscribe: "Подписка на новости" };
  var FIELD_LABELS = { name: "Имя", phone: "Телефон", date: "Дата", time: "Время", guests: "Гостей", zone: "Зона", format: "Формат", comment: "Комментарий", email: "E-mail", marketing: "Рекламные рассылки" };
  function genericMessage(type, data) {
    var rows = ["Здравствуйте! " + (FORM_TITLES[type] || "Заявка") + " с сайта кафе «Розмарин»:"];
    Object.keys(data).forEach(function (k) {
      if (k === "consent") return;
      var v = data[k];
      if (v === "" || v == null) return;
      if (typeof v === "boolean") v = v ? "да" : "нет";
      rows.push((FIELD_LABELS[k] || k) + ": " + v);
    });
    return rows.join("\n");
  }
  function initForms() {
    $$("form[data-form]").forEach(function (form) {
      var type = form.getAttribute("data-form");
      syncConsentButton(form);
      form.addEventListener("input", function (e) {
        var f = e.target;
        if (f.getAttribute("data-mask") === "phone") {
          f.value = maskPhone(f.value);
          var end = f.value.length;
          try { f.setSelectionRange(end, end); } catch (err) {}   // курсор всегда в конце номера
        }
        if (f.getAttribute("aria-invalid") === "true") setError(f, "");
      });
      form.addEventListener("change", function (e) {
        if (e.target.matches("[data-consent]")) { e.target.closest(".consent").classList.remove("has-error"); syncConsentButton(form); }
      });
      $$('[data-mask="phone"]', form).forEach(function (f) {
        f.addEventListener("focus", function () {
          if (!f.value) f.value = "+7 (";
          setTimeout(function () { try { f.setSelectionRange(f.value.length, f.value.length); } catch (err) {} }, 0);
        });
        f.addEventListener("blur", function () { if (f.value.replace(/\D/g, "").length <= 1) f.value = ""; });
      });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!validate(form)) return;
        var data = formData(form);
        var ok = $(".form-success", form);
        var done = function (msg) { form.classList.add("is-sent"); ok.textContent = msg; };
        /* Есть свой обработчик (например, Telegram-бот) — отправляем JSON методом POST.
           Персональные данные не попадают в адресную строку. */
        if (SITE.formEndpoint) {
          var payload = { type: type, data: data, page: location.pathname };
          if (type === "order") payload.cart = Cart.lines().map(function (l) { return { name: l.dish.name, qty: l.qty, price: l.dish.price }; });
          if (type === "order") payload.total = Cart.total();
          fetch(SITE.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
            .then(function (r) { if (!r.ok) throw 0; done("Спасибо! Заявка отправлена — мы свяжемся с вами в ближайшее время."); if (type === "order") Cart.clear(); form.reset(); syncConsentButton(form); })
            .catch(function () { done("Не получилось отправить. Позвоните нам: " + SITE.phone); });
          return;
        }
        /* Иначе — явный переход в WhatsApp по действию пользователя */
        var text = type === "order" ? orderMessage(data) : genericMessage(type, data);
        window.open(waLink(text), "_blank", "noopener");
        done(type === "order" ? "Открыли WhatsApp с вашим заказом — отправьте сообщение, и администратор подтвердит заказ." : "Открыли WhatsApp с текстом заявки — осталось нажать «Отправить».");
      });
    });
  }

  /* =========================================================================
     COOKIE-СОГЛАСИЕ. Метрика и Яндекс Карты — только после согласия.
     Выбор хранится в cookie «roz_consent» 12 месяцев (+ копия в localStorage,
     потому что при открытии файла с диска браузер не сохраняет cookie).
     ========================================================================= */
  var CONSENT_COOKIE = "roz_consent";
  function readConsent() {
    var m = document.cookie.match(new RegExp("(?:^|; )" + CONSENT_COOKIE + "=([^;]*)"));
    if (m) { try { return JSON.parse(decodeURIComponent(m[1])); } catch (e) {} }
    return store.get(CONSENT_COOKIE, null);
  }
  function writeConsent(c) {
    c.t = Date.now();
    var v = encodeURIComponent(JSON.stringify(c));
    document.cookie = CONSENT_COOKIE + "=" + v + "; max-age=" + 60 * 60 * 24 * 365 + "; path=/; SameSite=Lax";
    store.set(CONSENT_COOKIE, c);
    applyConsent(c);
  }
  function applyConsent(c) {
    if (!c) return;
    if (c.a) loadMetrika();
    if (c.m) loadMaps();
  }
  /* Яндекс Метрика — стандартный код счётчика, подключается динамически */
  function loadMetrika() {
    var id = SITE.metrikaId;
    if (!id || window.ym) return;
    (function (m, e, t, r, i, k, a) { m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); }; m[i].l = 1 * new Date(); k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a); })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    window.ym(id, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true });
  }
  /* Карта: виджет Яндекс Карт с карточкой организации — грузится только после согласия */
  function loadMaps() {
    $$("[data-map]").forEach(function (box) {
      if (box.querySelector("iframe")) return;
      var f = document.createElement("iframe");
      f.src = "https://yandex.ru/map-widget/v1/?mode=search&oid=" + SITE.yandexOrgId + "&ol=biz&z=16";
      f.title = "Кафе «Розмарин» на Яндекс Картах";
      f.loading = "lazy";
      f.setAttribute("allowfullscreen", "");
      box.appendChild(f);
      var ph = box.querySelector(".map-consent");
      if (ph) ph.remove();
    });
  }
  function initCookies() {
    var banner = $("#cookie"), modal = $("#cookie-modal");
    var c = readConsent();
    if (!c) setTimeout(function () { banner.classList.add("is-shown"); }, page === "home" ? 2200 : 900);
    else applyConsent(c);
    var fillModal = function () { var cur = readConsent() || {}; $$("[data-consent-key]", modal).forEach(function (i) { i.checked = !!cur[i.getAttribute("data-consent-key")]; }); };
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cookie]");
      if (b) {
        var act = b.getAttribute("data-cookie");
        if (act === "all") { writeConsent({ n: 1, a: 1, m: 1 }); banner.classList.remove("is-shown"); closeModal(modal); }
        if (act === "necessary") { writeConsent({ n: 1, a: 0, m: 0 }); banner.classList.remove("is-shown"); }
        if (act === "settings") { fillModal(); openModal(modal); }
        if (act === "save") {
          var o = { n: 1 };
          $$("[data-consent-key]", modal).forEach(function (i) { o[i.getAttribute("data-consent-key")] = i.checked ? 1 : 0; });
          writeConsent(o); banner.classList.remove("is-shown"); closeModal(modal);
        }
      }
      if (e.target.closest("[data-cookie-settings]")) { fillModal(); openModal(modal); }
      /* Кнопка «Показать карту» на заглушке — согласие именно на карты */
      if (e.target.closest("[data-map-consent]")) { var cur = readConsent() || { n: 1, a: 0 }; cur.m = 1; writeConsent(cur); banner.classList.remove("is-shown"); }
    });
  }

  /* =========================================================================
     ШАПКА, МОБИЛЬНОЕ МЕНЮ, КУРСОР, ШТОРКА, «магнитные» кнопки
     ========================================================================= */
  function initHeader() {
    var header = $("#header"), last = 0;
    var onScroll = function () {
      var y = window.scrollY;
      header.classList.toggle("is-solid", y > 40);
      header.classList.toggle("is-hidden", y > 500 && y > last && !openStack.length);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    var mm = $("#mobile-menu"), burger = $(".burger");
    var toggle = function (on) { mm.classList.toggle("is-open", on); burger.setAttribute("aria-expanded", on); lockScroll(on); if (on) setTimeout(function () { mm.querySelector("a").focus(); }, 100); };
    burger.addEventListener("click", function () { toggle(true); });
    $(".mm-close").addEventListener("click", function () { toggle(false); burger.focus(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && mm.classList.contains("is-open")) toggle(false); });
  }

  function initCursor() {
    var dot = $(".cursor"), ring = $(".cursor-ring");
    if (!dot) return;
    var x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    window.addEventListener("mousemove", function (e) { x = e.clientX; y = e.clientY; dot.style.transform = "translate(" + x + "px," + y + "px)"; }, { passive: true });
    (function loop() { rx += (x - rx) * 0.18; ry += (y - ry) * 0.18; ring.style.transform = "translate(" + rx + "px," + ry + "px)"; requestAnimationFrame(loop); })();
    document.addEventListener("mouseover", function (e) { ring.classList.toggle("is-hover", !!e.target.closest("a, button, label, .m-card, .dish-card")); });
  }

  /* Кнопки-«капли»: заливка расходится от точки наведения */
  function initButtons() {
    document.addEventListener("pointermove", function (e) {
      var b = e.target.closest && e.target.closest(".btn-primary");
      if (!b) return;
      var r = b.getBoundingClientRect();
      b.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
      b.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
    }, { passive: true });
  }

  /* Переходы между страницами: шторка цвета хвои с веточкой */
  function initTransitions() {
    var curtain = $("#curtain");
    if (reduceMotion) return;
    if (session.get("roz-curtain")) {
      session.set("roz-curtain", "");
      curtain.classList.add("is-in", "no-anim");
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        curtain.classList.remove("no-anim");
        curtain.classList.add("is-out");
        setTimeout(function () { curtain.classList.remove("is-in", "is-out"); }, 650);
      }); });
    }
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      var href = a.getAttribute("href");
      if (a.target === "_blank" || a.hasAttribute("download") || /^(#|tel:|mailto:|https?:|javascript:)/.test(href)) return;
      if (!/\.html(\?|#|$)/.test(href)) return;
      if (href.split("#")[0] === location.pathname.split("/").pop()) return;  // ссылка на ту же страницу
      e.preventDefault();
      session.set("roz-curtain", "1");
      curtain.classList.add("is-in");
      setTimeout(function () { location.href = href; }, 520);
    });
    window.addEventListener("pageshow", function (e) { if (e.persisted) curtain.classList.remove("is-in", "is-out"); });
  }

  /* =========================================================================
     ПЛАВНЫЙ СКРОЛЛ И АНИМАЦИИ ПОЯВЛЕНИЯ (Lenis + GSAP ScrollTrigger)
     ========================================================================= */
  function initMotion() {
    var hasGsap = !!(window.gsap && window.ScrollTrigger);
    window.ROZ.hasGsap = hasGsap && !reduceMotion;
    if (!hasGsap || reduceMotion) return;
    gsap.registerPlugin(ScrollTrigger);
    /* Lenis: autoRaf выключен, кадры отдаёт gsap.ticker — так scrub не дёргается */
    if (window.Lenis) {
      var lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, autoRaf: false });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      window.ROZ.lenis = lenis;
      /* Якорные ссылки — тоже плавно */
      document.addEventListener("click", function (e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a || e.defaultPrevented || a.getAttribute("href").length < 2) return;
        var t = document.querySelector(a.getAttribute("href"));
        if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -80 }); }
      });
    }
    document.documentElement.classList.add("js-anim");
    /* Появление снизу на 40px с fade, длительность 0.9с, stagger 0.08с */
    $$("[data-reveal]").forEach(function (el) {
      gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", delay: (+el.getAttribute("data-reveal") || 0) * 0.08,
        scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    });
    /* Веточки-разделители «прорастают» по мере прокрутки */
    $$(".divider .branch").forEach(function (svg) {
      var parts = svg.querySelectorAll(".stem, .leaf");
      gsap.set(parts, { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.to(parts, { strokeDashoffset: 0, stagger: 0.025, ease: "none",
        scrollTrigger: { trigger: svg, start: "top 92%", end: "top 55%", scrub: 0.6, onLeave: function () { svg.classList.add("is-grown"); } } });
    });
    /* Лёгкий параллакс фото с data-parallax */
    $$("[data-parallax]").forEach(function (el) {
      var s = +el.getAttribute("data-parallax") || 10;
      gsap.fromTo(el, { yPercent: -s / 2 }, { yPercent: s / 2, ease: "none", scrollTrigger: { trigger: el.parentNode, start: "top bottom", end: "bottom top", scrub: true } });
    });
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }

  /* =========================================================================
     СТАРТ
     ========================================================================= */
  window.ROZ = {
    SITE: SITE, DISHES: DISHES, Cart: Cart, ic: ic, esc: esc, rub: rub, $: $, $$: $$,
    branchSVG: branchSVG, logoSVG: logoSVG, dishMedia: dishMedia, addToCart: addToCart,
    openModal: openModal, closeModal: closeModal, guardImages: guardImages, fillConfig: fillConfig,
    reduceMotion: reduceMotion, finePointer: finePointer, consentHTML: consentHTML, initForms: initForms,
    waLink: waLink, routeLink: routeLink, isOpenNow: isOpenNow, findDish: findDish, lenis: null, hasGsap: false
  };

  mountChrome();
  /* Вставка веточек в контейнеры <div data-branch="14"></div> */
  $$("[data-branch]").forEach(function (el) { el.innerHTML = branchSVG({ leaves: +el.getAttribute("data-branch") || 14 }); });
  /* Иконки в разметке: <i data-ic="phone"></i> */
  $$("[data-ic]").forEach(function (el) { el.outerHTML = ic(el.getAttribute("data-ic")); });
  fillConfig(document);
  guardImages(document);
  updateOpenBadges();
  setInterval(updateOpenBadges, 60 * 1000);
  initHeader();
  initCart();
  initForms();
  initCookies();
  initCursor();
  initButtons();
  initTransitions();
  initMotion();
  document.dispatchEvent(new CustomEvent("roz:core-ready"));
})();
