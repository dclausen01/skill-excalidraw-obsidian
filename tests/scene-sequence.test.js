import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";

describe("scene().sequence", () => {
  it("verkettet Frames mit Übergangspfeilen", () => {
    const s = scene();
    const a = s.frame("Kapitel 1");
    const b = s.frame("Kapitel 2");
    const c = s.frame("Kapitel 3");
    const pfeile = s.sequence([a, b, c]);

    expect(pfeile).toHaveLength(2); // n-1 Übergänge
    const pfeileInSzene = s.elements().filter((e) => e.type === "arrow");
    expect(pfeileInSzene).toHaveLength(2);
  });

  it("bindet die Pfeile an die Frame-Elemente", () => {
    const s = scene();
    const a = s.frame("Kapitel 1");
    const b = s.frame("Kapitel 2");
    const [pfeil] = s.sequence([a, b]);
    expect(pfeil.startBinding.elementId).toBe(a.element.id);
    expect(pfeil.endBinding.elementId).toBe(b.element.id);
    // Frames führen den Pfeil in boundElements
    const alle = s.elements();
    const frameA = alle.find((e) => e.id === a.element.id);
    expect(frameA.boundElements.some((x) => x.id === pfeil.id && x.type === "arrow")).toBe(true);
  });

  it("nummeriert die Übergänge, wenn gewünscht", () => {
    const s = scene();
    const a = s.frame("Kapitel 1");
    const b = s.frame("Kapitel 2");
    const c = s.frame("Kapitel 3");
    s.sequence([a, b, c], { nummeriert: true });

    const labels = s.elements().filter((e) => e.type === "text" && /^[0-9]+$/.test(e.rawText));
    expect(labels.map((l) => l.rawText).sort()).toEqual(["1", "2"]);
  });

  it("bleibt deterministisch", () => {
    const baue = () => {
      const s = scene();
      const a = s.frame("K1");
      const b = s.frame("K2");
      s.sequence([a, b], { nummeriert: true });
      return JSON.stringify(s.elements());
    };
    expect(baue()).toBe(baue());
  });
});
