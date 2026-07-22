import { describe, it, expect } from "vitest";
import { createFindings } from "../lib/validate/findings.js";
import { checkSchema, detectOutOfScope } from "../lib/validate/structure.js";

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
    // arrow ist seit Stufe 3a ein bekannter Typ (siehe ZUSATZFELDER) — line bleibt
    // unbekannt und eignet sich weiterhin als Beispiel.
    const befunde = pruefe([basis({ type: "line" })]);
    expect(befunde.some((b) => b.meldung.includes("line"))).toBe(true);
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

describe("checkSchema — Format-Pflicht vs. Skill-Konvention", () => {
  // Schlusspruefung Findings C+D: BASISFELDER behandelte fünf Felder als
  // Pflicht, die reale, funktionierende Vault-Boards oft weglassen (gemessen
  // über 632 Boards: hasTextLink 2750×, index 971×, autoResize 591×, frameId
  // 218×, link 307× fehlend, alle Dateien öffnen anstandslos in Obsidian). Das
  // sind Felder, die DIESER SKILL beim Erzeugen immer setzt, die das
  // Excalidraw-Format selbst aber nicht verlangt (jüngere, optionale
  // Zusatzfelder für Frames, fraktionale Reihenfolge, Links, Auto-Resize,
  // Text-Link — ältere oder von Hand gebaute Boards kennen sie schlicht
  // nicht). Test der Zugehörigkeit: würde Excalidraw/Obsidian an einer
  // fehlenden Ausprägung tatsächlich scheitern? Für Geometrie/Stil/interne
  // Buchführung (x, y, width, height, angle, strokeColor, ... roundness) ja —
  // die bleiben harte Fehler. Für die fünf genannten Felder nein — sie werden
  // Warnungen, im Ton der bereits bestehenden reihenfolge-Warnung ("Konvention
  // dieses Skills, kein Formatfehler").

  it("meldet ein fehlendes Konventionsfeld (index) als Warnung, nicht als Fehler", () => {
    const kaputt = basis();
    delete kaputt.index;
    const treffer = pruefe([kaputt]).find((b) => b.meldung.includes('"index"'));
    expect(treffer).toBeDefined();
    expect(treffer.schwere).toBe("warnung");
  });

  it("meldet fehlendes frameId und link als Warnung (Konventionsfelder, gelten für alle Typen)", () => {
    const kaputt = basis();
    delete kaputt.frameId;
    delete kaputt.link;
    const befunde = pruefe([kaputt]);
    for (const feld of ["frameId", "link"]) {
      const treffer = befunde.find((b) => b.meldung.includes(`"${feld}"`));
      expect(treffer, `${feld} sollte gemeldet werden`).toBeDefined();
      expect(treffer.schwere, `${feld} sollte eine Warnung sein`).toBe("warnung");
    }
  });

  it("meldet fehlendes autoResize und hasTextLink bei Text als Warnung (Konventionsfelder)", () => {
    const text = basis({
      type: "text", id: "dddddddd", text: "x", rawText: "x", originalText: "x",
      fontSize: 20, fontFamily: 6, lineHeight: 1.25, textAlign: "left",
      verticalAlign: "top", containerId: null, autoResize: true, hasTextLink: false,
    });
    delete text.autoResize;
    delete text.hasTextLink;
    const befunde = pruefe([text]);
    for (const feld of ["autoResize", "hasTextLink"]) {
      const treffer = befunde.find((b) => b.meldung.includes(`"${feld}"`));
      expect(treffer, `${feld} sollte gemeldet werden`).toBeDefined();
      expect(treffer.schwere, `${feld} sollte eine Warnung sein`).toBe("warnung");
    }
  });

  it("meldet ein fehlendes Format-Pflichtfeld (width) weiterhin als Fehler", () => {
    const kaputt = basis();
    delete kaputt.width;
    const treffer = pruefe([kaputt]).find((b) => b.meldung.includes('"width"'));
    expect(treffer.schwere).toBe("fehler");
  });

  it("meldet ein fehlendes Format-Pflichtfeld (roundness) weiterhin als Fehler, nicht als Konvention", () => {
    const kaputt = basis();
    delete kaputt.roundness;
    const treffer = pruefe([kaputt]).find((b) => b.meldung.includes('"roundness"'));
    expect(treffer.schwere).toBe("fehler");
  });
});

