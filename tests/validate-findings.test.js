import { describe, it, expect } from "vitest";
import { createFindings, SCHWERE } from "../lib/validate/findings.js";

describe("createFindings", () => {
  it("beginnt leer und ohne Fehler", () => {
    const f = createFindings();
    expect(f.all()).toEqual([]);
    expect(f.hasErrors()).toBe(false);
  });

  it("nimmt Fehler und Warnungen mit ihren Feldern auf", () => {
    const f = createFindings();
    f.error("schema", "Pflichtfeld fehlt", "abc12345");
    f.warn("lesbarkeit", "Zu klein für L1");

    expect(f.all()).toEqual([
      { schwere: SCHWERE.fehler, regel: "schema", meldung: "Pflichtfeld fehlt", elementId: "abc12345" },
      { schwere: SCHWERE.warnung, regel: "lesbarkeit", meldung: "Zu klein für L1", elementId: null },
    ]);
  });

  it("meldet Fehler, aber nicht bei reinen Warnungen", () => {
    const nurWarnung = createFindings();
    nurWarnung.warn("abstand", "zu eng");
    expect(nurWarnung.hasErrors()).toBe(false);

    const mitFehler = createFindings();
    mitFehler.error("schema", "kaputt");
    expect(mitFehler.hasErrors()).toBe(true);
  });

  it("erhält die Aufnahmereihenfolge", () => {
    const f = createFindings();
    f.warn("a", "erste");
    f.error("b", "zweite");
    f.warn("c", "dritte");
    expect(f.all().map((b) => b.regel)).toEqual(["a", "b", "c"]);
  });
});
