import { describe, it, expect } from "vitest";
import { measureLine, wrapText, estimatedCharacters, FALLBACK_WIDTH } from "../lib/text.js";
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
});
