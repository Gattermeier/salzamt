// Generates the web-sized images in assets/img/ from the sources in originals/.
// Usage: NODE_PATH=/opt/node22/lib/node_modules node tools/resize-images.js
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "originals");
const out = path.join(root, "assets/img");
fs.mkdirSync(out, { recursive: true });

// Which portrait variant the pages show: "sketch" (ink drawing) or "photo".
const TEAM_VARIANT = "sketch";

// The Amtssiegel source (originals/amtssiegel.jpg, 976x976) is a crop of the
// poster with text remnants above the crown. These source-pixel coordinates
// paint them over with parchment sampled from a clean row of the same column
// (the cross between the words belongs to the crown and is kept), then centre
// the coat of arms inside a circle large enough for every wing tip.
const SEAL = {
  centre: [487, 500],
  diameter: 1040,
  background: "rgb(230, 214, 181)",
  clearTop: 68,
  sampleRowTop: 68,
  words: [
    [0, 60, 458, 104],
    [522, 60, 976, 104],
  ],
  sampleRowWords: 106,
};

// Per-person square crops as fractions of the source image: centre (cx, cy)
// and edge length (size, relative to the shorter side).
const STAFF = [
  {
    slug: "martin-gattermeier",
    crop: {
      sketch: { cx: 0.4, cy: 0.52, size: 0.7 },
      photo: { cx: 0.42, cy: 0.55, size: 0.7 },
    },
  },
  {
    slug: "alexander-fellner",
    crop: {
      sketch: { cx: 0.52, cy: 0.48, size: 0.82 },
      photo: { cx: 0.53, cy: 0.5, size: 0.8 },
    },
  },
  {
    slug: "katharina-gattermeier",
    crop: {
      sketch: { cx: 0.5, cy: 0.5, size: 0.95 },
      photo: { cx: 0.5, cy: 0.55, size: 0.9 },
    },
  },
  {
    slug: "irmgard-gattermeier",
    crop: {
      sketch: { cx: 0.5, cy: 0.47, size: 0.9 },
      photo: { cx: 0.5, cy: 0.5, size: 0.9 },
    },
  },
];

