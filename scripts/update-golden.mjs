import fs from "node:fs";
import path from "node:path";
import { createRenderer } from "../lib/render.js";
import { sceneToObject } from "../lib/document.js";
import { PROJECT_ROOT } from "../lib/config.js";

const GOLDEN = path.join(PROJECT_ROOT, "tests", "golden");
const szenen = fs.readdirSync(GOLDEN).filter((f) => f.endsWith(".mjs"));

const renderer = await createRenderer();
try {
  for (const datei of szenen) {
    const szene = (await import(path.join(GOLDEN, datei))).default;
    // Fester Literal statt readPluginVersion(): Der Renderpfad liest source/version
    // nie mit, das Pixel-Ergebnis ändert sich dadurch nicht. Ohne diesen Literal
    // würde readPluginVersion() aber das Manifest im (maschinenlokalen) Vault-Pfad
    // lesen — das pinnen wir hier weg, damit die Golden-Erzeugung auf jeder
    // Maschine portabel läuft und nicht abstürzt, wenn der Vault fehlt.
    const szenenObjekt = sceneToObject(szene, { pluginVersion: "golden" });

    const name = path.basename(datei, ".mjs");
    const png = await renderer.renderBoard(szenenObjekt, { breite: 1200 });
    fs.writeFileSync(path.join(GOLDEN, `${name}.png`), png);
    console.log(`${name}.png (${(png.length / 1024).toFixed(0)} kB)`);
  }
} finally {
  await renderer.close();
}
