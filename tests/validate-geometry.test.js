import { describe, it, expect } from "vitest";
import { createFindings } from "../lib/validate/findings.js";
import { checkGeometry } from "../lib/validate/layout.js";
import { scene } from "../lib/scene.js";
import { ABSTAND } from "../lib/style.js";

function pruefe(elemente) {
  const befunde = createFindings();
  checkGeometry(elemente, befunde);
  return befunde.all();
}

describe("checkGeometry", () => {
  it("akzeptiert zwei Kästen mit Abstand", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Eins", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    f.box("Zwei", { rolle: "kern", typo: "kernbegriff", x: 100, y: 600 });
    expect(pruefe(s.elements())).toEqual([]);
  });

  it("meldet zwei überlappende Kästen", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Eins", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    f.box("Zwei", { rolle: "kern", typo: "kernbegriff", x: 110, y: 110 });
    const befunde = pruefe(s.elements());
    expect(befunde.some((b) => b.regel === "ueberlappung" && b.schwere === "warnung")).toBe(true);
  });

  it("wertet Container und gebundenen Text nicht als Überlappung", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    expect(pruefe(s.elements()).filter((b) => b.regel === "ueberlappung")).toEqual([]);
  });

  it("meldet zwei überlappende Kästen mit gebundenem Text nur einmal", () => {
    // Ohne den Ausschluss gebundenen Texts würde eine einzige Überlappung
    // zweier Kästen bis zu vier Meldungen erzeugen (Kasten/Kasten,
    // Kasten/Text, Text/Kasten, Text/Text) — diese Regression fängt genau das.
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Eins", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    f.box("Zwei", { rolle: "kern", typo: "kernbegriff", x: 110, y: 110 });
    const treffer = pruefe(s.elements()).filter((b) => b.regel === "ueberlappung");
    expect(treffer.length).toBe(1);
  });

  it("meldet ein Kind, das über seinen Frame hinausragt", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Weit draußen", { rolle: "kern", typo: "kernbegriff", x: 1850, y: 100 });
    const befunde = pruefe(s.elements());
    expect(befunde.some((b) => b.regel === "framegrenze")).toBe(true);
  });

  it("meldet zwei zu eng stehende Frames", () => {
    const s = scene();
    s.frame("Erstes");
    s.frame("Zweites", { x: 1920 + ABSTAND.frames - 40, y: 0 });
    const befunde = pruefe(s.elements());
    expect(befunde.some((b) => b.regel === "frameabstand")).toBe(true);
  });

  it("akzeptiert den vorgesehenen Frame-Abstand", () => {
    const s = scene();
    s.frame("Erstes");
    s.frame("Zweites");
    expect(pruefe(s.elements()).filter((b) => b.regel === "frameabstand")).toEqual([]);
  });
});
