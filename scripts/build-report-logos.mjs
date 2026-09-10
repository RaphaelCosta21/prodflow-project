// Extracts the two header logos from the controlled report docx into a base64 TS asset.
// Run from the repo root:  node scripts/build-report-logos.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(
  path.join(process.cwd(), "tools/office-reader/package.json"),
);
const JSZip = require("jszip");

const SOURCE = "Relatório de Orçamento de Partes e Peças - OS.docx";
const OUT = "src/webparts/prodFlow/app/assets/reportLogosBase64.ts";

// Anchored images of the first paragraph: Oceaneering (left, jpeg) and Petrobras (right, png).
const PARTS = [
  {
    entry: "word/media/image1.jpeg",
    constName: "OCEANEERING_LOGO_JPEG_BASE64",
  },
  { entry: "word/media/image2.png", constName: "PETROBRAS_LOGO_PNG_BASE64" },
];

const zip = await JSZip.loadAsync(fs.readFileSync(SOURCE));

const chunks = [
  "// Auto-generated from the official report docx by scripts/build-report-logos.mjs.",
  "// Do not edit by hand.",
  "",
];

for (const { entry, constName } of PARTS) {
  const file = zip.file(entry);
  if (!file) throw new Error(`missing ${entry} in ${SOURCE}`);
  const b64 = (await file.async("nodebuffer")).toString("base64");
  chunks.push(`export const ${constName} =`, `  "${b64}";`, "");
  console.log(`${entry} -> ${constName} (${b64.length} chars)`);
}

fs.writeFileSync(OUT, chunks.join("\n"), "utf8");
console.log(`wrote ${OUT}`);
