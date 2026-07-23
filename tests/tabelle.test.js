import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";
import { tabelle } from "../lib/layout.js";

function frame() {
  const s = scene();
  return { s, f: s.frame("K", { x: 0, y: 0 }) };
}

describe("tabelle", () => {
  it("erzeugt eine Kopfzeile je Spalte", () => {
    const { f } = frame();
    const t = tabelle(f, ["Kategorie", "Erklärung", "Beispiel"], { zeilen: 3, x: 100, y: 100, breite: 900 });
    expect(t.kopf).toHaveLength(3);
    expect(t.kopf.map((k) => k.rawText)).toEqual(["Kategorie", "Erklärung", "Beispiel"]);
  });

  it("setzt senkrechte Trennlinien an inneren Spaltengrenzen und eine Kopflinie", () => {
    const { f } = frame();
    const t = tabelle(f, ["A", "B", "C"], { zeilen: 2, x: 100, y: 100, breite: 900 });
    // 3 Spalten → 2 senkrechte innere Trennlinien; Spaltenbreite 300 → x=400, x=700
    const senkrecht = t.linien.filter((l) => l.width === 0);
    expect(senkrecht.map((l) => l.x).sort((a, b) => a - b)).toEqual([400, 700]);
    // mindestens eine waagerechte (Kopflinie)
    expect(t.linien.some((l) => l.height === 0)).toBe(true);
  });

  it("zeilen erzeugt leere Ausfüllzellen (null)", () => {
    const { f } = frame();
    const t = tabelle(f, ["A", "B"], { zeilen: 2, x: 0, y: 0, breite: 600 });
    expect(t.zellen).toHaveLength(2);
    expect(t.zellen[0]).toEqual([null, null]);
  });

  it("inhalt füllt Zellen und lässt leere Strings leer", () => {
    const { f } = frame();
    const t = tabelle(f, ["A", "B"], { inhalt: [["x", ""], ["", "y"]], x: 0, y: 0, breite: 600 });
    expect(t.zellen[0][0].rawText).toBe("x");
    expect(t.zellen[0][1]).toBe(null);
    expect(t.zellen[1][0]).toBe(null);
    expect(t.zellen[1][1].rawText).toBe("y");
  });

  it("rahmen 'gitter' fügt waagerechte Zeilenlinien hinzu", () => {
    const { f } = frame();
    const spalten = tabelle(f, ["A", "B"], { zeilen: 3, x: 0, y: 0, breite: 600, rahmen: "spalten" });
    const gitter  = tabelle(f, ["A", "B"], { zeilen: 3, x: 0, y: 0, breite: 600, rahmen: "gitter" });
    const waag = (t) => t.linien.filter((l) => l.height === 0).length;
    expect(waag(gitter)).toBeGreaterThan(waag(spalten));
  });

  it("wirft bei fehlender oder doppelter Inhaltsangabe", () => {
    const { f } = frame();
    expect(() => tabelle(f, ["A"], { x: 0, y: 0, breite: 300 })).toThrow();
    expect(() => tabelle(f, ["A"], { zeilen: 2, inhalt: [["x"]], x: 0, y: 0, breite: 300 })).toThrow();
  });

  it("wirft, wenn eine inhalt-Zeile nicht zur Spaltenzahl passt", () => {
    const { f } = frame();
    expect(() => tabelle(f, ["A", "B"], { inhalt: [["x"]], x: 0, y: 0, breite: 600 })).toThrow();
  });
});
