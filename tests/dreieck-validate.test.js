// tests/dreieck-validate.test.js
// Validiert die TATSÄCHLICH ausgelieferte Golden-Referenzszene (eine Quelle der
// Wahrheit) — so kann die Referenz nie von ihrer "validiert sauber"-Zusage
// abweichen (Schlussprüfungs-Fund: Golden und Test hatten verschiedene Parameter).
import { describe, it, expect } from "vitest";
import { sceneToMarkdown } from "../lib/document.js";
import { validateScene } from "../lib/validate/index.js";
import gewaltdreieck from "./golden/dreieck.mjs";

describe("Dreieck validiert sauber", () => {
  it("die ausgelieferte Gewaltdreieck-Golden erzeugt keinen Befund", () => {
    const md = sceneToMarkdown(gewaltdreieck, { pluginVersion: "x" });
    const { findings } = validateScene(gewaltdreieck.elements(), { markdown: md });
    expect(findings).toEqual([]);
  });
});
