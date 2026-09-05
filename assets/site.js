/* Salzamt – shared runtime. Exposes window.Salzamt. No dependencies.
   See PLAN.md section 4.5 for the API contract. */
(function () {
  "use strict";

  var BASE_COMPLAINTS = 3412876;
  var STORAGE_KEYS = {
    cart: "salzamt_warenkorb",
    complaints: "salzamt_beschwerden_lokal",
  };
  var MONTHS = [
    "Jänner",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ];

  /* ---------- storage (fails silently when unavailable) ---------- */

  function storageGet(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- Austrian formatting ---------- */

  function formatNumber(n, decimals) {
    decimals = decimals || 0;
    var value = Number(n) || 0;
    var parts = Math.abs(value).toFixed(decimals).split(".");
    var integer = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    var out = decimals > 0 ? integer + "," + parts[1] : integer;
    return (value < 0 ? "−" : "") + out;
  }

  function formatEuro(cents) {
    return "€ " + formatNumber(Math.round(Number(cents) || 0) / 100, 2);
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function formatDateLong(date) {
    return (
      date.getDate() + ". " + MONTHS[date.getMonth()] + " " + date.getFullYear()
    );
  }

  function formatDateShort(date) {
    return (
      pad2(date.getDate()) +
      "." +
      pad2(date.getMonth() + 1) +
      "." +
      date.getFullYear()
    );
  }

  function formatTime(date) {
    return pad2(date.getHours()) + ":" + pad2(date.getMinutes()) + " Uhr";
  }

  function addYearsMonths(date, years, months) {
    var day = date.getDate();
    var result = new Date(
      date.getFullYear() + (years || 0),
      date.getMonth() + (months || 0),
      1,
      date.getHours(),
      date.getMinutes(),
    );
    var lastDay = new Date(
      result.getFullYear(),
      result.getMonth() + 1,
      0,
    ).getDate();
    result.setDate(Math.min(day, lastDay));
    return result;
  }

  /* ---------- reference numbers ---------- */

  function randomDigits(count) {
    var s = "";
    for (var i = 0; i < count; i++) s += Math.floor(Math.random() * 10);
    return s;
  }

  function newCaseNumber() {
    return (
      "SA-" +
      new Date().getFullYear() +
      "/" +
      randomDigits(3) +
      "." +
      randomDigits(3) +
      "-II/3-NB"
    );
  }

  function newOrderNumber() {
    return "B-" + new Date().getFullYear() + "-NB-" + randomDigits(6);
  }

  /* ---------- cart ---------- */

  function getCart() {
    var raw = storageGet(STORAGE_KEYS.cart, {});
    var cart = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return cart;
    Object.keys(raw).forEach(function (id) {
      var qty = parseInt(raw[id], 10);
      if (qty > 0) cart[id] = qty;
    });
    return cart;
  }

  function saveCart(cart) {
    storageSet(STORAGE_KEYS.cart, cart);
    updateCartBadge();
    return cart;
  }

  function setCartQty(id, qty) {
    var cart = getCart();
    qty = parseInt(qty, 10);
    if (!qty || qty <= 0) delete cart[id];
    else cart[id] = Math.min(qty, 999);
    return saveCart(cart);
  }

  function addToCart(id, qty) {
    var cart = getCart();
    var add = qty === undefined ? 1 : parseInt(qty, 10) || 0;
    return setCartQty(id, (cart[id] || 0) + add);
  }

  function clearCart() {
    return saveCart({});
  }

  function cartCount() {
    var cart = getCart();
    return Object.keys(cart).reduce(function (sum, id) {
      return sum + cart[id];
    }, 0);
  }

  function updateCartBadge() {
    var count = cartCount();
    var badges = document.querySelectorAll("[data-cart-count]");
    for (var i = 0; i < badges.length; i++) {
      badges[i].textContent = String(count);
      badges[i].classList.toggle("is-empty", count === 0);
    }
  }

  /* ---------- complaints counter ---------- */

  function complaintsLocal() {
    var n = parseInt(storageGet(STORAGE_KEYS.complaints, 0), 10);
    return n > 0 ? n : 0;
  }

  function registerComplaint() {
    var n = complaintsLocal() + 1;
    storageSet(STORAGE_KEYS.complaints, n);
    return n;
  }

  function complaintsTotal() {
    return BASE_COMPLAINTS + complaintsLocal();
  }

  /* ---------- UI helpers ---------- */

  function prefersReducedMotion() {
    return !!(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function countUp(el, target, ms) {
    target = Number(target) || 0;
    ms = ms || 1600;
    if (prefersReducedMotion() || !window.requestAnimationFrame) {
      el.textContent = formatNumber(target);
      return;
    }
    var start = null;
    function step(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min(1, (timestamp - start) / ms);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatNumber(Math.round(target * eased));
      if (progress < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  var toastTimer = null;

  function showToast(text, ms) {
    var toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, ms || 2600);
  }

  /* ---------- image fallbacks ---------- */

  function applyFallback(img) {
    if (img.dataset.fallbackDone) return;
    img.dataset.fallbackDone = "1";
    var fallback = img.getAttribute("data-fallback");
    if (!fallback) return;
    if (fallback === "lichtbild") {
      var placeholder = document.createElement("div");
      var classes = ["circle-photo", "photo-missing"];
      img.className.split(/\s+/).forEach(function (c) {
        if (c && classes.indexOf(c) === -1) classes.push(c);
      });
      placeholder.className = classes.join(" ");
      placeholder.setAttribute("role", "img");
      placeholder.setAttribute(
        "aria-label",
        img.getAttribute("alt") || "Lichtbild fehlt",
      );
      placeholder.innerHTML = "<span>Lichtbild<br>in Bearbeitung</span>";
      if (img.parentNode) img.parentNode.replaceChild(placeholder, img);
    } else {
      img.src = fallback;
    }
  }

  function initImageFallbacks() {
    var images = document.querySelectorAll("img[data-fallback]");
    for (var i = 0; i < images.length; i++) {
      (function (img) {
        img.addEventListener("error", function () {
          applyFallback(img);
        });
        if (img.complete && img.naturalWidth === 0) applyFallback(img);
      })(images[i]);
    }
  }

  /* ---------- navigation ---------- */

  function currentPageFile() {
    var file = window.location.pathname.split("/").pop() || "index.html";
    return file.toLowerCase();
  }

  function initNav() {
    var current = currentPageFile();
    var links = document.querySelectorAll(".main-nav a");
    for (var i = 0; i < links.length; i++) {
      var href = (links[i].getAttribute("href") || "")
        .split(/[?#]/)[0]
        .toLowerCase();
      if (href === current) links[i].setAttribute("aria-current", "page");
    }
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("main-nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
  }

  /* ---------- boot ---------- */

  function init() {
    initNav();
    initImageFallbacks();
    updateCartBadge();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.Salzamt = {
    BASE_COMPLAINTS: BASE_COMPLAINTS,
    STORAGE_KEYS: STORAGE_KEYS,
    MONTHS: MONTHS,
    formatNumber: formatNumber,
    formatEuro: formatEuro,
    formatDateLong: formatDateLong,
    formatDateShort: formatDateShort,
    formatTime: formatTime,
    addYearsMonths: addYearsMonths,
    newCaseNumber: newCaseNumber,
    newOrderNumber: newOrderNumber,
    getCart: getCart,
    setCartQty: setCartQty,
    addToCart: addToCart,
    clearCart: clearCart,
    cartCount: cartCount,
    updateCartBadge: updateCartBadge,
    complaintsLocal: complaintsLocal,
    registerComplaint: registerComplaint,
    complaintsTotal: complaintsTotal,
    countUp: countUp,
    showToast: showToast,
    prefersReducedMotion: prefersReducedMotion,
    initImageFallbacks: initImageFallbacks,
    initNav: initNav,
  };
})();
