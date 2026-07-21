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
});
