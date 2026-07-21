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

  it("lässt ok wahr, wenn eine sonst gültige Szene nur eine gebrochene z-Reihenfolge trägt", () => {
    // Finding 3: Excalidraw sortiert selbst nach index, Array-Reihenfolge ist ihm
    // gleichgültig — 90 von 618 echten Boards im Vault verletzen sie und funktionieren
    // trotzdem. reihenfolge ist deshalb nur noch eine Warnung.
    const s = gueltigeSzene();
    const alle = s.elements();
    alle[0].index = "zz"; // bricht die aufsteigende Reihenfolge, ohne sonst etwas zu ändern
    const ergebnis = validateScene(alle, { registry: s.registry, zoomL0: 1 });
    expect(ergebnis.findings.some((b) => b.regel === "reihenfolge" && b.schwere === "warnung")).toBe(true);
    expect(ergebnis.ok).toBe(true);
  });

  it("erkennt eine Szene mit fremdem Elementtyp als außerhalb des Skill-Umfangs", () => {
    // Finding 1: der Validator soll das Scope-Problem kennzeichnen, nicht nur eine
    // Wand von [schema]-Fehlern liefern, die wie ein Defekt aussieht.
    const s = gueltigeSzene();
    const alle = s.elements();
    alle.push({ ...alle[0], id: "fremdes-element", type: "arrow" });
    const ergebnis = validateScene(alle, { registry: s.registry, zoomL0: 1 });
    expect(ergebnis.ausserhalbDesSkills).toEqual({ fremdeTypen: ["arrow"], fremdeSchriften: [] });
  });

  it("lässt ausserhalbDesSkills null für eine Szene, die dieser Skill selbst erzeugt", () => {
    const s = gueltigeSzene();
    const ergebnis = validateScene(s.elements(), { registry: s.registry, zoomL0: 1 });
    expect(ergebnis.ausserhalbDesSkills).toBeNull();
  });

  it("überspringt Geometrie/Textpassung/Lesbarkeit für Szenen außerhalb des Skill-Umfangs, statt abzustürzen", () => {
    // Vor dem Fix warf checkTextFit für fontFamily 1 (Virgil) eine Exception
    // (measureText kennt nur fontFamily 5/6) — validateScene stürzte für 160 echte
    // Vault-Dateien komplett ab, statt Befunde zu melden.
    const s = gueltigeSzene();
    const alle = s.elements();
    // Muss der GEBUNDENE Text sein: nur den prüft checkTextFit (misst gegen den
    // Container), und nur dort löste fontFamily 1 vor dem Fix eine Exception aus.
    const text = alle.find((e) => e.type === "text" && e.containerId);
    text.fontFamily = 1; // Virgil — von diesem Skill nie erzeugt
    expect(() => validateScene(alle, { registry: s.registry, zoomL0: 1 })).not.toThrow();
    const ergebnis = validateScene(alle, { registry: s.registry, zoomL0: 1 });
    expect(ergebnis.findings.some((b) => b.regel === "textpassung")).toBe(false);
    expect(ergebnis.findings.some((b) => b.regel === "lesbarkeit-l0" || b.regel === "lesbarkeit-l1")).toBe(false);
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

  it("fasst wortgleiche Befunde zu einer Zeile mit Trefferzahl zusammen, statt sie zu wiederholen", () => {
    // Finding 2: ein reales Board erzeugte 18 wortgleiche [schema]-Zeilen für "arrow".
    const meldung = 'Unbekannter Elementtyp "arrow" — Stufe 1 erzeugt nur rectangle, ellipse';
    const befunde = ["a", "b", "c", "d"].map((id) => ({ schwere: "fehler", regel: "schema", meldung, elementId: id }));
    const text = formatFindings(befunde);

    expect(text.match(/arrow/g)).toHaveLength(1); // die Meldung erscheint nur einmal
    expect(text).toContain("4×");
  });

  it("zeigt bei einer Sammelzeile nur einige, nicht alle betroffenen IDs", () => {
    const meldung = "z-Index steigt nicht";
    const vieleIds = Array.from({ length: 10 }, (_, i) => `id-${i}`);
    const befunde = vieleIds.map((id) => ({ schwere: "fehler", regel: "reihenfolge", meldung, elementId: id }));
    const text = formatFindings(befunde);

    expect(text).toContain("id-0");
    expect(text).not.toContain("id-9"); // nicht alle zehn IDs tauchen auf
    expect(text).toContain("weitere");
  });

  it("verschiedene Meldungen mit derselben Regel bleiben eigene Zeilen", () => {
    const befunde = [
      { schwere: "fehler", regel: "schema", meldung: "fontFamily 1 wird nicht erzeugt", elementId: "a" },
      { schwere: "fehler", regel: "schema", meldung: "fontFamily 2 wird nicht erzeugt", elementId: "b" },
    ];
    const text = formatFindings(befunde);
    expect(text).toContain("fontFamily 1");
    expect(text).toContain("fontFamily 2");
    expect(text.split("\n").filter((z) => z.startsWith("  ["))).toHaveLength(2);
  });

  it("Fehler und Warnungen mit identischer Meldung werden getrennt gruppiert", () => {
    const befunde = [
      { schwere: "fehler", regel: "x", meldung: "gleicher Text", elementId: "a" },
      { schwere: "warnung", regel: "x", meldung: "gleicher Text", elementId: "b" },
    ];
    const text = formatFindings(befunde);
    expect(text).toContain("1 Fehler:");
    expect(text).toContain("1 Warnungen:");
  });
});
