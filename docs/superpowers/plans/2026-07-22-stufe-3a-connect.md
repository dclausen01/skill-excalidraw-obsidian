# Excalidraw-Tafelbild-Skill — Stufe 3a: connect() und Pfeile

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `connect(a, b)` zieht einen gebundenen Pfeil zwischen zwei Formen — mit korrekt berechneten Punkten, beidseitiger Bindung und optionalem Label —, der Renderer zeigt ihn verbunden, und der Validator prüft die Bindungsintegrität.

**Architecture:** Ein neues Modul `lib/connect.js` berechnet aus der Geometrie zweier Formen die Pfeilpunkte und `fixedPoint`-Werte und baut das Pfeilelement. Das Szenen-Objekt bekommt eine Methode `connect(a, b, opts)`, die den Pfeil registriert und beide Formen beidseitig bindet. Der Validator, der Pfeil-Bindungen in Stufe 2a bewusst ausklammerte, prüft sie jetzt.

**Tech Stack:** Node ≥ 20 (ESM), vitest. Keine neuen Abhängigkeiten.

## Global Constraints

- **Node ≥ 20**, ausschließlich ESM. Keine CommonJS-Dateien.
- **Pfade nie fest verdrahtet** — immer aus `lib/config.js`.
- **Sprache im Code:** Einheitlichkeit je Modul. `lib/connect.js` ist technisch → exportierte Namen englisch (`connect`, `arrowElement`, `fixedPointFor`). Die Befundstruktur des Validators bleibt deutsch (`schwere`, `regel`, `meldung`), `elementId` englisch. Lokale Variablen und Kommentare deutsch.
- **Determinismus:** Dieselbe Szene erzeugt byte-identische Ausgabe. `id`, `seed`, `versionNonce` des Pfeils aus dem Inhalt abgeleitet, nie gewürfelt.
- **`points` müssen exakt stimmen** (durch Spike belegt, Spec 2.4.1): Der Renderpfad zeichnet die `points` wie angegeben und reroutet nicht aus der Bindung. `connect()` berechnet die Pfeilpunkte selbst aus der Geometrie beider Formen. Die Bindungs-Metadaten halten den Pfeil nur beim späteren Verschieben in Obsidian verbunden.
- **`fixedPoint`-Werte für Kantenmitten** (Spec 2.4.1): rechts `[1.0, 0.5001]`, links `[0.0, 0.5001]`, unten `[0.5001, 1.0]`, oben `[0.5001, 0.0]`.
- **Pfeilfelder** (Spec 2.4.1): `points`, `lastCommittedPoint: null`, `startArrowhead`, `endArrowhead: "arrow"`, `elbowed: false`, `roundness: { type: 2 }`, `moveMidPointsWithElement: false`, plus die Basisfelder jedes Elements.
- **Bestehende 262 Tests müssen grün bleiben.**
- **Der Vault wird zuletzt angefasst** — unverändert aus den Vorstufen.

## Dateistruktur dieser Stufe

| Datei | Verantwortung |
|---|---|
| `lib/connect.js` | Pfeilgeometrie: Kantenwahl, Punkte, `fixedPoint`, Pfeilelement, optionales Label |
| `lib/scene.js` | **Änderung:** Methode `connect(a, b, opts)` ergänzen |
| `lib/index.js` | **Änderung:** `connect`-bezogene Exporte |
| `lib/validate/structure.js` | **Änderung:** Pfeil-Bindungsintegrität prüfen |

**Nicht in dieser Stufe:** Layout-Helfer (`row`/`column`/`grid`/`radial`/`timeline`/`stack`), `sequence()`, Obsidian-Anbindung (Links, Bilder, Transklusion), Spezialkomponenten. Das sind die Pläne 3b und 3c.

---

### Task 1: Kantenwahl und fixedPoint

**Files:**
- Create: `lib/connect.js`
- Test: `tests/connect-geometry.test.js`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `fixedPointFor(seite: "rechts"|"links"|"oben"|"unten"): [number, number]`
  - `edgeMidpoint(box: {x,y,width,height}, seite): [number, number]` — absoluter Punkt der Kantenmitte
  - `chooseSides(a, b): { start: string, end: string }` — welche Kanten einander zugewandt sind, aus den Mittelpunkten der beiden Boxen

