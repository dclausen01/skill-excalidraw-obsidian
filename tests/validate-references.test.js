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

  it("meldet ein Nicht-Text-Element, das sich in boundElements als Text ausgibt", () => {
    // Rückrichtung: der bisherige Code prüfte nur das type: "text"-Tag INNERHALB
    // des boundElements-Eintrags, nie den echten type des referenzierten Elements.
    // Ein Rechteck, das sich per Tag als Text ausgibt und dessen containerId
    // zurück auf den Container zeigt, kam bislang unentdeckt durch.
    const alle = echteSzene();
    const container = alle.find((e) => e.type === "rectangle");
    const impostor = {
      id: "impostor-rect-als-text",
      type: "rectangle",
      containerId: container.id,
      boundElements: [],
      index: "zzzz",
    };
    // Der echte gebundene Text bleibt unangetastet — nur der Impostor kommt dazu —
    // damit der Vorwärts-Check für den echten Text sauber bleibt und ausschließlich
    // die Rückrichtungs-Prüfung den Impostor aufdecken muss.
    container.boundElements = [...container.boundElements, { id: impostor.id, type: "text" }];
    const befunde = pruefe([...alle, impostor]);
    expect(befunde.some((b) => b.regel === "bindung")).toBe(true);
  });

  it("meldet gebundenen Text, dessen Container selbst ein Text ist", () => {
    // Vorwärtsrichtung: der bisherige Code prüfte nur, dass der Container existiert
    // und den Text zurückführt — nie, dass der Container tatsächlich eine Form ist.
    // Text, der an Text gebunden ist, ist unsinnig, kam aber unentdeckt durch, wenn
    // beide Seiten wechselseitig konsistent aufeinander zeigten.
    const alle = echteSzene();
    const pseudoContainer = {
      id: "pseudo-container-text",
      type: "text",
      containerId: null,
      boundElements: [{ id: "pseudo-gebundener-text", type: "text" }],
      index: "y0",
    };
    const gebundenerText = {
      id: "pseudo-gebundener-text",
      type: "text",
      containerId: pseudoContainer.id,
      boundElements: [],
      index: "y1",
    };
    const befunde = pruefe([...alle, pseudoContainer, gebundenerText]);
    expect(befunde.some((b) => b.regel === "bindung")).toBe(true);
  });

  it("benennt beim z-Reihenfolge-Verstoß das tatsächlich betroffene Element, nicht ein durch Filterung verschobenes", () => {
    // Der bisherige Code filterte erst alle index-Strings heraus und indexierte dann
    // mit der Position im GEFILTERTEN Array zurück ins UNGEFILTERTE elemente-Array.
    // Sobald irgendwo vorher ein index fehlt, fallen die beiden Arrays auseinander,
    // und die Meldung landet am falschen Element.
    //
    // Aufbau: el-b hat gar kein index-Feld (fällt aus der Index-Filterung raus).
    // el-c und el-d bilden den eigentlichen Verstoß ("a1" steigt nicht gegenüber "a2").
    // Der alte Code würde die Meldung an elemente[2] = el-c verankern (dessen "a2"
    // korrekt steigt) statt an el-d, das den Verstoß tatsächlich verursacht.
    const a = { id: "el-a", type: "rectangle", index: "a0", boundElements: [] };
    const b = { id: "el-b", type: "rectangle", boundElements: [] }; // index fehlt bewusst
    const c = { id: "el-c", type: "rectangle", index: "a2", boundElements: [] };
    const d = { id: "el-d", type: "rectangle", index: "a1", boundElements: [] };

    const befunde = pruefe([a, b, c, d]);
    const verstoss = befunde.find((f) => f.regel === "reihenfolge" && f.meldung.includes("steigt nicht"));

    expect(verstoss).toBeDefined();
    expect(verstoss.elementId).toBe("el-d");
  });
});
