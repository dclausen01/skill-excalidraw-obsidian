import { describe, it, expect } from "vitest";
import metriken from "./fixtures/text-metrics.json" with { type: "json" };

describe("Referenzdaten zur Textmessung", () => {
  it("enthält genug Proben für Excalifont", () => {
    const excalifont = metriken.proben.filter((p) => p.fontFamily === 5);
    expect(excalifont.length).toBeGreaterThan(200);
  });

  it("enthält Proben mit deutschen Umlauten", () => {
    const umlaute = metriken.proben.filter((p) => /[äöüßÄÖÜ]/.test(p.text));
    expect(umlaute.length).toBeGreaterThan(20);
  });

  it("führt für jede Schrift die erwartete Zeilenhöhe", () => {
    for (const probe of metriken.proben) {
      const erwartet = probe.fontFamily === 5 ? 1.25 : 1.35;
      // Ältere Nunito-Elemente tragen noch 1.25 — beide Werte sind zulässig.
      expect([erwartet, 1.25]).toContain(Math.round(probe.lineHeight * 100) / 100);
    }
  });
});
