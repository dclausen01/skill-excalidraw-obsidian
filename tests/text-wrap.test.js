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

  // Fix-Durchgang 1 (Review-Finding 1): wrapText war nicht content-preserving —
  // ein führendes Leerzeichen wurde verschluckt, weil der Zeilen-Akkumulator
  // per Falsy-Check ("zeile ? ... : wort") statt per expliziter
  // Start-Markierung geprüft wurde. Eine leere Zeichenkette ist in JS falsy,
  // obwohl sie hier ein bereits konsumiertes führendes Leerzeichen bedeuten
  // kann — das lässt sich nicht am Wahrheitswert von `zeile`, sondern nur an
  // "wurde der Absatz schon begonnen?" unterscheiden.
  it("erhält ein führendes Leerzeichen, wenn kein Umbruch nötig ist", () => {
    expect(wrapText(" Hello World", NUNITO, 24, 1000, register)).toEqual([" Hello World"]);
  });

  it("erhält ein führendes Leerzeichen auf einem späteren Absatz", () => {
    expect(wrapText("A\n B", NUNITO, 24, 1000, register)).toEqual(["A", " B"]);
  });

  it("erhält eine Zeile, die nur aus Leerzeichen besteht", () => {
    expect(wrapText("   ", NUNITO, 24, 1000, register)).toEqual(["   "]);
  });

  it("liefert bei leerem Text eine einzelne leere Zeile", () => {
    expect(wrapText("", NUNITO, 24, 1000, register)).toEqual([""]);
  });

  it("erhält nachgestellte Leerzeichen", () => {
    expect(wrapText("hello ", NUNITO, 24, 1000, register)).toEqual(["hello "]);
  });

  it("erhält mehrere aufeinanderfolgende Leerzeichen zwischen Wörtern", () => {
    expect(wrapText("a  b", NUNITO, 24, 1000, register)).toEqual(["a  b"]);
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

  it("berücksichtigt ein führendes Leerzeichen in der Breite, wenn maxBreite gesetzt ist", () => {
    const { breite, zeilen } = measureText(" Hi", { fontFamily: NUNITO, fontSize: 24, maxBreite: 1000 }, register);
    expect(zeilen).toEqual([" Hi"]);
    expect(breite).toBeCloseTo(measureLine(" Hi", NUNITO, 24, register), 5);
  });
});