Ein Element hier ist minimal `{ x, y, width, height }` — die Bounding-Box genügt.

- [ ] **Step 1: Test schreiben**

```js
// tests/connect-geometry.test.js
import { describe, it, expect } from "vitest";
import { fixedPointFor, edgeMidpoint, chooseSides } from "../lib/connect.js";

describe("fixedPointFor", () => {
  it("liefert die normalisierten Kantenmitten aus der Spezifikation", () => {
    expect(fixedPointFor("rechts")).toEqual([1.0, 0.5001]);
    expect(fixedPointFor("links")).toEqual([0.0, 0.5001]);
    expect(fixedPointFor("unten")).toEqual([0.5001, 1.0]);
    expect(fixedPointFor("oben")).toEqual([0.5001, 0.0]);
  });
});

describe("edgeMidpoint", () => {
  const box = { x: 100, y: 200, width: 80, height: 40 };
  it("rechts ist die Mitte der rechten Kante", () => {
    expect(edgeMidpoint(box, "rechts")).toEqual([180, 220]);
  });
  it("oben ist die Mitte der oberen Kante", () => {
    expect(edgeMidpoint(box, "oben")).toEqual([140, 200]);
  });
});

describe("chooseSides", () => {
  it("wählt rechts→links, wenn A links von B liegt", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 400, y: 0, width: 100, height: 100 };
    expect(chooseSides(a, b)).toEqual({ start: "rechts", end: "links" });
  });
  it("wählt unten→oben, wenn A über B liegt", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 0, y: 400, width: 100, height: 100 };
    expect(chooseSides(a, b)).toEqual({ start: "unten", end: "oben" });
  });
  it("nimmt die dominante Achse bei diagonaler Lage", () => {
    // Größerer horizontaler als vertikaler Abstand → horizontale Kanten
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 400, y: 120, width: 100, height: 100 };
    expect(chooseSides(a, b)).toEqual({ start: "rechts", end: "links" });
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/connect-geometry.test.js`
Expected: FAIL, `Cannot find module '../lib/connect.js'`

- [ ] **Step 3: Implementieren**

```js
// lib/connect.js

/** Normalisierte Kantenmitte auf der Bounding-Box (Spec 2.4.1). Die 0.5001 statt
 *  0.5 stammt aus der echten Vault-Datei und vermeidet die Mehrdeutigkeit des
 *  exakten Mittelpunkts. */
export function fixedPointFor(seite) {
  switch (seite) {
    case "rechts": return [1.0, 0.5001];
    case "links":  return [0.0, 0.5001];
    case "unten":  return [0.5001, 1.0];
    case "oben":   return [0.5001, 0.0];
    default: throw new Error(`Unbekannte Seite "${seite}"`);
  }
}

/** Absoluter Punkt der Kantenmitte einer Box. */
export function edgeMidpoint(box, seite) {
  const [fx, fy] = fixedPointFor(seite);
  return [box.x + fx * box.width, box.y + fy * box.height];
}

/** Welche Kanten von A und B einander zugewandt sind — nach der dominanten Achse
 *  zwischen den Mittelpunkten. */
export function chooseSides(a, b) {
  const amx = a.x + a.width / 2;
  const amy = a.y + a.height / 2;
  const bmx = b.x + b.width / 2;
  const bmy = b.y + b.height / 2;
  const dx = bmx - amx;
  const dy = bmy - amy;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { start: "rechts", end: "links" } : { start: "links", end: "rechts" };
  }
  return dy >= 0 ? { start: "unten", end: "oben" } : { start: "oben", end: "unten" };
}
```

