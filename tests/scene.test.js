import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";
import { FRAME_BREITE, ABSTAND } from "../lib/style.js";
import { loadFontRegistry } from "../lib/fonts.js";

// Einmal laden und an alle scene()-Aufrufe reichen — Schriftregistrierung ist
// teuer und soll in Tests nicht pro scene() neu aufgebaut werden.
const registry = loadFontRegistry();
const neueSzene = (opts = {}) => scene({ ...opts, registry });

describe("Szene", () => {
  it("reiht Frames mit dem vereinbarten Abstand auf", () => {
    const s = neueSzene();
    const a = s.frame("Erstes");
    const b = s.frame("Zweites");
    expect(a.element.x).toBe(0);
    expect(b.element.x).toBe(FRAME_BREITE + ABSTAND.frames);
  });

  it("platziert einen Frame an expliziten Koordinaten statt automatisch zu reihen", () => {
    const s = neueSzene();
    s.frame("Erstes");
    const b = s.frame("Zweites", { x: 500, y: 700 });
    expect(b.element.x).toBe(500);
    expect(b.element.y).toBe(700);
  });

  it("rechnet Frame-relative Koordinaten in absolute um", () => {
    const s = neueSzene();
    s.frame("Erstes");
    const zweiter = s.frame("Zweites");
    const { container } = zweiter.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 100, y: 50 });
    expect(container.x).toBe(FRAME_BREITE + ABSTAND.frames + 100);
    expect(container.y).toBe(50);
  });

  it("rechnet Frame-relative Koordinaten auch für einen Frame um, der nicht bei (0,0) liegt", () => {
    const s = neueSzene();
    const f = s.frame("Verschoben", { x: 300, y: 900 });
    const { container } = f.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 20, y: 40 });
    expect(container.x).toBe(320);
    expect(container.y).toBe(940);
  });

  it("bindet Kinder an ihren Frame", () => {
    const s = neueSzene();
    const f = s.frame("Kapitel");
    const { container, text } = f.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0 });
    expect(container.frameId).toBe(f.element.id);
    expect(text.frameId).toBe(f.element.id);
  });

  it("erreicht alle vier Kind-Fabriken über den Frame und bindet sie alle an ihn", () => {
    const s = neueSzene();
    const f = s.frame("Kapitel");
    const { container: box } = f.box("Box", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0 });
    const { container: ellipse } = f.ellipse("Ellipse", { rolle: "kontra", typo: "kernbegriff", x: 0, y: 200 });
    const { container: diamond } = f.diamond("Diamond", { rolle: "ergebnis", typo: "kernbegriff", x: 0, y: 400 });
    const text = f.text("Text", { typo: "standard", x: 0, y: 600 });
    expect(box.frameId).toBe(f.element.id);
    expect(ellipse.frameId).toBe(f.element.id);
    expect(diamond.frameId).toBe(f.element.id);
    expect(text.frameId).toBe(f.element.id);
    expect(box.type).toBe("rectangle");
    expect(ellipse.type).toBe("ellipse");
    expect(diamond.type).toBe("diamond");
    expect(text.type).toBe("text");
  });

  it("vergibt aufsteigende z-Indizes", () => {
    const s = neueSzene();
    const f = s.frame("Kapitel");
    f.box("A", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0 });
    f.box("B", { rolle: "kern", typo: "kernbegriff", x: 0, y: 200 });
    const indizes = s.elements().map((e) => e.index);
    expect([...indizes].sort()).toEqual(indizes);
  });

  it("vergibt aufsteigende z-Indizes auch bei einer realistischen Elementanzahl", () => {
    const s = neueSzene();
    for (let i = 0; i < 5; i++) {
      const f = s.frame(`Kapitel ${i}`);
      for (let j = 0; j < 10; j++) {
        f.box(`Box ${i}-${j}`, { rolle: "kern", typo: "kernbegriff", x: 0, y: j * 100 });
      }
    }
    const alle = s.elements();
    expect(alle.length).toBe(5 + 5 * 10 * 2); // 5 Frames + je 10 Boxen mit Container+Text
    const indizes = alle.map((e) => e.index);
    expect([...indizes].sort()).toEqual(indizes);
  });

  it("setzt Frames vor ihre Kinder in der z-Reihenfolge", () => {
    const s = neueSzene();
    const f1 = s.frame("Kapitel 1");
    f1.box("A", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0 });
    const f2 = s.frame("Kapitel 2");
    f2.box("B", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0 });

    const alle = s.elements();
    const frameIndizes = alle.filter((e) => e.type === "frame").map((e) => e.index);
    const kindIndizes = alle.filter((e) => e.type !== "frame").map((e) => e.index);
    // Beide Frames müssen vor beiden Frame-fremden Kindern in der Sortierreihenfolge liegen.
    for (const fi of frameIndizes) {
      for (const ki of kindIndizes) {
        expect(fi < ki).toBe(true);
      }
    }
  });

  it("vergibt eindeutige IDs", () => {
    const s = neueSzene();
    const f = s.frame("Kapitel");
    f.box("Gleich", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0 });
    f.box("Gleich", { rolle: "kern", typo: "kernbegriff", x: 0, y: 300 });
    const ids = s.elements().map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("liefert bei mehrfachem Aufruf von elements() ein identisches Ergebnis", () => {
    const s = neueSzene();
    const f = s.frame("Kapitel");
    f.box("A", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0 });
    f.box("B", { rolle: "kern", typo: "kernbegriff", x: 0, y: 300 });
    expect(s.elements()).toEqual(s.elements());
  });

  it("berechnet Boardmaße und den L0-Zoomfaktor", () => {
    const s = neueSzene();
    s.frame("A");
    s.frame("B");
    const { breite, zoomL0: zoom } = s.dimensions();
    expect(breite).toBe(2 * FRAME_BREITE + ABSTAND.frames);
    expect(zoom).toBeLessThan(1);
  });
});