const jobs = [
  {
    src: "salzamt_poster.png",
    name: "poster-900.jpg",
    w: 900,
    type: "jpeg",
    quality: 0.82,
  },
  {
    src: "salzamt_poster.png",
    name: "poster-480.jpg",
    w: 480,
    type: "jpeg",
    quality: 0.82,
  },
  {
    src: "Salzbug_Postkarte_A6.png",
    name: "postkarte-1.jpg",
    w: 900,
    type: "jpeg",
    quality: 0.84,
  },
  {
    src: "Wappen-Postkarte-A6.png",
    name: "postkarte-2.jpg",
    w: 700,
    type: "jpeg",
    quality: 0.84,
  },
  {
    src: "amtssiegel.jpg",
    name: "badge-320.png",
    w: 320,
    type: "png",
    seal: SEAL,
  },
  {
    src: "amtssiegel.jpg",
    name: "badge-96.png",
    w: 96,
    type: "png",
    seal: SEAL,
  },
  {
    src: "salzamt_stamp.png",
    name: "stamp-600.jpg",
    w: 600,
    type: "jpeg",
    quality: 0.85,
  },
  {
    src: "salzamt.png",
    name: "oval-600.jpg",
    w: 600,
    type: "jpeg",
    quality: 0.82,
  },
  {
    src: "shop_salzstreuer.png",
    name: "shop_salzstreuer.jpg",
    w: 600,
    type: "jpeg",
    quality: 0.85,
  },
  {
    src: "shop_salzkorn.png",
    name: "shop_salzkorn.jpg",
    w: 600,
    type: "jpeg",
    quality: 0.85,
  },
  {
    src: "shop_haeferl.png",
    name: "shop_haeferl.jpg",
    w: 600,
    type: "jpeg",
    quality: 0.85,
  },
  {
    src: "shop_stempel.png",
    name: "shop_stempel.jpg",
    w: 600,
    type: "jpeg",
    quality: 0.85,
  },
  {
    src: "shop_wartenummer.png",
    name: "shop_wartenummer.jpg",
    w: 600,
    type: "jpeg",
    quality: 0.85,
  },
  {
    src: "shop_aktenordner.png",
    name: "shop_aktenordner.jpg",
    w: 600,
    type: "jpeg",
    quality: 0.85,
  },
  {
    // Frame, title and caption of shop_postkarten.png around the real
    // postcards: `clear` (source pixels, between title and caption) is
    // repainted from its own edges, then both A6 cards are laid into `area`,
    // the Salzach view on the Doppeladler, low enough to keep the eagle in
    // sight. Card positions are in card long sides.
    name: "shop_postkarten.jpg",
    w: 600,
    type: "jpeg",
    quality: 0.85,
    stack: {
      backdrop: "shop_postkarten.png",
      clear: [33, 85, 567, 521],
      grain: 2,
      area: [63, 104, 537, 500],
      cards: [
        { src: "Wappen-Postkarte-A6.png", cx: 0, cy: 0, angle: -6 },
        { src: "Salzbug_Postkarte_A6.png", cx: 0.45, cy: 0.56, angle: 4 },
      ],
      shadow: "rgba(40, 25, 5, 0.4)",
    },
  },
  ...STAFF.map((person) => ({
    src: `team-${person.slug}-${TEAM_VARIANT}.jpg`,
    name: `team-${person.slug}.jpg`,
    w: 440,
    type: "jpeg",
    quality: 0.85,
    crop: person.crop[TEAM_VARIANT],
  })),
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent("<html><body></body></html>");
  for (const job of jobs) {
    const files = job.stack
      ? [job.stack.backdrop, ...job.stack.cards.map((c) => c.src)]
      : [job.src];
    const missing = files.find((f) => !fs.existsSync(path.join(src, f)));
    if (missing) {
      console.log(
        job.name.padEnd(30),
        `skipped, source missing: originals/${missing}`,
      );
      continue;
    }
    const dataUrls = files.map((f) => {
      const mime = f.toLowerCase().endsWith(".png")
        ? "image/png"
        : "image/jpeg";
      const b64 = fs.readFileSync(path.join(src, f)).toString("base64");
      return `data:${mime};base64,${b64}`;
    });
    const res = await page.evaluate(
      async ({ dataUrls, w, type, quality, seal, crop, stack }) => {
        const imgs = await Promise.all(
          dataUrls.map(
            (url) =>
              new Promise((resolve) => {
                const im = new Image();
                im.onload = () => resolve(im);
                im.src = url;
              }),
          ),
        );
        // stepwise halving for smooth downscaling, stopping above w
        const halve = (cur, cw, ch, target) => {
          while (cw / 2 > target) {
            const halfW = Math.round(cw / 2);
            const halfH = Math.round(ch / 2);
            const next = document.createElement("canvas");
            next.width = halfW;
            next.height = halfH;
            const nctx = next.getContext("2d");
            nctx.imageSmoothingQuality = "high";
            nctx.drawImage(cur, 0, 0, cw, ch, 0, 0, halfW, halfH);
            cur = next;
            cw = halfW;
            ch = halfH;
          }
          return [cur, cw, ch];
        };
        const img = imgs[0];
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        let source = img;
        let sx = 0;
        let sy = 0;
        let sw = nw;
        let sh = nh;
        if (seal) {
          // paint over the text remnants column by column with parchment from
          // a clean row, then centre the eagle on a larger square
          const fixed = document.createElement("canvas");
          fixed.width = nw;
          fixed.height = nh;
          const fctx = fixed.getContext("2d");
          fctx.drawImage(img, 0, 0);
          const image = fctx.getImageData(0, 0, nw, nh);
          const d = image.data;
          const paint = (x0, y0, x1, y1, fromRow) => {
            for (let x = x0; x < x1; x++) {
              const j = (fromRow * nw + x) * 4;
              for (let y = y0; y < y1; y++) {
                const i = (y * nw + x) * 4;
                d[i] = d[j];
                d[i + 1] = d[j + 1];
                d[i + 2] = d[j + 2];
                d[i + 3] = 255;
              }
            }
          };
          paint(0, 0, nw, seal.clearTop, seal.sampleRowTop);
          seal.words.forEach(([x0, y0, x1, y1]) =>
            paint(x0, y0, x1, y1, seal.sampleRowWords),
          );
          fctx.putImageData(image, 0, 0);
          const D = seal.diameter;
          const composed = document.createElement("canvas");
          composed.width = D;
          composed.height = D;
          const cctx = composed.getContext("2d");
          cctx.fillStyle = seal.background;
          cctx.fillRect(0, 0, D, D);
          cctx.drawImage(
            fixed,
            Math.round(D / 2 - seal.centre[0]),
            Math.round(D / 2 - seal.centre[1]),
          );
          source = composed;
          sw = D;
          sh = D;
        } else if (crop) {
          // square crop around a focus point
          const s = Math.round(Math.min(nw, nh) * crop.size);
          sx = Math.min(Math.max(Math.round(nw * crop.cx - s / 2), 0), nw - s);
          sy = Math.min(Math.max(Math.round(nh * crop.cy - s / 2), 0), nh - s);
          sw = s;
          sh = s;
        } else if (stack) {
          const composed = document.createElement("canvas");
          composed.width = nw;
          composed.height = nh;
          const cctx = composed.getContext("2d");
          cctx.drawImage(img, 0, 0);
          // Coons patch: blend the four edges (each averaged 3 px deep)
          // across the area, plus grain as fine as the backdrop's own
          const [x0, y0, x1, y1] = stack.clear;
          const pw = x1 - x0;
          const ph = y1 - y0;
          const patch = cctx.getImageData(x0, y0, pw, ph);
          const d = patch.data;
          const edge = (x, y, dx, dy, c) =>
            (d[(y * pw + x) * 4 + c] +
              d[((y + dy) * pw + x + dx) * 4 + c] +
              d[((y + 2 * dy) * pw + x + 2 * dx) * 4 + c]) /
            3;
          const edges = [0, 1, 2].map((c) => {
            const top = Array.from({ length: pw }, (_, x) =>
              edge(x, 0, 0, 1, c),
            );
            const bottom = Array.from({ length: pw }, (_, x) =>
              edge(x, ph - 1, 0, -1, c),
            );
            const left = Array.from({ length: ph }, (_, y) =>
              edge(0, y, 1, 0, c),
            );
            const right = Array.from({ length: ph }, (_, y) =>
              edge(pw - 1, y, -1, 0, c),
            );
            const corners = [
              (top[0] + left[0]) / 2,
              (top[pw - 1] + right[0]) / 2,
              (bottom[0] + left[ph - 1]) / 2,
              (bottom[pw - 1] + right[ph - 1]) / 2,
            ];
            return { top, bottom, left, right, corners };
          });
          let seed = 1848;
          const rand = () =>
            (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
          for (let y = 0; y < ph; y++) {
            const v = y / (ph - 1);
            for (let x = 0; x < pw; x++) {
              const u = x / (pw - 1);
              edges.forEach((e, c) => {
                d[(y * pw + x) * 4 + c] =
                  (1 - v) * e.top[x] +
                  v * e.bottom[x] +
                  (1 - u) * e.left[y] +
                  u * e.right[y] -
                  ((1 - u) * (1 - v) * e.corners[0] +
                    u * (1 - v) * e.corners[1] +
                    (1 - u) * v * e.corners[2] +
                    u * v * e.corners[3]) +
                  (rand() * 2 - 1) * stack.grain;
              });
            }
          }
          cctx.putImageData(patch, x0, y0);
          // cards scaled to a common long side of 1, rotated about their
          // centres, the whole stack centred in `area` as large as it fits
          const cards = stack.cards.map((c, i) => {
            const im = imgs[i + 1];
            const long = Math.max(im.naturalWidth, im.naturalHeight);
            return {
              ...c,
              im,
              w: im.naturalWidth / long,
              h: im.naturalHeight / long,
              rad: (c.angle * Math.PI) / 180,
            };
          });
          let bx0 = Infinity;
          let by0 = Infinity;
          let bx1 = -Infinity;
          let by1 = -Infinity;
          cards.forEach((c) => {
            const cos = Math.abs(Math.cos(c.rad));
            const sin = Math.abs(Math.sin(c.rad));
            const ex = (c.w * cos + c.h * sin) / 2;
            const ey = (c.w * sin + c.h * cos) / 2;
            bx0 = Math.min(bx0, c.cx - ex);
            bx1 = Math.max(bx1, c.cx + ex);
            by0 = Math.min(by0, c.cy - ey);
            by1 = Math.max(by1, c.cy + ey);
          });
          const [ax0, ay0, ax1, ay1] = stack.area;
          const scale = Math.min(
            (ax1 - ax0) / (bx1 - bx0),
            (ay1 - ay0) / (by1 - by0),
          );
          cctx.imageSmoothingQuality = "high";
          cctx.shadowColor = stack.shadow;
          cctx.shadowBlur = 16;
          cctx.shadowOffsetX = 5;
          cctx.shadowOffsetY = 9;
          cards.forEach((c) => {
            const cardW = c.w * scale;
            const cardH = c.h * scale;
            const [small, smallW, smallH] = halve(
              c.im,
              c.im.naturalWidth,
              c.im.naturalHeight,
              cardW,
            );
            cctx.save();
            cctx.translate(
              (ax0 + ax1) / 2 + (c.cx - (bx0 + bx1) / 2) * scale,
              (ay0 + ay1) / 2 + (c.cy - (by0 + by1) / 2) * scale,
            );
            cctx.rotate(c.rad);
            cctx.drawImage(
              small,
              0,
              0,
              smallW,
              smallH,
              -cardW / 2,
              -cardH / 2,
              cardW,
              cardH,
            );
            cctx.restore();
          });
          source = composed;
        }
        const h = seal || crop ? w : Math.round((w * sh) / sw);
        const region = document.createElement("canvas");
        region.width = sw;
        region.height = sh;
        region.getContext("2d").drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
        const [cur, cw, ch] = halve(region, sw, sh, w);
        const o = document.createElement("canvas");
        o.width = w;
        o.height = h;
        const octx = o.getContext("2d");
        octx.imageSmoothingQuality = "high";
        if (seal) {
          octx.beginPath();
          octx.arc(w / 2, h / 2, w / 2 - 0.5, 0, Math.PI * 2);
          octx.clip();
        } else {
          octx.fillStyle = "#fff";
          octx.fillRect(0, 0, w, h);
        }
        octx.drawImage(cur, 0, 0, cw, ch, 0, 0, w, h);
        return {
          data: o.toDataURL(
            type === "jpeg" ? "image/jpeg" : "image/png",
            quality,
          ),
          w,
          h,
        };
      },
      {
        dataUrls,
        w: job.w,
        type: job.type,
        quality: job.quality,
        seal: job.seal || null,
        crop: job.crop || null,
        stack: job.stack || null,
      },
    );
    const buf = Buffer.from(res.data.split(",")[1], "base64");
    fs.writeFileSync(path.join(out, job.name), buf);
    console.log(
      job.name.padEnd(30),
      `${res.w}x${res.h}`.padEnd(10),
      `${Math.round(buf.length / 1024)} KB`,
    );
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
