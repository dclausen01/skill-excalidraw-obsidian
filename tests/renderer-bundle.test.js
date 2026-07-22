import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../lib/config.js";

const DIST = path.join(PROJECT_ROOT, "renderer", "dist");

describe("Renderer-Bündel", () => {
  it("ist gebaut", () => {
    expect(fs.existsSync(path.join(DIST, "bundle.js")), "renderer/dist/bundle.js fehlt — npm run build-renderer ausführen").toBe(true);
    expect(fs.existsSync(path.join(DIST, "index.html"))).toBe(true);
  });

  it("legt die benötigten Funktionen offen", () => {
    const quelle = fs.readFileSync(path.join(DIST, "bundle.js"), "utf8");
    expect(quelle).toContain("ExcalidrawLib");
    expect(quelle).toContain("__excalidrawLibReady");
  });

  it("setzt den Schriftpfad, bevor das Bündel geladen wird", () => {
    const html = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
    const pfadPos = html.indexOf("EXCALIDRAW_ASSET_PATH");
    const buendelPos = html.indexOf("bundle.js");
    expect(pfadPos).toBeGreaterThan(-1);
    expect(pfadPos, "EXCALIDRAW_ASSET_PATH muss vor dem Bündel stehen").toBeLessThan(buendelPos);
  });

  it("spiegelt Excalifont und Nunito", () => {
    const dateien = fs.readdirSync(path.join(DIST, "fonts"), { recursive: true }).map(String);
    expect(dateien.some((f) => f.includes("Excalifont"))).toBe(true);
    expect(dateien.some((f) => f.includes("Nunito"))).toBe(true);
  });
});
