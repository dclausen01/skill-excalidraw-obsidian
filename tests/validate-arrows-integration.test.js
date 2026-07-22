import { describe, it, expect } from "vitest";
import { validateScene } from "../lib/validate/index.js";
import { scene } from "../lib/scene.js";
import { sceneToMarkdown } from "../lib/document.js";

function baueVerbunden() {
  const s = scene();
  const f = s.frame("Kapitel");
  f.text("Titel", { typo: "frametitel", x: 60, y: 60 });
  const a = f.box("A", { rolle: "kern", typo: "kernbegriff", x: 100, y: 300 });
  const b = f.box("B", { rolle: "kern", typo: "kernbegriff", x: 700, y: 300 });
  s.connect(a, b, { label: "führt zu" });
  return s;
}

describe("validateScene mit Pfeilen", () => {
  it("erklärt eine verbundene Szene für gültig", () => {
    const s = baueVerbunden();
    const ergebnis = validateScene(s.elements(), {
      markdown: sceneToMarkdown(s, { pluginVersion: "2.23.12" }),
      registry: s.registry,
      zoomL0: s.dimensions().zoomL0,
    });
    expect(ergebnis.findings.filter((b) => b.schwere === "fehler")).toEqual([]);
    expect(ergebnis.ok).toBe(true);
  });

  it("lehnt einen Pfeil mit kaputter Bindung als ungültig ab", () => {
    const s = baueVerbunden();
    const alle = s.elements();
    alle.find((e) => e.type === "arrow").startBinding.elementId = "xxxxxxxx";
    const ergebnis = validateScene(alle, { registry: s.registry, zoomL0: 1 });
    expect(ergebnis.ok).toBe(false);
  });

  it("wertet arrow nicht mehr als unbekannten Elementtyp", () => {
    const s = baueVerbunden();
    const ergebnis = validateScene(s.elements(), { registry: s.registry, zoomL0: 1 });
    expect(ergebnis.findings.some((b) => b.meldung.includes('Unbekannter Elementtyp "arrow"'))).toBe(false);
  });
});
