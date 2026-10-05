/* QUIET KHAOS — storefront behaviour (no dependencies) */
(function () {
  "use strict";

  var P = window.QK_PRODUCTS || [];
  var CUR = window.QK_CURRENCY || { symbol: "$" };
  var FREE = window.QK_FREE_SHIP || 100;
  var IMG = "assets/img/";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var money = function (n) { return CUR.symbol + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0); };
  var byId = function (id) { for (var i = 0; i < P.length; i++) if (P[i].id === id) return P[i]; return null; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var catLabel = function (c) { return (window.QK_CATEGORIES[c] || {}).label || c; };

  var ICON_BAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>';
  var ICON_PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  /* ---------------- storage (safe) ---------------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------------- cart ---------------- */
  var cart = store.get("qk_cart", []);
  if (!Array.isArray(cart)) cart = [];
  cart = cart.filter(function (l) { return byId(l.id); });

  function saveCart() { store.set("qk_cart", cart); renderCart(); }
  function cartCount() { return cart.reduce(function (a, l) { return a + l.qty; }, 0); }
  function cartTotal() { return cart.reduce(function (a, l) { return a + byId(l.id).price * l.qty; }, 0); }

  function addToCart(id, size, color, qty) {
    var p = byId(id); if (!p) return;
    size = size || p.sizes[0]; color = color || p.colors[0].name; qty = qty || 1;
    var key = id + "|" + size + "|" + color;
    var line = cart.filter(function (l) { return l.key === key; })[0];
    if (line) line.qty = Math.min(line.qty + qty, 10);
    else cart.push({ key: key, id: id, size: size, color: color, qty: qty });
    saveCart();
    var c = $(".cart-count"); if (c) { c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); }
    toast(p, size);
  }

  function cartLineHTML(l, compact) {
    var p = byId(l.id);
    return '<div class="cart-line" data-key="' + esc(l.key) + '">' +
      '<a class="cart-line__img" href="product.html?p=' + p.id + '"><img src="' + IMG + p.img + '-sm.webp" alt="" loading="lazy" width="560" height="560"></a>' +
      '<div><a class="cart-line__name" href="product.html?p=' + p.id + '">' + esc(p.short) + '</a>' +
      '<div class="cart-line__meta">' + esc(l.color) + (l.size !== "One Size" ? " · " + esc(l.size) : "") + (compact ? " · Qty " + l.qty : "") + '</div>' +
      (compact ? "" : '<div class="qty" role="group" aria-label="Quantity"><button type="button" data-q="-1" aria-label="Decrease">−</button><span>' + l.qty + '</span><button type="button" data-q="1" aria-label="Increase">+</button></div>' +
      '<div><button type="button" class="cart-line__remove" data-remove>Remove</button></div>') +
      '</div><div class="cart-line__price">' + money(p.price * l.qty) + '</div></div>';
  }

  function renderCart() {
    var n = cartCount();
    $$(".cart-count").forEach(function (el) { el.textContent = n; el.classList.toggle("is-on", n > 0); });
    var body = $(".cart__body"); if (!body) return;
    $(".cart__head h2 span").textContent = "(" + n + ")";
    var total = cartTotal();
    var ship = $(".cart__ship");
    if (n === 0) {
      body.innerHTML = '<div class="cart__empty"><img src="' + IMG + 'rose.webp" alt=""><p>Your bag is quiet.<br><em class="serif-italic">Let’s make some khaos.</em></p><a href="collection.html" class="btn">Shop the collection</a></div>';
      $(".cart__foot").hidden = true; ship.hidden = true; return;
    }
    $(".cart__foot").hidden = false; ship.hidden = false;
    var left = FREE - total;
    ship.innerHTML = (left > 0 ? "You’re <b>" + money(left) + "</b> away from free shipping" : "<b>You’ve unlocked free shipping.</b>") +
      '<div class="cart__ship-bar"><i style="width:' + Math.min(100, total / FREE * 100) + '%"></i></div>';
    body.innerHTML = cart.map(function (l) { return cartLineHTML(l); }).join("");
    $(".cart__total").textContent = money(total);
  }

  function openCart() { open($(".cart")); }

  document.addEventListener("click", function (e) {
    var t = e.target;
    var line = t.closest && t.closest(".cart .cart-line");
    if (line) {
      var l = cart.filter(function (x) { return x.key === line.dataset.key; })[0];
      if (!l) return;
      if (t.closest("[data-remove]")) { cart = cart.filter(function (x) { return x !== l; }); saveCart(); }
      var q = t.closest("[data-q]");
      if (q) { l.qty = Math.max(0, Math.min(10, l.qty + Number(q.dataset.q))); if (!l.qty) cart = cart.filter(function (x) { return x !== l; }); saveCart(); }
    }
    var quick = t.closest && t.closest("[data-quick]");
    if (quick) { e.preventDefault(); var p = byId(quick.dataset.quick); if (p.sizes.length > 1) { location.href = "product.html?p=" + p.id; } else { addToCart(p.id); } }
  });

  /* ---------------- drawers ---------------- */
  var backdrop = $(".drawer-backdrop");
  var lastFocus = null;
  function open(el) {
    if (!el) return;
    lastFocus = document.activeElement;
    closeAll();
    el.classList.add("is-open"); el.setAttribute("aria-hidden", "false");
    backdrop && backdrop.classList.add("is-open");
    document.body.classList.add("no-scroll");
    var f = el.querySelector("button, a"); f && setTimeout(function () { f.focus(); }, 60);
  }
  function closeAll() {
    $$(".menu, .cart, .modal").forEach(function (el) { el.classList.remove("is-open"); el.setAttribute("aria-hidden", "true"); });
    backdrop && backdrop.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
  }
  $$("[data-open-menu]").forEach(function (b) { b.addEventListener("click", function () { open($(".menu")); }); });
  $$("[data-open-cart]").forEach(function (b) { b.addEventListener("click", openCart); });
  $$("[data-close]").forEach(function (b) { b.addEventListener("click", function () { closeAll(); lastFocus && lastFocus.focus(); }); });
  backdrop && backdrop.addEventListener("click", closeAll);
  $$(".modal").forEach(function (m) { m.addEventListener("click", function (e) { if (e.target === m) closeAll(); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });

  /* ---------------- toast ---------------- */
  var toastTimer;
  function toast(p, size) {
    var el = $(".toast"); if (!el) return;
    el.innerHTML = '<img src="' + IMG + p.img + '-sm.webp" alt=""><span><b>Added to bag</b> <u>View bag</u><br>' + esc(p.short) + (size && size !== "One Size" ? " · " + esc(size) : "") + '</span>';
    el.classList.add("is-on");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove("is-on"); }, 2600);
    el.onclick = function () { el.classList.remove("is-on"); openCart(); };
  }

  /* ---------------- header ---------------- */
  var header = $(".header");
  if (header && header.classList.contains("header--over")) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 40); };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  /* ---------------- reveal ---------------- */
  function observeReveal(root) {
    var els = $$(".reveal:not(.is-in), .manifesto:not(.is-in)", root);
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- product card ---------------- */
  function cardHTML(p, i) {
    var badge = p.badge ? '<span class="card__badge' + (p.badge === "Sale" || p.badge === "Limited" ? " card__badge--ember" : "") + '">' + esc(p.badge) + '</span>' : "";
    var sw = p.colors.map(function (c) { return '<i style="background:' + c.hex + '" title="' + esc(c.name) + '"></i>'; }).join("");
    var z = p.zoom && p.zoom[0];
    return '<article class="card reveal' + (i ? " reveal-d" + (i % 4) : "") + '">' +
      '<div class="card__mediawrap"><a class="card__media" href="product.html?p=' + p.id + '" aria-label="' + esc(p.short) + '">' + badge +
      '<img class="img-main has-alt" src="' + IMG + p.img + '-sm.webp" alt="' + esc(p.name) + '" loading="lazy" width="560" height="560">' +
      '<img class="img-alt" src="' + IMG + p.img + '-sm.webp" alt="" loading="lazy" width="560" height="560" style="transform-origin:' + (z ? z[0] + " " + z[1] : "50% 50%") + '">' +
      '</a>' +
      '<button class="card__quick" type="button" data-quick="' + p.id + '" aria-label="' + (p.sizes.length > 1 ? "Choose size for " : "Add to bag: ") + esc(p.short) + '">' + (p.sizes.length > 1 ? ICON_PLUS : ICON_BAG) + '</button></div>' +
      '<div class="card__body"><span class="card__cat">' + catLabel(p.cat) + '</span>' +
      '<h3 class="card__name"><a href="product.html?p=' + p.id + '">' + esc(p.short) + '</a></h3>' +
      '<div class="card__price">' + money(p.price) + (p.compare ? '<s>' + money(p.compare) + '</s>' : "") + '</div>' +
      (p.colors.length > 1 ? '<div class="card__swatches">' + sw + '</div>' : "") +
      '</div></article>';
  }
  function fill(sel, list) {
    var el = $(sel); if (!el) return;
    el.innerHTML = list.map(cardHTML).join(""); observeReveal(el);
  }

  /* ---------------- pages ---------------- */
  var page = document.body.dataset.page;

  if (page === "home") {
    fill("[data-rail='new']", P.filter(function (p) { return p.cat !== "beanies"; }).slice(0, 4));
    fill("[data-grid='beanies']", P.filter(function (p) { return p.cat === "beanies"; }).slice(0, 4));
  }

  if (page === "collection") {
    var params = new URLSearchParams(location.search);
    var state = { c: params.get("c") || "all", s: params.get("s") || "featured" };
    if (!window.QK_CATEGORIES[state.c]) state.c = "all";
    var chips = $(".chips"), sortSel = $("#sort");
    chips.innerHTML = Object.keys(window.QK_CATEGORIES).map(function (k) {
      var n = k === "all" ? P.length : P.filter(function (p) { return p.cat === k; }).length;
      return '<button class="chip" type="button" data-c="' + k + '">' + window.QK_CATEGORIES[k].label + ' <sup>' + n + '</sup></button>';
    }).join("");
    var renderShop = function () {
      var list = P.filter(function (p) { return state.c === "all" || p.cat === state.c; }).slice();
      if (state.s === "low") list.sort(function (a, b) { return a.price - b.price; });
      else if (state.s === "high") list.sort(function (a, b) { return b.price - a.price; });
      else if (state.s === "az") list.sort(function (a, b) { return a.short.localeCompare(b.short); });
      else list.sort(function (a, b) { return a.order - b.order; });
      fill(".grid", list);
      $$(".chip", chips).forEach(function (b) { b.classList.toggle("is-active", b.dataset.c === state.c); b.setAttribute("aria-pressed", b.dataset.c === state.c); });
      $(".result-count").textContent = list.length + (list.length === 1 ? " piece" : " pieces");
      var cat = window.QK_CATEGORIES[state.c];
      $("[data-shop-title]").innerHTML = state.c === "all" ? "The <em>Collection</em>" : "<em>" + cat.title + "</em>";
      $("[data-crumb]").textContent = cat.label;
      document.title = (state.c === "all" ? "Shop All" : cat.title) + " — Quiet Khaos";
      var q = new URLSearchParams(); if (state.c !== "all") q.set("c", state.c); if (state.s !== "featured") q.set("s", state.s);
      history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
    };
    chips.addEventListener("click", function (e) { var b = e.target.closest(".chip"); if (!b) return; state.c = b.dataset.c; renderShop(); });
    sortSel.value = state.s;
    sortSel.addEventListener("change", function () { state.s = sortSel.value; renderShop(); });
    renderShop();
  }

  if (page === "product") {
    var id = new URLSearchParams(location.search).get("p");
    var p = byId(id) || P[0];
    var sel = { size: p.sizes.length === 1 ? p.sizes[0] : null, color: p.colors[0].name, qty: 1 };
    document.title = p.short + " — Quiet Khaos";
    var md = $('meta[name="description"]'); md && md.setAttribute("content", p.lede);

    $("[data-crumb-cat]").textContent = catLabel(p.cat);
    $("[data-crumb-cat]").href = "collection.html?c=" + p.cat;
    $("[data-crumb-name]").textContent = p.short;

    /* gallery: full shot + two detail crops */
    var slides = [{ z: null }].concat((p.zoom || []).map(function (z) { return { z: z }; }));
    var track = $(".gallery__track"), dots = $(".gallery__dots"), thumbs = $(".gallery__thumbs");
    track.innerHTML = slides.map(function (s, i) {
      return '<div class="gallery__slide' + (s.z ? " gallery__slide--zoom" : "") + '"' + (s.z ? ' style="--zx:' + s.z[0] + ';--zy:' + s.z[1] + '"' : "") + '>' +
        '<img src="' + IMG + p.img + '.webp" alt="' + esc(p.name) + (i ? " — detail " + i : "") + '" width="1000" height="1000"' + (i ? ' loading="lazy"' : ' fetchpriority="high"') + '></div>';
    }).join("");
    dots.innerHTML = slides.map(function (s, i) { return '<button type="button" aria-label="Image ' + (i + 1) + '"></button>'; }).join("");
    thumbs.innerHTML = slides.map(function (s, i) {
      return '<button type="button" aria-label="Show image ' + (i + 1) + '"><img src="' + IMG + p.img + '-sm.webp" alt="" style="' + (s.z ? "transform:scale(1.9);transform-origin:" + s.z[0] + " " + s.z[1] : "") + '"></button>';
    }).join("");
    var setActive = function (i) {
      $$("button", dots).forEach(function (b, j) { b.classList.toggle("is-active", i === j); });
      $$("button", thumbs).forEach(function (b, j) { b.classList.toggle("is-active", i === j); });
    };
    var goTo = function (i) { track.scrollTo({ left: track.clientWidth * i, behavior: "smooth" }); setActive(i); };
    track.addEventListener("scroll", function () { setActive(Math.round(track.scrollLeft / track.clientWidth)); }, { passive: true });
    $$("button", dots).forEach(function (b, i) { b.addEventListener("click", function () { goTo(i); }); });
    $$("button", thumbs).forEach(function (b, i) { b.addEventListener("click", function () { goTo(i); }); });
    setActive(0);

    /* info */
    $(".pdp__cat").textContent = catLabel(p.cat) + " · Drop 01";
    $(".pdp__title").textContent = p.name;
    $(".pdp__price").innerHTML = money(p.price) + (p.compare ? "<s>" + money(p.compare) + "</s>" : "");
    $(".pdp__lede").textContent = p.lede;
    $(".acc__details").innerHTML = "<ul>" + p.details.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ul>";
    $(".acc__fit").textContent = p.fit;

    var colorsEl = $(".colors");
    colorsEl.innerHTML = p.colors.map(function (c) { return '<button type="button" class="color" style="background:' + c.hex + '" data-color="' + esc(c.name) + '" aria-label="' + esc(c.name) + '"></button>'; }).join("");
    var updColor = function () {
      $$(".color", colorsEl).forEach(function (b) { var on = b.dataset.color === sel.color; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on); });
      $("[data-color-name]").textContent = sel.color;
    };
    colorsEl.addEventListener("click", function (e) { var b = e.target.closest(".color"); if (b) { sel.color = b.dataset.color; updColor(); } });
    updColor();

    var sizesEl = $(".sizes"), sizeWrap = $("[data-size-opt]");
    if (p.sizes.length === 1) { sizeWrap.hidden = true; }
    sizesEl.innerHTML = p.sizes.map(function (s) {
      var out = p.soldOut.indexOf(s) > -1;
      return '<button type="button" class="size' + (out ? " is-out" : "") + '" data-size="' + s + '"' + (out ? ' aria-disabled="true" title="Sold out"' : "") + '>' + s + '</button>';
    }).join("");
    var addBtns = $$("[data-add]");
    var updSize = function () {
      $$(".size", sizesEl).forEach(function (b) { var on = b.dataset.size === sel.size; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on); });
      $("[data-size-name]").textContent = sel.size || "Select a size";
      addBtns.forEach(function (b) { b.querySelector("span").textContent = sel.size ? "Add to bag — " + money(p.price * sel.qty) : "Select a size"; });
    };
    sizesEl.addEventListener("click", function (e) { var b = e.target.closest(".size"); if (b && !b.classList.contains("is-out")) { sel.size = b.dataset.size; updSize(); } });

    var qtyEl = $(".pdp__buy .qty span");
    $$(".pdp__buy .qty button").forEach(function (b) {
      b.addEventListener("click", function () { sel.qty = Math.max(1, Math.min(10, sel.qty + Number(b.dataset.q))); qtyEl.textContent = sel.qty; updSize(); });
    });
    addBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        if (!sel.size) {
          sizeWrap.scrollIntoView({ behavior: "smooth", block: "center" });
          sizesEl.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 320 });
          return;
        }
        addToCart(p.id, sel.size, sel.color, sel.qty);
      });
    });
    updSize();

    $(".buybar__name").textContent = p.short;
    $(".buybar__price").textContent = money(p.price);
    var mainBtn = $(".btn--order"), buybar = $(".buybar");
    if ("IntersectionObserver" in window && mainBtn) {
      new IntersectionObserver(function (en) { buybar.classList.toggle("is-on", !en[0].isIntersecting && en[0].boundingClientRect.top < 0); }).observe(mainBtn);
    }

    /* desktop hover zoom on main slide */
    if (window.matchMedia("(hover:hover) and (min-width:900px)").matches) {
      $$(".gallery__slide", track).forEach(function (s) {
        var img = s.querySelector("img"), base = s.classList.contains("gallery__slide--zoom");
        s.addEventListener("mousemove", function (e) {
          var r = s.getBoundingClientRect();
          img.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + "% " + ((e.clientY - r.top) / r.height * 100) + "%";
          img.style.transform = "scale(" + (base ? 2.4 : 1.8) + ")";
        });
        s.addEventListener("mouseleave", function () { img.style.transform = ""; img.style.transformOrigin = ""; });
      });
    }

    /* size guide visibility */
    var sg = $("[data-open-size]");
    if (sg) {
      if (p.cat === "beanies") sg.hidden = true;
      sg.addEventListener("click", function () { open($("#size-guide")); });
      $("[data-guide-tees]").hidden = p.cat !== "tees";
      $("[data-guide-hoodies]").hidden = p.cat !== "hoodies";
    }

    fill("[data-rail='related']", P.filter(function (x) { return x.id !== p.id && x.cat === p.cat; })
      .concat(P.filter(function (x) { return x.cat !== p.cat; })).slice(0, 4));
  }

  if (page === "checkout") {
    var sumEl = $(".summary__lines");
    var renderSummary = function () {
      if (!cart.length) { location.replace("collection.html"); return; }
      sumEl.innerHTML = cart.map(function (l) { return cartLineHTML(l, true); }).join("");
      var sub = cartTotal(), ship = sub >= FREE ? 0 : 8;
      $("[data-sub]").textContent = money(sub);
      $("[data-ship]").textContent = ship ? money(ship) : "Free";
      $("[data-total]").textContent = money(sub + ship);
    };
    renderSummary();
    $(".checkout form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target; if (!f.reportValidity()) return;
      cart = []; saveCart();
      $(".checkout").hidden = true; $(".success").hidden = false;
      $(".success [data-name]").textContent = (f.elements.first.value || "").trim() || "friend";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* newsletter (static demo) */
  $$("form[data-news]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      f.innerHTML = '<p style="margin:0 auto;font-family:var(--serif);font-size:26px;font-style:italic;color:var(--bone)">You’re in. Welcome to the quiet.</p>';
    });
  });

  renderCart();
  observeReveal(document);
  var y = $("[data-year]"); if (y) y.textContent = new Date().getFullYear();
})();
