import fs from "node:fs";
import path from "node:path";
import { sceneToMarkdown, sceneToObject } from "../lib/document.js";
import { validateScene, formatFindings } from "../lib/validate/index.js";
import { createRenderer } from "../lib/render.js";

const argumente = process.argv.slice(2);
const kennzeichen = new Set(argumente.filter((a) => a.startsWith("--")));
const [skriptPfad, zielPfad] = argumente.filter((a) => !a.startsWith("--"));

const rendersIndex = argumente.indexOf("--renders");
const renderVerzeichnis = rendersIndex >= 0 ? argumente[rendersIndex + 1] : null;

if (!skriptPfad || !zielPfad) {
  console.error("Aufruf: node bin/build.mjs <szenen-skript.mjs> <ziel.excalidraw.md> [--renders <verzeichnis>] [--skip-render]");
  process.exit(1);
}

// Kein stilles Überschreiben — der Vault ist zu wertvoll für einen Flüchtigkeitsfehler.
if (fs.existsSync(zielPfad) && process.env.UEBERSCHREIBEN !== "ja") {
  console.error(`${zielPfad} existiert bereits. Zum Überschreiben UEBERSCHREIBEN=ja setzen.`);
  process.exit(1);
}

const szene = (await import(path.resolve(skriptPfad))).default;
const elemente = szene.elements();
const markdown = sceneToMarkdown(szene);
const { zoomL0 } = szene.dimensions();

// Gate 1: Validator. Harte Fehler beenden hier — der Vault bleibt unberührt.
const pruefung = validateScene(elemente, { markdown, registry: szene.registry, zoomL0 });
console.log(formatFindings(pruefung.findings));

if (!pruefung.ok) {
  console.error("\nAbbruch: harte Fehler. Es wurde nichts geschrieben.");
  process.exit(1);
}

// Gate 2: Rendering ins Scratchpad, damit das Layout vor dem Schreiben sichtbar ist.
if (!kennzeichen.has("--skip-render")) {
  const ziel = renderVerzeichnis ?? path.join(path.dirname(skriptPfad), "renders");
  fs.mkdirSync(ziel, { recursive: true });

  const renderer = await createRenderer();
  try {
    const szenenObjekt = sceneToObject(szene);
    fs.writeFileSync(path.join(ziel, "uebersicht.png"), await renderer.renderBoard(szenenObjekt, { breite: 1920 }));
    console.log(`\nL0 Übersicht: ${path.join(ziel, "uebersicht.png")}`);

    for (const [nr, name] of renderer.frameNames(szenenObjekt).entries()) {
      const sicher = name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "frame";
      const bild = path.join(ziel, `frame-${nr + 1}-${sicher}.png`);
      fs.writeFileSync(bild, await renderer.renderFrame(szenenObjekt, name, { breite: 1920, hoehe: 1080 }));
      console.log(`L1 ${name}: ${bild}`);
    }
  } finally {
    await renderer.close();
  }
}

// Erst jetzt in den Vault.
fs.mkdirSync(path.dirname(zielPfad), { recursive: true });
fs.writeFileSync(zielPfad, markdown, "utf8");

const { breite, hoehe } = szene.dimensions();
console.log(`\nGeschrieben: ${zielPfad}`);
console.log(`Elemente: ${elemente.length} | Board: ${Math.round(breite)}×${Math.round(hoehe)} | L0-Zoom: ${zoomL0.toFixed(2)}`);
