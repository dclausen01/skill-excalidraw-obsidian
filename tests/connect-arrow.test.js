import { describe, it, expect } from "vitest";
import { arrowElement } from "../lib/connect.js";

const a = { id: "aaaaaaaa", x: 0, y: 0, width: 100, height: 100 };
const b = { id: "bbbbbbbb", x: 400, y: 0, width: 100, height: 100 };

describe("arrowElement", () => {
  const pfeil = arrowElement({ a, b, ordnung: 5 });

  it("ist ein Pfeil mit den Pflicht-Sonderfeldern", () => {
    expect(pfeil.type).toBe("arrow");
    expect(pfeil.endArrowhead).toBe("arrow");
    expect(pfeil.startArrowhead).toBe(null);
    expect(pfeil.elbowed).toBe(false);
    expect(pfeil.roundness).toEqual({ type: 2 });
    expect(pfeil.lastCommittedPoint).toBe(null);
    expect(pfeil.moveMidPointsWithElement).toBe(false);
  });

  it("startet an A's rechter Kantenmitte und endet an B's linker", () => {
    // A rechts mittig = (100, 50); B links mittig = (400, 50)
    expect(pfeil.x).toBeCloseTo(100, 1);
    expect(pfeil.y).toBeCloseTo(50, 1);
    // points sind Offsets von x,y: erster [0,0], letzter zeigt auf (400,50)
    expect(pfeil.points[0]).toEqual([0, 0]);
    const [lx, ly] = pfeil.points[pfeil.points.length - 1];
    expect(pfeil.x + lx).toBeCloseTo(400, 1);
    expect(pfeil.y + ly).toBeCloseTo(50, 1);
  });

  it("bindet beide Seiten mit den passenden fixedPoints", () => {
    expect(pfeil.startBinding).toEqual({ elementId: "aaaaaaaa", mode: "orbit", fixedPoint: [1.0, 0.5001] });
    expect(pfeil.endBinding).toEqual({ elementId: "bbbbbbbb", mode: "orbit", fixedPoint: [0.0, 0.5001] });
  });

  it("ist deterministisch", () => {
    const bauen = () => arrowElement({ a, b, ordnung: 5 });
    expect(JSON.stringify(bauen())).toBe(JSON.stringify(bauen()));
  });

  it("respektiert fest vorgegebene Seiten", () => {
    const p = arrowElement({ a, b, ordnung: 5, seite: { start: "unten", end: "oben" } });
    expect(p.startBinding.fixedPoint).toEqual([0.5001, 1.0]);
    expect(p.endBinding.fixedPoint).toEqual([0.5001, 0.0]);
  });
});
