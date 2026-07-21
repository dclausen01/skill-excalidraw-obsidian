import { describe, it, expect } from "vitest";
import { createFindings } from "../lib/validate/findings.js";
import { checkTextFit, checkLegibility } from "../lib/validate/layout.js";
import { scene } from "../lib/scene.js";
import { loadFontRegistry } from "../lib/fonts.js";

const register = loadFontRegistry();

function pruefeFit(elemente) {
  const befunde = createFindings();
  checkTextFit(elemente, register, befunde);
  return befunde.all();
}

function pruefeLesbar(elemente, zoom) {
  const befunde = createFindings();
  checkLegibility(elemente, zoom, befunde);
  return befunde.all();
}

describe("checkTextFit", () => {
  it("akzeptiert automatisch dimensionierte Formen", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Mängelwesen", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    f.ellipse("Entlastung", { rolle: "ergebnis", typo: "kernbegriff", x: 100, y: 500 });
    f.diamond("Frage?", { rolle: "frage", typo: "kernbegriff", x: 800, y: 500 });
    expect(pruefeFit(s.elements())).toEqual([]);
  });

  it("meldet einen Container, der zu niedrig für seinen Text ist", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Ein recht langer Satz, der umbrechen muss", {
      rolle: "kern", typo: "standard", x: 100, y: 100, breite: 300, hoehe: 40,
    });
    const befunde = pruefeFit(s.elements());
    expect(befunde.some((b) => b.regel === "textpassung" && b.schwere === "warnung")).toBe(true);
  });
});

describe("checkLegibility", () => {
  it("akzeptiert die Standardgrößen auf L1", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.text("Titel", { typo: "frametitel", x: 40, y: 40 });
    f.box("Fließtext", { rolle: "neutral", typo: "standard", x: 100, y: 300 });
    expect(pruefeLesbar(s.elements(), s.dimensions().zoomL0).filter((b) => b.regel === "lesbarkeit-l1")).toEqual([]);
  });

  it("meldet Text unter der L1-Schwelle", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.text("Quellenangabe", { typo: "fussnote", x: 40, y: 40 });
    const befunde = pruefeLesbar(s.elements(), s.dimensions().zoomL0);
    expect(befunde.some((b) => b.regel === "lesbarkeit-l1")).toBe(true);
  });

  it("meldet ein Board ohne jede auf L0 lesbare Beschriftung", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Nur Fließtext", { rolle: "neutral", typo: "standard", x: 100, y: 100 });
    // Zoomfaktor eines sehr großen Boards
    const befunde = pruefeLesbar(s.elements(), 0.1);
    expect(befunde.some((b) => b.regel === "lesbarkeit-l0")).toBe(true);
  });

  it("meldet nichts, wenn ein Frame-Titel auf L0 trägt", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.text("Großer Titel", { typo: "frametitel", x: 40, y: 40 });
    const befunde = pruefeLesbar(s.elements(), 0.3);
    expect(befunde.filter((b) => b.regel === "lesbarkeit-l0")).toEqual([]);
  });
});
