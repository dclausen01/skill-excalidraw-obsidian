import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { PROJECT_ROOT } from "../lib/config.js";

function laufe(argumente) {
  try {
    const ausgabe = execFileSync("node", [path.join(PROJECT_ROOT, "bin", "build.mjs"), ...argumente], {
      cwd: PROJECT_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, ausgabe };
  } catch (fehler) {
    return { code: fehler.status, ausgabe: `${fehler.stdout ?? ""}${fehler.stderr ?? ""}` };
  }
}

describe("build-Gates", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "build-gates-"));

  it("schreibt nichts, wenn die Szene harte Fehler hat", () => {
    const skript = path.join(tmp, "kaputt.mjs");
    // Zwei Elemente mit derselben ID: verletzt die Eindeutigkeit.
    fs.writeFileSync(skript, `
      import { scene } from "${path.join(PROJECT_ROOT, "lib", "scene.js")}";
      const s = scene();
      const f = s.frame("Kapitel");
      f.box("Eins", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
      const echte = s.elements;
      s.elements = () => { const alle = echte(); alle[1].id = alle[0].id; return alle; };
      export default s;
    `);
    const ziel = path.join(tmp, "kaputt.excalidraw.md");
    const { code, ausgabe } = laufe([skript, ziel, "--skip-render"]);

    expect(code).not.toBe(0);
    expect(ausgabe).toMatch(/Fehler/);
    expect(fs.existsSync(ziel), "Bei harten Fehlern darf keine Datei entstehen").toBe(false);
  });

  it("schreibt bei einer sauberen Szene", () => {
    const skript = path.join(tmp, "sauber.mjs");
    fs.writeFileSync(skript, `
      import { scene } from "${path.join(PROJECT_ROOT, "lib", "scene.js")}";
      const s = scene();
      const f = s.frame("Kapitel");
      f.text("Titel", { typo: "frametitel", x: 60, y: 60 });
      f.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 200, y: 400 });
      export default s;
    `);
    const ziel = path.join(tmp, "sauber.excalidraw.md");
    const { code } = laufe([skript, ziel, "--skip-render"]);

    expect(code).toBe(0);
    expect(fs.existsSync(ziel)).toBe(true);
    expect(fs.readFileSync(ziel, "utf8")).toContain("excalidraw-plugin: parsed");
  });
});
