# `line`-Primitiv und `tabelle`-Helfer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein punktbasiertes `line`-Primitiv (offen/geschlossen, keine Füllung) und ein `tabelle`-Helfer, der daraus Ausfüll- und Vergleichstabellen mit Spalten-Trennlinien komponiert.

**Architecture:** `lineElement` (neue Fabrik in `lib/elements.js`) erzeugt Excalidraw-`line`-Elemente nach dem Muster von `arrowElement`, aber ohne Pfeilspitzen/Bindungen. `f.line` auf dem Frame platziert frame-relativ. `tabelle` (Layout-Helfer in `lib/layout.js`) komponiert `frame.line` (Trennlinien) mit `frame.text` (Kopf/Zellen). Der Validator kennt `line` als Typ und nimmt es — wie Pfeile — aus der Überlappungsprüfung aus.

**Tech Stack:** Node ≥ 20 (ESM), vitest, bestehender Puppeteer-Renderer.

## Global Constraints

- **Node ≥ 20**, ausschließlich ESM.
- **Determinismus:** dieselbe Szene → byte-identische Ausgabe. Inhaltsbasierte ids/seeds (`elementId`/`seedFor`/`versionNonceFor` aus `lib/ids.js`).
- **Sprache:** deutsche Optionsschlüssel und lokale Bezeichner (`punkte`, `geschlossen`, `strichbreite`, `zeilen`, `inhalt`, `rahmen`); technische Exporte englisch (`lineElement`, `tabelle`).
- **Hausstil:** Trennlinien in `kontext`-Grau (`#868e96`), dünn. `STRICH` und `FARBROLLEN` aus `lib/style.js`.
- **`line`-Elementstruktur (Spike bestätigt, Spec 2.2):** geschlossene Formen über **Loopback** (ersten Punkt am Ende wiederholen), NICHT über ein `polygon`-Flag. `roundness: null`, keine Bindungen/Pfeilspitzen.
- **Golden-PNGs byte-identisch;** bestehende Tests bleiben grün.

## Dateistruktur

| Datei | Verantwortung |
|---|---|
| `lib/elements.js` | **neu:** `lineElement(...)` |
| `lib/scene.js` | **Änderung:** `f.line(...)` im Frame-Objekt |
| `lib/layout.js` | **neu:** `tabelle(...)` |
| `lib/index.js` | **Änderung:** Export `tabelle` |
| `lib/validate/structure.js` | **Änderung:** `line` in `ZUSATZFELDER` |
| `lib/validate/layout.js` | **Änderung:** `line` aus Überlappungsprüfung ausnehmen |
| `references/{builder-api,muster}.md` | **Änderung:** `f.line`/`tabelle` dokumentieren |
| `tests/…` | Unit-, Validator-, Golden-Tests |

Der `line`-Spike ist bereits erfolgt; seine Erkenntnisse stehen in Spec 2.2 (Loopback, Feldwerte). Kein Spike-Task mehr.

---

### Task 1: `lineElement` und `f.line`

**Files:**
- Modify: `lib/elements.js`, `lib/scene.js`
- Test: `tests/line-element.test.js`

**Interfaces:**
- Consumes: `elementId`, `seedFor`, `versionNonceFor` (`lib/ids.js`); `STRICH`, `FARBROLLEN` (`lib/style.js`).
- Produces:
  - `lineElement({ punkte, rolle = "kontext", geschlossen = false, strichbreite, ordnung }) → line-Element`. `punkte` sind **absolute** `[x,y]`-Koordinaten (≥ 2). Die Fabrik normalisiert: `x`/`y` = min-Ecke, `points` = Offsets, bei `geschlossen` wird der erste Punkt am Ende wiederholt.
  - `f.line(punkte, { rolle?, geschlossen?, strichbreite? }) → line-Element`. `punkte` sind **frame-relativ**; `f.line` addiert `posX`/`posY` und ruft `lineElement`.

- [ ] **Step 1: Test schreiben**

