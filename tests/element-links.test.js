import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";

describe("Notiz-Link an einer Form", () => {
  it("setzt link am Container", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const b = f.box("Mängelwesen", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100, link: "[[Der Mensch – ein Mängelwesen]]" });
    expect(b.container.link).toBe("[[Der Mensch – ein Mängelwesen]]");
  });

  it("lässt link null, wenn nicht gesetzt", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const b = f.box("Ohne Link", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    expect(b.container.link).toBe(null);
  });

  it("bleibt deterministisch", () => {
    const baue = () => {
      const s = scene();
      const f = s.frame("K");
      f.box("X", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0, link: "[[N]]" });
      return JSON.stringify(s.elements());
    };
    expect(baue()).toBe(baue());
  });
});
