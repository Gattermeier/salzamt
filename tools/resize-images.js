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
    const file = path.join(src, job.src);
    if (!fs.existsSync(file)) {
      console.log(
        job.name.padEnd(30),
        `skipped, source missing: originals/${job.src}`,
      );
      continue;
    }
    const mime = job.src.toLowerCase().endsWith(".png")
      ? "image/png"
      : "image/jpeg";
    const b64 = fs.readFileSync(file).toString("base64");
    const res = await page.evaluate(
      async ({ dataUrl, w, type, quality, seal, crop }) => {
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = dataUrl;
        });
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
        }
        const h = seal || crop ? w : Math.round((w * sh) / sw);
        // stepwise halving for smooth downscaling
        let cur = document.createElement("canvas");
        cur.width = sw;
        cur.height = sh;
        cur.getContext("2d").drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
        let cw = sw;
        let ch = sh;
        while (cw / 2 > w) {
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
        dataUrl: `data:${mime};base64,${b64}`,
        w: job.w,
        type: job.type,
        quality: job.quality,
        seal: job.seal || null,
        crop: job.crop || null,
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
