import fs from "node:fs";
import path from "node:path";
import { createRenderer } from "../lib/render.js";
import { extractDrawing } from "../lib/compress.js";

const [dateiPfad, zielVerzeichnis] = process.argv.slice(2);

if (!dateiPfad || !zielVerzeichnis) {
  console.error("Aufruf: node bin/render.mjs <datei.excalidraw.md> <zielverzeichnis>");
  process.exit(1);
}

const szene = JSON.parse(extractDrawing(fs.readFileSync(dateiPfad, "utf8")).json);
fs.mkdirSync(zielVerzeichnis, { recursive: true });

const renderer = await createRenderer();
try {
  const uebersicht = path.join(zielVerzeichnis, "uebersicht.png");
  fs.writeFileSync(uebersicht, await renderer.renderBoard(szene, { breite: 1920 }));
  console.log(`L0 Übersicht: ${uebersicht}`);

  const namen = renderer.frameNames(szene);
  for (const [nr, name] of namen.entries()) {
    // Dateiname aus dem Frame-Namen, ohne Zeichen, die Pfade zerlegen könnten.
    const sicher = name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "frame";
    const ziel = path.join(zielVerzeichnis, `frame-${nr + 1}-${sicher}.png`);
    fs.writeFileSync(ziel, await renderer.renderFrame(szene, name, { breite: 1920, hoehe: 1080 }));
    console.log(`L1 ${name}: ${ziel}`);
  }
} finally {
  await renderer.close();
}
