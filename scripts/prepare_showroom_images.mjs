import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE || "sharp");
const sourceDir = process.argv[2];
if (!sourceDir)
  throw new Error("Pass the operator's AW26 model-image directory.");
const context = { window: {} };
vm.runInNewContext(
  await fs.readFile(path.join(root, "aw26-product-data.js"), "utf8"),
  context,
);
const products = context.window.bingoAw26ProductBatches.flatMap(
  (batch) => batch.products,
);
const dest = path.join(root, "assets/garments/aw26/photos");
await fs.mkdir(dest, { recursive: true });
for (const product of products) {
  const input = path.join(sourceDir, `model-${product.code}.png`);
  const { width, height } = await sharp(input).metadata();
  // Extract only the existing on-body photograph; no garment or model is generated.
  const crop = {
    left: Math.floor(width * 0.72),
    top: Math.floor(height * 0.04),
    width: Math.floor(width * 0.275),
    height: Math.floor(height * 0.79),
  };
  await sharp(input)
    .extract(crop)
    .resize(720, 900, { fit: "contain", background: "#2b303e" })
    .webp({ quality: 87 })
    .toFile(path.join(dest, `${product.code.toLowerCase()}.webp`));
}
const heroLayers = [];
for (const [code, left, width] of [
  ["04C", 830, 540],
  ["253", 1290, 540],
]) {
  const input = path.join(sourceDir, `model-${code}.png`);
  const info = await sharp(input).metadata();
  const photo = await sharp(input)
    .extract({
      left: Math.floor(info.width * 0.72),
      top: 0,
      width: Math.floor(info.width * 0.28),
      height: info.height,
    })
    .resize(width, 1040, { fit: "cover", position: "top" })
    .png()
    .toBuffer();
  heroLayers.push({ input: photo, left, top: 0 });
}
await sharp({
  create: { width: 1920, height: 1040, channels: 3, background: "#2b303e" },
})
  .composite(heroLayers)
  .webp({ quality: 88 })
  .toFile(path.join(dest, "aw26-editorial.webp"));
console.log(
  `Prepared ${products.length} photograph crops and one editorial composition.`,
);
