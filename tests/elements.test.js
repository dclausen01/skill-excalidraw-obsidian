import { describe, it, expect } from "vitest";
import { textElement, boxElement, ellipseElement, diamondElement, frameElement } from "../lib/elements.js";
import { loadFontRegistry } from "../lib/fonts.js";
import { FARBROLLEN, FRAME_BREITE, FRAME_HOEHE, FRAME_STRICH } from "../lib/style.js";

/** ~100 Zeichen, erzwingt bei breite: 200 mehrfachen Umbruch. */
const LANGER_SATZ =
  "Dies ist ein Beispielsatz mit ungefaehr hundert Zeichen, der in einem schmalen Kasten mehrfach umbricht.";

/** Ein langes, leerzeichenfreies Wort — kann nicht durch Zeilenumbruch schmaler werden. */
const LANGES_WORT = "Photosynthesegleichgewicht";

function umschliesst(container, text) {
  return (
    text.x >= container.x &&
    text.x + text.width <= container.x + container.width &&
    text.y >= container.y &&
    text.y + text.height <= container.y + container.height
  );
}

/**
 * Unabhängig von lib/elements.js nachgebaute Excalidraw-Geometrie (Quelle:
 * @excalidraw/excalidraw, element/textElement.ts — getContainerCoords,
 * getBoundTextMaxWidth, getBoundTextMaxHeight) für rectangle/ellipse/diamond.
 * Absichtlich eine zweite, eigenständige Implementierung derselben Formeln —
 * ein Test, der dieselbe Helper-Funktion wie die Implementierung importiert,
 * würde nur prüfen, dass beide Stellen sich einig sind, nicht, dass sie mit
 * Excalidraws tatsächlicher einbeschriebener Fläche übereinstimmen.
 */
const SQRT2 = Math.sqrt(2);
const PADDING = 5; // BOUND_TEXT_PADDING

function einbeschriebeneBox(container) {
  let offsetX = PADDING;
  let offsetY = PADDING;
  let maxWidth = container.width - 2 * PADDING;
  let maxHeight = container.height - 2 * PADDING;
  if (container.type === "ellipse") {
    offsetX += (container.width / 2) * (1 - SQRT2 / 2);
    offsetY += (container.height / 2) * (1 - SQRT2 / 2);
    maxWidth = Math.round((container.width / 2) * SQRT2) - 2 * PADDING;
    maxHeight = Math.round((container.height / 2) * SQRT2) - 2 * PADDING;
  }
  if (container.type === "diamond") {
    offsetX += container.width / 4;
    offsetY += container.height / 4;
    maxWidth = Math.round(container.width / 2) - 2 * PADDING;
    maxHeight = Math.round(container.height / 2) - 2 * PADDING;
  }
  return { x: container.x + offsetX, y: container.y + offsetY, width: maxWidth, height: maxHeight };
}

/** Wie umschliesst, aber gegen die einbeschriebene Fläche statt der Bounding-Box. */
function umschliesstEinbeschrieben(container, text) {
  const box = einbeschriebeneBox(container);
  return (
    text.x >= box.x &&
    text.x + text.width <= box.x + box.width &&
    text.y >= box.y &&
    text.y + text.height <= box.y + box.height
  );
}

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

  it("nimmt die Strichfarbe aus der neutralen Farbrolle statt aus einem Hex-Literal (Review-Finding 3)", () => {
    const el = textElement({ inhalt: "Hallo", typo: "standard", x: 0, y: 0, ordnung: 0 }, register);
    expect(el.strokeColor).toBe(FARBROLLEN.neutral.strich);
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

  it("meldet eine unbekannte Typo-Rolle mit derselben verständlichen Fehlermeldung wie textElement", () => {
    expect(() =>
      boxElement({ inhalt: "Kern", rolle: "kern", typo: "nichtvorhanden", x: 0, y: 0, ordnung: 0 }, register),
    ).toThrow(/Unbekannte Typo-Rolle/);
  });

  describe("Größenangaben", () => {
    it("umschließt den Text, wenn Breite und Höhe automatisch sind", () => {
      const { container, text } = boxElement(
        { inhalt: LANGER_SATZ, rolle: "kern", typo: "standard", x: 0, y: 0, ordnung: 0 }, register,
      );
      expect(umschliesst(container, text)).toBe(true);
    });

    it("umschließt den umbrochenen Text, wenn nur die Breite vorgegeben ist (Review-Finding 1)", () => {
      const { container, text } = boxElement(
        { inhalt: LANGER_SATZ, rolle: "kern", typo: "standard", x: 0, y: 0, breite: 200, ordnung: 0 }, register,
      );
      expect(text.text.split("\n").length).toBeGreaterThan(1); // Umbruch findet tatsächlich statt
      expect(umschliesst(container, text)).toBe(true);
    });

    it("umschließt den Text, wenn nur die Höhe vorgegeben ist", () => {
      const { container, text } = boxElement(
        { inhalt: "Kern", rolle: "kern", typo: "standard", x: 0, y: 0, hoehe: 200, ordnung: 0 }, register,
      );
      expect(container.height).toBe(200);
      expect(umschliesst(container, text)).toBe(true);
    });

    it("umschließt den umbrochenen Text, wenn Breite und Höhe beide vorgegeben sind", () => {
      const { container, text } = boxElement(
        {
          inhalt: LANGER_SATZ, rolle: "kern", typo: "standard", x: 0, y: 0,
          breite: 400, hoehe: 400, ordnung: 0,
        },
        register,
      );
      expect(container.width).toBe(400);
      expect(container.height).toBe(400);
      expect(umschliesst(container, text)).toBe(true);
    });
  });
});

