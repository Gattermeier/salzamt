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
    src: "salzamt_circle.png",
    name: "badge-320.png",
    w: 320,
    type: "png",
    circle: true,
  },
  {
    src: "salzamt_circle.png",
    name: "badge-96.png",
    w: 96,
    type: "png",
    circle: true,
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
      async ({ dataUrl, w, type, quality, circle, crop }) => {
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = dataUrl;
        });
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        let sx = 0;
        let sy = 0;
        let sw = nw;
        let sh = nh;
        if (circle) {
          // crop to the bounding box of non-white pixels, squared and centred
          const c = document.createElement("canvas");
          c.width = nw;
          c.height = nh;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const d = ctx.getImageData(0, 0, nw, nh).data;
          let minX = nw;
          let minY = nh;
          let maxX = 0;
          let maxY = 0;
          for (let y = 0; y < nh; y++) {
            for (let x = 0; x < nw; x++) {
              const i = (y * nw + x) * 4;
              if (d[i] < 225 || d[i + 1] < 225 || d[i + 2] < 225) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          const s = Math.max(maxX - minX + 1, maxY - minY + 1);
          sx = Math.round((minX + maxX) / 2 - s / 2);
          sy = Math.round((minY + maxY) / 2 - s / 2);
          sw = s;
          sh = s;
        } else if (crop) {
          // square crop around a focus point
          const s = Math.round(Math.min(nw, nh) * crop.size);
          sx = Math.min(Math.max(Math.round(nw * crop.cx - s / 2), 0), nw - s);
          sy = Math.min(Math.max(Math.round(nh * crop.cy - s / 2), 0), nh - s);
          sw = s;
          sh = s;
        }
        const h = circle || crop ? w : Math.round((w * sh) / sw);
        // stepwise halving for smooth downscaling
        let cur = document.createElement("canvas");
        cur.width = sw;
        cur.height = sh;
        cur.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
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
        if (circle) {
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
        circle: !!job.circle,
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
