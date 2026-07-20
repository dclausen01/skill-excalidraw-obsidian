import { describe, it, expect } from "vitest";
import {
  FARBROLLEN,
  TYPO,
  zoomL0,
  titelGroesse,
  istLesbar,
  FRAME_BREITE,
  FRAME_HOEHE,
  LESBARKEIT_MIN,
  BASIS,
  ABSTAND,
  STRICH,
  ZOOM,
} from "../lib/style.js";
import { EXCALIFONT, NUNITO } from "../lib/fonts.js";

describe("Farbrollen", () => {
  it("umfasst genau die sieben vereinbarten Rollen", () => {
    expect(Object.keys(FARBROLLEN).sort()).toEqual(
      ["ergebnis", "frage", "kern", "kontext", "kontra", "neutral", "technik"],
    );
  });

  it("führt die vereinbarten Hex-Werte für alle Rollen", () => {
    const expected = {
      neutral: { strich: "#1e1e1e", fuellung: "#ffffff" },
      kern: { strich: "#1971c2", fuellung: "#a5d8ff" },
      kontra: { strich: "#e03131", fuellung: "#ffc9c9" },
      ergebnis: { strich: "#2f9e44", fuellung: "#b2f2bb" },
      frage: { strich: "#f08c00", fuellung: "#ffec99" },
      kontext: { strich: "#868e96", fuellung: "#f1f3f5" },
      technik: { strich: "#6741d9", fuellung: "#d0bfff" },
    };
    expect(FARBROLLEN).toEqual(expected);
  });
});

describe("Typo-Skala", () => {
  it("führt alle sechs Stile mit korrekten Werten", () => {
    const expected = {
      boardtitel: { groesse: 120, fontFamily: EXCALIFONT, stufe: "L0" },
      frametitel: { groesse: 72, fontFamily: EXCALIFONT, stufe: "L0" },
      kernbegriff: { groesse: 36, fontFamily: EXCALIFONT, stufe: "L1" },
      standard: { groesse: 24, fontFamily: NUNITO, stufe: "L1" },
      detail: { groesse: 18, fontFamily: NUNITO, stufe: "L1" },
      fussnote: { groesse: 14, fontFamily: NUNITO, stufe: "L2" },
    };
    expect(TYPO).toEqual(expected);
  });

  it("verwendet Excalifont für Titel und Nunito für Fließtext", () => {
    expect(TYPO.frametitel.fontFamily).toBe(EXCALIFONT);
    expect(TYPO.standard.fontFamily).toBe(NUNITO);
  });
});

describe("Abstand", () => {
  it("hält die vereinbarten Werte für Abstände", () => {
    expect(ABSTAND).toEqual({ eng: 40, normal: 80, weit: 160, frames: 240 });
  });
});

describe("Basis und Frame", () => {
  it("definiert BASIS als 20", () => {
    expect(BASIS).toBe(20);
  });

  it("definiert Frame-Dimensionen", () => {
    expect(FRAME_BREITE).toBe(1920);
    expect(FRAME_HOEHE).toBe(1080);
  });

  it("definiert Lesbarkeits-Minimum", () => {
    expect(LESBARKEIT_MIN).toBe(18);
  });
});

describe("Strich", () => {
  it("führt die vereinbarten Werte für Strichstil", () => {
    const expected = {
      strokeWidth: 2,
      roughness: 1,
      fillStyle: "solid",
      roundnessBox: { type: 3 },
      roundnessArrow: { type: 2 },
    };
    expect(STRICH).toEqual(expected);
  });
});

describe("Zoom", () => {
  it("definiert Zoom-Stufen", () => {
    expect(ZOOM).toEqual({ L1: 1.0, L2: 2.5 });
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