```js
// tests/line-element.test.js
import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";
import { FARBROLLEN } from "../lib/style.js";

describe("f.line", () => {
  it("erzeugt eine offene Linie mit korrekten Punkten und Bounding-Box", () => {
    const s = scene();
    const f = s.frame("K", { x: 0, y: 0 });
    const l = f.line([[200, 150], [200, 650]]);          // senkrecht, frame-relativ
    expect(l.type).toBe("line");
    expect(l.x).toBe(200);
    expect(l.y).toBe(150);
    expect(l.points).toEqual([[0, 0], [0, 500]]);
    expect(l.width).toBe(0);
    expect(l.height).toBe(500);
    expect(l.strokeColor).toBe(FARBROLLEN.kontext.strich);
    expect(l.roundness).toBe(null);
    expect(l.frameId).toBe(f.element.id);
  });

  it("schließt eine Form per Loopback (erster Punkt am Ende wiederholt)", () => {
    const s = scene();
    const f = s.frame("K", { x: 0, y: 0 });
    const dreieck = f.line([[0, 260], [300, 260], [150, 0]], { geschlossen: true });
    // min-Ecke (0,0); Offsets; erster Punkt am Ende wiederholt
    expect(dreieck.points).toEqual([[0, 260], [300, 260], [150, 0], [0, 260]]);
    expect(dreieck.width).toBe(300);
    expect(dreieck.height).toBe(260);
  });

  it("übernimmt die Strichfarbe aus der Rolle", () => {
    const s = scene();
    const f = s.frame("K", { x: 0, y: 0 });
    const l = f.line([[0, 0], [100, 0]], { rolle: "kern" });
    expect(l.strokeColor).toBe(FARBROLLEN.kern.strich);
  });

  it("rechnet frame-relative Punkte in absolute um", () => {
    const s = scene();
    const f = s.frame("K", { x: 1000, y: 500 });
    const l = f.line([[10, 20], [10, 120]]);
    expect(l.x).toBe(1010);
    expect(l.y).toBe(520);
  });

  it("ist deterministisch", () => {
    const baue = () => {
      const s = scene();
      s.frame("K", { x: 0, y: 0 }).line([[0, 0], [0, 300]]);
      return JSON.stringify(s.elements());
    };
    expect(baue()).toBe(baue());
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/line-element.test.js`
Expected: FAIL — `f.line is not a function`.

- [ ] **Step 3: `lineElement` implementieren**

In `lib/elements.js` (Importe `elementId`/`seedFor`/`versionNonceFor` sind vorhanden; `STRICH`/`FARBROLLEN` aus `./style.js` ergänzen, falls nicht schon importiert):

```js
export function lineElement({ punkte, rolle = "kontext", geschlossen = false, strichbreite, ordnung }) {
  if (!Array.isArray(punkte) || punkte.length < 2) {
    throw new Error("line braucht mindestens zwei Punkte");
  }
  const pkt = geschlossen ? [...punkte, punkte[0]] : punkte;
  const xs = pkt.map((p) => p[0]);
  const ys = pkt.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const points = pkt.map((p) => [p[0] - minX, p[1] - minY]);
  const id = elementId(`line:${JSON.stringify(punkte)}:${geschlossen}`, ordnung);

  return {
    id,
    type: "line",
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
    angle: 0,
    strokeColor: (FARBROLLEN[rolle] ?? FARBROLLEN.kontext).strich,
    backgroundColor: "transparent",
    fillStyle: STRICH.fillStyle,
    strokeWidth: strichbreite ?? STRICH.strokeWidth,
    strokeStyle: "solid",
    roughness: STRICH.roughness,
    opacity: 100,
    groupIds: [],
    frameId: null,               // von f.line gesetzt
    index: "a0",                 // von scene.elements() überschrieben
    roundness: null,
    seed: seedFor(id),
    version: 1,
    versionNonce: versionNonceFor(id),
    isDeleted: false,
    boundElements: [],
    updated: 1,
    link: null,
    locked: false,
    points,
    lastCommittedPoint: null,
    startArrowhead: null,
    endArrowhead: null,
    startBinding: null,
    endBinding: null,
  };
}
```

