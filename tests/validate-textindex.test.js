import { describe, it, expect } from "vitest";
import { createFindings, SCHWERE } from "../lib/validate/findings.js";
import { checkTextIndex } from "../lib/validate/structure.js";
import { scene } from "../lib/scene.js";
import { sceneToMarkdown } from "../lib/document.js";

/** Nur die Fehler — Warnungen blockieren das Schreiben nicht. */
function fehler(befunde) {
  return befunde.filter((b) => b.schwere === SCHWERE.fehler);
}

function baueSzene() {
  const s = scene();
  const f = s.frame("Kapitel");
  f.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
  f.text("Freitext", { typo: "standard", x: 40, y: 400 });
  return s;
}

function pruefe(elemente, markdown) {
  const befunde = createFindings();
  checkTextIndex(elemente, markdown, befunde);
  return befunde.all();
}

describe("checkTextIndex", () => {
  const s = baueSzene();
  const markdown = sceneToMarkdown(s, { pluginVersion: "2.23.12" });

  it("akzeptiert eine selbst erzeugte Datei", () => {
    expect(pruefe(s.elements(), markdown)).toEqual([]);
  });

  it("meldet ein Textelement, das im Index fehlt", () => {
    const textId = s.elements().find((e) => e.type === "text").id;
    const ohne = markdown.replace(new RegExp(`^.* \\^${textId}$`, "m"), "");
    const befunde = pruefe(s.elements(), ohne);
    expect(befunde.some((b) => b.regel === "textindex" && b.elementId === textId)).toBe(true);
  });

  it("meldet einen Index-Eintrag ohne zugehöriges Element", () => {
    const zuviel = markdown.replace("## Text Elements", "## Text Elements\nGespenst ^zzzzzzzz\n");
    const befunde = pruefe(s.elements(), zuviel);
    expect(befunde.some((b) => b.meldung.includes("zzzzzzzz"))).toBe(true);
  });

  it("akzeptiert ein Textelement, dessen Inhalt selbst eine Obsidian-Blockreferenz nennt", () => {
    // Reproduktion des Review-Findings: ein Textelement mit Inhalt
    // "See issue ^abc12345\nSecond line here" sieht in der ersten Zeile wie ein
    // Indexeintrag zu einer nicht existierenden ID "abc12345" aus. Da diese Zeile
    // Teil des Elementinhalts ist (nicht die letzte Zeile des Blocks), darf sie
    // keinen Befund auslösen — die Datei ist gültig.
    const s2 = scene();
    const f2 = s2.frame("Kapitel");
    f2.text("See issue ^abc12345\nSecond line here", { typo: "standard", x: 40, y: 400 });
    const md2 = sceneToMarkdown(s2, { pluginVersion: "2.23.12" });

    expect(pruefe(s2.elements(), md2)).toEqual([]);
  });

  it("akzeptiert ein Textelement mit Leerzeile im Inhalt, dessen erste Zeile auf eine Blockreferenz endet (Fall 1)", () => {
    // Reproduktion Fehler 1: letzteZeilenProBlock() (die alte Grundlage des
    // Index) splittet auf /\n{2,}/ — demselben Muster, das sceneToMarkdown
    // zwischen zwei Elementblöcken einsetzt. Ein rawText mit eingebautem
    // Absatzumbruch ("Referenz-Beispiel ^abc12345\n\nSo verweist man auf einen
    // Block.") erzeugt zufällig dieselbe Doppel-Leerzeile *innerhalb* eines
    // einzigen Blocks. Die alte Implementierung zerlegte ihn fälschlich in
    // zwei Blöcke und einer davon sah wie ein Phantom-Indexeintrag zur ID
    // "abc12345" aus — die es nicht gibt. Das durfte keinen FEHLER auslösen.
    const s3 = scene();
    const f3 = s3.frame("Kapitel");
    f3.text("Referenz-Beispiel ^abc12345\n\nSo verweist man auf einen Block.", {
      typo: "standard",
      x: 40,
      y: 400,
    });
    const md3 = sceneToMarkdown(s3, { pluginVersion: "2.23.12" });

    expect(fehler(pruefe(s3.elements(), md3))).toEqual([]);
  });

  it("akzeptiert ein Textelement, dessen Inhalt mit '## ' beginnt (Fall 2)", () => {
    // Reproduktion Fehler 2: Die alte Sektionsgrenze erkannte jede Zeile, die
    // mit "## " beginnt, als nächste Überschrift — auch wenn diese Zeile
    // Elementinhalt ist (z. B. bei einem Nutzer, der Markdown-Überschriften
    // unterrichtet). Steht so eine Zeile am Anfang der Sektion, wird die
    // gesamte Sektion "## Text Elements" auf null Zeichen abgeschnitten und
    // der echte Indexeintrag geht verloren.
    const s4 = scene();
    const f4 = s4.frame("Kapitel");
    f4.text("## Ueberschriften in Markdown\nSo schreibt man sie.", {
      typo: "standard",
      x: 40,
      y: 400,
    });
    const md4 = sceneToMarkdown(s4, { pluginVersion: "2.23.12" });

    expect(fehler(pruefe(s4.elements(), md4))).toEqual([]);
  });

  it("stuft einen Index-Eintrag ohne zugehöriges Element als Warnung ein, nicht als Fehler", () => {
    // Die Rückrichtung ("Index nennt eine ID, zu der es kein Element gibt")
    // lässt sich nicht zuverlässig entscheiden — ein Textelement kann
    // legitim etwas enthalten, das wie eine Blockreferenz aussieht. Ein
    // FEHLER würde ein gültiges Board blockieren; eine WARNUNG nicht.
    const zuviel = markdown.replace("## Text Elements", "## Text Elements\nGespenst ^zzzzzzzz\n");
    const befunde = pruefe(s.elements(), zuviel);
    const treffer = befunde.find((b) => b.meldung.includes("zzzzzzzz"));
    expect(treffer).toBeDefined();
    expect(treffer.schwere).toBe(SCHWERE.warnung);
    expect(treffer.meldung).toMatch(/Fehlalarm|falsch.?positiv/i);
  });
});
