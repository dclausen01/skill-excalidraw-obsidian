import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { scene } from "../lib/scene.js";
import { sceneToMarkdown, sceneToObject } from "../lib/document.js";
import { PROJECT_ROOT } from "../lib/config.js";

const BILD = path.join(PROJECT_ROOT, "tests", "fixtures", "testbild.png");
const SHA1 = crypto.createHash("sha1").update(fs.readFileSync(BILD)).digest("hex");

function baue() {
  const s = scene();
  const f = s.frame("Kapitel");
  f.image(BILD, { x: 100, y: 100, breite: 400 });
  return s;
}

describe("Bilder in Markdown und Render-Objekt", () => {
  it("schreibt ## Embedded Files mit fileId und Dateinamen", () => {
    const md = sceneToMarkdown(baue(), { pluginVersion: "2.23.12" });
    expect(md).toContain("## Embedded Files");
    expect(md).toContain(`${SHA1}: [[testbild.png]]`);
  });

  it("hält files der geschriebenen Datei leer", () => {
    const md = sceneToMarkdown(baue(), { pluginVersion: "2.23.12" });
    const json = JSON.parse(md.match(/```json\n([\s\S]*?)\n```/)[1]);
    expect(json.files).toEqual({});
  });

  it("befüllt files nur mit mitBilddaten für den Render-Pfad", () => {
    const obj = sceneToObject(baue(), { pluginVersion: "2.23.12", mitBilddaten: true });
    expect(obj.files[SHA1]).toBeDefined();
    expect(obj.files[SHA1].dataURL).toMatch(/^data:image\/png;base64,/);
    expect(obj.files[SHA1].id).toBe(SHA1);
  });

  it("lässt ## Embedded Files weg, wenn kein Bild da ist", () => {
    const s = scene();
    s.frame("K").box("X", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0 });
    expect(sceneToMarkdown(s, { pluginVersion: "2.23.12" })).not.toContain("## Embedded Files");
  });
});