In `lib/scene.js`: `lineElement` in die Importzeile aus `./elements.js` aufnehmen und im zurückgegebenen Frame-Objekt (neben `image`/`transclusion`) ergänzen:

```js
line: (punkte, opts = {}) => {
  const absolut = punkte.map(([px, py]) => [posX + px, posY + py]);
  const l = lineElement({ punkte: absolut, rolle: opts.rolle, geschlossen: opts.geschlossen, strichbreite: opts.strichbreite, ordnung: ordnung++ });
  l.frameId = element.id;
  kinder.push(l);
  return l;
},
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/line-element.test.js`
Expected: PASS (5 Tests).

- [ ] **Step 5: Volle Suite**

Run: `npx vitest run`
Expected: PASS (bestehende Tests unberührt; `render.test.js` kann unter Last flackern — isoliert nachprüfen).

- [ ] **Step 6: Commit**

```bash
git add lib/elements.js lib/scene.js tests/line-element.test.js
git commit -m "feat: line-Primitiv (lineElement + f.line, offen/geschlossen per Loopback)"
```

---

### Task 2: `line` in den Validator

**Files:**
- Modify: `lib/validate/structure.js`, `lib/validate/layout.js`
- Test: `tests/validate-line.test.js`

**Interfaces:**
- Consumes: `createFindings`, `checkSchema`, `checkGeometry`.
- Produces: `line` ist erlaubter Elementtyp (`ZUSATZFELDER.line = ["points"]`); `checkGeometry` schließt `line` aus der Überlappungsprüfung aus.

- [ ] **Step 1: Test schreiben**

```js
// tests/validate-line.test.js
import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";
import { sceneToMarkdown } from "../lib/document.js";
import { validateScene } from "../lib/validate/index.js";

describe("Validator kennt line", () => {
  it("akzeptiert eine Linie als bekannten Typ (kein Schema-Fehler)", () => {
    const s = scene();
    const f = s.frame("K", { x: 0, y: 0 });
    f.line([[600, 100], [600, 800]]);
    const md = sceneToMarkdown(s, { pluginVersion: "x" });
    const befunde = validateScene(s.elements(), { markdown: md });
    expect(befunde.every((b) => b.regel !== "schema")).toBe(true);
  });

  it("meldet KEINE Überlappung, wenn eine Trennlinie zwischen/über Kästen liegt", () => {
    const s = scene();
    const f = s.frame("K", { x: 0, y: 0 });
    f.box("A", { rolle: "kern", typo: "kernbegriff", x: 100, y: 300 });
    f.box("B", { rolle: "kern", typo: "kernbegriff", x: 700, y: 300 });
    f.line([[650, 250], [650, 500]]);         // senkrecht zwischen A und B, überlappt bbox-technisch nichts Echtes
    const befunde = validateScene(s.elements(), {});
    expect(befunde.some((b) => b.regel === "ueberlappung")).toBe(false);
  });

  it("warnt weiterhin bei echter Kasten-Überlappung", () => {
    const s = scene();
    const f = s.frame("K", { x: 0, y: 0 });
    f.box("A", { rolle: "kern", typo: "kernbegriff", x: 100, y: 300, breite: 400, hoehe: 200 });
    f.box("B", { rolle: "kern", typo: "kernbegriff", x: 200, y: 350, breite: 400, hoehe: 200 });
    const befunde = validateScene(s.elements(), {});
    expect(befunde.some((b) => b.regel === "ueberlappung")).toBe(true);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/validate-line.test.js`
Expected: FAIL — `line` ist unbekannter Typ (Schema-Fehler) bzw. die Linie löst eine Überlappungswarnung aus.

- [ ] **Step 3: Implementieren**

In `lib/validate/structure.js`, `ZUSATZFELDER` um `line` ergänzen:

```js
  line: ["points"],
```

(Damit ist `line` automatisch in `ERLAUBTE_TYPEN` und `detectOutOfScope`; `KONVENTIONSFELDER` frameId/index/link bringt das Element über `lineElement` mit, kein `ZUSATZKONVENTIONSFELDER`-Eintrag nötig.)

