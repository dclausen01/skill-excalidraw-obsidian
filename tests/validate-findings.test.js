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

  it("gibt eine Kopie zurück: Pushing auf all() ändert die interne Liste nicht", () => {
    const f = createFindings();
    f.warn("original", "erste");

    const befundeVonAll = f.all();
    expect(befundeVonAll).toHaveLength(1);

    // Versuche, die zurückgegebene Liste zu mutieren
    befundeVonAll.push({ schwere: SCHWERE.fehler, regel: "injiziert", meldung: "sollte nicht sichtbar sein", elementId: null });

    // Ein frischer Aufruf von all() sollte nur den ursprünglichen Eintrag enthalten
    expect(f.all()).toHaveLength(1);
    expect(f.all()[0].regel).toBe("original");
  });

  it("gibt eine Kopie zurück: Mutieren von Objekten in all() ändert hasErrors() nicht", () => {
    const f = createFindings();
    f.error("regel1", "meldung1");

    expect(f.hasErrors()).toBe(true);

    // Versuche, den Fehler zu "Warnung" zu mutieren
    const befunde = f.all();
    befunde[0].schwere = SCHWERE.warnung;

    // hasErrors() sollte immer noch true zurückgeben, weil die interne Liste nicht mutiert wurde
    expect(f.hasErrors()).toBe(true);
  });
});
