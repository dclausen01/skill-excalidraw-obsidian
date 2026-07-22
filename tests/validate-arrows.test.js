import { describe, it, expect } from "vitest";
import { createFindings } from "../lib/validate/findings.js";
import { checkArrowBindings } from "../lib/validate/structure.js";
import { scene } from "../lib/scene.js";

function baueVerbunden() {
  const s = scene();
  const f = s.frame("Kapitel");
  const a = f.box("A", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
  const b = f.box("B", { rolle: "kern", typo: "kernbegriff", x: 600, y: 100 });
  s.connect(a, b);
  return s.elements();
}

function pruefe(elemente) {
  const befunde = createFindings();
  checkArrowBindings(elemente, befunde);
  return befunde.all();
}

describe("checkArrowBindings", () => {
  it("akzeptiert eine sauber verbundene Szene", () => {
    expect(pruefe(baueVerbunden())).toEqual([]);
  });

  it("meldet eine startBinding auf ein nicht existierendes Element", () => {
    const alle = baueVerbunden();
    alle.find((e) => e.type === "arrow").startBinding.elementId = "xxxxxxxx";
    expect(pruefe(alle).some((b) => b.regel === "pfeilbindung" && b.schwere === "fehler")).toBe(true);
  });

  it("meldet einen Pfeil, den sein Ziel nicht in boundElements führt", () => {
    const alle = baueVerbunden();
    const pfeil = alle.find((e) => e.type === "arrow");
    const ziel = alle.find((e) => e.id === pfeil.startBinding.elementId);
    ziel.boundElements = ziel.boundElements.filter((x) => x.id !== pfeil.id);
    expect(pruefe(alle).some((b) => b.regel === "pfeilbindung")).toBe(true);
  });

  it("meldet einen boundElements-Pfeileintrag ohne existierenden Pfeil", () => {
    const alle = baueVerbunden();
    const box = alle.find((e) => e.type === "rectangle");
    box.boundElements = [...(box.boundElements ?? []), { id: "yyyyyyyy", type: "arrow" }];
    expect(pruefe(alle).some((b) => b.regel === "pfeilbindung")).toBe(true);
  });

  it("meldet einen entarteten Pfeil, dessen Kanten exakt zusammenfallen", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    // Zugewandte Kanten liegen exakt aufeinander: A endet bei x=300, B beginnt dort.
    const a = f.box("A", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100, breite: 200, hoehe: 100 });
    const b = f.box("B", { rolle: "kern", typo: "kernbegriff", x: 300, y: 100, breite: 200, hoehe: 100 });
    s.connect(a, b);
    const befunde = pruefe(s.elements());
    expect(befunde.some((be) => be.regel === "pfeilentartet" && be.schwere === "warnung")).toBe(true);
  });
});
