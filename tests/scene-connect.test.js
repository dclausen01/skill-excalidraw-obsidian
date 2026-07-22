import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";

function containerVon(ergebnis) {
  return ergebnis.container ?? ergebnis;
}

describe("scene().connect", () => {
  it("fügt der Szene ein Pfeilelement hinzu", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const a = f.box("A", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    const b = f.box("B", { rolle: "kern", typo: "kernbegriff", x: 600, y: 100 });
    s.connect(a, b);
    const pfeile = s.elements().filter((e) => e.type === "arrow");
    expect(pfeile).toHaveLength(1);
  });

  it("bindet den Pfeil beidseitig in die boundElements der Container", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const a = f.box("A", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    const b = f.box("B", { rolle: "kern", typo: "kernbegriff", x: 600, y: 100 });
    const pfeil = s.connect(a, b);

    const alle = s.elements();
    const ca = alle.find((e) => e.id === containerVon(a).id);
    const cb = alle.find((e) => e.id === containerVon(b).id);
    expect(ca.boundElements.some((x) => x.id === pfeil.id && x.type === "arrow")).toBe(true);
    expect(cb.boundElements.some((x) => x.id === pfeil.id && x.type === "arrow")).toBe(true);
  });

  it("hängt bei label ein Textelement an den Pfeil", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const a = f.box("A", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    const b = f.box("B", { rolle: "kern", typo: "kernbegriff", x: 600, y: 100 });
    const pfeil = s.connect(a, b, { label: "führt zu" });

    const alle = s.elements();
    const label = alle.find((e) => e.type === "text" && e.containerId === pfeil.id);
    expect(label).toBeTruthy();
    expect(label.rawText).toBe("führt zu");
    expect(pfeil.boundElements.some((x) => x.id === label.id && x.type === "text")).toBe(true);
  });

  it("bleibt deterministisch", () => {
    const baue = () => {
      const s = scene();
      const f = s.frame("Kapitel");
      const a = f.box("A", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
      const b = f.box("B", { rolle: "kern", typo: "kernbegriff", x: 600, y: 100 });
      s.connect(a, b, { label: "x" });
      return JSON.stringify(s.elements());
    };
    expect(baue()).toBe(baue());
  });
});
