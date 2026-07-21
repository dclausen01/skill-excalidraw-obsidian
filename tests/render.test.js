import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRenderer } from "../lib/render.js";
import { extractDrawing } from "../lib/compress.js";
import { VAULT_PATH } from "../lib/config.js";

const REFERENZ = path.join(VAULT_PATH, "Excalidraw", "Skill-Test Stufe 1.excalidraw.md");

describe("Renderer", () => {
  let renderer;
  let szene;

  beforeAll(async () => {
    szene = JSON.parse(extractDrawing(fs.readFileSync(REFERENZ, "utf8")).json);
    renderer = await createRenderer();
  }, 60_000);

  afterAll(async () => {
    await renderer?.close();
  });

  it("liefert ein PNG des ganzen Boards", async () => {
    const png = await renderer.renderBoard(szene, { breite: 1920 });
    expect(Buffer.isBuffer(png)).toBe(true);
    // PNG-Signatur
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(png.length).toBeGreaterThan(5000);
  }, 30_000);

  it("greift zur Laufzeit nicht auf das Netz zu", () => {
    const fremd = renderer.requestedUrls().filter((u) => !u.startsWith("http://127.0.0.1") && !u.startsWith("http://localhost"));
    expect(fremd, `Fremde Anfragen: ${fremd.join(", ")}`).toEqual([]);
  });

  it("lädt die Schriften lokal, nicht von esm.sh", () => {
    const urls = renderer.requestedUrls();
    expect(urls.some((u) => u.includes("esm.sh"))).toBe(false);
    expect(urls.some((u) => u.includes(".woff2"))).toBe(true);
  });

  it("ist reproduzierbar", async () => {
    const a = await renderer.renderBoard(szene, { breite: 800 });
    const b = await renderer.renderBoard(szene, { breite: 800 });
    expect(a.equals(b)).toBe(true);
  }, 30_000);
});
