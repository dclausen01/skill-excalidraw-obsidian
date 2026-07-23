import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";
import { sceneToMarkdown } from "../lib/document.js";

describe("frame.transclusion", () => {
  it("erzeugt ein Textelement mit dem Verweis als rawText", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const t = f.transclusion("[[Mängelwesen#Definition]]", { x: 100, y: 100, breite: 600 });
    expect(t.type).toBe("text");
    expect(t.rawText).toBe("[[Mängelwesen#Definition]]");
    expect(t.originalText).toBe("[[Mängelwesen#Definition]]");
  });

  it("erscheint in der ## Text Elements-Sektion", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const t = f.transclusion("[[N#A]]", { x: 100, y: 100, breite: 600 });
    const md = sceneToMarkdown(s, { pluginVersion: "x" });
    expect(md).toContain(`[[N#A]] ^${t.id}`);
  });

  it("bleibt deterministisch", () => {
    const baue = () => {
      const s = scene();
      s.frame("K").transclusion("[[N#A]]", { x: 0, y: 0, breite: 600 });
      return JSON.stringify(s.elements());
    };
    expect(baue()).toBe(baue());
  });
});
