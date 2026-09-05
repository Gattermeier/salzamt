// Generates web-sized derivatives of the original artworks in assets/img/.
// Usage: NODE_PATH=/opt/node22/lib/node_modules node tools/resize-images.js
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "assets/img");
fs.mkdirSync(out, { recursive: true });

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
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent("<html><body></body></html>");
  for (const job of jobs) {
    const b64 = fs.readFileSync(path.join(root, job.src)).toString("base64");
    const res = await page.evaluate(
      async ({ src, w, type, quality, circle }) => {
        const img = new Image();
        await new Promise((r) => {
          img.onload = r;
          img.src = src;
        });
        let sx = 0,
          sy = 0,
          sw = img.naturalWidth,
          sh = img.naturalHeight;
        if (circle) {
          // crop to the bounding box of non-white pixels, squared and centred
          const c = document.createElement("canvas");
          c.width = sw;
          c.height = sh;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const d = ctx.getImageData(0, 0, sw, sh).data;
          let minX = sw,
            minY = sh,
            maxX = 0,
            maxY = 0;
          for (let y = 0; y < sh; y++)
            for (let x = 0; x < sw; x++) {
              const i = (y * sw + x) * 4;
              if (d[i] < 225 || d[i + 1] < 225 || d[i + 2] < 225) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          const s = Math.max(maxX - minX + 1, maxY - minY + 1);
          sx = Math.round((minX + maxX) / 2 - s / 2);
          sy = Math.round((minY + maxY) / 2 - s / 2);
          sw = s;
          sh = s;
        }
        const h = circle ? w : Math.round((w * sh) / sw);
        // stepwise halving for smooth downscaling
        let cur = document.createElement("canvas");
        cur.width = sw;
        cur.height = sh;
        cur.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        let cw = sw,
          ch = sh;
        while (cw / 2 > w) {
          const nw = Math.round(cw / 2),
            nh = Math.round(ch / 2);
          const n = document.createElement("canvas");
          n.width = nw;
          n.height = nh;
          const nctx = n.getContext("2d");
          nctx.imageSmoothingQuality = "high";
          nctx.drawImage(cur, 0, 0, cw, ch, 0, 0, nw, nh);
          cur = n;
          cw = nw;
          ch = nh;
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
        src: "data:image/png;base64," + b64,
        w: job.w,
        type: job.type,
        quality: job.quality,
        circle: !!job.circle,
      },
    );
    const buf = Buffer.from(res.data.split(",")[1], "base64");
    fs.writeFileSync(path.join(out, job.name), buf);
    console.log(
      job.name.padEnd(18),
      `${res.w}x${res.h}`.padEnd(10),
      `${Math.round(buf.length / 1024)} KB`,
    );
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
