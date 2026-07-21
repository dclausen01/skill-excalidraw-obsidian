import { describe, it, expect } from "vitest";
import { validateScene, formatFindings } from "../lib/validate/index.js";
import { scene } from "../lib/scene.js";
import { sceneToMarkdown } from "../lib/document.js";

function gueltigeSzene() {
  const s = scene();
  const f = s.frame("Kapitel");
  f.text("Der Mensch", { typo: "frametitel", x: 60, y: 60 });
  f.box("Mängelwesen", { rolle: "kern", typo: "kernbegriff", x: 200, y: 400 });
  return s;
}

describe("validateScene", () => {
  it("erklärt eine saubere Szene für gültig", () => {
    const s = gueltigeSzene();
    const ergebnis = validateScene(s.elements(), {
      markdown: sceneToMarkdown(s, { pluginVersion: "2.23.12" }),
      registry: s.registry,
      zoomL0: s.dimensions().zoomL0,
    });
    expect(ergebnis.findings.filter((b) => b.schwere === "fehler")).toEqual([]);
    expect(ergebnis.ok).toBe(true);
  });

  it("setzt ok auf false bei einem harten Fehler", () => {
    const s = gueltigeSzene();
    const alle = s.elements();
    alle[1].id = alle[0].id;
    const ergebnis = validateScene(alle, { registry: s.registry, zoomL0: 1 });
    expect(ergebnis.ok).toBe(false);
  });

  it("lässt ok bei reinen Warnungen wahr", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Eins", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    f.box("Zwei", { rolle: "kern", typo: "kernbegriff", x: 110, y: 110 });
    const ergebnis = validateScene(s.elements(), { registry: s.registry, zoomL0: 1 });
    expect(ergebnis.findings.some((b) => b.schwere === "warnung")).toBe(true);
    expect(ergebnis.ok).toBe(true);
  });

  it("prüft den Textindex nur, wenn Markdown mitgegeben wird", () => {
    const s = gueltigeSzene();
    const ohne = validateScene(s.elements(), { registry: s.registry, zoomL0: 1 });
    expect(ohne.findings.some((b) => b.regel === "textindex")).toBe(false);
  });

  it("ist deterministisch", () => {
    const s = gueltigeSzene();
    const a = validateScene(s.elements(), { registry: s.registry, zoomL0: 1 });
    const b = validateScene(s.elements(), { registry: s.registry, zoomL0: 1 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("formatFindings", () => {
  it("meldet Fehlerfreiheit verständlich", () => {
    expect(formatFindings([])).toContain("Keine Befunde");
  });

  it("nennt Schwere, Regel und Meldung", () => {
    const text = formatFindings([
      { schwere: "fehler", regel: "schema", meldung: "Feld fehlt", elementId: "abc12345" },
    ]);
    expect(text).toContain("schema");
    expect(text).toContain("Feld fehlt");
    expect(text).toContain("abc12345");
  });
});