In `lib/validate/layout.js`, `checkGeometry`, den Körper-Filter (aktuell Zeile 67) um `line` erweitern:

```js
  const koerper = eigenstaendig.filter((e) => e.type !== "frame" && e.type !== "arrow" && e.type !== "line");
```

Den bestehenden Kommentar über den Pfeil-Ausschluss um `line` ergänzen (dünne Bounding-Box, sitzt absichtlich zwischen/über Zellen — dieselbe Lektion wie bei Pfeilen).

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/validate-line.test.js`
Expected: PASS (3 Tests).

- [ ] **Step 5: Volle Suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/validate/structure.js lib/validate/layout.js tests/validate-line.test.js
git commit -m "feat: Validator kennt line (erlaubter Typ, aus Überlappungsprüfung ausgenommen)"
```

---

### Task 3: `tabelle`-Helfer

**Files:**
- Modify: `lib/layout.js`, `lib/index.js`
- Test: `tests/tabelle.test.js`

**Interfaces:**
- Consumes: `frame.text`, `frame.line` (aus Task 1), `TYPO`/`ABSTAND` falls nötig.
- Produces: `tabelle(frame, kopf, { zeilen?, inhalt?, x = 0, y = 0, breite, zeilenhoehe = 100, rahmen = "spalten" }) → { kopf: [...], zellen: [[...]], linien: [...] }`.

**Layout-Regeln:** Spaltenbreite `breite / kopf.length`. Kopfzeile als Text je Spalte in **größerer Typo** (`kernbegriff`), Zellinhalte in `standard` — die Hierarchie kommt über die Schriftgröße, nicht über Farbe (`textElement` kennt keine Farbrolle). Linksbündig mit kleinem Innenabstand (`polster = 20`). Kopfhöhe fest (`kopfhoehe = 60`). Körperzeilen je `zeilenhoehe`. Senkrechte Trennlinien an inneren Spaltengrenzen über die gesamte Tabellenhöhe; waagerechte Linie unter dem Kopf; bei `rahmen: "gitter"` zusätzlich zwischen den Körperzeilen. Leere Zellen → kein Element (`null` in `zellen`).

- [ ] **Step 1: Test schreiben**

```js
// tests/tabelle.test.js
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
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/tabelle.test.js`
Expected: FAIL — `tabelle is not a function` (bzw. nicht importierbar).

- [ ] **Step 3: Implementieren**

In `lib/layout.js` (Ende der Datei), `tabelle` ergänzen:

```js
/**
 * Ausfüll- oder Vergleichstabelle. `kopf` = Spaltenüberschriften. Genau eine
 * Inhaltsangabe: `zeilen` (N leere Ausfüllzeilen) ODER `inhalt` (2D-Array,
 * "" = Ausfüllfeld). Rahmen standardmäßig nur Spalten-Trennlinien + Kopflinie;
 * "gitter" zusätzlich Zeilenlinien. Nutzt frame.text (Kopf/Zellen) und
 * frame.line (Trennlinien, kontext-Grau).
 */
export function tabelle(frame, kopf, { zeilen, inhalt, x = 0, y = 0, breite, zeilenhoehe = 100, rahmen = "spalten" } = {}) {
  if (!Array.isArray(kopf) || kopf.length === 0) throw new Error("tabelle braucht mindestens eine Kopfspalte");
  if (!breite) throw new Error("tabelle braucht eine breite");
  const hatZeilen = typeof zeilen === "number";
  const hatInhalt = Array.isArray(inhalt);
  if (hatZeilen === hatInhalt) throw new Error("tabelle braucht genau eines: zeilen ODER inhalt");

  const spalten = kopf.length;
  const zeilenInhalt = hatInhalt ? inhalt : Array.from({ length: zeilen }, () => Array(spalten).fill(""));
  for (const zeile of zeilenInhalt) {
    if (zeile.length !== spalten) throw new Error(`inhalt-Zeile hat ${zeile.length} Spalten, erwartet ${spalten}`);
  }

  const spaltenbreite = breite / spalten;
  const kopfhoehe = 60;
  const polster = 20;
  const anzahlZeilen = zeilenInhalt.length;
  const gesamthoehe = kopfhoehe + anzahlZeilen * zeilenhoehe;

  // Kopf
  const kopfTexte = kopf.map((titel, s) =>
    frame.text(titel, { typo: "kernbegriff", x: x + s * spaltenbreite + polster, y: y + polster }),
  );

  // Zellen
  const zellen = zeilenInhalt.map((zeile, z) =>
    zeile.map((wert, s) =>
      wert === ""
        ? null
        : frame.text(wert, { typo: "standard", x: x + s * spaltenbreite + polster, y: y + kopfhoehe + z * zeilenhoehe + polster }),
    ),
  );

  // Linien
  const linien = [];
  for (let s = 1; s < spalten; s++) {                 // senkrechte innere Trennlinien
    const lx = x + s * spaltenbreite;
    linien.push(frame.line([[lx, y], [lx, y + gesamthoehe]]));
  }
  linien.push(frame.line([[x, y + kopfhoehe], [x + breite, y + kopfhoehe]]));   // Kopflinie
  if (rahmen === "gitter") {
    for (let z = 1; z < anzahlZeilen; z++) {
      const ly = y + kopfhoehe + z * zeilenhoehe;
      linien.push(frame.line([[x, ly], [x + breite, ly]]));
    }
  }

  return { kopf: kopfTexte, zellen, linien };
}
```

