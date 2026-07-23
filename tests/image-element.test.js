import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scene } from "../lib/scene.js";
import { imageElement } from "../lib/elements.js";
import { PROJECT_ROOT } from "../lib/config.js";

const BILD = path.join(PROJECT_ROOT, "tests", "fixtures", "testbild.png");
const SHA1 = crypto.createHash("sha1").update(fs.readFileSync(BILD)).digest("hex");

describe("frame.image", () => {
  it("baut ein image-Element mit SHA-1 als fileId", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const bild = f.image(BILD, { x: 100, y: 100, breite: 400 });
    expect(bild.element.type).toBe("image");
    expect(bild.element.fileId).toBe(SHA1);
    expect(bild.element.status).toBeDefined();
    expect(bild.element.scale).toEqual([1, 1]);
    expect(bild.element.crop).toBe(null);
  });

  it("übernimmt das Seitenverhältnis aus den echten Bildmaßen", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const bild = f.image(BILD, { x: 100, y: 100, breite: 400 });
    // testbild ist 8x8 (quadratisch) → Höhe = Breite
    expect(bild.element.height).toBeCloseTo(bild.element.width, 5);
  });

  it("trägt das Bild in die Embedded-Files-Sammlung ein", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.image(BILD, { x: 100, y: 100 });
    const embeds = s.embeddedFiles();
    expect(embeds.has(SHA1)).toBe(true);
    expect(embeds.get(SHA1).dataURL).toMatch(/^data:image\/png;base64,/);
  });

  it("ist deterministisch", () => {
    const baue = () => {
      const s = scene();
      const f = s.frame("K");
      f.image(BILD, { x: 0, y: 0, breite: 400 });
      return JSON.stringify(s.elements());
    };
    expect(baue()).toBe(baue());
  });
});

describe("imageElement mit nicht unterstütztem Bildformat", () => {
  it("wirft einen Fehler statt das Bild fälschlich als PNG zu beschriften", () => {
    // Gleicher Byte-Inhalt wie das PNG-Testbild, nur mit .svg-Endung — es geht
    // hier nur um die Endungsprüfung, nicht um einen echten SVG-Inhalt.
    const svgPfad = path.join(os.tmpdir(), `testbild-${process.pid}.svg`);
    fs.copyFileSync(BILD, svgPfad);
    try {
      expect(() => imageElement({ pfad: svgPfad, x: 0, y: 0, ordnung: 0 })).toThrow(
        /Nicht unterstütztes Bildformat ".svg"/,
      );
    } finally {
      fs.unlinkSync(svgPfad);
    }
  });
});
