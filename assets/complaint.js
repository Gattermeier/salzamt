/* Salzamt – complaint form (beschwerde.html).
   Validation with Fehlerprotokoll, the Rückfrage dialog, the trash-can
   sequence and the Eingangsbestätigung. While the trash can plays, the
   complaint is delivered to the Einlaufstelle mailbox through Web3Forms
   (endpoint and public access key come from data attributes on the form).
   Nothing is stored in the browser except the local counter. */
(function () {
  "use strict";

  var Salzamt = window.Salzamt;
  var form = document.getElementById("complaint-form");
  if (!form || !Salzamt) return;

  var MAX_TEXT = 1848;
  var SECURITY_ANSWER = "Beim Salzamt";
  var STEP_DELAY = 200;
  var TRASH_END = 4000;
  var TRASH_FADE = 300;
  var DELIVERY_TIMEOUT = 20000;
  var CAPTCHA_FIELD = "h-captcha-response";
  var FROM_NAME = "K.k. Salzamt – Formular SA-47/B";

  var SUBCATEGORIES = {
    Lärm: [
      "Kirchenglocken",
      "Nachbarn (siehe auch Nachbarn)",
      "Innere Stimme",
      "Stille",
    ],
    Nachbarn: ["Zu laut", "Zu leise", "Zu freundlich", "Grüßen nicht"],
    Wetter: ["Zu heiß", "Zu kalt", "Regen", "Föhn", "Wetter allgemein"],
    Amtswege: ["Zu lang", "Zu kurz", "Zu viele Stempel", "Zu wenige Stempel"],
    Gebühren: [
      "Zu hoch",
      "Unverständlich",
      "Bereits bezahlt",
      "Noch nicht bezahlt",
    ],
    "Das Salzamt selbst": [
      "Unzuständigkeit",
      "Untätigkeit",
      "Zuvorkommende Ablehnung",
      "Öffnungszeiten",
    ],
    Sonstiges: ["Sonstiges", "Anderes", "Weiteres"],
  };

  /* Phases of the trash sequence: class added to #trash-stage at t ms. */
  var TRASH_TIMELINE = [
    { at: 0, cls: "is-active", step: 1, caption: "Eingelangt." },
    { at: 100, cls: "phase-crumple", step: 2, caption: "Geprüft." },
    { at: 1100, cls: "phase-lid", step: 3, caption: "Nicht zuständig." },
    { at: 1300, cls: "phase-drop", step: 4, caption: "Abgelegt." },
    { at: 2200, cls: "phase-close" },
    { at: 2900, cls: "phase-stamp", step: 5, caption: "Eingesalzen." },
  ];

  /* Validation rules in document order. A rule is required unless it says
     `optional` or has a `requiredIf` predicate. `check` runs on non-empty
     values; a failing check yields "Angabe unzulässig." unless the rule
     carries its own message. */
  var RULES = [
    { name: "salutation" },
    { name: "given-name" },
    { name: "family-name" },
    {
      name: "birth-date",
      check: function (v) {
        var d = parseShortDate(v);
        return !!d && d.getTime() <= startOfToday().getTime();
      },
      message:
        "Das Geburtsdatum ist in der Form TT.MM.JJJJ anzugeben und darf nicht in der Zukunft liegen.",
    },
    { name: "citizenship" },
    { name: "street" },
    { name: "street-number" },
    {
      name: "postal-code",
      check: function (v) {
        return /^[0-9]{4}$/.test(v);
      },
    },
    { name: "city" },
    { name: "crown-land" },
    { name: "complaint-category" },
    { name: "complaint-subcategory" },
    { name: "urgency" },
    {
      name: "complaint-text",
      check: function (v) {
        return v.length <= MAX_TEXT;
      },
    },
    { name: "desired-outcome" },
    { name: "previous-complaint" },
    {
      name: "previous-case-number",
      requiredIf: function () {
        return valueOf("previous-complaint") === "Ja";
      },
    },
    {
      name: "previous-attempts",
      optional: true,
      check: function (v) {
        return /^[0-9]{1,3}$/.test(v);
      },
    },
    { name: "declaration-1", declaration: 1 },
    { name: "declaration-2", declaration: 2 },
    { name: "declaration-3", declaration: 3 },
    { name: "declaration-4", declaration: 4 },
    { name: "declaration-5", declaration: 5 },
    {
      name: "security-question",
      check: function (v) {
        return v === SECURITY_ANSWER;
      },
      message:
        "Die Sicherheitsfrage wurde unrichtig beantwortet. Denken Sie an den Namen dieses Amtes.",
    },
    { name: "place" },
    {
      name: "date",
      check: function (v) {
        return isToday(v);
      },
      message:
        "Das Datum ist in der Form TT.MM.JJJJ anzugeben und hat dem heutigen Tag zu entsprechen.",
    },
    {
      name: "signature",
      check: function (v) {
        return v === v.toUpperCase();
      },
    },
  ];

  /* ---------- elements ---------- */

  var el = {
    preamble: document.getElementById("complaint-preamble"),
    progress: document.getElementById("complaint-progress"),
    progressValue: document.querySelector("[data-progress-value]"),
    progressTrack: document.querySelector("[data-progress-track]"),
    progressBar: document.querySelector("[data-progress-bar]"),
    progressNote: document.querySelector("[data-progress-note]"),
    category: document.getElementById("complaint-category"),
    subcategory: document.getElementById("complaint-subcategory"),
    text: document.getElementById("complaint-text"),
    counter: document.getElementById("complaint-text-counter"),
    signature: document.getElementById("signature"),
    birthDate: document.getElementById("birth-date"),
    date: document.getElementById("date"),
    previousCaseField: form.querySelector("[data-required-if-previous]"),
    submit: form.querySelector('button[type="submit"]'),
    errors: document.getElementById("complaint-errors"),
    errorList: document.querySelector("[data-error-list]"),
    errorCount: document.querySelector("[data-error-count]"),
    dialog: document.getElementById("confirm-dialog"),
    stage: document.getElementById("trash-stage"),
    stageStep: document.querySelector("[data-trash-step]"),
    stageCaption: document.querySelector("[data-trash-caption]"),
    deliveryError: document.getElementById("complaint-delivery-error"),
    deliveryDetail: document.querySelector("[data-delivery-detail]"),
    captcha: document.getElementById("complaint-captcha"),
    honeypot: form.querySelector('[name="botcheck"]'),
    confirmation: document.getElementById("confirmation"),
    confirmationTitle: document.getElementById("confirmation-title"),
    caseNumber: document.querySelector("[data-case-number]"),
    receivedDate: document.querySelector("[data-received-date]"),
    receivedTime: document.querySelector("[data-received-time]"),
    complaintsTotal: document.querySelector("[data-complaints-total]"),
    steps: document.querySelectorAll("#confirmation .amtsweg li"),
    reload: document.querySelector('[data-action="reload"]'),
  };

  var state = { busy: false, silentReset: false, caseNumber: "" };

  /* ---------- helpers ---------- */

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  /* Dates are typed the Austrian way: day, month, year (TT.MM.JJJJ). */
  function startOfToday() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function todayShort() {
    return Salzamt.formatDateShort(new Date());
  }

  function parseShortDate(v) {
    var m = /^\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*$/.exec(v || "");
    if (!m) return null;
    var day = parseInt(m[1], 10);
    var month = parseInt(m[2], 10);
    var year = parseInt(m[3], 10);
    var d = new Date(year, month - 1, day);
    if (
      d.getFullYear() !== year ||
      d.getMonth() !== month - 1 ||
      d.getDate() !== day
    ) {
      return null;
    }
    return d;
  }

  function isToday(v) {
    var d = parseShortDate(v);
    return !!d && d.getTime() === startOfToday().getTime();
  }

  /* "5.9.2026" becomes "05.09.2026" once the field is left */
  function normalizeDateInput(event) {
    var d = parseShortDate(event.target.value);
    if (d) event.target.value = Salzamt.formatDateShort(d);
  }

  function scrollBehavior() {
    return Salzamt.prefersReducedMotion() ? "auto" : "smooth";
  }

  function scrollTo(node) {
    if (node && node.scrollIntoView) {
      node.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    }
  }

  function focusQuietly(node) {
    if (!node || typeof node.focus !== "function") return;
    try {
      node.focus({ preventScroll: true });
    } catch (e) {
      node.focus();
    }
  }

  function controlsByName(name) {
    return form.querySelectorAll('[name="' + name + '"]');
  }

  function valueOf(name) {
    var controls = controlsByName(name);
    if (!controls.length) return "";
    var first = controls[0];
    if (first.type === "radio") {
      for (var i = 0; i < controls.length; i++) {
        if (controls[i].checked) return controls[i].value;
      }
      return "";
    }
    if (first.type === "checkbox") return first.checked ? "on" : "";
    return String(first.value || "").trim();
  }

  function fieldOf(control) {
    return control.closest(".field");
  }

  function sectionOf(control) {
    var section = control.closest("[data-section]");
    return section ? section.getAttribute("data-section") : "–";
  }

  function labelOf(control) {
    var field = fieldOf(control);
    if (field && field.hasAttribute("data-error-label")) {
      return field.getAttribute("data-error-label");
    }
    var label = field ? field.querySelector(".field__label") : null;
    return label ? label.textContent.replace(/\s+/g, " ").trim() : control.name;
  }

  function isRequired(rule) {
    if (rule.requiredIf) return rule.requiredIf();
    return !rule.optional;
  }

  /* ---------- Automatenprüfung (hCaptcha, rendered by the Web3Forms client) ---------- */

  function captchaControl() {
    return el.captcha
      ? el.captcha.querySelector('[name="' + CAPTCHA_FIELD + '"]')
      : null;
  }

  /* The widget is only demanded once it has actually rendered. If the
     Web3Forms client or hCaptcha cannot load (blocked, offline), the form
     stays usable and Web3Forms falls back to the honeypot. */
  function captchaRendered() {
    return !!(el.captcha && el.captcha.querySelector("iframe"));
  }

  function captchaToken() {
    var control = captchaControl();
    return control ? String(control.value || "").trim() : "";
  }

  function resetCaptcha() {
    try {
      if (window.hcaptcha && typeof window.hcaptcha.reset === "function") {
        window.hcaptcha.reset();
      }
    } catch (e) {
      /* the widget may not be mounted */
    }
  }

  /* Callbacks named in data-callback / data-expired-callback on .h-captcha */
  window.salzamtCaptchaVerified = function () {
    if (el.captcha) el.captcha.classList.remove("field--error");
    clearError(CAPTCHA_FIELD);
  };
  window.salzamtCaptchaExpired = function () {
    /* the next submit asks for a fresh confirmation */
  };

  /* ---------- dependent fields, counters, defaults ---------- */

  function addOption(select, value, text) {
    var option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    select.appendChild(option);
  }

  function populateSubcategories() {
    var options = SUBCATEGORIES[el.category.value];
    var previous = el.subcategory.value;
    el.subcategory.innerHTML = "";
    addOption(
      el.subcategory,
      "",
      options ? "Bitte wählen" : "Bitte zuerst den Gegenstand wählen",
    );
    (options || []).forEach(function (name) {
      addOption(el.subcategory, name, name);
    });
    if (options && options.indexOf(previous) !== -1) {
      el.subcategory.value = previous;
    }
  }

  function updateCounter() {
    var length = el.text.value.length;
    el.counter.textContent = length + " / " + MAX_TEXT + " Zeichen";
    el.counter.classList.toggle("is-full", length >= MAX_TEXT);
  }

  function uppercaseSignature() {
    var value = el.signature.value;
    var upper = value.toUpperCase();
    if (upper === value) return;
    var start = el.signature.selectionStart;
    var end = el.signature.selectionEnd;
    var delta = upper.length - value.length;
    el.signature.value = upper;
    try {
      el.signature.setSelectionRange(start + delta, end + delta);
    } catch (e) {
      /* selection is not available on every input type */
    }
  }

  function setDateDefaults() {
    var today = todayShort();
    el.date.setAttribute("value", today);
    el.date.value = today;
  }

  function updatePreviousCaseRequirement() {
    var required = valueOf("previous-complaint") === "Ja";
    el.previousCaseField.classList.toggle("field--required", required);
    if (!required) clearError("previous-case-number");
  }

  /* ---------- Ausfüllgrad ---------- */

  function updateProgress() {
    var required = RULES.filter(isRequired);
    var filled = required.filter(function (rule) {
      return valueOf(rule.name) !== "";
    }).length;
    var percent = required.length
      ? Math.round((filled / required.length) * 100)
      : 0;
    el.progressValue.textContent = percent + " %";
    el.progressBar.style.width = percent + "%";
    el.progressTrack.setAttribute("aria-valuenow", String(percent));
    el.progress.classList.toggle("is-complete", percent === 100);
    el.progressNote.textContent =
      percent === 100
        ? "Der Antrag ist vollständig. Das ändert nichts."
        : percent > 0
          ? "Der Antrag ist noch unvollständig."
          : "Der Antrag ist unvollständig.";
  }

  /* ---------- validation and Fehlerprotokoll ---------- */

  function validate() {
    var errors = [];
    RULES.forEach(function (rule) {
      var controls = controlsByName(rule.name);
      if (!controls.length) return;
      var control = controls[0];
      var value = valueOf(rule.name);
      var prefix =
        "Abschnitt " +
        sectionOf(control) +
        ", Feld „" +
        labelOf(control) +
        "“: ";
      var message = null;

      if (isRequired(rule) && value === "") {
        message = rule.declaration
          ? "Abschnitt F: Erklärung Nr. " +
            rule.declaration +
            " wurde nicht abgegeben."
          : prefix + "Angabe fehlt.";
      } else if (value !== "" && rule.check && !rule.check(value)) {
        message = prefix + (rule.message || "Angabe unzulässig.");
      }

      if (message) {
        errors.push({
          key: rule.name,
          message: message,
          field: fieldOf(control),
          control: control,
        });
      }
    });

    if (captchaRendered() && captchaToken() === "") {
      errors.push({
        key: CAPTCHA_FIELD,
        message:
          "Abschnitt F, Feld „Automatenprüfung“: Die Bestätigung, kein Automat zu sein, fehlt oder ist abgelaufen.",
        field: el.captcha,
        control: captchaControl() || el.captcha,
      });
    }
    return errors;
  }

  function updateErrorCount() {
    var count = el.errorList.children.length;
    el.errorCount.textContent =
      "Mängel gesamt: " + count + (count === 1 ? " (in Worten: einer)." : ".");
  }

  function clearAllErrors() {
    var marked = form.querySelectorAll(".field--error");
    for (var i = 0; i < marked.length; i++) {
      marked[i].classList.remove("field--error");
    }
    el.errorList.innerHTML = "";
    el.errors.hidden = true;
  }

  function clearError(key) {
    var item = el.errorList.querySelector('li[data-key="' + key + '"]');
    if (item) item.parentNode.removeChild(item);
    var controls = controlsByName(key);
    var field = controls.length ? fieldOf(controls[0]) : null;
    if (key === CAPTCHA_FIELD) field = el.captcha;
    if (field) field.classList.remove("field--error");
    if (!el.errorList.children.length) {
      el.errors.hidden = true;
    } else {
      updateErrorCount();
    }
  }

  function showErrors(errors) {
    clearAllErrors();
    errors.forEach(function (error) {
      if (error.field) error.field.classList.add("field--error");
      var item = document.createElement("li");
      item.setAttribute("data-key", error.key);
      var link = document.createElement("a");
      link.href = "#" + (error.control.id || (error.field && error.field.id));
      link.textContent = error.message;
      item.appendChild(link);
      el.errorList.appendChild(item);
    });
    updateErrorCount();
    el.errors.hidden = false;
    scrollTo(el.errors);
    focusQuietly(errors[0].control);
  }

  function onErrorLinkClick(event) {
    var link = event.target.closest("a[href^='#']");
    if (!link) return;
    var target = document.getElementById(link.getAttribute("href").slice(1));
    if (!target) return;
    event.preventDefault();
    var field = fieldOf(target) || target;
    scrollTo(field);
    focusQuietly(target);
  }

  /* ---------- Rückfrage dialog ---------- */

  function openDialog() {
    if (typeof el.dialog.showModal !== "function") {
      startSequence();
      return;
    }
    el.dialog.returnValue = "";
    el.dialog.showModal();
  }

  function onDialogClose() {
    var answer = el.dialog.returnValue;
    if (answer === "yes" || answer === "really") {
      startSequence();
    } else {
      focusQuietly(el.submit);
    }
  }

  /* ---------- trash-can sequence ---------- */

  function setTrashCaption(step, caption) {
    el.stageStep.textContent = "Schritt " + step + " von 5";
    el.stageCaption.textContent = caption;
  }

  function runTrashSequence(done) {
    var stage = el.stage;
    stage.className = "complaint-trash";
    setTrashCaption(1, "Eingelangt.");
    stage.hidden = false;
    /* flush styles so the opacity transition starts from 0 */
    void stage.offsetWidth;

    TRASH_TIMELINE.forEach(function (phase) {
      window.setTimeout(function () {
        stage.classList.add(phase.cls);
        if (phase.step) setTrashCaption(phase.step, phase.caption);
      }, phase.at);
    });

    window.setTimeout(function () {
      stage.classList.remove("is-active");
      done();
      window.setTimeout(function () {
        stage.hidden = true;
      }, TRASH_FADE);
    }, TRASH_END);
  }

  /* ---------- Zustellung an die Einlaufstelle (Web3Forms) ---------- */

  function deliveryConfig() {
    return {
      endpoint: String(form.getAttribute("data-endpoint") || "").trim(),
      accessKey: String(form.getAttribute("data-access-key") || "").trim(),
    };
  }

  function deliveryConfigured() {
    var config = deliveryConfig();
    return !!(config.endpoint && config.accessKey);
  }

  /* Human-readable value of one control group, for the e-mail */
  function displayValueOf(name) {
    var controls = controlsByName(name);
    if (!controls.length) return "";
    var first = controls[0];
    if (first.type === "radio") {
      for (var i = 0; i < controls.length; i++) {
        if (controls[i].checked) return checkLabel(controls[i]);
      }
      return "";
    }
    if (first.type === "checkbox") return first.checked ? "Ja" : "Nein";
    if (first.tagName === "SELECT") {
      var option = first.options[first.selectedIndex];
      return option && option.value ? option.text.trim() : "";
    }
    return String(first.value || "").trim();
  }

  function checkLabel(control) {
    var label = control.closest("label");
    var text = label ? label.textContent : control.value;
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* Walks the form in document order and builds one "Abschnitt X · Feld"
     entry per control group, so the e-mail reads like the printed form. */
  function collectPayload(caseNumber, now) {
    var config = deliveryConfig();
    var category = displayValueOf("complaint-category");
    var subcategory = displayValueOf("complaint-subcategory");
    var payload = {
      access_key: config.accessKey,
      subject:
        "Beschwerde SA-47/B · " +
        caseNumber +
        (category ? " · " + category : "") +
        (subcategory ? ": " + subcategory : ""),
      from_name: FROM_NAME,
      Aktenzeichen: caseNumber,
      "Eingelangt am":
        Salzamt.formatDateShort(now) + " um " + Salzamt.formatTime(now),
    };
    var seen = {};
    var controls = form.querySelectorAll("input, select, textarea");
    for (var i = 0; i < controls.length; i++) {
      var control = controls[i];
      var name = control.name;
      if (!name || seen[name]) continue;
      if (name === "botcheck" || name === CAPTCHA_FIELD) continue;
      seen[name] = true;
      var key = "Abschnitt " + sectionOf(control) + " · " + groupLabel(control);
      var value = displayValueOf(name);
      payload[key] = value === "" ? "–" : value;
    }
    /* like a plain form post: the honeypot travels only when a bot ticked it */
    if (el.honeypot && el.honeypot.checked) payload.botcheck = true;
    var token = captchaToken();
    if (token) payload[CAPTCHA_FIELD] = token;
    return payload;
  }

  /* Label of a control group: the field label, or the legend for radio and
     checkbox groups, with the check's own text for plain checkboxes. */
  function groupLabel(control) {
    var field = fieldOf(control);
    if (
      control.type === "checkbox" &&
      !control.hasAttribute("data-declaration")
    ) {
      var group = control.closest(".complaint-group");
      var legend = group ? group.querySelector("legend") : null;
      var legendText = legend
        ? legend.textContent.replace(/\s+/g, " ").trim()
        : "";
      return (legendText ? legendText + ": " : "") + checkLabel(control);
    }
    if (control.hasAttribute("data-declaration")) {
      return "Erklärung Nr. " + control.getAttribute("data-declaration");
    }
    if (control.type === "radio") {
      var legend2 = field ? field.querySelector("legend") : null;
      if (legend2) return legend2.textContent.replace(/\s+/g, " ").trim();
    }
    return labelOf(control);
  }

  function deliver(payload) {
    var config = deliveryConfig();
    return new Promise(function (resolve, reject) {
      if (!deliveryConfigured()) {
        /* nothing to send: the form only plays its part */
        resolve({ skipped: true });
        return;
      }
      if (typeof window.fetch !== "function") {
        reject(new Error("Dieser Browser kennt den Dienstweg nicht."));
        return;
      }
      var controller =
        typeof window.AbortController === "function"
          ? new window.AbortController()
          : null;
      var timer = window.setTimeout(function () {
        if (controller) controller.abort();
      }, DELIVERY_TIMEOUT);
      var options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      };
      if (controller) options.signal = controller.signal;
      window
        .fetch(config.endpoint, options)
        .then(function (response) {
          return response
            .json()
            .catch(function () {
              return {};
            })
            .then(function (data) {
              if (response.ok && data && data.success) {
                resolve(data);
              } else {
                reject(
                  new Error(
                    (data && data.message) ||
                      "Die Einlaufstelle antwortete mit Status " +
                        response.status +
                        ".",
                  ),
                );
              }
            });
        })
        .catch(function (error) {
          reject(
            error && error.name === "AbortError"
              ? new Error(
                  "Die Einlaufstelle hat nicht rechtzeitig geantwortet.",
                )
              : new Error("Keine Verbindung zur Einlaufstelle."),
          );
        })
        .then(function () {
          window.clearTimeout(timer);
        });
    });
  }

  function startSequence() {
    if (state.busy) return;
    state.busy = true;
    form.setAttribute("aria-busy", "true");
    el.deliveryError.hidden = true;
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }

    var now = new Date();
    state.caseNumber = Salzamt.newCaseNumber();
    var payload = collectPayload(state.caseNumber, now);
    var delivery = deliver(payload);

    /* The trash can plays while the Amtsbote runs; the outcome is shown
       once both the animation and the delivery are over. */
    var animationDone = new Promise(function (resolve) {
      if (Salzamt.prefersReducedMotion()) resolve();
      else runTrashSequence(resolve);
    });

    Promise.all([animationDone, delivery]).then(
      function () {
        showConfirmation(now);
      },
      function (error) {
        animationDone.then(function () {
          showDeliveryFailure(error);
        });
      },
    );
  }

  function showDeliveryFailure(error) {
    state.busy = false;
    form.removeAttribute("aria-busy");
    resetCaptcha();
    el.deliveryDetail.textContent =
      "Grund: " + ((error && error.message) || "unbekannt") + ".";
    el.deliveryError.hidden = false;
    scrollTo(el.deliveryError);
    focusQuietly(el.deliveryError);
    Salzamt.showToast(
      "Postlauf gestört. Die Beschwerde wurde nicht zugestellt.",
    );
  }

  /* ---------- Eingangsbestätigung ---------- */

  function showConfirmation(now) {
    var reduced = Salzamt.prefersReducedMotion();
    now = now || new Date();

    Salzamt.registerComplaint();
    el.caseNumber.textContent = state.caseNumber || Salzamt.newCaseNumber();
    el.receivedDate.textContent = Salzamt.formatDateShort(now);
    el.receivedTime.textContent = Salzamt.formatTime(now);
    el.complaintsTotal.textContent = Salzamt.formatNumber(
      Salzamt.complaintsTotal(),
      0,
    );

    /* the submitted values are discarded */
    state.silentReset = true;
    form.reset();
    state.silentReset = false;

    form.hidden = true;
    el.progress.hidden = true;
    el.preamble.hidden = true;
    el.errors.hidden = true;
    el.deliveryError.hidden = true;
    el.confirmation.hidden = false;

    for (var i = 0; i < el.steps.length; i++) {
      (function (li, index) {
        window.setTimeout(
          function () {
            li.classList.add("is-done");
          },
          reduced ? 0 : STEP_DELAY * (index + 1),
        );
      })(el.steps[i], i);
    }

    scrollTo(el.confirmation);
    focusQuietly(el.confirmationTitle);
    form.removeAttribute("aria-busy");
  }

  /* ---------- events ---------- */

  function onFieldChange(event) {
    var control = event.target;
    if (!control || !control.name) return;
    clearError(control.name);
    if (control.name === "previous-complaint") updatePreviousCaseRequirement();
    updateProgress();
  }

  function onSubmit(event) {
    event.preventDefault();
    if (state.busy) return;
    var errors = validate();
    if (errors.length) {
      showErrors(errors);
      return;
    }
    clearAllErrors();
    openDialog();
  }

  function onReset() {
    var silent = state.silentReset;
    /* the browser restores default values after this handler; finish later */
    window.setTimeout(function () {
      populateSubcategories();
      setDateDefaults();
      updateCounter();
      updatePreviousCaseRequirement();
      clearAllErrors();
      updateProgress();
      if (!silent) {
        Salzamt.showToast(
          "Formular verworfen. Das Amt nimmt dies zur Kenntnis.",
        );
      }
    }, 0);
  }

  function init() {
    setDateDefaults();
    populateSubcategories();
    updateCounter();
    updatePreviousCaseRequirement();
    updateProgress();

    if (!deliveryConfigured() && window.console && console.warn) {
      console.warn(
        "Salzamt: Einlaufstelle nicht konfiguriert (data-access-key fehlt). Beschwerden werden nicht übermittelt.",
      );
    }

    el.category.addEventListener("change", populateSubcategories);
    el.category.addEventListener("input", populateSubcategories);
    el.text.addEventListener("input", updateCounter);
    el.signature.addEventListener("input", uppercaseSignature);
    el.birthDate.addEventListener("change", normalizeDateInput);
    el.date.addEventListener("change", normalizeDateInput);
    form.addEventListener("input", onFieldChange);
    form.addEventListener("change", onFieldChange);
    form.addEventListener("submit", onSubmit);
    form.addEventListener("reset", onReset);
    el.errorList.addEventListener("click", onErrorLinkClick);
    el.dialog.addEventListener("close", onDialogClose);
    el.reload.addEventListener("click", function () {
      window.location.reload();
    });
  }

  init();
})();
