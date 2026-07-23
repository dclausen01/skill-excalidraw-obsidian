import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createFindings } from "../lib/validate/findings.js";
import { checkImageRefs } from "../lib/validate/structure.js";
import { scene } from "../lib/scene.js";
import { sceneToMarkdown } from "../lib/document.js";
import { PROJECT_ROOT } from "../lib/config.js";

const BILD = path.join(PROJECT_ROOT, "tests", "fixtures", "testbild.png");
// Der Vault für den Test ist der Ordner, in dem testbild.png liegt.
const VAULT = path.join(PROJECT_ROOT, "tests", "fixtures");
const SHA1 = crypto.createHash("sha1").update(fs.readFileSync(BILD)).digest("hex");

function baue() {
  const s = scene();
  const f = s.frame("Kapitel");
  f.image(BILD, { x: 100, y: 100, breite: 400 });
  return s;
}

function pruefe(elemente, markdown, vaultPath = VAULT) {
  const b = createFindings();
  checkImageRefs(elemente, markdown, b, { vaultPath });
  return b.all();
}

describe("checkImageRefs", () => {
  it("akzeptiert ein Bild, dessen Datei existiert und dessen SHA-1 stimmt", () => {
    const s = baue();
    expect(pruefe(s.elements(), sceneToMarkdown(s, { pluginVersion: "x" }))).toEqual([]);
  });

  it("meldet ein fehlendes Bild als harten Fehler", () => {
    const s = baue();
    const md = sceneToMarkdown(s, { pluginVersion: "x" }).replace("testbild.png", "gibtsnicht.png");
    const befunde = pruefe(s.elements(), md);
    expect(befunde.some((b) => b.regel === "bildreferenz" && b.schwere === "fehler")).toBe(true);
  });
});
