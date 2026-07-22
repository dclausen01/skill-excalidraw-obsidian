import { describe, it, expect } from "vitest";
import { radial } from "../lib/layout.js";
import { scene } from "../lib/scene.js";

describe("radial", () => {
  it("platziert Zentrum und Satelliten", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const { zentrum, satelliten } = radial(f, "Mängelwesen", ["A", "B", "C", "D"], {
      typo: "kernbegriff", radius: 400, x: 960, y: 540,
    });
    expect(zentrum.text.rawText).toBe("Mängelwesen");
    expect(satelliten).toHaveLength(4);
  });

  it("verteilt die Satelliten rund um das Zentrum", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const { zentrum, satelliten } = radial(f, "Z", ["A", "B", "C", "D"], {
      typo: "kernbegriff", radius: 400, x: 960, y: 540,
    });
    // Mittelpunkte der Satelliten
    const zentrumMitte = { x: zentrum.container.x + zentrum.container.width / 2, y: zentrum.container.y + zentrum.container.height / 2 };
    // Jeder Satellit liegt ungefähr radius vom Zentrumsmittelpunkt entfernt
    for (const sat of satelliten) {
      const mx = sat.container.x + sat.container.width / 2;
      const my = sat.container.y + sat.container.height / 2;
      const dist = Math.hypot(mx - zentrumMitte.x, my - zentrumMitte.y);
      expect(dist).toBeCloseTo(400, 0); // auf ganze Pixel genau
    }
  });

  it("ist deterministisch", () => {
    const baue = () => {
      const s = scene();
      const f = s.frame("Kapitel");
      radial(f, "Z", ["A", "B", "C"], { typo: "kernbegriff" });
      return JSON.stringify(s.elements());
    };
    expect(baue()).toBe(baue());
  });
});
