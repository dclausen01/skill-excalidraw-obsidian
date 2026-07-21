import { describe, it, expect } from "vitest";
import { createFindings } from "../lib/validate/findings.js";
import { checkTextIndex } from "../lib/validate/structure.js";
import { scene } from "../lib/scene.js";
import { sceneToMarkdown } from "../lib/document.js";

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
});
