// tests/dreieck-validate.test.js
import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";
import { dreieck } from "../lib/shapes/dreieck.js";
import { sceneToMarkdown } from "../lib/document.js";
import { validateScene } from "../lib/validate/index.js";

describe("Dreieck validiert sauber", () => {
  it("erzeugt keinen Befund (neue Form → keine Falschwarnung)", () => {
    const s = scene();
    const f = s.frame("Gewaltdreieck");
    f.text("Das Gewaltdreieck nach Galtung", { typo: "frametitel", x: 60, y: 55 });
    dreieck(f, ["personelle Gewalt", "strukturelle Gewalt", "kulturelle Gewalt"],
      { x: 600, y: 300, breite: 700 });
    const md = sceneToMarkdown(s, { pluginVersion: "x" });
    const { findings } = validateScene(s.elements(), { markdown: md });
    expect(findings).toEqual([]);
  });
});
