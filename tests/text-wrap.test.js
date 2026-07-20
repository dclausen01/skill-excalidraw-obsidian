import { describe, it, expect } from "vitest";
import { wrapText, measureText, measureLine } from "../lib/text.js";
import { loadFontRegistry, EXCALIFONT, NUNITO } from "../lib/fonts.js";

const register = loadFontRegistry();

describe("wrapText", () => {
  it("bricht an Leerzeichen um", () => {
    const zeilen = wrapText("Der Mensch ist ein Mängelwesen", NUNITO, 24, 200, register);
    expect(zeilen.length).toBeGreaterThan(1);
    for (const zeile of zeilen) {
      expect(measureLine(zeile, NUNITO, 24, register)).toBeLessThanOrEqual(200);
    }
  });

  it("erhält vorhandene Zeilenumbrüche", () => {
    expect(wrapText("A\nB", NUNITO, 24, 1000, register)).toEqual(["A", "B"]);
  });

  it("bricht ein einzelnes überlanges Wort zeichenweise", () => {
    const zeilen = wrapText("Donaudampfschifffahrtsgesellschaft", NUNITO, 24, 80, register);
    expect(zeilen.length).toBeGreaterThan(1);
    for (const zeile of zeilen) {
      expect(measureLine(zeile, NUNITO, 24, register)).toBeLessThanOrEqual(80);
    }
  });

  it("gibt bei ausreichender Breite eine einzige Zeile zurück", () => {
    expect(wrapText("Kurz", EXCALIFONT, 20, 1000, register)).toEqual(["Kurz"]);
  });
});

describe("measureText", () => {
  it("nimmt die breiteste Zeile als Gesamtbreite", () => {
    const { breite, zeilen } = measureText("kurz\nsehr viel laenger", { fontFamily: NUNITO, fontSize: 24 }, register);
    expect(zeilen).toHaveLength(2);
    expect(breite).toBeCloseTo(measureLine("sehr viel laenger", NUNITO, 24, register), 5);
  });

  it("berechnet die Höhe aus Zeilenzahl und schriftabhängiger Zeilenhöhe", () => {
    const { hoehe } = measureText("A\nB\nC", { fontFamily: NUNITO, fontSize: 20 }, register);
    expect(hoehe).toBeCloseTo(3 * 20 * 1.35, 5);
  });

  it("verwendet für Excalifont die Zeilenhöhe 1.25", () => {
    const { hoehe } = measureText("A", { fontFamily: EXCALIFONT, fontSize: 20 }, register);
    expect(hoehe).toBeCloseTo(25, 5);
  });
});