Zur `fixedPoint`-Mitte: `edgeMidpoint` nutzt exakt die normalisierten Werte aus `fixedPointFor`, damit gezeichneter Punkt und Bindungs-Ankerpunkt auf dieselbe Stelle zeigen. Die 0,0001-Verschiebung ist dabei vernachlässigbar (`0.5001 * width` statt `0.5 * width`) und in den Tests über ganze Pixel unsichtbar — die Testboxen sind so gewählt, dass die Mitten glatt aufgehen.

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/connect-geometry.test.js`
Expected: PASS, 7 Tests

Schlägt ein `edgeMidpoint`-Test wegen der 0,0001-Verschiebung fehl (z. B. 220,004 statt 220), im Test `toBeCloseTo` statt `toEqual` verwenden und im Kommentar festhalten, dass die Verschiebung gewollt ist.

- [ ] **Step 5: Commit**

```bash
git add lib/connect.js tests/connect-geometry.test.js
git commit -m "feat: Kantenwahl und fixedPoint für gebundene Pfeile"
```

---

### Task 2: Pfeilelement bauen

**Files:**
- Modify: `lib/connect.js`
- Test: `tests/connect-arrow.test.js`

**Interfaces:**
- Consumes: `chooseSides`, `edgeMidpoint`, `fixedPointFor` aus `lib/connect.js`; `elementId`, `seedFor`, `versionNonceFor` aus `lib/ids.js`; `STRICH` aus `lib/style.js`
- Produces: `arrowElement({ a, b, ordnung, seite? }): object` — ein vollständiges Pfeilelement mit korrekten `points` und beidseitigem `startBinding`/`endBinding`. `a` und `b` sind die Ziel-**Container** (`{ id, x, y, width, height }`). `seite` erlaubt optional feste Kanten `{ start, end }` statt automatischer Wahl.

Das Pfeilelement trägt noch keine `index`; die vergibt `scene.elements()`. Es trägt noch keine Einträge in den `boundElements` der Ziele; das macht Task 3.

- [ ] **Step 1: Test schreiben**

```js
// tests/connect-arrow.test.js
import { describe, it, expect } from "vitest";
import { arrowElement } from "../lib/connect.js";

const a = { id: "aaaaaaaa", x: 0, y: 0, width: 100, height: 100 };
const b = { id: "bbbbbbbb", x: 400, y: 0, width: 100, height: 100 };

