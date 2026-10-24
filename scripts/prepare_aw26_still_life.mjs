import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE || "sharp");
const source = process.argv[2];
if (!source) throw new Error("Pass the exported supplier product-object directory.");
const context = { window: {} };
vm.runInNewContext(await fs.readFile(path.join(root, "aw26-product-data.js"), "utf8"), context);
const products = context.window.bingoAw26ProductBatches.flatMap((batch) => batch.products);
const destination = path.join(root, "assets/garments/aw26/still-life");
await fs.mkdir(destination, { recursive: true });

for (const product of products) {
  // Preserve the supplied product pixels and transparency; only optimize delivery.
  await sharp(path.join(source, `${product.code}.png`))
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88, effort: 5 })
    .toFile(path.join(destination, `${product.code.toLowerCase()}.webp`));
}

const layers = [];
for (const [code, left, top, width, height] of [
  ["04C", 780, 130, 580, 700],
  ["253", 1340, 80, 530, 790],
]) {
  const input = await sharp(path.join(source, `${code}.png`))
    .resize(width, height, { fit: "contain", background: "#00000000" })
    .png().toBuffer();
  layers.push({ input, left, top });
}
await sharp({ create: { width: 1920, height: 1000, channels: 3, background: "#f3f3f1" } })
  .composite(layers)
  .webp({ quality: 88 })
  .toFile(path.join(destination, "collection.webp"));

const guides = JSON.parse(await fs.readFile(path.join(source, "size-guides.json"), "utf8"));
if (products.some((product) => !guides[product.code])) throw new Error("A size guide is missing.");
await fs.writeFile(path.join(root, "aw26-size-guides.js"),
  `// Transcribed from the existing English catalog; reconfirm with each order.\nwindow.bingoAw26SizeGuides = ${JSON.stringify(guides, null, 2)};\n`);
console.log(`Prepared ${products.length} garment-only assets, one collection image and twenty size guides.`);
