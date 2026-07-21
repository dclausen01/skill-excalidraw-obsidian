import { describe, it, expect } from "vitest";
import { measureLine, wrapText, measureText, estimatedCharacters, FALLBACK_WIDTH } from "../lib/text.js";
import { loadFontRegistry, EXCALIFONT } from "../lib/fonts.js";

const register = loadFontRegistry();

describe("Ersatzbreite für nicht abgedeckte Zeichen", () => {
  it("wirft nicht mehr bei einem Paragraphenzeichen", () => {
    expect(() => measureLine("§ 3 Abs. 2", EXCALIFONT, 20, register)).not.toThrow();
  });

  it("wirft nicht mehr bei einem Emoji", () => {
    expect(() => measureLine("Ziel 🌐 erreicht", EXCALIFONT, 20, register)).not.toThrow();
  });

  it("rechnet abgedeckte Zeichen unverändert", () => {
    // Referenzwert aus dem Vault, muss exakt gleich bleiben
    expect(measureLine("Feline", EXCALIFONT, 20, register)).toBeCloseTo(53.8, 1);
  });

  it("schätzt Emoji breiter als ein schmales Satzzeichen", () => {
    const emoji = measureLine("🌐", EXCALIFONT, 20, register);
    const paragraf = measureLine("§", EXCALIFONT, 20, register);
    expect(emoji).toBeGreaterThan(paragraf);
  });

  it("skaliert die Ersatzbreite mit der Schriftgröße", () => {
    const klein = measureLine("🌐", EXCALIFONT, 20, register);
    const gross = measureLine("🌐", EXCALIFONT, 40, register);
    expect(gross).toBeCloseTo(klein * 2, 5);
  });

  it("benennt die geschätzten Zeichen", () => {
    expect(estimatedCharacters("§ 3 🌐", EXCALIFONT, register)).toEqual(["§", "🌐"]);
  });

  it("meldet nichts, wenn alles abgedeckt ist", () => {
    expect(estimatedCharacters("Mängelwesen", EXCALIFONT, register)).toEqual([]);
  });

  it("bleibt deterministisch", () => {
    const a = measureLine("§ 3 🌐", EXCALIFONT, 20, register);
    const b = measureLine("§ 3 🌐", EXCALIFONT, 20, register);
    expect(a).toBe(b);
  });

  it("FALLBACK_WIDTH ist relativ zur Schriftgröße definiert (Faktor, keine Pixel)", () => {
    expect(FALLBACK_WIDTH.emoji).toBeGreaterThan(0);
    expect(FALLBACK_WIDTH.standard).toBeGreaterThan(0);
    expect(FALLBACK_WIDTH.emoji).toBeGreaterThan(FALLBACK_WIDTH.standard);
  });

  it("wrapText wirft nicht mehr bei nicht abgedeckten Zeichen und liefert Zeilen", () => {
    const zeilen = wrapText("Ziel 🌐 § erreicht und noch mehr Text hier", EXCALIFONT, 20, 100, register);
    expect(() => zeilen).not.toThrow();
    expect(zeilen.length).toBeGreaterThan(0);
    expect(zeilen.join(" ")).toContain("🌐");
  });

  describe("Fix-Durchgang 1, Finding 1: Emoji-Klassifikation über Unicode-Property statt Codepoint-Schwelle", () => {
    it("klassifiziert BMP-Emoji (❤ ✅ ⭐ ☀) als emoji, nicht als standard", () => {
      for (const zeichen of ["❤", "✅", "⭐", "☀"]) {
        const breite = measureLine(zeichen, EXCALIFONT, 20, register);
        expect(breite).toBeCloseTo(FALLBACK_WIDTH.emoji * 20, 5);
      }
    });

    it("klassifiziert einen nicht-emoji astralen Codepoint (Mathematical Alphanumeric Symbol) als standard, nicht als emoji", () => {
      const zeichen = String.fromCodePoint(0x1d400); // MATHEMATICAL BOLD CAPITAL A
      const breite = measureLine(zeichen, EXCALIFONT, 20, register);
      expect(breite).toBeCloseTo(FALLBACK_WIDTH.standard * 20, 5);
    });

    it("zählt eine Flaggen-Sequenz (zwei Regional-Indicator-Codepoints) als ein Graphem, nicht doppelt", () => {
      const flagge = "\u{1F1E9}\u{1F1EA}"; // 🇩🇪, zwei Codepoints, ein gerendertes Glyph
      const einzelzeichen = measureLine("\u{1F1E9}", EXCALIFONT, 20, register);
      const breiteFlagge = measureLine(flagge, EXCALIFONT, 20, register);
      // Eine Flagge darf nicht doppelt so breit sein wie ein einzelner Regional-Indicator-Codepoint,
      // obwohl sie aus zwei Codepoints besteht — sie ist EIN Graphemcluster.
      expect(breiteFlagge).toBeCloseTo(einzelzeichen, 5);
      expect(breiteFlagge).not.toBeCloseTo(einzelzeichen * 2, 5);
    });

    it("zählt eine ZWJ-Sequenz (Familie) als ein Graphem", () => {
      const familie = "\u{1F468}‍\u{1F469}‍\u{1F467}"; // 👨‍👩‍👧, drei Emoji + zwei ZWJ = 1 Cluster
      const breite = measureLine(familie, EXCALIFONT, 20, register);
      expect(breite).toBeCloseTo(FALLBACK_WIDTH.emoji * 20, 5);
    });
  });

  describe("Fix-Durchgang 1, Finding 2: estimatedCharacters dedupliziert", () => {
    it("liefert ein wiederholtes nicht abgedecktes Zeichen nur einmal, in Reihenfolge des ersten Auftretens", () => {
      expect(estimatedCharacters("§§", EXCALIFONT, register)).toEqual(["§"]);
    });

    it("dedupliziert auch bei mehreren verschiedenen wiederholten Zeichen, Reihenfolge bleibt ersteintreffend", () => {
      expect(estimatedCharacters("🌐§🌐§", EXCALIFONT, register)).toEqual(["🌐", "§"]);
    });
  });

  describe("Fix-Durchgang 1, Finding 3: measureText direkt getestet", () => {
    it("liefert breite/hoehe/zeilen ohne maxBreite bei Text mit nicht abgedecktem Zeichen", () => {
      const ergebnis = measureText("Ziel 🌐 erreicht", { fontFamily: EXCALIFONT, fontSize: 20 }, register);
      expect(ergebnis.zeilen).toEqual(["Ziel 🌐 erreicht"]);
      expect(ergebnis.breite).toBeCloseTo(measureLine("Ziel 🌐 erreicht", EXCALIFONT, 20, register), 5);
      expect(ergebnis.hoehe).toBeGreaterThan(0);
    });

    it("bricht um und liefert breite/hoehe/zeilen mit maxBreite bei Text mit nicht abgedecktem Zeichen", () => {
      const ergebnis = measureText(
        "Ziel 🌐 § erreicht und noch mehr Text hier",
        { fontFamily: EXCALIFONT, fontSize: 20, maxBreite: 100 },
        register,
      );
      expect(ergebnis.zeilen.length).toBeGreaterThan(1);
      expect(ergebnis.zeilen.join(" ")).toContain("🌐");
      for (const zeile of ergebnis.zeilen) {
        expect(measureLine(zeile, EXCALIFONT, 20, register)).toBeLessThanOrEqual(100 + 1e-6);
      }
      expect(ergebnis.hoehe).toBeCloseTo(ergebnis.zeilen.length * 20 * 1.25, 5);
    });
  });
});
