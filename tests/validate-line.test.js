import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";
import { sceneToMarkdown } from "../lib/document.js";
import { validateScene } from "../lib/validate/index.js";

describe("Validator kennt line", () => {
  it("akzeptiert eine Linie als bekannten Typ (kein Schema-Fehler)", () => {
    const s = scene();
    const f = s.frame("K", { x: 0, y: 0 });
    f.line([[600, 100], [600, 800]]);
    const md = sceneToMarkdown(s, { pluginVersion: "x" });
    const result = validateScene(s.elements(), { markdown: md });
    expect(result.findings.every((b) => b.regel !== "schema")).toBe(true);
  });

  it("meldet KEINE Überlappung, wenn eine Trennlinie zwischen/über Kästen liegt", () => {
    const s = scene();
    const f = s.frame("K", { x: 0, y: 0 });
    f.box("A", { rolle: "kern", typo: "kernbegriff", x: 100, y: 300 });
    f.box("B", { rolle: "kern", typo: "kernbegriff", x: 700, y: 300 });
    f.line([[650, 250], [650, 500]]);         // senkrecht zwischen A und B, überlappt bbox-technisch nichts Echtes
    const result = validateScene(s.elements(), {});
    expect(result.findings.some((b) => b.regel === "ueberlappung")).toBe(false);
  });

  it("warnt weiterhin bei echter Kasten-Überlappung", () => {
    const s = scene();
    const f = s.frame("K", { x: 0, y: 0 });
    f.box("A", { rolle: "kern", typo: "kernbegriff", x: 100, y: 300, breite: 400, hoehe: 200 });
    f.box("B", { rolle: "kern", typo: "kernbegriff", x: 200, y: 350, breite: 400, hoehe: 200 });
    const result = validateScene(s.elements(), {});
    expect(result.findings.some((b) => b.regel === "ueberlappung")).toBe(true);
  });
});
