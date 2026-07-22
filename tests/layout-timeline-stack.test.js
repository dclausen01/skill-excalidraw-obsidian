import { describe, it, expect } from "vitest";
import { timeline, stack } from "../lib/layout.js";
import { scene } from "../lib/scene.js";

describe("stack", () => {
  it("stapelt vertikal", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const formen = stack(f, ["A", "B", "C"], { typo: "kernbegriff" });
    expect(formen).toHaveLength(3);
    expect(formen[1].container.x).toBe(formen[0].container.x);
    expect(formen[1].container.y).toBeGreaterThan(formen[0].container.y);
  });
});

describe("timeline", () => {
  it("reiht Formen und verbindet sie mit Pfeilen", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const { formen, pfeile } = timeline(f, ["Start", "Mitte", "Ende"], {
      szene: s, typo: "kernbegriff", x: 100, y: 300,
    });
    expect(formen).toHaveLength(3);
    expect(pfeile).toHaveLength(2); // n-1 Pfeile
    // Pfeile sind in der Szene
    const pfeileInSzene = s.elements().filter((e) => e.type === "arrow");
    expect(pfeileInSzene).toHaveLength(2);
  });

  it("verbindet jeweils benachbarte Formen", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const { formen, pfeile } = timeline(f, ["A", "B"], { szene: s, typo: "kernbegriff", x: 100, y: 300 });
    expect(pfeile[0].startBinding.elementId).toBe(formen[0].container.id);
    expect(pfeile[0].endBinding.elementId).toBe(formen[1].container.id);
  });
});
