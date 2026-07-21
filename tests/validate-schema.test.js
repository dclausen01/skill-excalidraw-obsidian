import { describe, it, expect } from "vitest";
import { createFindings } from "../lib/validate/findings.js";
import { checkSchema } from "../lib/validate/structure.js";

/** Ein minimal vollständiges Element, das alle Basisfelder trägt. */
function basis(ueberschreiben = {}) {
  return {
    id: "aaaaaaaa", type: "rectangle", x: 0, y: 0, width: 100, height: 50,
    angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent",
    fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 1,
    opacity: 100, groupIds: [], frameId: null, index: "a0", roundness: null,
    seed: 1, version: 1, versionNonce: 1, isDeleted: false, boundElements: [],
    updated: 1, link: null, locked: false,
    ...ueberschreiben,
  };
}

function pruefe(elemente) {
  const befunde = createFindings();
  checkSchema(elemente, befunde);
  return befunde.all();
}

describe("checkSchema", () => {
  it("akzeptiert ein vollständiges Rechteck", () => {
    expect(pruefe([basis()])).toEqual([]);
  });

  it("meldet ein fehlendes Pflichtfeld mit Element-ID und Feldnamen", () => {
    const kaputt = basis();
    delete kaputt.width;
    const befunde = pruefe([kaputt]);
    expect(befunde).toHaveLength(1);
    expect(befunde[0].schwere).toBe("fehler");
    expect(befunde[0].elementId).toBe("aaaaaaaa");
    expect(befunde[0].meldung).toContain("width");
  });

  it("meldet einen unbekannten Elementtyp", () => {
    const befunde = pruefe([basis({ type: "arrow" })]);
    expect(befunde.some((b) => b.meldung.includes("arrow"))).toBe(true);
  });

  it("verlangt bei Text die Textfelder", () => {
    const text = basis({ type: "text", id: "bbbbbbbb" });
    const befunde = pruefe([text]);
    for (const feld of ["text", "rawText", "originalText", "fontSize", "fontFamily", "lineHeight"]) {
      expect(befunde.some((b) => b.meldung.includes(feld)), `${feld} fehlt in der Meldung`).toBe(true);
    }
  });

  it("verlangt bei Frame den Namen", () => {
    const befunde = pruefe([basis({ type: "frame", id: "cccccccc" })]);
    expect(befunde.some((b) => b.meldung.includes("name"))).toBe(true);
  });

  it("meldet ungültige Aufzählungswerte", () => {
    const befunde = pruefe([basis({ fillStyle: "schraffiert" })]);
    expect(befunde.some((b) => b.meldung.includes("fillStyle"))).toBe(true);
  });

  it("meldet nur erzeugbare Schriften", () => {
    const text = basis({
      type: "text", id: "dddddddd", text: "x", rawText: "x", originalText: "x",
      fontSize: 20, fontFamily: 1, lineHeight: 1.25, textAlign: "left",
      verticalAlign: "top", containerId: null, autoResize: true, hasTextLink: false,
    });
    const befunde = pruefe([text]);
    expect(befunde.some((b) => b.meldung.includes("fontFamily"))).toBe(true);
  });

  it("verlangt roundness als Pflichtfeld", () => {
    const kaputt = basis();
    delete kaputt.roundness;
    const befunde = pruefe([kaputt]);
    expect(befunde.some((b) => b.meldung.includes("roundness"))).toBe(true);
  });

  it("verlangt link als Pflichtfeld", () => {
    const kaputt = basis();
    delete kaputt.link;
    const befunde = pruefe([kaputt]);
    expect(befunde.some((b) => b.meldung.includes("link"))).toBe(true);
  });

  it("verlangt hasTextLink als Pflichtfeld bei Text", () => {
    const text = basis({
      type: "text", id: "eeeeeeee", text: "x", rawText: "x", originalText: "x",
      fontSize: 20, fontFamily: 5, lineHeight: 1.25, textAlign: "left",
      verticalAlign: "top", containerId: null, autoResize: true,
    });
    delete text.hasTextLink;
    const befunde = pruefe([text]);
    expect(befunde.some((b) => b.meldung.includes("hasTextLink"))).toBe(true);
  });
});
