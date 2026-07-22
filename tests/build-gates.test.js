import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { PROJECT_ROOT } from "../lib/config.js";

function laufe(argumente, envUeberschreibung = {}) {
  try {
    const ausgabe = execFileSync("node", [path.join(PROJECT_ROOT, "bin", "build.mjs"), ...argumente], {
      cwd: PROJECT_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...envUeberschreibung },
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

  it("meldet einen Renderfehler als eine deutsche Zeile statt als Stack-Trace und schreibt nichts", () => {
    const skript = path.join(tmp, "render-fehler.mjs");
    fs.writeFileSync(skript, `
      import { scene } from "${path.join(PROJECT_ROOT, "lib", "scene.js")}";
      const s = scene();
      const f = s.frame("Kapitel");
      f.text("Titel", { typo: "frametitel", x: 60, y: 60 });
      f.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 200, y: 400 });
      export default s;
    `);
    const ziel = path.join(tmp, "render-fehler.excalidraw.md");

    // Zwingt den Bereitschafts-Check des Renderers, schnell und deterministisch
    // zu scheitern (siehe lib/render.js / render.test.js) — simuliert realistisch
    // einen Renderabsturz, ohne echte Dateien oder das Netz anzufassen.
    const { code, ausgabe } = laufe([skript, ziel], {
      RENDERER_TEST_READY_PROP: "__wird_nie_gesetzt__",
      RENDERER_TEST_READY_TIMEOUT_MS: "1000",
    });

    expect(code).not.toBe(0);
    expect(ausgabe).toMatch(/Abbruch: Rendering fehlgeschlagen/);
    expect(ausgabe).not.toMatch(/at file:|at async|node:internal/, "Es soll eine freundliche Zeile sein, kein Stack-Trace");
    expect(fs.existsSync(ziel), "Bei einem Renderfehler darf keine Datei entstehen").toBe(false);
  }, 20_000);

  it("meldet einen Schreibfehler in den Vault als eine deutsche Zeile statt als Stack-Trace", () => {
    const skript = path.join(tmp, "schreib-fehler.mjs");
    fs.writeFileSync(skript, `
      import { scene } from "${path.join(PROJECT_ROOT, "lib", "scene.js")}";
      const s = scene();
      const f = s.frame("Kapitel");
      f.text("Titel", { typo: "frametitel", x: 60, y: 60 });
      f.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 200, y: 400 });
      export default s;
    `);

    // Erzwingt einen Schreibfehler: "blockiert" existiert bereits als Datei, also
    // kann das Zielverzeichnis nicht angelegt werden (ENOTDIR).
    const blockiert = path.join(tmp, "blockiert");
    fs.writeFileSync(blockiert, "keine Datei-Hierarchie hier möglich");
    const ziel = path.join(blockiert, "unterordner", "schreib-fehler.excalidraw.md");

    const { code, ausgabe } = laufe([skript, ziel, "--skip-render"]);

    expect(code).not.toBe(0);
    expect(ausgabe).toMatch(/Abbruch: Schreiben/);
    expect(ausgabe).not.toMatch(/at file:|at async|node:internal/, "Es soll eine freundliche Zeile sein, kein Stack-Trace");
  });
});
