import { describe, it, expect } from "vitest";
import { fixedPointFor, edgeMidpoint, chooseSides } from "../lib/connect.js";

describe("fixedPointFor", () => {
  it("liefert die normalisierten Kantenmitten aus der Spezifikation", () => {
    expect(fixedPointFor("rechts")).toEqual([1.0, 0.5001]);
    expect(fixedPointFor("links")).toEqual([0.0, 0.5001]);
    expect(fixedPointFor("unten")).toEqual([0.5001, 1.0]);
    expect(fixedPointFor("oben")).toEqual([0.5001, 0.0]);
  });
});

describe("edgeMidpoint", () => {
  const box = { x: 100, y: 200, width: 80, height: 40 };
  it("rechts ist die Mitte der rechten Kante", () => {
    // toBeCloseTo wegen der 0.5001-Verschiebung (aus echter Vault-Datei, Spec 2.4.1)
    const [x, y] = edgeMidpoint(box, "rechts");
    expect(x).toBeCloseTo(180, 1);
    expect(y).toBeCloseTo(220, 1);
  });
  it("oben ist die Mitte der oberen Kante", () => {
    // toBeCloseTo wegen der 0.5001-Verschiebung (aus echter Vault-Datei, Spec 2.4.1)
    const [x, y] = edgeMidpoint(box, "oben");
    expect(x).toBeCloseTo(140, 1);
    expect(y).toBeCloseTo(200, 1);
  });
});

describe("chooseSides", () => {
  it("wählt rechts→links, wenn A links von B liegt", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 400, y: 0, width: 100, height: 100 };
    expect(chooseSides(a, b)).toEqual({ start: "rechts", end: "links" });
  });
  it("wählt unten→oben, wenn A über B liegt", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 0, y: 400, width: 100, height: 100 };
    expect(chooseSides(a, b)).toEqual({ start: "unten", end: "oben" });
  });
  it("nimmt die dominante Achse bei diagonaler Lage", () => {
    // Größerer horizontaler als vertikaler Abstand → horizontale Kanten
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 400, y: 120, width: 100, height: 100 };
    expect(chooseSides(a, b)).toEqual({ start: "rechts", end: "links" });
  });
});
