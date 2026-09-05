/* Salzamt – Kassa: editable cart, totals, order confirmation and the cash
   denomination rule (splitCash). Requires site.js and shop.js in the browser;
   also loadable in Node so splitCash can be unit-checked. */
(function () {
  "use strict";

  var root = typeof window !== "undefined" ? window : {};
  var S = root.Salzamt || (root.Salzamt = {});

  /* All amounts are integer Groschen (1 Schilling = 100 Groschen). */
  var HANDLING_FEE_GROSCHEN = 11848; // S 118,48
  var SHIPPING_GROSCHEN = 0;
  var DELIVERY_YEARS = 3;
  var DELIVERY_MONTHS = 4;

  /* Schilling cash: notes only 20 S and 50 S in equal numbers (one pair is
     70 S, leftover in 20 S notes), at least one third of the total in coins,
     the largest accepted coin being 10 S. Coin weights are the real ones. */
  var NOTE_SMALL = 2000; // 20 S
  var NOTE_LARGE = 5000; // 50 S
  var NOTE_PAIR = NOTE_SMALL + NOTE_LARGE;
  var COIN_VALUES = [1000, 500, 100, 50, 10, 5, 2, 1];
  var COIN_WEIGHT_GRAMS = {
    1000: 6.2,
    500: 4.8,
    100: 4.2,
    50: 3.0,
    10: 1.1,
    5: 2.5,
    2: 0.9,
    1: 1.8,
  };
  var COINS_PER_ROLL = 25;

  /* ---------- denomination rule (pure) ---------- */

  function splitCash(totalGroschen) {
    var total = Math.max(0, Math.round(Number(totalGroschen) || 0));
    var coinsTarget = Math.ceil(total / 3); // at least one third in coins
    var notesBudget = total - coinsTarget;
    var pairs = Math.floor(notesBudget / NOTE_PAIR);
    var extraSmall = Math.floor((notesBudget - pairs * NOTE_PAIR) / NOTE_SMALL);
    var fifties = pairs;
    var twenties = pairs + extraSmall;
    var notesGroschen = fifties * NOTE_LARGE + twenties * NOTE_SMALL;
    var coinsGroschen = total - notesGroschen;

    var coins = {};
    var remaining = coinsGroschen;
    var weight = 0;
    var rolls = 0;
    COIN_VALUES.forEach(function (value) {
      var count = Math.floor(remaining / value);
      remaining -= count * value;
      coins[value] = count;
      weight += count * COIN_WEIGHT_GRAMS[value];
      rolls += Math.ceil(count / COINS_PER_ROLL);
    });

    return {
      notes: { 50: fifties, 20: twenties },
      coins: coins,
      notesGroschen: notesGroschen,
      coinsGroschen: coinsGroschen,
      coinWeightGrams: Math.round(weight * 100) / 100,
      rolls: rolls,
    };
  }

  /* Rows for the Stückelungsvorschrift table, zero counts omitted. */
  function denominationRows(split) {
    var rows = [];
    if (split.notes[50]) {
      rows.push({
        label: "Banknoten zu 50 Schilling",
        count: split.notes[50],
        amount: split.notes[50] * NOTE_LARGE,
      });
    }
    if (split.notes[20]) {
      rows.push({
        label: "Banknoten zu 20 Schilling",
        count: split.notes[20],
        amount: split.notes[20] * NOTE_SMALL,
      });
    }
    COIN_VALUES.forEach(function (value) {
      var count = split.coins[value];
      if (!count) return;
      var label =
        value >= 100
          ? "Münzen zu " + value / 100 + " Schilling"
          : "Münzen zu " + value + " Groschen";
      rows.push({ label: label, count: count, amount: count * value });
    });
    return rows;
  }

  S.splitCash = splitCash;
  S.denominationRows = denominationRows;
  S.HANDLING_FEE_GROSCHEN = HANDLING_FEE_GROSCHEN;

  if (typeof module === "object" && module.exports) {
    module.exports = {
      splitCash: splitCash,
      denominationRows: denominationRows,
      HANDLING_FEE_GROSCHEN: HANDLING_FEE_GROSCHEN,
    };
  }

  if (typeof document === "undefined") return;

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[ch];
    });
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(selector, text) {
    var nodes = document.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = text;
  }

  /* Cart lines in catalogue order, unknown ids ignored. */
  function cartLines() {
    var cart = S.getCart();
    var lines = [];
    (S.PRODUCTS || []).forEach(function (product) {
      var qty = cart[product.id];
      if (qty > 0) lines.push({ product: product, qty: qty });
    });
    return lines;
  }

  function totalsFor(lines) {
    var subtotal = lines.reduce(function (sum, line) {
      return sum + line.product.price * line.qty;
    }, 0);
    return {
      subtotal: subtotal,
      shipping: SHIPPING_GROSCHEN,
      fee: HANDLING_FEE_GROSCHEN,
      total: subtotal + SHIPPING_GROSCHEN + HANDLING_FEE_GROSCHEN,
    };
  }

  /* ---------- cart view ---------- */

  function lineRowHtml(line) {
    var p = line.product;
    var inputId = "qty-" + p.id;
    return (
      '<tr data-cart-line="' +
      esc(p.id) +
      '">' +
      '<td class="checkout-line__item">' +
      '<strong class="checkout-line__name">' +
      esc(p.name) +
      "</strong>" +
      '<span class="checkout-line__subtitle">' +
      esc(p.subtitle) +
      "</span>" +
      '<span class="checkout-line__unit">Einzelpreis ' +
      esc(S.formatMoney(p.price)) +
      "</span>" +
      "</td>" +
      '<td class="num checkout-line__price">' +
      esc(S.formatMoney(p.price)) +
      "</td>" +
      '<td class="checkout-line__qty">' +
      '<div class="checkout-qty">' +
      '<button type="button" class="checkout-qty__btn" data-qty-minus data-id="' +
      esc(p.id) +
      '" aria-label="Menge verringern: ' +
      esc(p.name) +
      '">−</button>' +
      '<label class="visually-hidden" for="' +
      inputId +
      '">Menge: ' +
      esc(p.name) +
      "</label>" +
      '<input type="number" class="checkout-qty__input" id="' +
      inputId +
      '" min="0" max="999" step="1" inputmode="numeric" value="' +
      line.qty +
      '" data-qty-input data-id="' +
      esc(p.id) +
      '" />' +
      '<button type="button" class="checkout-qty__btn" data-qty-plus data-id="' +
      esc(p.id) +
      '" aria-label="Menge erhöhen: ' +
      esc(p.name) +
      '">+</button>' +
      "</div>" +
      "</td>" +
      '<td class="num checkout-line__sum">' +
      esc(S.formatMoney(p.price * line.qty)) +
      "</td>" +
      '<td class="checkout-line__remove">' +
      '<button type="button" class="checkout-remove" data-remove data-id="' +
      esc(p.id) +
      '" aria-label="Entfernen: ' +
      esc(p.name) +
      '">Entfernen</button>' +
      "</td>" +
      "</tr>"
    );
  }

  function focusDescriptor() {
    var el = document.activeElement;
    if (!el || !el.hasAttribute || !el.hasAttribute("data-id")) return null;
    var attr = [
      "data-qty-plus",
      "data-qty-minus",
      "data-qty-input",
      "data-remove",
    ].filter(function (name) {
      return el.hasAttribute(name);
    })[0];
    return attr ? { attr: attr, id: el.getAttribute("data-id") } : null;
  }

  function restoreFocus(descriptor) {
    if (!descriptor) return;
    var target = document.querySelector(
      "[" + descriptor.attr + '][data-id="' + descriptor.id + '"]',
    );
    if (!target) {
      target = byId("checkout-cart").hidden
        ? byId("checkout-empty").querySelector("a")
        : byId("checkout-title");
    }
    if (target) target.focus();
  }

  function renderCart() {
    var lines = cartLines();
    var empty = byId("checkout-empty");
    var cart = byId("checkout-cart");
    var descriptor = focusDescriptor();

    if (!lines.length) {
      empty.hidden = false;
      cart.hidden = true;
      restoreFocus(descriptor);
      return;
    }

    var totals = totalsFor(lines);
    byId("checkout-lines").innerHTML = lines.map(lineRowHtml).join("");
    setText('[data-total-part="subtotal"]', S.formatMoney(totals.subtotal));
    setText('[data-total-part="shipping"]', S.formatMoney(totals.shipping));
    setText('[data-total-part="fee"]', S.formatMoney(totals.fee));
    setText("[data-total]", S.formatMoney(totals.total));
    empty.hidden = true;
    cart.hidden = false;
    restoreFocus(descriptor);
  }

  function onCartClick(event) {
    var button = event.target.closest(
      "[data-qty-plus], [data-qty-minus], [data-remove]",
    );
    if (!button) return;
    var id = button.getAttribute("data-id");
    var current = S.getCart()[id] || 0;
    if (button.hasAttribute("data-qty-plus")) S.setCartQty(id, current + 1);
    else if (button.hasAttribute("data-qty-minus"))
      S.setCartQty(id, current - 1);
    else S.setCartQty(id, 0);
    renderCart();
  }

  function onCartChange(event) {
    var input = event.target.closest("[data-qty-input]");
    if (!input) return;
    var qty = parseInt(input.value, 10);
    S.setCartQty(input.getAttribute("data-id"), qty > 0 ? qty : 0);
    renderCart();
  }

  /* ---------- order confirmation ---------- */

  function orderItemsHtml(lines, totals) {
    var rows = lines.map(function (line) {
      return (
        "<tr>" +
        "<td>" +
        esc(line.product.name) +
        "</td>" +
        '<td class="num">' +
        line.qty +
        "</td>" +
        '<td class="num">' +
        esc(S.formatMoney(line.product.price * line.qty)) +
        "</td>" +
        "</tr>"
      );
    });
    rows.push(
      '<tr class="checkout-order__sub"><td colspan="2">Zwischensumme</td><td class="num">' +
        esc(S.formatMoney(totals.subtotal)) +
        "</td></tr>",
      '<tr class="checkout-order__sub"><td colspan="2">Versandkosten</td><td class="num">' +
        esc(S.formatMoney(totals.shipping)) +
        "</td></tr>",
      '<tr class="checkout-order__sub"><td colspan="2">Bearbeitungsgebühr für den kostenlosen Versand</td><td class="num">' +
        esc(S.formatMoney(totals.fee)) +
        "</td></tr>",
    );
    return rows.join("");
  }

  function denominationHtml(rows) {
    return rows
      .map(function (row) {
        return (
          "<tr><td>" +
          esc(row.label) +
          '</td><td class="num">' +
          esc(S.formatNumber(row.count)) +
          '</td><td class="num" data-denomination-amount="' +
          row.amount +
          '">' +
          esc(S.formatMoney(row.amount)) +
          "</td></tr>"
        );
      })
      .join("");
  }

  function placeOrder() {
    var lines = cartLines();
    if (!lines.length) {
      renderCart();
      return;
    }
    var totals = totalsFor(lines);
    var now = new Date();
    var orderNumber = S.newOrderNumber();
    var delivery = S.addYearsMonths(now, DELIVERY_YEARS, DELIVERY_MONTHS);
    var deliveryLong = S.formatDateLong(delivery);
    var split = splitCash(totals.total);
    var rows = denominationRows(split);
    var pieces = rows.reduce(function (sum, row) {
      return sum + row.count;
    }, 0);

    setText("[data-order-number]", orderNumber);
    setText("[data-order-date]", S.formatDateShort(now));
    setText("[data-delivery-date]", deliveryLong);
    var totalNodes = document.querySelectorAll("[data-order-total]");
    for (var i = 0; i < totalNodes.length; i++) {
      totalNodes[i].setAttribute("data-order-total", String(totals.total));
      totalNodes[i].textContent = S.formatMoney(totals.total);
    }
    byId("order-items").innerHTML = orderItemsHtml(lines, totals);
    byId("order-denominations").innerHTML = denominationHtml(rows);
    setText("[data-denomination-pieces]", S.formatNumber(pieces));
    setText(
      "[data-order-weight]",
      S.formatNumber(split.coinWeightGrams / 1000, 2),
    );
    setText("[data-order-rolls]", S.formatNumber(split.rolls));
    setText("[data-order-rolls-word]", split.rolls === 1 ? "Rolle" : "Rollen");

    S.clearCart();

    byId("checkout-cart").hidden = true;
    byId("checkout-empty").hidden = true;
    var confirmation = byId("order-confirmation");
    confirmation.hidden = false;
    document.body.classList.add("checkout-ordered");
    document.title = "Bestellbestätigung " + orderNumber + " · Salzamt";

    var title = byId("order-title");
    if (title) title.focus({ preventScroll: true });
    confirmation.scrollIntoView({
      behavior: S.prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  }

  /* ---------- boot ---------- */

  function init() {
    var cart = byId("checkout-cart");
    if (!cart) return;
    cart.addEventListener("click", onCartClick);
    cart.addEventListener("change", onCartChange);
    var order = document.querySelector("[data-place-order]");
    if (order) order.addEventListener("click", placeOrder);
    var print = byId("print-order");
    if (print) {
      print.addEventListener("click", function () {
        window.print();
      });
    }
    renderCart();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