In `lib/index.js` den Export ergänzen:

```js
export { row, column, grid, radial, timeline, stack, tabelle } from "./layout.js";
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/tabelle.test.js`
Expected: PASS (7 Tests).

- [ ] **Step 5: Volle Suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/layout.js lib/index.js tests/tabelle.test.js
git commit -m "feat: tabelle-Helfer (Kopf + zeilen/inhalt, Spalten-Trennlinien via line)"
```

---

### Task 4: Referenzen dokumentieren

**Files:**
- Modify: `references/builder-api.md`, `references/muster.md`
- Test: keine (Doku)

**Interfaces:**
- Consumes: die APIs aus Task 1 und 3.
- Produces: `f.line` und `tabelle` sind in den Skill-Referenzen dokumentiert; „Noch nicht baubar" in `muster.md` um Trennlinien/Tabellenrahmen gekürzt.

- [ ] **Step 1: `builder-api.md` erweitern**

Nach dem Abschnitt „Obsidian-Anbindung" (oder bei den Formen) einen Abschnitt einfügen:

````markdown
## Linien und Tabellen

```js
// Freie Linie (offen). Punkte frame-relativ. Standard: dünnes kontext-Grau.
f.line([[600, 200], [600, 800]]);                 // senkrechte Trennlinie
f.line([[0, 260], [300, 260], [150, 0]], { geschlossen: true });  // geschlossener Umriss

