/* Salzamt – complaint form (beschwerde.html).
   Validation with Fehlerprotokoll, the Rückfrage dialog, the trash-can
   sequence and the Eingangsbestätigung. Form contents are read for validation
   only; they are never stored (not even in localStorage) and never sent. */
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
    confirmation: document.getElementById("confirmation"),
    confirmationTitle: document.getElementById("confirmation-title"),
    caseNumber: document.querySelector("[data-case-number]"),
    receivedDate: document.querySelector("[data-received-date]"),
    receivedTime: document.querySelector("[data-received-time]"),
    complaintsTotal: document.querySelector("[data-complaints-total]"),
    steps: document.querySelectorAll("#confirmation .amtsweg li"),
    reload: document.querySelector('[data-action="reload"]'),
  };

  var state = { busy: false, silentReset: false };

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
      link.href = "#" + error.control.id;
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

  function startSequence() {
    if (state.busy) return;
    state.busy = true;
    form.setAttribute("aria-busy", "true");
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    if (Salzamt.prefersReducedMotion()) {
      showConfirmation();
    } else {
      runTrashSequence(showConfirmation);
    }
  }

  /* ---------- Eingangsbestätigung ---------- */

  function showConfirmation() {
    var now = new Date();
    var reduced = Salzamt.prefersReducedMotion();

    Salzamt.registerComplaint();
    el.caseNumber.textContent = Salzamt.newCaseNumber();
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
