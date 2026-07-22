import { describe, it, expect } from "vitest";
import { row, column } from "../lib/layout.js";
import { scene } from "../lib/scene.js";
import { ABSTAND } from "../lib/style.js";

describe("row", () => {
  it("platziert Formen nebeneinander mit dem Abstands-Token dazwischen", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const formen = row(f, ["Eins", "Zwei", "Drei"], { rolle: "kern", typo: "kernbegriff", x: 100, y: 100, abstand: "normal" });

    expect(formen).toHaveLength(3);
    // Alle auf gleicher Höhe
    expect(formen[1].container.y).toBe(formen[0].container.y);
    expect(formen[2].container.y).toBe(formen[0].container.y);
    // Jede folgende beginnt um vorige Breite + Abstand versetzt
    const c0 = formen[0].container;
    const c1 = formen[1].container;
    expect(c1.x).toBeCloseTo(c0.x + c0.width + ABSTAND.normal, 5);
  });

  it("gibt die platzierten Formen in Eingabereihenfolge zurück", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const formen = row(f, ["A", "B"], { typo: "kernbegriff" });
    expect(formen[0].text.rawText).toBe("A");
    expect(formen[1].text.rawText).toBe("B");
  });

  it("respektiert den Typ (ellipse)", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const formen = row(f, ["A", "B"], { typ: "ellipse", typo: "kernbegriff" });
    expect(formen[0].container.type).toBe("ellipse");
  });
});

describe("column", () => {
  it("platziert Formen untereinander mit dem Abstands-Token dazwischen", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const formen = column(f, ["Eins", "Zwei"], { typo: "kernbegriff", x: 100, y: 100, abstand: "eng" });
    expect(formen[1].container.x).toBe(formen[0].container.x);
    const c0 = formen[0].container;
    expect(formen[1].container.y).toBeCloseTo(c0.y + c0.height + ABSTAND.eng, 5);
  });
});