// Ausfüll-/Vergleichstabelle
tabelle(f, ["Kategorie", "Erklärung"], { zeilen: 4, x: 100, y: 200, breite: 900 });
tabelle(f, ["Pro", "Contra"], { inhalt: [["…", "…"], ["", ""]], x: 100, y: 200, breite: 900 });
```

- `f.line(punkte, { rolle?, geschlossen?, strichbreite? })` — punktbasiert (≥ 2 Punkte), keine Füllung, kein Text. `geschlossen: true` schließt den Umriss.
- `tabelle(frame, kopf, { zeilen? | inhalt?, x, y, breite, zeilenhoehe?, rahmen? })` — Kopf Pflicht; genau `zeilen: N` (leer) **oder** `inhalt` (2D-Array, `""` = Ausfüllfeld). `rahmen`: `"spalten"` (Standard, nur Spalten-Trennlinien + Kopflinie) oder `"gitter"`. Rückgabe `{ kopf, zellen, linien }`.
````

- [ ] **Step 2: `muster.md` aktualisieren**

In der Frame-Ebene-Tabelle die Zeile „Tabelle zum Ausfüllen" auf den neuen Helfer umstellen:

```markdown
| **Tabelle zum Ausfüllen** | `tabelle(frame, kopf, { zeilen })` — Spaltenköpfe + leere Zeilen mit Spalten-Trennlinien | Stichworte vorgeben, Leerraum zum Handschriftlichen |
```

Im Abschnitt „Noch nicht baubar" die Trennlinien/Tabellenrahmen streichen:

```markdown
Mengenkreise (Venn), Dreiecke (z. B. Gewaltdreieck), Programmablaufpläne. Wenn ein Board das braucht, ehrlich sagen — nicht behelfsmäßig mit falschen Primitiven nachbauen.
```

- [ ] **Step 3: Commit**

```bash
git add references/builder-api.md references/muster.md
git commit -m "docs: f.line und tabelle in Skill-Referenzen"
```

---

### Task 5: Golden-Referenz Ausfüll-Tabelle

**Files:**
- Create: `tests/golden/tabelle.mjs`, `tests/golden/tabelle.png` (generiert)
- Test: `tests/golden-render.test.js` (bestehend, greift automatisch)

**Interfaces:**
- Consumes: `scene`, `f.line`, `tabelle`, der Renderer.
- Produces: eine Golden-Referenzszene, die eine 3-Spalten-Ausfüll-Tabelle abdeckt.

**Dieser Task gehört dem Controller** (wie die früheren Golden-Tasks): Szene schreiben, `npm run update-golden`, **das Bild mit dem Read-Tool ansehen** und prüfen (Trennlinien an den Spaltengrenzen, Kopflinie unter dem Kopf, genug Schreibraum, dezentes Grau), erst dann committen.

- [ ] **Step 1: Referenzszene schreiben**

```js
// tests/golden/tabelle.mjs
// Deckt f.line (über tabelle) und den tabelle-Helfer ab: 3-Spalten-Ausfülltafel.
import { scene } from "../../lib/scene.js";
import { tabelle } from "../../lib/layout.js";

const s = scene();
const f = s.frame("Kategorientafel");
f.text("Die Kategorien nach Kant", { typo: "frametitel", x: 60, y: 55 });
tabelle(f, ["Kategorie", "Erklärung", "Beispiel"], { zeilen: 4, x: 120, y: 220, breite: 1600, zeilenhoehe: 120 });

export default s;
```

- [ ] **Step 2: Golden erzeugen und geänderte PNGs prüfen**

Run: `npm run update-golden`
Dann prüfen, dass **nur** `tabelle.png` neu ist (bestehende Golden byte-identisch): `git status --short tests/golden/`.

- [ ] **Step 3: Das Bild ansehen (Controller, Read-Tool)**

`tests/golden/tabelle.png` öffnen und prüfen: drei gleich breite Spalten, senkrechte graue Trennlinien an den Spaltengrenzen, waagerechte Linie unter der Kopfzeile, vier leere Zeilen mit genug Schreibraum, Köpfe in größerer Typo (`kernbegriff`) deutlich vom Zellraum abgehoben. Bei Mängeln `tabelle` bzw. Standardwerte (`zeilenhoehe`, `strichbreite`) anpassen und neu erzeugen.

- [ ] **Step 4: Golden-Test**

Run: `npx vitest run tests/golden-render.test.js`
Expected: PASS — die neue Szene byte-identisch, bestehende unverändert.

- [ ] **Step 5: Commit**

```bash
git add tests/golden/tabelle.mjs tests/golden/tabelle.png
git commit -m "feat: Golden-Referenz Ausfüll-Tabelle (line + tabelle)"
```

---

## Abschluss

Nach Task 5:

- `f.line` erzeugt offene und (per Loopback) geschlossene Linien; im Validator bekannt und aus der Überlappungsprüfung ausgenommen.
- `tabelle` komponiert Ausfüll- und Vergleichstabellen mit Spalten-Trennlinien; in den Referenzen dokumentiert; per Golden visuell bestätigt.
- **Nächste Stufe-4-Zyklen:** Dreieck (nutzt `line` geschlossen + Füllung), Mengenkreise/Venn, Programmablaufplan. Sowie separat: SVG-Unterstützung für `f.image` (Feature-Wunsch), Minor aus 3c-Schlussprüfung, Bereitstellung auf anderen Rechnern.
