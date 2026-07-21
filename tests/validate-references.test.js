import { describe, it, expect } from "vitest";
import { createFindings } from "../lib/validate/findings.js";
import { checkReferences } from "../lib/validate/structure.js";
import { scene } from "../lib/scene.js";

function pruefe(elemente) {
  const befunde = createFindings();
  checkReferences(elemente, befunde);
  return befunde.all();
}

/** Eine echte, gültige Szene aus der Bibliothek selbst. */
function echteSzene() {
  const s = scene();
  const f = s.frame("Kapitel");
  f.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
  f.text("Titel", { typo: "frametitel", x: 40, y: 40 });
  return s.elements();
}

describe("checkReferences", () => {
  it("akzeptiert eine echte, von der Bibliothek gebaute Szene", () => {
    expect(pruefe(echteSzene())).toEqual([]);
  });

  it("meldet doppelte IDs", () => {
    const alle = echteSzene();
    alle[1].id = alle[0].id;
    const befunde = pruefe(alle);
    expect(befunde.some((b) => b.regel === "ids" && b.schwere === "fehler")).toBe(true);
  });

  it("meldet einen gebundenen Text, dessen Container ihn nicht kennt", () => {
    const alle = echteSzene();
    const container = alle.find((e) => e.type === "rectangle");
    container.boundElements = [];
    const befunde = pruefe(alle);
    expect(befunde.some((b) => b.regel === "bindung")).toBe(true);
  });

  it("meldet einen Container, dessen gebundener Text fehlt", () => {
    const alle = echteSzene();
    const text = alle.find((e) => e.containerId);
    const ohneText = alle.filter((e) => e !== text);
    const befunde = pruefe(ohneText);
    expect(befunde.some((b) => b.regel === "bindung")).toBe(true);
  });

  it("meldet eine frameId, zu der es keinen Frame gibt", () => {
    const alle = echteSzene();
    alle.find((e) => e.type === "rectangle").frameId = "xxxxxxxx";
    const befunde = pruefe(alle);
    expect(befunde.some((b) => b.regel === "frame")).toBe(true);
  });

  it("meldet eine absteigende z-Reihenfolge", () => {
    const alle = echteSzene();
    alle[0].index = "zz";
    const befunde = pruefe(alle);
    expect(befunde.some((b) => b.regel === "reihenfolge")).toBe(true);
  });

  it("meldet ein fehlendes index-Feld", () => {
    const alle = echteSzene();
    delete alle[1].index;
    const befunde = pruefe(alle);
    expect(befunde.some((b) => b.regel === "reihenfolge")).toBe(true);
  });
});
