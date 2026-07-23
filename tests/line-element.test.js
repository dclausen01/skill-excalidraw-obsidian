// tests/line-element.test.js
import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";
import { FARBROLLEN } from "../lib/style.js";

describe("f.line", () => {
  it("erzeugt eine offene Linie mit korrekten Punkten und Bounding-Box", () => {
    const s = scene();
    const f = s.frame("K", { x: 0, y: 0 });
    const l = f.line([[200, 150], [200, 650]]);          // senkrecht, frame-relativ
    expect(l.type).toBe("line");
    expect(l.x).toBe(200);
    expect(l.y).toBe(150);
    expect(l.points).toEqual([[0, 0], [0, 500]]);
    expect(l.width).toBe(0);
    expect(l.height).toBe(500);
    expect(l.strokeColor).toBe(FARBROLLEN.kontext.strich);
    expect(l.roundness).toBe(null);
    expect(l.frameId).toBe(f.element.id);
  });

  it("schließt eine Form per Loopback (erster Punkt am Ende wiederholt)", () => {
    const s = scene();
    const f = s.frame("K", { x: 0, y: 0 });
    const dreieck = f.line([[0, 260], [300, 260], [150, 0]], { geschlossen: true });
    // min-Ecke (0,0); Offsets; erster Punkt am Ende wiederholt
    expect(dreieck.points).toEqual([[0, 260], [300, 260], [150, 0], [0, 260]]);
    expect(dreieck.width).toBe(300);
    expect(dreieck.height).toBe(260);
  });

  it("übernimmt die Strichfarbe aus der Rolle", () => {
    const s = scene();
    const f = s.frame("K", { x: 0, y: 0 });
    const l = f.line([[0, 0], [100, 0]], { rolle: "kern" });
    expect(l.strokeColor).toBe(FARBROLLEN.kern.strich);
  });

  it("rechnet frame-relative Punkte in absolute um", () => {
    const s = scene();
    const f = s.frame("K", { x: 1000, y: 500 });
    const l = f.line([[10, 20], [10, 120]]);
    expect(l.x).toBe(1010);
    expect(l.y).toBe(520);
  });

  it("ist deterministisch", () => {
    const baue = () => {
      const s = scene();
      s.frame("K", { x: 0, y: 0 }).line([[0, 0], [0, 300]]);
      return JSON.stringify(s.elements());
    };
    expect(baue()).toBe(baue());
  });
});
