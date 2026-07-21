import { describe, it, expect } from "vitest";
import { textElement, boxElement, frameElement } from "../lib/elements.js";
import { loadFontRegistry } from "../lib/fonts.js";
import { FARBROLLEN, FRAME_BREITE, FRAME_HOEHE } from "../lib/style.js";

const register = loadFontRegistry();

describe("textElement", () => {
  it("übernimmt Größe und Schrift aus der Typo-Rolle", () => {
    const el = textElement({ inhalt: "Mängelwesen", typo: "kernbegriff", x: 0, y: 0, ordnung: 0 }, register);
    expect(el.type).toBe("text");
    expect(el.fontSize).toBe(36);
    expect(el.fontFamily).toBe(5);
    expect(el.lineHeight).toBe(1.25);
  });

  it("berechnet die Höhe aus Zeilenzahl und Zeilenhöhe", () => {
    const el = textElement({ inhalt: "A\nB", typo: "standard", x: 0, y: 0, ordnung: 0 }, register);
    expect(el.height).toBeCloseTo(2 * 24 * 1.35, 5);
  });

  it("führt text, rawText und originalText gleichlautend", () => {
    const el = textElement({ inhalt: "Hallo", typo: "standard", x: 0, y: 0, ordnung: 0 }, register);
    expect(el.rawText).toBe("Hallo");
    expect(el.originalText).toBe("Hallo");
  });
});

describe("boxElement", () => {
  it("verbindet Container und Text beidseitig", () => {
    const { container, text } = boxElement(
      { inhalt: "Kern", rolle: "kern", typo: "kernbegriff", x: 0, y: 0, ordnung: 0 }, register,
    );
    expect(text.containerId).toBe(container.id);
    expect(container.boundElements).toEqual([{ id: text.id, type: "text" }]);
  });

  it("nimmt die Farben aus der Rolle", () => {
    const { container } = boxElement(
      { inhalt: "Kern", rolle: "kern", typo: "kernbegriff", x: 0, y: 0, ordnung: 0 }, register,
    );
    expect(container.strokeColor).toBe(FARBROLLEN.kern.strich);
    expect(container.backgroundColor).toBe(FARBROLLEN.kern.fuellung);
  });

  it("umschließt den Text mit Rand, wenn keine Größe vorgegeben ist", () => {
    const { container, text } = boxElement(
      { inhalt: "Kern", rolle: "kern", typo: "kernbegriff", x: 0, y: 0, ordnung: 0 }, register,
    );
    expect(container.width).toBeGreaterThan(text.width);
    expect(container.height).toBeGreaterThan(text.height);
  });

  it("ist deterministisch", () => {
    const bauen = () => boxElement(
      { inhalt: "Kern", rolle: "kern", typo: "kernbegriff", x: 0, y: 0, ordnung: 0 }, register,
    );
    expect(JSON.stringify(bauen())).toBe(JSON.stringify(bauen()));
  });
});

describe("frameElement", () => {
  it("hat standardmäßig Beamer-Format", () => {
    const f = frameElement({ name: "Kapitel 1", x: 0, y: 0, ordnung: 0 });
    expect(f.type).toBe("frame");
    expect(f.width).toBe(FRAME_BREITE);
    expect(f.height).toBe(FRAME_HOEHE);
    expect(f.name).toBe("Kapitel 1");
  });
});
