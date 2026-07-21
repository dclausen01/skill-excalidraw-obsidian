import fs from "node:fs";
import path from "node:path";
import { sceneToMarkdown } from "../lib/document.js";

const [skriptPfad, zielPfad] = process.argv.slice(2);

if (!skriptPfad || !zielPfad) {
  console.error("Aufruf: node bin/build.mjs <szenen-skript.mjs> <ziel.excalidraw.md>");
  process.exit(1);
}

// Kein stilles Überschreiben — der Vault ist zu wertvoll für einen Flüchtigkeitsfehler.
if (fs.existsSync(zielPfad) && process.env.UEBERSCHREIBEN !== "ja") {
  console.error(`${zielPfad} existiert bereits. Zum Überschreiben UEBERSCHREIBEN=ja setzen.`);
  process.exit(1);
}

const szene = (await import(path.resolve(skriptPfad))).default;
const markdown = sceneToMarkdown(szene);

fs.mkdirSync(path.dirname(zielPfad), { recursive: true });
fs.writeFileSync(zielPfad, markdown, "utf8");

const { breite, hoehe, zoomL0 } = szene.dimensions();
console.log(`Geschrieben: ${zielPfad}`);
console.log(`Elemente: ${szene.elements().length} | Board: ${Math.round(breite)}×${Math.round(hoehe)} | L0-Zoom: ${zoomL0.toFixed(2)}`);
