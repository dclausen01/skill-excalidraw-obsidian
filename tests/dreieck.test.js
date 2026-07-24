import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";
import { dreieck } from "../lib/shapes/dreieck.js";

function frame() {
  const s = scene();
  return { s, f: s.frame("K", { x: 0, y: 0 }) };
}

describe("dreieck", () => {
  it("baut eine geschlossene Linie mit Basisbreite und gleichseitiger Höhe", () => {
    const { f } = frame();
    const { dreieck: d } = dreieck(f, ["A", "B", "C"], { x: 100, y: 100, breite: 400 });
    expect(d.type).toBe("line");
    expect(d.width).toBeCloseTo(400, 5);
    expect(d.height).toBeCloseTo(400 * Math.sqrt(3) / 2, 3);
    expect(d.points).toHaveLength(4);                    // geschlossen (Loopback)
  });

  it("respektiert eine explizite hoehe", () => {
    const { f } = frame();
    const { dreieck: d } = dreieck(f, ["A", "B", "C"], { x: 0, y: 0, breite: 400, hoehe: 300 });
    expect(d.height).toBeCloseTo(300, 5);
  });

  it("platziert das obere Label mittig über der Spitze", () => {
    const { f } = frame();
    const { ecken } = dreieck(f, ["Spitze", "", ""], { x: 100, y: 100, breite: 400 });
    const oben = ecken[0];
    // Frame bei (0,0) → absolute = frame-relative. Spitze bei x=300, y=100.
    expect(oben.x + oben.width / 2).toBeCloseTo(300, 1);   // horizontal mittig
    expect(oben.y + oben.height).toBeCloseTo(100 - 24, 1); // knapp über der Spitze (AUSSEN=24)
  });

  it("gibt null für leere Ecken zurück", () => {
    const { f } = frame();
    const { ecken } = dreieck(f, ["A", "", "C"], { x: 0, y: 0, breite: 400 });
    expect(ecken[1]).toBe(null);
    expect(ecken[0].rawText).toBe("A");
    expect(ecken[2].rawText).toBe("C");
  });

  it("reicht die Füllung an die Linie durch", () => {
    const { f } = frame();
    const { dreieck: d } = dreieck(f, ["A", "B", "C"], { x: 0, y: 0, breite: 400, fuellung: "ergebnis" });
    expect(d.backgroundColor).not.toBe("transparent");
  });

  it("wirft bei falscher Eckenzahl oder fehlender breite", () => {
    const { f } = frame();
    expect(() => dreieck(f, ["A", "B"], { x: 0, y: 0, breite: 400 })).toThrow();
    expect(() => dreieck(f, ["A", "B", "C"], { x: 0, y: 0 })).toThrow();
  });
});
