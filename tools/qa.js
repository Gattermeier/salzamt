// Smoke test for salzamt.vip: screenshots, console errors, failed requests,
// internal links, and the three user flows (complaint, shop order, team).
//
// Usage:
//   npx http-server -p 8080 -s -c-1 .            (in another terminal)
//   NODE_PATH=/opt/node22/lib/node_modules node tools/qa.js
// Env: BASE (default http://127.0.0.1:8080/), OUT (default ./qa-screenshots)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE || "http://127.0.0.1:8080/";
const OUT = process.env.OUT || path.resolve(__dirname, "..", "qa-screenshots");
const PAGES = [
  "index.html",
  "beschwerde.html",
  "shop.html",
  "kassa.html",
  "team.html",
];
const WIDTHS = [390, 1280];
// The staff photos are supplied by the owner and may be missing.
const OWNER_IMAGES = /team-[a-z-]+\.jpg$/;

const failures = [];
function fail(msg) {
  failures.push(msg);
  console.log("FAIL", msg);
}
function ok(msg) {
  console.log("ok  ", msg);
}

function watch(page, label) {
  const errors = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const loc = m.location && m.location();
    if (loc && loc.url && OWNER_IMAGES.test(loc.url)) return;
    errors.push(`${label}: console: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`${label}: pageerror: ${e}`));
  page.on("response", (r) => {
    if (r.status() >= 400 && !OWNER_IMAGES.test(r.url()))
      errors.push(`${label}: ${r.status()} ${r.url()}`);
  });
  page.on("requestfailed", (r) => {
    if (!OWNER_IMAGES.test(r.url()))
      errors.push(`${label}: request failed ${r.url()}`);
  });
  return errors;
}

async function screenshotsAndLinks(browser) {
  const seen = new Set();
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    for (const p of PAGES) {
      const page = await ctx.newPage();
      const errors = watch(page, `${p}@${width}`);
      await page.goto(BASE + p, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const current = await page.$$eval(
        ".main-nav a[aria-current='page']",
        (els) => els.map((e) => e.getAttribute("href")),
      );
      if (!current.includes(p))
        fail(
          `${p}: aria-current not set on its nav link (got ${JSON.stringify(current)})`,
        );
      const h1s = await page.$$eval("h1", (els) => els.length);
      if (h1s !== 1) fail(`${p}: expected exactly one h1, found ${h1s}`);
      await page.screenshot({
        path: path.join(OUT, `${p.replace(".html", "")}-${width}.png`),
        fullPage: true,
      });
      if (width === 1280) {
        const hrefs = await page.$$eval("a[href]", (els) =>
          els.map((a) => a.getAttribute("href")),
        );
        for (const href of hrefs) {
          if (
            !href ||
            href.startsWith("#") ||
            /^(https?:|mailto:|tel:)/.test(href)
          )
            continue;
          const target = href.split(/[?#]/)[0];
          if (!target || seen.has(target)) continue;
          seen.add(target);
          const res = await page.request.get(BASE + target);
          if (res.status() !== 200)
            fail(`${p}: link ${href} -> ${res.status()}`);
        }
      }
      errors.forEach(fail);
      await page.close();
    }
    await ctx.close();
  }
  ok(
    `screenshots written to ${OUT}; ${seen.size} internal link targets checked`,
  );
}

async function complaintFlow(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();
  const errors = watch(page, "complaint");
  await page.goto(BASE + "beschwerde.html", { waitUntil: "networkidle" });
  const requests = [];
  page.on("request", (r) => {
    if (!r.url().startsWith(BASE)) requests.push(r.url());
  });

  // 1) empty submit must be blocked with the protocol
  await page.click("#complaint-form button[type='submit']");
  await page.waitForTimeout(300);
  const protocolShown = await page
    .$eval("#complaint-errors", (el) => !el.hidden && el.offsetHeight > 0)
    .catch(() => false);
  if (!protocolShown)
    fail("complaint: Fehlerprotokoll not shown on empty submit");
  const confirmVisible = await page
    .$eval("#confirmation", (el) => !el.hidden && el.offsetHeight > 0)
    .catch(() => false);
  if (confirmVisible)
    fail("complaint: confirmation shown although the form was invalid");

  // 2) fill everything validly
  await page.evaluate(() => {
    const form = document.getElementById("complaint-form");
    form
      .querySelectorAll("input[type='text'], input[type='number']")
      .forEach((el) => {
        if (!el.value) {
          el.value =
            el.id === "postal-code"
              ? "1010"
              : el.id === "birth-date"
                ? "18.08.1984"
                : "MUSTER";
        }
      });
    form.querySelectorAll("input[type='date']").forEach((el) => {
      if (!el.value) el.value = "1984-08-18";
    });
    form.querySelectorAll("textarea").forEach((el) => {
      if (!el.value)
        el.value = "Der Sachverhalt ist folgender: Es wird nichts bearbeitet.";
    });
    form.querySelectorAll("select").forEach((sel) => {
      const wanted = sel.id === "security-question" ? "Beim Salzamt" : null;
      let idx = -1;
      for (let i = 0; i < sel.options.length; i++) {
        const o = sel.options[i];
        if (wanted ? o.text.trim() === wanted : i > 0 && !o.disabled) {
          idx = i;
          break;
        }
      }
      if (idx >= 0) {
        sel.selectedIndex = idx;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    // dependent subcategory may have been repopulated on change
    const sub = form.querySelector("#complaint-subcategory");
    if (sub && sub.selectedIndex <= 0 && sub.options.length > 1)
      sub.selectedIndex = 1;
    const groups = {};
    form.querySelectorAll("input[type='radio']").forEach((r) => {
      groups[r.name] = groups[r.name] || [];
      groups[r.name].push(r);
    });
    Object.values(groups).forEach((list) => {
      const nein = list.find(
        (r) =>
          /nein/i.test(r.value) || /nein/i.test(r.parentElement.textContent),
      );
      (nein || list[0]).checked = true;
      (nein || list[0]).dispatchEvent(new Event("change", { bubbles: true }));
    });
    form
      .querySelectorAll(
        "fieldset:last-of-type input[type='checkbox'], [data-declaration] input[type='checkbox']",
      )
      .forEach((c) => {
        c.checked = true;
      });
    form.querySelectorAll("input[type='checkbox'][required]").forEach((c) => {
      c.checked = true;
    });
    form
      .querySelectorAll("input, select, textarea")
      .forEach((el) => el.dispatchEvent(new Event("input", { bubbles: true })));
  });
  await page.click("#complaint-form button[type='submit']");
  await page
    .waitForSelector("#confirm-dialog[open]", { timeout: 3000 })
    .catch(() => fail("complaint: confirm dialog did not open"));
  const buttons = await page.$$("#confirm-dialog button");
  if (buttons.length) await buttons[buttons.length - 1].click();
  await page
    .waitForFunction(
      () => {
        const c = document.getElementById("confirmation");
        return c && !c.hidden && c.offsetHeight > 0;
      },
      { timeout: 12000 },
    )
    .catch(() =>
      fail("complaint: confirmation did not appear after the animation"),
    );
  const caseNumber = await page
    .$eval(
      "#confirmation",
      (el) =>
        (el.textContent.match(/SA-\d{4}\/\d{3}\.\d{3}-II\/3-NB/) || [])[0],
    )
    .catch(() => null);
  if (!caseNumber) fail("complaint: no Aktenzeichen in the confirmation");
  else ok(`complaint: Aktenzeichen ${caseNumber}`);
  await page.waitForTimeout(1500);
  const done = await page.$$eval(
    "#confirmation .amtsweg li.is-done",
    (els) => els.length,
  );
  if (done !== 5) fail(`complaint: expected 5 completed steps, found ${done}`);
  const stored = await page.evaluate(() =>
    localStorage.getItem("salzamt_beschwerden_lokal"),
  );
  if (stored !== "1")
    fail(`complaint: local counter is ${stored}, expected "1"`);
  if (requests.length)
    fail(`complaint: external requests on submit: ${requests.join(", ")}`);
  await page.screenshot({
    path: path.join(OUT, "flow-complaint-confirmation.png"),
    fullPage: true,
  });
  errors.forEach(fail);
  await ctx.close();
}

async function shopFlow(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();
  const errors = watch(page, "shop");
  await page.goto(BASE + "shop.html", { waitUntil: "networkidle" });
  const addButtons = await page.$$("[data-add]");
  if (addButtons.length < 3)
    fail(`shop: expected at least 3 add buttons, found ${addButtons.length}`);
  for (const b of addButtons.slice(0, 3)) await b.click();
  const badge = await page.$eval("[data-cart-count]", (el) =>
    el.textContent.trim(),
  );
  if (badge !== "3") fail(`shop: badge shows ${badge}, expected 3`);

  await page.goto(BASE + "kassa.html", { waitUntil: "networkidle" });
  const rows = await page.$$("[data-cart-line]");
  if (rows.length !== 3)
    fail(`kassa: expected 3 cart lines, found ${rows.length}`);
  const plus = await page.$("[data-cart-line] [data-qty-plus]");
  if (plus) await plus.click();
  const remove = await page.$$("[data-cart-line] [data-remove]");
  if (remove.length) await remove[remove.length - 1].click();
  await page.waitForTimeout(200);
  const lines = await page.$$eval("[data-cart-line]", (els) => els.length);
  if (lines !== 2)
    fail(`kassa: expected 2 lines after removal, found ${lines}`);
  const totalText = await page
    .$eval("[data-total]", (el) => el.textContent.trim())
    .catch(() => null);
  if (!totalText) fail("kassa: no [data-total] element");
  await page.click("[data-place-order]");
  await page
    .waitForSelector("[data-order-number]", { timeout: 3000 })
    .catch(() => fail("kassa: order confirmation missing"));
  const orderNumber = await page
    .$eval("[data-order-number]", (el) => el.textContent.trim())
    .catch(() => "");
  if (!/^B-\d{4}-NB-\d{6}$/.test(orderNumber))
    fail(`kassa: bad order number "${orderNumber}"`);
  else ok(`kassa: Bestellnummer ${orderNumber}`);
  const sums = await page.$$eval("[data-denomination-amount]", (els) =>
    els.map((e) => e.getAttribute("data-denomination-amount")).map(Number),
  );
  const grand = await page
    .$eval("[data-order-total]", (el) =>
      Number(el.getAttribute("data-order-total")),
    )
    .catch(() => NaN);
  const sum = sums.reduce((a, b) => a + b, 0);
  if (!sums.length || sum !== grand)
    fail(`kassa: denominations sum to ${sum}, total is ${grand}`);
  else ok(`kassa: Stückelung sums to ${grand} Groschen`);
  const delivery = await page
    .$eval("[data-delivery-date]", (el) => el.textContent.trim())
    .catch(() => "");
  const expected = await page.evaluate(() =>
    Salzamt.formatDateLong(Salzamt.addYearsMonths(new Date(), 3, 4)),
  );
  if (delivery !== expected)
    fail(`kassa: delivery "${delivery}" != expected "${expected}"`);
  else ok(`kassa: Zustellung ${delivery}`);
  const badgeAfter = await page.$eval("[data-cart-count]", (el) => ({
    text: el.textContent.trim(),
    hidden: getComputedStyle(el).display === "none",
  }));
  if (badgeAfter.text !== "0" || !badgeAfter.hidden)
    fail(`kassa: badge after order is ${JSON.stringify(badgeAfter)}`);
  await page.screenshot({
    path: path.join(OUT, "flow-order-confirmation.png"),
    fullPage: true,
  });
  await page.emulateMedia({ media: "print" });
  const navVisible = await page.$eval(
    ".site-header",
    (el) => getComputedStyle(el).display !== "none",
  );
  if (navVisible) fail("kassa: header visible in print media");
  await page.screenshot({
    path: path.join(OUT, "flow-order-print.png"),
    fullPage: true,
  });
  errors.forEach(fail);
  await ctx.close();
}

async function teamFlow(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();
  const errors = watch(page, "team");
  await page.goto(BASE + "team.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const circles = await page.$$eval(
    ".team-member .circle-photo",
    (els) => els.length,
  );
  if (circles !== 4)
    fail(`team: expected 4 circle photos or placeholders, found ${circles}`);
  else ok("team: four portrait circles rendered");
  errors.forEach(fail);
  await ctx.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    await screenshotsAndLinks(browser);
    await complaintFlow(browser);
    await shopFlow(browser);
    await teamFlow(browser);
  } finally {
    await browser.close();
  }
  console.log(
    failures.length ? `\n${failures.length} failure(s)` : "\nall checks passed",
  );
  process.exit(failures.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
