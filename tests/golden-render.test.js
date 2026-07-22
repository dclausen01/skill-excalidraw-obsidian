import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRenderer } from "../lib/render.js";
import { sceneToObject } from "../lib/document.js";
import { PROJECT_ROOT } from "../lib/config.js";

const GOLDEN = path.join(PROJECT_ROOT, "tests", "golden");
const szenen = fs.readdirSync(GOLDEN).filter((f) => f.endsWith(".mjs"));

describe("Golden-Renderings", () => {
  let renderer;

  beforeAll(async () => {
    renderer = await createRenderer();
  }, 60_000);

  afterAll(async () => {
    await renderer?.close();
  });

  it("hat für jede Referenzszene ein Referenzbild", () => {
    expect(szenen.length).toBeGreaterThan(0);
    for (const datei of szenen) {
      const png = path.join(GOLDEN, `${path.basename(datei, ".mjs")}.png`);
      expect(fs.existsSync(png), `${png} fehlt — npm run update-golden ausführen`).toBe(true);
    }
  });

  for (const datei of szenen) {
    const name = path.basename(datei, ".mjs");

    it(`rendert "${name}" byte-identisch zum Referenzbild`, async () => {
      const szene = (await import(path.join(GOLDEN, datei))).default;
      // Fester Literal statt readPluginVersion(): Der Renderpfad liest source/version
      // nie mit, das Pixel-Ergebnis ändert sich dadurch nicht. Ohne diesen Literal
      // würde readPluginVersion() aber das Manifest im (maschinenlokalen) Vault-Pfad
      // lesen — das pinnen wir hier weg, damit der Test auf jeder Maschine portabel
      // läuft und nicht abstürzt, wenn der Vault fehlt.
      const szenenObjekt = sceneToObject(szene, { pluginVersion: "golden" });

      const jetzt = await renderer.renderBoard(szenenObjekt, { breite: 1200 });
      const referenz = fs.readFileSync(path.join(GOLDEN, `${name}.png`));

      expect(
        jetzt.equals(referenz),
        `Das Rendering von "${name}" weicht vom Referenzbild ab. War die Änderung beabsichtigt, mit "npm run update-golden" neu erzeugen und die Bilder ansehen.`,
      ).toBe(true);
    }, 30_000);
  }
});
