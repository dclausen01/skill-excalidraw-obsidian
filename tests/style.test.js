import { describe, it, expect } from "vitest";
import { FARBROLLEN, TYPO, zoomL0, titelGroesse, istLesbar, FRAME_BREITE } from "../lib/style.js";
import { EXCALIFONT, NUNITO } from "../lib/fonts.js";

describe("Farbrollen", () => {
  it("umfasst genau die sieben vereinbarten Rollen", () => {
    expect(Object.keys(FARBROLLEN).sort()).toEqual(
      ["ergebnis", "frage", "kern", "kontext", "kontra", "neutral", "technik"],
    );
  });

  it("führt die vereinbarten Werte für 'kern'", () => {
    expect(FARBROLLEN.kern).toEqual({ strich: "#1971c2", fuellung: "#a5d8ff" });
  });
});

describe("Typo-Skala", () => {
  it("verwendet Excalifont für Titel und Nunito für Fließtext", () => {
    expect(TYPO.frametitel.fontFamily).toBe(EXCALIFONT);
    expect(TYPO.standard.fontFamily).toBe(NUNITO);
  });
});

describe("zoomL0", () => {
  it("ist 1 für ein Board von Frame-Größe", () => {
    expect(zoomL0(FRAME_BREITE, 1080)).toBeCloseTo(1, 5);
  });

  it("sinkt bei einem Board aus 3x2 Kapiteln auf etwa 0,31", () => {
    // 3 Frames + 2 Lücken à 240 = 6240 breit; 2 Frames + 1 Lücke = 2400 hoch
    expect(zoomL0(6240, 2400)).toBeCloseTo(0.31, 2);
  });
});

describe("titelGroesse", () => {
  it("hält die Untergrenze bei kleinen Boards ein", () => {
    expect(titelGroesse(72, 1)).toBe(72);
  });

  it("wächst, wenn die Untergrenze auf L0 unlesbar wäre", () => {
    const zoom = zoomL0(8160, 3480);          // 4x3 Kapitel
    const groesse = titelGroesse(72, zoom);
    expect(groesse).toBeGreaterThan(72);
    expect(istLesbar(groesse, zoom)).toBe(true);
  });

  it("liefert Vielfache von 4", () => {
    expect(titelGroesse(72, 0.23) % 4).toBe(0);
  });
});
