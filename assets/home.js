/* Salzamt – landing page. Animates the complaints counter in the
   Amtsstatistik once it scrolls into view (once per page load).
   Everything else on the page is static. Depends on assets/site.js. */
(function () {
  "use strict";

  var COUNT_DURATION_MS = 2200;

  function initComplaintsCounter() {
    var el = document.querySelector('[data-stat="complaints"]');
    if (!el || !window.Salzamt) return;

    var started = false;

    function start() {
      if (started) return;
      started = true;
      window.Salzamt.countUp(
        el,
        window.Salzamt.complaintsTotal(),
        COUNT_DURATION_MS,
      );
    }

    if (!("IntersectionObserver" in window)) {
      start();
      return;
    }

    // Reset the static markup value so the count visibly starts from zero.
    el.textContent = window.Salzamt.formatNumber(0);

    var observer = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            observer.disconnect();
            start();
            return;
          }
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initComplaintsCounter);
  } else {
    initComplaintsCounter();
  }
})();
