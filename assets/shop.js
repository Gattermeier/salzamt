/* Salzamt – Amtsshop: product catalogue, hand-drawn line icons and the
   shop grid. Loaded by shop.html (renders #shop-grid) and by kassa.html
   (checkout.js reads Salzamt.PRODUCTS). Requires site.js in the browser;
   also loadable in Node for unit checks. */
(function () {
  "use strict";

  var root = typeof window !== "undefined" ? window : {};
  var S = root.Salzamt || (root.Salzamt = {});

  /* ---------- icons (viewBox 0 0 100 100, stroke = currentColor) ---------- */

  var ICON_ATTRS =
    'viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';

  function icon(body) {
    return "<svg " + ICON_ATTRS + ">" + body + "</svg>";
  }

  var ICONS = {
    /* Sealed shaker: perforated cap, flared neck, label with the Eichstempel */
    "salt-shaker": icon(
      '<path d="M37 12h26a3 3 0 0 1 3 3v9H34v-9a3 3 0 0 1 3-3z"/>' +
        '<circle cx="43" cy="18" r="1.7" fill="currentColor" stroke="none"/>' +
        '<circle cx="50" cy="18" r="1.7" fill="currentColor" stroke="none"/>' +
        '<circle cx="57" cy="18" r="1.7" fill="currentColor" stroke="none"/>' +
        '<path d="M36 24l-3 9M64 24l3 9"/>' +
        '<path d="M33 33h34v45a7 7 0 0 1-7 7H40a7 7 0 0 1-7-7z"/>' +
        '<path d="M40 50h20v16H40z"/>' +
        '<circle cx="50" cy="58" r="4.5"/>' +
        '<path d="M50 55.5v5M47.5 58h5"/>',
    ),
    /* One numbered crystal on a plinth, with a paper tag */
    "salt-grain": icon(
      '<path d="M50 20l24 12v28L50 74 26 60V32z"/>' +
        '<path d="M26 32l24 12 24-12M50 44v30"/>' +
        '<path d="M16 22h6M19 19v6M78 22h6M81 19v6"/>' +
        '<path d="M28 86h44"/>' +
        '<path d="M62 78h14l4 4-4 4H62z"/>' +
        '<circle cx="65.5" cy="82" r="1.3" fill="currentColor" stroke="none"/>',
    ),
    /* Rubber stamp with wooden knob and the dashed impression below */
    stamp: icon(
      '<path d="M41 24v-7a9 9 0 0 1 18 0v7"/>' +
        '<path d="M45 24h10v16H45z"/>' +
        '<path d="M24 40h52a3 3 0 0 1 3 3v9H21v-9a3 3 0 0 1 3-3z"/>' +
        '<path d="M27 52h46v7H27z"/>' +
        '<path d="M24 70h52v18H24z" stroke-dasharray="4 3"/>' +
        '<path d="M32 79h36" stroke-width="2"/>',
    ),
    /* Waiting-number ticket, torn off and already called */
    ticket: icon(
      '<path d="M16 30h68v13a7 7 0 0 0 0 14v13H16V57a7 7 0 0 0 0-14z"/>' +
        '<path d="M60 30v50" stroke-dasharray="3 4"/>' +
        '<path d="M26 44h22M26 52h14M26 60h18"/>' +
        '<circle cx="72" cy="50" r="6"/>' +
        '<path d="M69 50l2 2 4-4"/>',
    ),
    /* Ring binder, front cover with spine label and grip hole */
    folder: icon(
      '<path d="M24 14h52a2 2 0 0 1 2 2v68a2 2 0 0 1-2 2H24a2 2 0 0 1-2-2V16a2 2 0 0 1 2-2z"/>' +
        '<path d="M30 14v72"/>' +
        '<path d="M38 24h32v20H38z"/>' +
        '<path d="M44 31h20M44 37h14"/>' +
        '<circle cx="54" cy="72" r="4"/>',
    ),
    /* Häferl with steam and the prohibition sign */
    mug: icon(
      '<path d="M24 32h44v38a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8z"/>' +
        '<path d="M68 42h6a10 10 0 0 1 0 20h-6"/>' +
        '<path d="M38 24c0-5 5-5 5-10M52 24c0-5 5-5 5-10"/>' +
        '<circle cx="46" cy="53" r="10"/>' +
        '<path d="M39 46l14 14"/>',
    ),
    /* Two postcards, the front one showing stamp, divider and address lines */
    "postcard-set": icon(
      '<path d="M30 40V16h52v36H70"/>' +
        '<path d="M18 40h52v36H18z"/>' +
        '<path d="M44 46v24"/>' +
        '<path d="M59 44h8v7h-8z" fill="currentColor" fill-opacity="0.35"/>' +
        '<path d="M50 58h14M50 64h10M50 70h12"/>' +
        '<path d="M22 56h16M22 62h12"/>',
    ),
  };

  /* ---------- catalogue (prices in integer Groschen; 100 Groschen = 1 Schilling) ---------- */

  var PRODUCTS = [
    {
      id: "postkarte-1",
      name: "Postkarte Nr. 1 „Salzamt an der Salzach“",
      subtitle: "Ansichtskarte, A6, ungelaufen",
      description:
        "Das Salzamt am Ufer der Salzach im Abendlicht, mit Festung, Kuppeln und dem Amtsgebäude, in dem nie ein Licht brennt. Rückseite unbeschrieben, damit Sie sich selbst beschweren können.",
      price: 18480,
      image: {
        src: "assets/img/postkarte-1.jpg",
        width: 900,
        height: 639,
        alt: "Postkarte Nr. 1: das Salzamt am Ufer der Salzach im Abendlicht, dahinter die Festung",
        fallback: "assets/img/oval-600.jpg",
      },
      tag: "Neu",
    },
    {
      id: "postkarte-2",
      name: "Postkarte Nr. 2 „Doppeladler“",
      subtitle: "Ansichtskarte, A6, ungelaufen",
      description:
        "Der Doppeladler mit Salzfass, Hammer und Schlägel, dazu unser Leitspruch: Mit vorzüglicher Hochachtung, und ohne jede Absicht zu helfen.",
      price: 18480,
      image: {
        src: "assets/img/postkarte-2.jpg",
        width: 700,
        height: 987,
        alt: "Postkarte Nr. 2: gekrönter Doppeladler mit Salzfass, Hammer und Schlägel",
        fallback: "assets/img/poster-480.jpg",
      },
    },
    {
      id: "postkarten-set",
      name: "Postkarten-Set (beide Motive)",
      subtitle: "2 Stück, einzeln kuvertiert, ohne Kuvert",
      description:
        "Beide Motive in einer Mappe. Sparen Sie nicht: Das Set kostet fünfmal so viel wie die Einzelkarten, enthält dafür aber eine Mappe.",
      price: 184800,
      icon: "postcard-set",
      tag: "Amtlich",
    },
    {
      id: "salzstreuer",
      name: "Amtlicher Salzstreuer",
      subtitle: "Geeicht, Streuöffnungen amtlich versiegelt",
      description:
        "Der einzige Salzstreuer mit Eichstempel des Salzamtes. Die Öffnungen sind zu Ihrer Sicherheit versiegelt. Salz nicht enthalten. Entsiegelung nicht vorgesehen.",
      price: 471100,
      icon: "salt-shaker",
      tag: "Bestseller",
    },
    {
      id: "salzkorn",
      name: "Salzamt-Salz, 1 Korn",
      subtitle: "Mit Echtheitszertifikat, Mindestabnahme 1 Korn",
      description:
        "Ein einzelnes Korn aus den Beständen des Amtes, nummeriert und in Seidenpapier gewickelt. Nicht zum Verzehr bestimmt. Zum Einsalzen ausreichend.",
      price: 99999,
      icon: "salt-grain",
    },
    {
      id: "stempel",
      name: "Stempel „NICHT ZUSTÄNDIG“",
      subtitle: "Holzgriff, Gummiplatte, ohne Stempelkissen",
      description:
        "Für den Hausgebrauch: Beenden Sie jedes Gespräch mit einem Handgriff. Stempelkissen separat erhältlich, jedoch nicht bei uns.",
      price: 184800,
      icon: "stamp",
    },
    {
      id: "stempelmarke",
      name: "Stempelmarke zu 10 Heller",
      subtitle: "Ungültig seit 1925, unverkäuflich, dennoch erhältlich",
      description:
        "Die amtliche Stempelmarke des Salzamtes. Wird für Beilagen zu Formular SA-47/B benötigt und dort nicht anerkannt.",
      price: 1000000,
      image: {
        src: "assets/img/stamp-600.jpg",
        width: 600,
        height: 707,
        alt: "Stempelmarke zu 10 Heller mit dem Amtssiegel des Salzamtes",
        fallback: "assets/img/badge-320.png",
      },
      tag: "Sammlerstück",
    },
    {
      id: "wartenummer",
      name: "Wartenummer",
      subtitle: "Gebraucht, bereits aufgerufen",
      description:
        "Eine originale Wartenummer aus unserem Parteienverkehr. Bereits aufgerufen, daher ohne Wartezeit. Nummer nicht wählbar.",
      price: 4711,
      icon: "ticket",
    },
    {
      id: "aktenordner",
      name: "Aktenordner „Erledigt“",
      subtitle: "Leer, vorgelocht, Rückenschild beschriftet",
      description:
        "Der Ordner, in dem beim Salzamt nichts abgelegt wird. Liefert das gute Gefühl der Erledigung ohne den Umweg über die Arbeit.",
      price: 38000,
      icon: "folder",
    },
    {
      id: "poster",
      name: "Poster „Seit 1848 folgenlos“",
      subtitle: "DIN A2, gerollt, ohne Rahmen",
      description:
        "Unser Wappen für Amtsstube, Vorzimmer und Wartezimmer. Gedruckt auf Papier, das sich nach drei Jahren von selbst einrollt.",
      price: 230000,
      image: {
        src: "assets/img/poster-480.jpg",
        width: 480,
        height: 677,
        alt: "Poster mit dem Doppeladler des Salzamtes und dem Leitspruch „Seit 1848 folgenlos“",
        fallback: "assets/img/postkarte-2.jpg",
      },
    },
    {
      id: "haeferl",
      name: "Häferl „Kein Parteienverkehr“",
      subtitle: "Steingut, 0,3 l, spülmaschinenungeeignet",
      description:
        "Für Amtsstunden, in denen niemand kommen soll. Aufschrift auf beiden Seiten, damit auch Ihr Gegenüber Bescheid weiß.",
      price: 61200,
      icon: "mug",
    },
  ];

  var ADD_TOAST = "Zum Warenkorb gelegt. Bearbeitung nicht vorgesehen.";

  function productById(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) return PRODUCTS[i];
    }
    return null;
  }

  /* ---------- rendering ---------- */

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

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function mediaHtml(product, index) {
    if (product.image) {
      var img = product.image;
      return (
        '<img src="' +
        esc(img.src) +
        '" width="' +
        img.width +
        '" height="' +
        img.height +
        '" alt="' +
        esc(img.alt) +
        '"' +
        (index >= 3 ? ' loading="lazy"' : "") +
        (img.fallback ? ' data-fallback="' + esc(img.fallback) + '"' : "") +
        " />"
      );
    }
    return (
      '<div class="shop-product__icon">' +
      (ICONS[product.icon] || "") +
      "</div>"
    );
  }

  function productCardHtml(product, index) {
    return (
      '<article class="card shop-product" data-product-id="' +
      esc(product.id) +
      '">' +
      '<div class="card__media shop-product__media">' +
      mediaHtml(product, index) +
      (product.tag
        ? '<span class="badge-tag shop-product__tag">' +
          esc(product.tag) +
          "</span>"
        : "") +
      '<span class="shop-product__sku">Art.-Nr. 1848-' +
      pad2(index + 1) +
      "</span>" +
      "</div>" +
      '<div class="card__body">' +
      '<h2 class="card__title">' +
      esc(product.name) +
      "</h2>" +
      '<p class="shop-product__subtitle">' +
      esc(product.subtitle) +
      "</p>" +
      '<p class="shop-product__description">' +
      esc(product.description) +
      "</p>" +
      '<p class="shop-price">' +
      esc(S.formatMoney(product.price)) +
      "</p>" +
      '<p class="shop-product__actions">' +
      '<button class="btn btn--block" type="button" data-add="' +
      esc(product.id) +
      '">In den Warenkorb</button>' +
      "</p>" +
      "</div>" +
      "</article>"
    );
  }

  function renderShopGrid(grid) {
    grid.innerHTML = PRODUCTS.map(productCardHtml).join("");
    grid.addEventListener("click", function (event) {
      var button = event.target.closest("[data-add]");
      if (!button) return;
      var product = productById(button.getAttribute("data-add"));
      if (!product) return;
      S.addToCart(product.id, 1);
      S.showToast(ADD_TOAST);
    });
  }

  function init() {
    var grid = document.getElementById("shop-grid");
    if (grid) renderShopGrid(grid);
  }

  S.PRODUCTS = PRODUCTS;
  S.ICONS = ICONS;
  S.productById = productById;

  if (typeof document !== "undefined") {
    /* The grid precedes the script tag, so it can be rendered right away;
       site.js then wires the image fallbacks on DOMContentLoaded. */
    if (
      document.readyState === "loading" &&
      !document.getElementById("shop-grid")
    ) {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  if (typeof module === "object" && module.exports) {
    module.exports = { PRODUCTS: PRODUCTS, ICONS: ICONS };
  }
})();
