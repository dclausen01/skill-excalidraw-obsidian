import { describe, it, expect } from "vitest";
import { createFindings } from "../lib/validate/findings.js";
import { checkGeometry } from "../lib/validate/layout.js";
import { scene } from "../lib/scene.js";
import { ABSTAND } from "../lib/style.js";
import { radial } from "../lib/layout.js";

function pruefe(elemente) {
  const befunde = createFindings();
  checkGeometry(elemente, befunde);
  return befunde.all();
}

describe("checkGeometry", () => {
  it("akzeptiert zwei Kästen mit Abstand", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Eins", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    f.box("Zwei", { rolle: "kern", typo: "kernbegriff", x: 100, y: 600 });
    expect(pruefe(s.elements())).toEqual([]);
  });

  it("meldet zwei überlappende Kästen", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Eins", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    f.box("Zwei", { rolle: "kern", typo: "kernbegriff", x: 110, y: 110 });
    const befunde = pruefe(s.elements());
    expect(befunde.some((b) => b.regel === "ueberlappung" && b.schwere === "warnung")).toBe(true);
  });

  it("wertet Container und gebundenen Text nicht als Überlappung", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    expect(pruefe(s.elements()).filter((b) => b.regel === "ueberlappung")).toEqual([]);
  });

  it("meldet zwei überlappende Kästen mit gebundenem Text nur einmal", () => {
    // Ohne den Ausschluss gebundenen Texts würde eine einzige Überlappung
    // zweier Kästen bis zu vier Meldungen erzeugen (Kasten/Kasten,
    // Kasten/Text, Text/Kasten, Text/Text) — diese Regression fängt genau das.
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Eins", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    f.box("Zwei", { rolle: "kern", typo: "kernbegriff", x: 110, y: 110 });
    const treffer = pruefe(s.elements()).filter((b) => b.regel === "ueberlappung");
    expect(treffer.length).toBe(1);
  });

  it("meldet ein Kind, das über seinen Frame hinausragt", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Weit draußen", { rolle: "kern", typo: "kernbegriff", x: 1850, y: 100 });
    const befunde = pruefe(s.elements());
    expect(befunde.some((b) => b.regel === "framegrenze")).toBe(true);
  });

  it("meldet zwei zu eng stehende Frames", () => {
    const s = scene();
    s.frame("Erstes");
    s.frame("Zweites", { x: 1920 + ABSTAND.frames - 40, y: 0 });
    const befunde = pruefe(s.elements());
    expect(befunde.some((b) => b.regel === "frameabstand")).toBe(true);
  });

  it("akzeptiert den vorgesehenen Frame-Abstand", () => {
    const s = scene();
    s.frame("Erstes");
    s.frame("Zweites");
    expect(pruefe(s.elements()).filter((b) => b.regel === "frameabstand")).toEqual([]);
  });

  it("zählt zwei berührende Kästen nicht als Überlappung", () => {
    // Zwei Boxen mit gemeinsamer Kante (Abstand = 0) sollten nicht als
    // Überlappung erkannt werden. Berührung != Überlappung.
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Eins", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100, breite: 100 });
    f.box("Zwei", { rolle: "kern", typo: "kernbegriff", x: 200, y: 100, breite: 100 });
    const befunde = pruefe(s.elements());
    expect(befunde.filter((b) => b.regel === "ueberlappung")).toEqual([]);
  });

  it("akzeptiert ein Kind, das bündig mit der Frame-Kante abschließt", () => {
    // Ein Kind genau an der Frame-Grenze (Abstand = 0) sollte nicht als
    // „ragt hinaus" erkannt werden. Bündig ist erlaubt.
    const s = scene();
    const f = s.frame("Kapitel", { x: 0, y: 0 });
    f.box("Bündig", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0, breite: 100 });
    const befunde = pruefe(s.elements());
    expect(befunde.filter((b) => b.regel === "framegrenze")).toEqual([]);
  });

  it("akzeptiert zwei Frames genau mit ABSTAND.frames Abstand", () => {
    // Zwei Frames genau ABSTAND.frames (240) Einheiten auseinander sollten nicht
    // vor Unterschreitung warnen. Das ist die akzeptierte Minimaldistanz.
    const s = scene();
    s.frame("Erstes", { x: 0, y: 0 });
    s.frame("Zweites", { x: 1920 + ABSTAND.frames, y: 0 });
    const befunde = pruefe(s.elements());
    expect(befunde.filter((b) => b.regel === "frameabstand")).toEqual([]);
  });

  it("meldet keine Überlappung für einen verbundenen Pfeil (radial)", () => {
    // arrowElement() (connect.js) speichert x/y als Pfeil-Startpunkt und
    // width/height als absolute Ausdehnung, nicht als Top-Left-AABB. Bei einem
    // nach links/oben laufenden Pfeil zeigt diese Box in die falsche Richtung
    // und überlappt scheinbar die Form, mit der der Pfeil verbunden ist —
    // genau das Muster, das radial() erzeugt (Schlussprüfung, Finding 2).
    const s = scene();
    const f = s.frame("Kapitel");
    const { zentrum, satelliten } = radial(
      f, "Mängelwesen",
      ["Instinktarmut", "Weltoffenheit", "Kultur als 2. Natur", "Frühgeburt"],
      { rolle: "kern", typo: "kernbegriff", radius: 340, x: 960, y: 580 },
    );
    for (const sat of satelliten) s.connect(zentrum, sat);

    const befunde = pruefe(s.elements());
    expect(befunde.filter((b) => b.regel === "ueberlappung")).toEqual([]);
  });

  it("meldet echte Überlappung zweier Kästen weiterhin, auch wenn ein Pfeil in der Szene ist", () => {
    // Der Ausschluss von Pfeilen aus der Überlappungsprüfung darf die eigentliche
    // Prüfung nicht verwässern: zwei aufeinanderliegende Boxen müssen weiterhin
    // warnen.
    const s = scene();
    const f = s.frame("Kapitel");
    const a = f.box("Eins", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    const b = f.box("Zwei", { rolle: "kern", typo: "kernbegriff", x: 110, y: 110 });
    s.connect(a, b);
    const befunde = pruefe(s.elements());
    expect(befunde.some((bef) => bef.regel === "ueberlappung")).toBe(true);
  });

  it("warnt nicht vor Frames im diagonalen Abstand über Euclideanische Grenzwert", () => {
    // Zwei Frames, je 200 Einheiten in x und y versetzt: Die echte
    // Distanz ist √(200² + 200²) ≈ 282,84, weit über den 240er Grenzwert.
    // max(200, 200) ist aber 200, was die falsche Formel fälschlicherweise
    // als Unterschreitung flaggt. Das sollte nicht passieren.
    const s = scene();
    s.frame("Erstes", { x: 0, y: 0 });
    s.frame("Zweites", { x: 1920 + 200, y: 1080 + 200 });
    const befunde = pruefe(s.elements());
    expect(befunde.filter((b) => b.regel === "frameabstand")).toEqual([]);
  });
});
