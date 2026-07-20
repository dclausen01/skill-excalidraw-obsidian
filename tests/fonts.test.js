import { describe, it, expect } from "vitest";
import { loadFontRegistry, EXCALIFONT, NUNITO, LINE_HEIGHT } from "../lib/fonts.js";

const register = loadFontRegistry();

describe("Schriftregister", () => {
  it("kennt die Zeilenhöhe beider Schriften", () => {
    expect(LINE_HEIGHT[EXCALIFONT]).toBe(1.25);
    expect(LINE_HEIGHT[NUNITO]).toBe(1.35);
  });

  it("findet ein Subset für lateinische Buchstaben", () => {
    expect(register.fontFor("A".codePointAt(0), EXCALIFONT)).toBeTruthy();
    expect(register.fontFor("A".codePointAt(0), NUNITO)).toBeTruthy();
  });

  it("findet ein Subset für deutsche Umlaute", () => {
    for (const zeichen of ["ä", "ö", "ü", "ß", "Ä"]) {
      expect(register.fontFor(zeichen.codePointAt(0), EXCALIFONT)).toBeTruthy();
    }
  });

  it("liefert eine plausible Em-Größe", () => {
    expect(register.unitsPerEm(EXCALIFONT)).toBeGreaterThan(0);
  });

  it("meldet ein nicht abgedecktes Zeichen verständlich", () => {
    // Ein Zeichen aus der privaten Nutzungszone deckt keine Schrift ab.
    expect(() => register.fontFor(0xf8ff, EXCALIFONT)).toThrow(/Zeichen/);
  });
});
