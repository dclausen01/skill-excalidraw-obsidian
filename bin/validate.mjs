import fs from "node:fs";
import { validateScene, formatFindings } from "../lib/validate/index.js";
import { markdownToScene } from "../lib/document.js";
import { zoomL0 } from "../lib/style.js";

const [dateiPfad] = process.argv.slice(2);

if (!dateiPfad) {
  console.error("Aufruf: node bin/validate.mjs <datei.excalidraw.md>");
  process.exit(1);
}

const markdown = fs.readFileSync(dateiPfad, "utf8");
const { elements } = markdownToScene(markdown);

// Boardmaße aus den Elementen selbst, damit die L0-Regel auch für fremde Dateien greift.
const rechts = Math.max(...elements.map((e) => e.x + e.width));
const unten = Math.max(...elements.map((e) => e.y + e.height));
const links = Math.min(...elements.map((e) => e.x));
const oben = Math.min(...elements.map((e) => e.y));

const ergebnis = validateScene(elements, {
  markdown,
  zoomL0: zoomL0(rechts - links, unten - oben),
});

console.log(formatFindings(ergebnis.findings));
console.log(ergebnis.ok ? "\nGültig." : "\nUngültig — harte Fehler vorhanden.");
process.exit(ergebnis.ok ? 0 : 1);