describe("arrowElement", () => {
  const pfeil = arrowElement({ a, b, ordnung: 5 });

  it("ist ein Pfeil mit den Pflicht-Sonderfeldern", () => {
    expect(pfeil.type).toBe("arrow");
    expect(pfeil.endArrowhead).toBe("arrow");
    expect(pfeil.startArrowhead).toBe(null);
    expect(pfeil.elbowed).toBe(false);
    expect(pfeil.roundness).toEqual({ type: 2 });
    expect(pfeil.lastCommittedPoint).toBe(null);
    expect(pfeil.moveMidPointsWithElement).toBe(false);
  });

  it("startet an A's rechter Kantenmitte und endet an B's linker", () => {
    // A rechts mittig = (100, 50); B links mittig = (400, 50)
    expect(pfeil.x).toBeCloseTo(100, 1);
    expect(pfeil.y).toBeCloseTo(50, 1);
    // points sind Offsets von x,y: erster [0,0], letzter zeigt auf (400,50)
    expect(pfeil.points[0]).toEqual([0, 0]);
    const [lx, ly] = pfeil.points[pfeil.points.length - 1];
    expect(pfeil.x + lx).toBeCloseTo(400, 1);
    expect(pfeil.y + ly).toBeCloseTo(50, 1);
  });

  it("bindet beide Seiten mit den passenden fixedPoints", () => {
    expect(pfeil.startBinding).toEqual({ elementId: "aaaaaaaa", mode: "orbit", fixedPoint: [1.0, 0.5001] });
    expect(pfeil.endBinding).toEqual({ elementId: "bbbbbbbb", mode: "orbit", fixedPoint: [0.0, 0.5001] });
  });

  it("ist deterministisch", () => {
    const bauen = () => arrowElement({ a, b, ordnung: 5 });
    expect(JSON.stringify(bauen())).toBe(JSON.stringify(bauen()));
  });

  it("respektiert fest vorgegebene Seiten", () => {
    const p = arrowElement({ a, b, ordnung: 5, seite: { start: "unten", end: "oben" } });
    expect(p.startBinding.fixedPoint).toEqual([0.5001, 1.0]);
    expect(p.endBinding.fixedPoint).toEqual([0.5001, 0.0]);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/connect-arrow.test.js`
Expected: FAIL, `arrowElement is not a function`

- [ ] **Step 3: Implementieren**

```js
// Ergänzung in lib/connect.js
import { elementId, seedFor, versionNonceFor } from "./ids.js";
import { STRICH } from "./style.js";

/**
 * Baut ein gebundenes Pfeilelement zwischen den Containern a und b.
 * Die points werden aus der echten Geometrie berechnet — der Renderpfad
 * zeichnet sie wie angegeben und reroutet nicht (Spec 2.4.1).
 */
export function arrowElement({ a, b, ordnung, seite = null }) {
  const seiten = seite ?? chooseSides(a, b);
  const [startX, startY] = edgeMidpoint(a, seiten.start);
  const [endX, endY] = edgeMidpoint(b, seiten.end);

  const id = elementId(`arrow:${a.id}->${b.id}`, ordnung);

  // points sind Offsets von der eigenen x,y. Erster Punkt liegt im Ursprung.
  const points = [[0, 0], [endX - startX, endY - startY]];

  return {
    id,
    type: "arrow",
    x: startX,
    y: startY,
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
    angle: 0,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: STRICH.fillStyle,
    strokeWidth: STRICH.strokeWidth,
    strokeStyle: "solid",
    roughness: STRICH.roughness,
    opacity: 100,
    groupIds: [],
    frameId: null,
    index: "a0",              // wird von scene.elements() überschrieben
    roundness: STRICH.roundnessArrow,
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
    endArrowhead: "arrow",
    elbowed: false,
    startBinding: { elementId: a.id, mode: "orbit", fixedPoint: fixedPointFor(seiten.start) },
    endBinding: { elementId: b.id, mode: "orbit", fixedPoint: fixedPointFor(seiten.end) },
    hasTextLink: false,
    moveMidPointsWithElement: false,
  };
}
```

`STRICH.roundnessArrow` ist `{ type: 2 }` (aus `lib/style.js`), `STRICH.strokeWidth` ist 2, `STRICH.roughness` ist 1. Falls ein Name abweicht, in `lib/style.js` nachsehen und den echten verwenden — nicht raten.

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/connect-arrow.test.js`
Expected: PASS, 5 Tests

- [ ] **Step 5: Commit**

```bash
git add lib/connect.js tests/connect-arrow.test.js
git commit -m "feat: gebundenes Pfeilelement mit berechneten Punkten"
```

---

### Task 3: connect() am Szenen-Objekt

**Files:**
- Modify: `lib/scene.js`, `lib/index.js`
- Test: `tests/scene-connect.test.js`

**Interfaces:**
- Consumes: `arrowElement` aus `lib/connect.js`; `textElement` aus `lib/elements.js`
- Produces:
  - `scene()` gibt zusätzlich `connect(a, b, opts?)` zurück
  - `connect(a, b, { label?, seite? })` — `a` und `b` sind die Rückgaben von `frame.box()`/`.ellipse()`/`.diamond()` (also `{ container, text }`) **oder** direkt ein Container. Zieht den Pfeil, trägt ihn beidseitig in die `boundElements` der Container ein, hängt bei `label` ein mittiges Textelement an den Pfeil. Gibt das Pfeilelement zurück.
  - `lib/index.js` re-exportiert `connect` aus `lib/connect.js` (die geometrische Funktion, für Tests und Fortgeschrittene) — die bequeme Methode ist `scene().connect`.

**Zur Mutation:** Die von `frame.box()` zurückgegebenen Container sind **dieselben Objekte**, die intern in `kinder` liegen. `elements()` spreadet jedes Element flach in ein neues Objekt, kopiert also die `boundElements`-Array-Referenz — eine Mutation der `boundElements` am Container bleibt daher in der Ausgabe erhalten. Das ist der Mechanismus, auf dem `connect` beruht.

- [ ] **Step 1: Test schreiben**

```js
// tests/scene-connect.test.js
import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";

function containerVon(ergebnis) {
  return ergebnis.container ?? ergebnis;
}

describe("scene().connect", () => {
  it("fügt der Szene ein Pfeilelement hinzu", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const a = f.box("A", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    const b = f.box("B", { rolle: "kern", typo: "kernbegriff", x: 600, y: 100 });
    s.connect(a, b);
    const pfeile = s.elements().filter((e) => e.type === "arrow");
    expect(pfeile).toHaveLength(1);
  });

  it("bindet den Pfeil beidseitig in die boundElements der Container", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const a = f.box("A", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    const b = f.box("B", { rolle: "kern", typo: "kernbegriff", x: 600, y: 100 });
    const pfeil = s.connect(a, b);

    const alle = s.elements();
    const ca = alle.find((e) => e.id === containerVon(a).id);
    const cb = alle.find((e) => e.id === containerVon(b).id);
    expect(ca.boundElements.some((x) => x.id === pfeil.id && x.type === "arrow")).toBe(true);
    expect(cb.boundElements.some((x) => x.id === pfeil.id && x.type === "arrow")).toBe(true);
  });

  it("hängt bei label ein Textelement an den Pfeil", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const a = f.box("A", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    const b = f.box("B", { rolle: "kern", typo: "kernbegriff", x: 600, y: 100 });
    const pfeil = s.connect(a, b, { label: "führt zu" });

    const alle = s.elements();
    const label = alle.find((e) => e.type === "text" && e.containerId === pfeil.id);
    expect(label).toBeTruthy();
    expect(label.rawText).toBe("führt zu");
    expect(pfeil.boundElements.some((x) => x.id === label.id && x.type === "text")).toBe(true);
  });

  it("bleibt deterministisch", () => {
    const baue = () => {
      const s = scene();
      const f = s.frame("Kapitel");
      const a = f.box("A", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
      const b = f.box("B", { rolle: "kern", typo: "kernbegriff", x: 600, y: 100 });
      s.connect(a, b, { label: "x" });
      return JSON.stringify(s.elements());
    };
    expect(baue()).toBe(baue());
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/scene-connect.test.js`
Expected: FAIL, `s.connect is not a function`

- [ ] **Step 3: Implementieren**

In `lib/scene.js`: `arrowElement` und `textElement` importieren (letzteres ist schon importiert), und innerhalb von `scene()` vor dem `return` die Funktion `connect` ergänzen. Sie braucht Zugriff auf `kinder`, `ordnung` und `registry` — steht also im Closure richtig.

```js
// In lib/scene.js, Import ergänzen:
import { arrowElement } from "./connect.js";

// Innerhalb von scene(), vor dem return:
function connect(a, b, { label = null, seite = null } = {}) {
  const ca = a.container ?? a;
  const cb = b.container ?? b;

  const pfeil = arrowElement({ a: ca, b: cb, ordnung: ordnung++, seite });
  kinder.push(pfeil);

  // Beidseitig binden: beide Container führen den Pfeil in ihren boundElements.
  ca.boundElements = [...(ca.boundElements ?? []), { id: pfeil.id, type: "arrow" }];
  cb.boundElements = [...(cb.boundElements ?? []), { id: pfeil.id, type: "arrow" }];

  if (label !== null) {
    // Label sitzt mittig auf dem Pfeil (Excalidraw positioniert gebundenen
    // Pfeiltext selbst; wir setzen es an die Pfeilmitte als Startwert).
    const mitteX = pfeil.x + pfeil.points.at(-1)[0] / 2;
    const mitteY = pfeil.y + pfeil.points.at(-1)[1] / 2;
    const labelEl = textElement(
      { inhalt: label, typo: "detail", x: mitteX, y: mitteY, containerId: pfeil.id, ordnung: ordnung++ },
      registry,
    );
    labelEl.frameId = pfeil.frameId;
    kinder.push(labelEl);
    pfeil.boundElements = [...pfeil.boundElements, { id: labelEl.id, type: "text" }];
  }

  return pfeil;
}

// return-Zeile erweitern:
return { titel, frame, connect, elements, dimensions, registry };
```

In `lib/index.js` ergänzen:

```js
export { connect, arrowElement, fixedPointFor } from "./connect.js";
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/scene-connect.test.js`
Expected: PASS, 4 Tests

- [ ] **Step 5: Volle Suite**

Run: `npx vitest run`
Expected: PASS, alle 262 bisherigen plus die neuen. Achte besonders darauf, dass `tests/scene.test.js` grün bleibt — die `return`-Zeile von `scene()` wurde erweitert.

- [ ] **Step 6: Commit**

```bash
git add lib/scene.js lib/index.js tests/scene-connect.test.js
git commit -m "feat: scene().connect zieht gebundene Pfeile mit optionalem Label"
```

---

### Task 4: Validator prüft Pfeil-Bindungen

**Files:**
- Modify: `lib/validate/structure.js`
- Test: `tests/validate-arrows.test.js`

**Interfaces:**
- Consumes: `createFindings` aus `lib/validate/findings.js`
- Produces: `checkArrowBindings(elements, befunde): void` — ergänzt die bestehende Prüfkette. Wird in Task 5 in `validateScene` eingehängt (hier nur die Funktion und ihr Test).

Stufe 2a klammerte Pfeil-Bindungen aus, weil es noch keine Pfeile gab. Jetzt gibt es sie. Geprüft wird beidseitig: Jede `startBinding`/`endBinding` eines Pfeils muss auf ein existierendes Element zeigen, und dieses Element muss den Pfeil in `boundElements` führen. Umgekehrt: Jeder Pfeil-Eintrag in den `boundElements` einer Form muss ein existierender Pfeil sein, der zurückzeigt. Alles harte Fehler — eine kaputte Bindung macht die Datei falsch.

- [ ] **Step 1: Test schreiben**

```js
// tests/validate-arrows.test.js
import { describe, it, expect } from "vitest";
import { createFindings } from "../lib/validate/findings.js";
import { checkArrowBindings } from "../lib/validate/structure.js";
import { scene } from "../lib/scene.js";

function baueVerbunden() {
  const s = scene();
  const f = s.frame("Kapitel");
  const a = f.box("A", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
  const b = f.box("B", { rolle: "kern", typo: "kernbegriff", x: 600, y: 100 });
  s.connect(a, b);
  return s.elements();
}

function pruefe(elemente) {
  const befunde = createFindings();
  checkArrowBindings(elemente, befunde);
  return befunde.all();
}

describe("checkArrowBindings", () => {
  it("akzeptiert eine sauber verbundene Szene", () => {
    expect(pruefe(baueVerbunden())).toEqual([]);
  });

  it("meldet eine startBinding auf ein nicht existierendes Element", () => {
    const alle = baueVerbunden();
    alle.find((e) => e.type === "arrow").startBinding.elementId = "xxxxxxxx";
    expect(pruefe(alle).some((b) => b.regel === "pfeilbindung" && b.schwere === "fehler")).toBe(true);
  });

  it("meldet einen Pfeil, den sein Ziel nicht in boundElements führt", () => {
    const alle = baueVerbunden();
    const pfeil = alle.find((e) => e.type === "arrow");
    const ziel = alle.find((e) => e.id === pfeil.startBinding.elementId);
    ziel.boundElements = ziel.boundElements.filter((x) => x.id !== pfeil.id);
    expect(pruefe(alle).some((b) => b.regel === "pfeilbindung")).toBe(true);
  });

  it("meldet einen boundElements-Pfeileintrag ohne existierenden Pfeil", () => {
    const alle = baueVerbunden();
    const box = alle.find((e) => e.type === "rectangle");
    box.boundElements = [...(box.boundElements ?? []), { id: "yyyyyyyy", type: "arrow" }];
    expect(pruefe(alle).some((b) => b.regel === "pfeilbindung")).toBe(true);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/validate-arrows.test.js`
Expected: FAIL, `checkArrowBindings is not a function`

- [ ] **Step 3: Implementieren**

```js
// Ergänzung in lib/validate/structure.js

export function checkArrowBindings(elemente, befunde) {
  const nachId = new Map(elemente.map((e) => [e.id, e]));

  for (const el of elemente) {
    if (el.type !== "arrow") continue;

    for (const [rolle, bindung] of [["start", el.startBinding], ["end", el.endBinding]]) {
      if (!bindung) continue;
      const ziel = nachId.get(bindung.elementId);
      if (!ziel) {
        befunde.error("pfeilbindung", `Pfeil ${rolle}Binding verweist auf Element "${bindung.elementId}", das es nicht gibt`, el.id);
      } else if (!(ziel.boundElements ?? []).some((x) => x.id === el.id && x.type === "arrow")) {
        befunde.error("pfeilbindung", `Ziel "${ziel.id}" des Pfeils führt ihn nicht in boundElements`, el.id);
      }
    }
  }

  // Gegenrichtung: jeder Pfeil-Eintrag in boundElements muss ein existierender
  // Pfeil sein, der auf dieses Element zurückzeigt.
  for (const el of elemente) {
    for (const bezug of el.boundElements ?? []) {
      if (bezug.type !== "arrow") continue;
      const pfeil = nachId.get(bezug.id);
      if (!pfeil) {
        befunde.error("pfeilbindung", `boundElements nennt Pfeil "${bezug.id}", den es nicht gibt`, el.id);
      } else if (pfeil.startBinding?.elementId !== el.id && pfeil.endBinding?.elementId !== el.id) {
        befunde.error("pfeilbindung", `Pfeil "${bezug.id}" zeigt nicht auf "${el.id}" zurück`, el.id);
      }
    }
  }
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/validate-arrows.test.js`
Expected: PASS, 4 Tests

- [ ] **Step 5: Commit**

```bash
git add lib/validate/structure.js tests/validate-arrows.test.js
git commit -m "feat: Validator prüft Pfeil-Bindungsintegrität beidseitig"
```

---

### Task 5: Pfeilprüfung einhängen und Schema erweitern

**Files:**
- Modify: `lib/validate/index.js`, `lib/validate/structure.js`
- Test: `tests/validate-arrows-integration.test.js`

**Interfaces:**
- Consumes: `checkArrowBindings` aus `lib/validate/structure.js`
- Produces: `validateScene` ruft `checkArrowBindings` mit auf; `checkSchema` kennt `arrow` als gültigen Elementtyp mit seinen Pflichtfeldern.

Zwei Lücken schließen: `validateScene` ruft die neue Prüfung noch nicht auf, und `checkSchema` aus Stufe 2a lehnt `arrow` als „unbekannten Typ" ab, weil es damals keine Pfeile gab.

- [ ] **Step 1: Test schreiben**

```js
// tests/validate-arrows-integration.test.js
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
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/validate-arrows-integration.test.js`
Expected: FAIL — `arrow` gilt noch als unbekannter Typ und/oder die Bindungsprüfung läuft nicht mit.

- [ ] **Step 3: `checkSchema` um den Typ `arrow` erweitern**

In `lib/validate/structure.js` die `ZUSATZFELDER`-Tabelle um `arrow` ergänzen. Die
allgemeinen Pflichtfelder deckt `FORMAT_PFLICHTFELDER` schon ab (ein Pfeil trägt sie alle,
weil `arrowElement` dieselben Basisfelder wie jedes andere Element setzt); ein Pfeil führt
typspezifisch zusätzlich:

```js
// In ZUSATZFELDER ergänzen (die Felder sind bei einem Pfeil immer präsent, ggf. mit
// Wert null — checkSchema prüft nur auf === undefined, ein null-Binding besteht also):
  arrow: ["points", "startArrowhead", "endArrowhead", "elbowed",
          "startBinding", "endBinding", "lastCommittedPoint"],
```

`ERLAUBTE_TYPEN` entsteht aus `Object.keys(ZUSATZFELDER)` (verifiziert) — mit dem Eintrag
oben gilt `arrow` daher automatisch als erlaubter Typ, keine weitere Stelle nötig. Ein Pfeil
soll **keine** typspezifischen Konventionsfelder erben; `ZUSATZKONVENTIONSFELDER` bleibt
unangetastet.

- [ ] **Step 4: `checkArrowBindings` in `validateScene` einhängen**

In `lib/validate/index.js` den Import ergänzen und die Prüfung in die Kette aufnehmen — bei den harten Strukturprüfungen, nach `checkReferences`:

```js
import { checkSchema, checkReferences, checkTextIndex, checkArrowBindings } from "./structure.js";

// in validateScene, nach checkReferences(elemente, befunde):
  checkArrowBindings(elemente, befunde);
```

- [ ] **Step 5: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/validate-arrows-integration.test.js`
Expected: PASS, 3 Tests

- [ ] **Step 6: Volle Suite**

Run: `npx vitest run`
Expected: PASS, alles grün.

- [ ] **Step 7: Commit**

```bash
git add lib/validate/index.js lib/validate/structure.js tests/validate-arrows-integration.test.js
git commit -m "feat: arrow als gültiger Typ, Bindungsprüfung in der Pipeline"
```

---

### Task 6: Sichtprüfung am gerenderten Pfeil

**Files:**
- Create: `tests/golden/verbindung.mjs`, `tests/golden/verbindung.png` (generiert)
- Modify: keine Produktionsdatei

**Interfaces:**
- Consumes: `scene`, `sceneToObject`, `createRenderer` (bestehend)
- Produces: eine dritte Golden-Referenzszene, die einen gebundenen Pfeil mit Label abdeckt

Der Renderer beweist, dass der Pfeil verbunden erscheint — das kann kein struktureller Test. Diese Szene kommt in den bestehenden Golden-Test aus Stufe 2b, der automatisch jede `.mjs` in `tests/golden/` rendert und vergleicht.

- [ ] **Step 1: Referenzszene schreiben**

```js
// tests/golden/verbindung.mjs
// Deckt gebundene Pfeile mit Label und automatischer Kantenwahl ab.
import { scene } from "../../lib/scene.js";

const s = scene();
const f = s.frame("Verbindungen");
f.text("Ursache und Wirkung", { typo: "frametitel", x: 60, y: 50 });

const a = f.box("Instinktarmut", { rolle: "kern", typo: "kernbegriff", x: 120, y: 300 });
const b = f.box("Weltoffenheit", { rolle: "ergebnis", typo: "kernbegriff", x: 760, y: 300 });
const c = f.box("Kultur", { rolle: "technik", typo: "kernbegriff", x: 760, y: 650 });

s.connect(a, b, { label: "führt zu" });
s.connect(b, c);

export default s;
```

- [ ] **Step 2: Reproduzierbarkeit prüfen, dann Referenzbild erzeugen**

Bündel bauen, falls nötig, dann das Referenzbild erzeugen:

```bash
npm run build-renderer   # nur nötig, wenn renderer/dist fehlt
npm run update-golden
```

- [ ] **Step 3: Das Bild ansehen**

Öffne `tests/golden/verbindung.png` und prüfe mit dem Auge:
- Der Pfeil von „Instinktarmut" nach „Weltoffenheit" verbindet die rechte Kante der einen mit der linken der anderen, mit Pfeilspitze an der Zielkante.
- Das Label „führt zu" sitzt auf dem Pfeil.
- Der Pfeil von „Weltoffenheit" nach „Kultur" verläuft senkrecht, von unten nach oben.
- Kein Pfeil endet im Leeren oder als Stummel.

Sitzt ein Pfeil falsch, ist das ein echter Befund — er gehört gemeldet und die Geometrie in `lib/connect.js` korrigiert, nicht durch ein falsches Referenzbild zementiert.

- [ ] **Step 4: Volle Suite (der Golden-Test nimmt die neue Szene automatisch auf)**

Run: `npx vitest run tests/golden-render.test.js`
Expected: PASS — auch die neue `verbindung`-Szene rendert byte-identisch zu ihrem frischen Referenzbild.

- [ ] **Step 5: Sicherstellen, dass das Bild versioniert wird**

Run: `git check-ignore -v tests/golden/verbindung.png || echo "wird versioniert"`
Expected: `wird versioniert`

- [ ] **Step 6: Commit**

```bash
git add tests/golden/verbindung.mjs tests/golden/verbindung.png
git commit -m "feat: Golden-Referenz für gebundene Pfeile mit Label"
```

---

## Abschluss der Stufe 3a

Nach Task 6 gilt:

- `scene().connect(a, b, { label })` zieht einen gebundenen Pfeil zwischen zwei Formen, mit korrekt berechneten Punkten und beidseitiger Bindung.
- Der Validator prüft die Bindungsintegrität als harten Fehler.
- Der Renderer zeigt den Pfeil verbunden — visuell abgenommen und als Golden-Test festgeschrieben.

**Noch nicht möglich:** Formen automatisch anordnen (`row`/`column`/`grid`/`radial`/`timeline`/`stack`), Kapitel zu einem Präsentationsablauf verketten (`sequence`), Notiz-Links, Bilder, Transklusion. Das sind die Pläne 3b (Layout und Sequenz) und 3c (Obsidian-Anbindung).

**Offene Designfrage für 3b:** Die Layout-Helfer der Spezifikation (`radial(kap, zentrum, [box(...), ...])`) setzen voraus, dass Formen erst *beschrieben* und dann vom Helfer *platziert* werden — die aktuelle `frame.box(inhalt, opts)` platziert dagegen sofort an gegebenen Koordinaten. Ob die Helfer die Kinder selbst platzieren (und `frame.box` intern aufrufen) oder ein neues „Baustein-Spec"-Muster nötig ist, muss vor Plan 3b entschieden werden. Diese Entscheidung gehört mit Dennis besprochen, nicht im Plan geraten.
