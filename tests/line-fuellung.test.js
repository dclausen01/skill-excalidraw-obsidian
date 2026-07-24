import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";
import { FARBROLLEN } from "../lib/style.js";

describe("line-Füllung", () => {
  it("setzt backgroundColor aus einer literalen Farbe", () => {
    const s = scene();
    const f = s.frame("K", { x: 0, y: 0 });
    const l = f.line([[0, 0], [100, 0], [50, 80]], { geschlossen: true, fuellung: "#b2f2bb" });
    expect(l.backgroundColor).toBe("#b2f2bb");
    expect(l.fillStyle).toBe("solid");
  });

  it("löst einen Rollennamen auf FARBROLLEN[rolle].fuellung auf", () => {
    const s = scene();
    const f = s.frame("K", { x: 0, y: 0 });
    const l = f.line([[0, 0], [100, 0], [50, 80]], { geschlossen: true, fuellung: "ergebnis" });
    expect(l.backgroundColor).toBe(FARBROLLEN.ergebnis.fuellung);
  });

  it("bleibt ohne fuellung transparent", () => {
    const s = scene();
    const f = s.frame("K", { x: 0, y: 0 });
    const l = f.line([[0, 0], [100, 0]]);
    expect(l.backgroundColor).toBe("transparent");
  });

  it("unterscheidet gefüllte und ungefüllte Linie deterministisch (verschiedene ids)", () => {
    const s = scene();
    const f = s.frame("K", { x: 0, y: 0 });
    const a = f.line([[0, 0], [100, 0], [50, 80]], { geschlossen: true });
    const b = f.line([[0, 0], [100, 0], [50, 80]], { geschlossen: true, fuellung: "#b2f2bb" });
    expect(a.id).not.toBe(b.id);
  });
});
