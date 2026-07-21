import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRenderer } from "../lib/render.js";
import { extractDrawing } from "../lib/compress.js";
import { VAULT_PATH } from "../lib/config.js";

const REFERENZ = path.join(VAULT_PATH, "Excalidraw", "Skill-Test Stufe 1.excalidraw.md");

describe("Frame-Rendering", () => {
  let renderer;
  let szene;

  beforeAll(async () => {
    szene = JSON.parse(extractDrawing(fs.readFileSync(REFERENZ, "utf8")).json);
    renderer = await createRenderer();
  }, 60_000);

  afterAll(async () => {
    await renderer?.close();
  });

  it("findet die Frame-Namen der Szene", () => {
    const namen = renderer.frameNames(szene);
    expect(namen.length).toBe(2);
    expect(namen.every((n) => typeof n === "string" && n.length > 0)).toBe(true);
  });

  it("rendert einen einzelnen Frame in Beamer-Auflösung", async () => {
    const [erster] = renderer.frameNames(szene);
    const png = await renderer.renderFrame(szene, erster, { breite: 1920, hoehe: 1080 });
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(png.length).toBeGreaterThan(5000);
  }, 30_000);

  it("liefert für verschiedene Frames verschiedene Bilder", async () => {
    const [a, b] = renderer.frameNames(szene);
    const bildA = await renderer.renderFrame(szene, a, { breite: 960, hoehe: 540 });
    const bildB = await renderer.renderFrame(szene, b, { breite: 960, hoehe: 540 });
    expect(bildA.equals(bildB)).toBe(false);
  }, 30_000);

  it("meldet einen unbekannten Frame-Namen verständlich", async () => {
    await expect(renderer.renderFrame(szene, "Gibt es nicht", {})).rejects.toThrow(/Gibt es nicht/);
  }, 30_000);
});
