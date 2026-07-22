import { describe, it, expect } from "vitest";
import { grid } from "../lib/layout.js";
import { scene } from "../lib/scene.js";

describe("grid", () => {
  it("ordnet in der angegebenen Spaltenzahl an", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const formen = grid(f, ["A", "B", "C", "D", "E"], { spalten: 2, typo: "kernbegriff", x: 100, y: 100 });
    expect(formen).toHaveLength(5);
    // A und B in derselben Zeile (gleiche y), C beginnt eine neue Zeile (größere y)
    expect(formen[1].container.y).toBe(formen[0].container.y);
    expect(formen[2].container.y).toBeGreaterThan(formen[0].container.y);
    // A und C in derselben Spalte (gleiche x)
    expect(formen[2].container.x).toBe(formen[0].container.x);
  });

  it("gibt alle Formen in Eingabereihenfolge zurück", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const formen = grid(f, ["A", "B", "C"], { spalten: 2, typo: "kernbegriff" });
    expect(formen.map((x) => x.text.rawText)).toEqual(["A", "B", "C"]);
  });
});