describe("ellipseElement / diamondElement — einbeschriebene Fläche (Schlussprüfung Finding 1)", () => {
  // Die bisherige Container-Bemessung wandte für jede Form dieselbe Rechteck-Formel
  // an; Ellipse und Raute haben aber eine kleinere einbeschriebene Fläche als ihre
  // Bounding-Box, also überstand der Text die Kontur. `umschliesst` (Bounding-Box)
  // hätte das nicht erkannt — deshalb prüfen diese Tests gegen die tatsächliche
  // einbeschriebene Fläche (`umschliesstEinbeschrieben`).

  it("Ellipse umschließt automatisch bemessenen Text innerhalb der einbeschriebenen Fläche", () => {
    const { container, text } = ellipseElement(
      { inhalt: LANGES_WORT, rolle: "kern", typo: "standard", x: 0, y: 0, ordnung: 0 }, register,
    );
    expect(umschliesstEinbeschrieben(container, text)).toBe(true);
  });

  it("Raute umschließt automatisch bemessenen Text innerhalb der einbeschriebenen Fläche", () => {
    const { container, text } = diamondElement(
      { inhalt: LANGES_WORT, rolle: "kern", typo: "standard", x: 0, y: 0, ordnung: 0 }, register,
    );
    expect(umschliesstEinbeschrieben(container, text)).toBe(true);
  });

  it("Ellipse umbricht gebundenen Text an der tatsächlichen Innenbreite, wenn eine Breite vorgegeben ist", () => {
    const { container, text } = ellipseElement(
      { inhalt: LANGER_SATZ, rolle: "kern", typo: "standard", x: 0, y: 0, breite: 400, ordnung: 0 }, register,
    );
    expect(text.text.split("\n").length).toBeGreaterThan(1);
    expect(umschliesstEinbeschrieben(container, text)).toBe(true);
  });

  it("Raute umbricht gebundenen Text an der tatsächlichen Innenbreite, wenn eine Breite vorgegeben ist", () => {
    const { container, text } = diamondElement(
      { inhalt: LANGER_SATZ, rolle: "kern", typo: "standard", x: 0, y: 0, breite: 400, ordnung: 0 }, register,
    );
    expect(text.text.split("\n").length).toBeGreaterThan(1);
    expect(umschliesstEinbeschrieben(container, text)).toBe(true);
  });

  it("Rechteck behält exakt die bisherigen Maße — Beweis, dass der Fix den bereits korrekten Fall nicht verändert", () => {
    const { container, text } = boxElement(
      { inhalt: "Kern", rolle: "kern", typo: "kernbegriff", x: 0, y: 0, ordnung: 0 }, register,
    );
    expect(container.width).toBe(100);
    expect(container.height).toBe(80);
    expect(text.x).toBe(5);
    expect(text.y).toBe(17.5);
  });
});

describe("Text-IDs", () => {
  it("weist eigenständigem und gebundenem Text unterschiedliche IDs zu — auch bei gleichem Inhalt und gleicher Ordnungszahl (Review-Finding 2)", () => {
    const standalone = textElement({ inhalt: "Kern", typo: "standard", x: 0, y: 0, ordnung: 0 }, register);
    const { text: bound } = boxElement(
      { inhalt: "Kern", rolle: "kern", typo: "standard", x: 0, y: 0, ordnung: 0 }, register,
    );
    expect(standalone.id).not.toBe(bound.id);
  });

  it("weist gebundenem Text verschiedener Formtypen unterschiedliche IDs zu — auch bei gleichem Inhalt und gleicher Ordnungszahl", () => {
    const { text: boxText } = boxElement(
      { inhalt: "Kern", rolle: "kern", typo: "standard", x: 0, y: 0, ordnung: 0 }, register,
    );
    const { text: ellipseText } = ellipseElement(
      { inhalt: "Kern", rolle: "kern", typo: "standard", x: 0, y: 0, ordnung: 0 }, register,
    );
    expect(boxText.id).not.toBe(ellipseText.id);
  });

  it("weist Container und gebundenem Text unterschiedliche IDs zu", () => {
    const { container, text } = boxElement(
      { inhalt: "Kern", rolle: "kern", typo: "standard", x: 0, y: 0, ordnung: 0 }, register,
    );
    expect(container.id).not.toBe(text.id);
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

  it("nimmt die Strichfarbe aus dem FRAME_STRICH-Token statt aus einem Hex-Literal (Review-Finding 3)", () => {
    const f = frameElement({ name: "Kapitel 1", x: 0, y: 0, ordnung: 0 });
    expect(f.strokeColor).toBe(FRAME_STRICH);
  });
});