describe("detectOutOfScope", () => {
  it("meldet nichts für Elementtypen und Schriften, die dieser Skill erzeugt", () => {
    const text = basis({
      type: "text", id: "eeeeeeee", text: "x", rawText: "x", originalText: "x",
      fontSize: 20, fontFamily: 6, lineHeight: 1.25, textAlign: "left",
      verticalAlign: "top", containerId: null, autoResize: true, hasTextLink: false,
    });
    expect(detectOutOfScope([basis(), text])).toEqual({
      fremdeTypen: [], fremdeSchriften: [], fehlendeKonventionsfelder: [],
    });
  });

  it("nennt einen fremden Elementtyp einmal, unabhängig von der Anzahl der Vorkommen", () => {
    const linien = [basis({ type: "line", id: "1" }), basis({ type: "line", id: "2" })];
    expect(detectOutOfScope(linien)).toEqual({
      fremdeTypen: ["line"], fremdeSchriften: [], fehlendeKonventionsfelder: [],
    });
  });

  it("sammelt mehrere fremde Typen in Erstauftrittsreihenfolge", () => {
    const gemischt = [
      basis({ type: "freedraw", id: "1" }),
      basis({ type: "rectangle", id: "2" }),
      basis({ type: "line", id: "3" }),
      basis({ type: "freedraw", id: "4" }),
    ];
    expect(detectOutOfScope(gemischt).fremdeTypen).toEqual(["freedraw", "line"]);
  });

  it("nennt eine fremde fontFamily wie Virgil (1)", () => {
    const virgil = basis({
      type: "text", id: "ffffffff", text: "x", rawText: "x", originalText: "x",
      fontSize: 20, fontFamily: 1, lineHeight: 1.25, textAlign: "left",
      verticalAlign: "top", containerId: null, autoResize: true, hasTextLink: false,
    });
    expect(detectOutOfScope([virgil])).toEqual({
      fremdeTypen: [], fremdeSchriften: [1], fehlendeKonventionsfelder: [],
    });
  });

  it("meldet Typen und Schriften gleichzeitig, wenn beides vorkommt", () => {
    const virgil = basis({
      type: "text", id: "ffffffff", text: "x", rawText: "x", originalText: "x",
      fontSize: 20, fontFamily: 1, lineHeight: 1.25, textAlign: "left",
      verticalAlign: "top", containerId: null, autoResize: true, hasTextLink: false,
    });
    const linie = basis({ type: "line", id: "1" });
    expect(detectOutOfScope([linie, virgil])).toEqual({
      fremdeTypen: ["line"], fremdeSchriften: [1], fehlendeKonventionsfelder: [],
    });
  });

  // Schlusspruefung Finding D: 5 von 632 echten Vault-Boards nutzten ausschließlich
  // erlaubte Elementtypen/Schriften, waren aber trotzdem von Hand gebaut, nicht von
  // diesem Skill — Typ/Schrift allein reichte als Fremdsignal nicht. Die Konventions-
  // felder aus Finding C sind ein zusätzliches, unabhängiges Provenienzsignal: nur
  // dieser Skill setzt sie beim Erzeugen zuverlässig auf jedem Element.

  it("erkennt ein fehlendes Konventionsfeld als Fremdsignal, auch bei erlaubtem Typ", () => {
    const handgemacht = basis();
    delete handgemacht.link;
    expect(detectOutOfScope([handgemacht]).fehlendeKonventionsfelder).toEqual(["link"]);
  });

  it("sammelt mehrere fehlende Konventionsfelder über mehrere Elemente in Erstauftrittsreihenfolge, dedupliziert", () => {
    const a = basis();
    delete a.link;
    const b = basis({ id: "bbbbbbbb" });
    delete b.index;
    delete b.link;
    expect(detectOutOfScope([a, b]).fehlendeKonventionsfelder).toEqual(["link", "index"]);
  });

  it("prüft bei Text zusätzlich autoResize und hasTextLink als Konventionsfelder", () => {
    const text = basis({
      type: "text", id: "eeeeeeee", text: "x", rawText: "x", originalText: "x",
      fontSize: 20, fontFamily: 6, lineHeight: 1.25, textAlign: "left",
      verticalAlign: "top", containerId: null, autoResize: true, hasTextLink: false,
    });
    delete text.autoResize;
    delete text.hasTextLink;
    expect(detectOutOfScope([text]).fehlendeKonventionsfelder).toEqual(["autoResize", "hasTextLink"]);
  });

  it("prüft Konventionsfelder nicht bei fremden Elementtypen (dort sind sie ohnehin nicht definiert)", () => {
    const linie = basis({ type: "line", id: "1" });
    delete linie.link; // irrelevant: line ist schon über den Typ fremd
    expect(detectOutOfScope([linie])).toEqual({
      fremdeTypen: ["line"], fremdeSchriften: [], fehlendeKonventionsfelder: [],
    });
  });
});
