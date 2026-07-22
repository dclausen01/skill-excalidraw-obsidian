# Excalidraw-Tafelbild-Skill — Stufe 3b: Layout-Helfer und sequence()

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Layout-Helfer (`row`, `column`, `grid`, `radial`, `timeline`, `stack`) ordnen Formen automatisch an, und `sequence()` verkettet Kapitel-Frames zu einem Präsentationsablauf mit nummerierten Übergangspfeilen.

**Architecture:** Ein Modul `lib/layout.js`, dessen Funktionen den Frame, Inhalte (als Strings) und einen Abstands-Token bekommen, die Positionen berechnen und intern `frame.box()` an diesen Positionen aufrufen — das vom Nutzer entschiedene Modell „Helfer platziert selbst" (Spec 5, Ebene 2). Sie geben die platzierten Formen zurück. `sequence()` bindet Übergangspfeile direkt an Frames (durch Spike belegt).

**Tech Stack:** Node ≥ 20 (ESM), vitest. Keine neuen Abhängigkeiten.

## Global Constraints

- **Node ≥ 20**, ausschließlich ESM. Keine CommonJS-Dateien.
- **Pfade nie fest verdrahtet** — immer aus `lib/config.js`.
- **Sprache im Code:** `lib/layout.js` ist technisch → exportierte Namen englisch (`row`, `column`, `grid`, `radial`, `timeline`, `stack`, `sequence`). Optionsschlüssel und Rollenwerte deutsch (`{ rolle: "kern", abstand: "normal" }`). Lokale Variablen und Kommentare deutsch.
- **Platzierungsmodell (Spec 5):** Helfer bekommen den Frame, Inhalte als Strings und Optionen, rufen intern `frame.box()` (bzw. die per `typ` gewählte Fabrik) an berechneten Positionen auf und geben die platzierten Formen zurück.
- **Abstands-Token** aus `lib/style.js`: `ABSTAND = { eng: 40, normal: 80, weit: 160, frames: 240 }`. Helfer nehmen einen Token `"eng"|"normal"|"weit"`, kein roher Pixelwert.
- **Determinismus:** Dieselbe Szene erzeugt byte-identische Ausgabe. Die Helfer fügen der Szene Elemente in fester Reihenfolge hinzu.
- **Koordinaten sind Frame-relativ.** `frame.box(inhalt, { x, y })` rechnet die Frame-relativen Koordinaten selbst in absolute um (bestehende `scene.js`-Logik). Die Helfer geben also Frame-relative Positionen an `frame.box()`.
- **Bestehende 288 Tests müssen grün bleiben.**

## Dateistruktur dieser Stufe

| Datei | Verantwortung |
|---|---|
| `lib/layout.js` | Layout-Helfer: Positionsberechnung, ruft `frame.box()` auf |
| `lib/index.js` | **Änderung:** Layout-Helfer exportieren |
| `lib/scene.js` | **Änderung:** `sequence(frames, opts)` als Szenen-Methode |

**Nicht in dieser Stufe:** Obsidian-Anbindung (Links, Bilder, Transklusion — Plan 3c), Spezialkomponenten (Mengenkreise, Dreieck, PAP — Stufe 4).

## Das gemeinsame Muster der Helfer

Jeder Helfer der Ebene 2 hat dieselbe Signatur-Form:

```
helfer(frame, inhalte: string[], { typ?, rolle?, typo?, abstand?, ... }): PlatzierteForm[]
```

- `frame` — das von `scene().frame(...)` zurückgegebene Objekt mit `.box`/`.ellipse`/`.diamond`/`.text`.
- `inhalte` — die Texte der Formen, als Strings.
- `typ` — welche Fabrik: `"box"` (Standard), `"ellipse"`, `"diamond"`.
- `rolle`, `typo` — an jede Form durchgereicht.
- `abstand` — Token, Standard `"normal"`.
- Rückgabe: das Array der `frame.box()`-Rückgaben (`{ container, text }`), in Eingabereihenfolge.

`radial` weicht ab (Zentrum plus Satelliten) und ist in seiner Task beschrieben.

---

### Task 1: row und column

**Files:**
- Create: `lib/layout.js`
- Test: `tests/layout-row-column.test.js`

**Interfaces:**
- Consumes: `ABSTAND` aus `lib/style.js`
- Produces:
  - `row(frame, inhalte, opts?): Array<{container, text}>` — Formen nebeneinander, linksbündig ab `opts.x ?? 0`, gleiche `y`
  - `column(frame, inhalte, opts?): Array<{container, text}>` — Formen untereinander
  - Gemeinsame Optionen: `{ typ = "box", rolle = "neutral", typo = "standard", abstand = "normal", x = 0, y = 0 }`

Der Abstand ist der Zwischenraum zwischen den Bounding-Boxen benachbarter Formen. Weil die Formgrößen aus dem Text entstehen und erst nach dem Platzieren feststehen, platziert der Helfer eine Form, liest ihre Breite/Höhe aus der Rückgabe und setzt die nächste um Formbreite + Abstand versetzt.

- [ ] **Step 1: Test schreiben**

```js
// tests/layout-row-column.test.js
import { describe, it, expect } from "vitest";
import { row, column } from "../lib/layout.js";
import { scene } from "../lib/scene.js";
import { ABSTAND } from "../lib/style.js";

describe("row", () => {
  it("platziert Formen nebeneinander mit dem Abstands-Token dazwischen", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const formen = row(f, ["Eins", "Zwei", "Drei"], { rolle: "kern", typo: "kernbegriff", x: 100, y: 100, abstand: "normal" });

    expect(formen).toHaveLength(3);
    // Alle auf gleicher Höhe
    expect(formen[1].container.y).toBe(formen[0].container.y);
    expect(formen[2].container.y).toBe(formen[0].container.y);
    // Jede folgende beginnt um vorige Breite + Abstand versetzt
    const c0 = formen[0].container;
    const c1 = formen[1].container;
    expect(c1.x).toBeCloseTo(c0.x + c0.width + ABSTAND.normal, 5);
  });

  it("gibt die platzierten Formen in Eingabereihenfolge zurück", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const formen = row(f, ["A", "B"], { typo: "kernbegriff" });
    expect(formen[0].text.rawText).toBe("A");
    expect(formen[1].text.rawText).toBe("B");
  });

  it("respektiert den Typ (ellipse)", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const formen = row(f, ["A", "B"], { typ: "ellipse", typo: "kernbegriff" });
    expect(formen[0].container.type).toBe("ellipse");
  });
});

describe("column", () => {
  it("platziert Formen untereinander mit dem Abstands-Token dazwischen", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const formen = column(f, ["Eins", "Zwei"], { typo: "kernbegriff", x: 100, y: 100, abstand: "eng" });
    expect(formen[1].container.x).toBe(formen[0].container.x);
    const c0 = formen[0].container;
    expect(formen[1].container.y).toBeCloseTo(c0.y + c0.height + ABSTAND.eng, 5);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/layout-row-column.test.js`
Expected: FAIL, `Cannot find module '../lib/layout.js'`

- [ ] **Step 3: Implementieren**

```js
// lib/layout.js
import { ABSTAND } from "./style.js";

/** Ruft die zum typ passende Fabrik des Frames auf. */
function platziere(frame, inhalt, { typ = "box", rolle, typo, x, y }) {
  const fabrik = frame[typ];
  if (!fabrik) throw new Error(`Unbekannter Formtyp "${typ}" — erlaubt: box, ellipse, diamond`);
  return fabrik(inhalt, { rolle, typo, x, y });
}

/** Formen nebeneinander, linksbündig, gleiche Höhe. */
export function row(frame, inhalte, opts = {}) {
  const { rolle = "neutral", typo = "standard", typ = "box", abstand = "normal", x = 0, y = 0 } = opts;
  const luecke = ABSTAND[abstand];
  const platziert = [];
  let cursorX = x;

  for (const inhalt of inhalte) {
    const form = platziere(frame, inhalt, { typ, rolle, typo, x: cursorX, y });
    platziert.push(form);
    cursorX += form.container.width + luecke;
  }
  return platziert;
}

/** Formen untereinander, gleiche x. */
export function column(frame, inhalte, opts = {}) {
  const { rolle = "neutral", typo = "standard", typ = "box", abstand = "normal", x = 0, y = 0 } = opts;
  const luecke = ABSTAND[abstand];
  const platziert = [];
  let cursorY = y;

  for (const inhalt of inhalte) {
    const form = platziere(frame, inhalt, { typ, rolle, typo, x, y: cursorY });
    platziert.push(form);
    cursorY += form.container.height + luecke;
  }
  return platziert;
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/layout-row-column.test.js`
Expected: PASS, 5 Tests

- [ ] **Step 5: Commit**

```bash
git add lib/layout.js tests/layout-row-column.test.js
git commit -m "feat: Layout-Helfer row und column"
```

---

### Task 2: grid

**Files:**
- Modify: `lib/layout.js`
- Test: `tests/layout-grid.test.js`

**Interfaces:**
- Consumes: `row` aus `lib/layout.js`, `ABSTAND`
- Produces: `grid(frame, inhalte, { spalten, ... }): Array<{container, text}>` — Formen in einem Raster mit `spalten` Spalten. Zeilen werden mit dem Abstands-Token getrennt. Die Zeilenhöhe richtet sich nach der höchsten Form der jeweiligen Zeile.

- [ ] **Step 1: Test schreiben**

```js
// tests/layout-grid.test.js
import { describe, it, expect } from "vitest";
import { grid } from "../lib/layout.js";
import { scene } from "../lib/scene.js";

describe("grid", () => {
  it("ordnet in der angegebenen Spaltenzahl an", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const formen = grid(f, ["A", "B", "C", "D", "E"], { spalten: 2, typo: "kernbegriff", x: 100, y: 100 });
    expect(formen).toHaveLength(5);
    // A und B in derselben Zeile (gleiche y), C beginnt eine neue Zeile (größere y)
    expect(formen[1].container.y).toBe(formen[0].container.y);
    expect(formen[2].container.y).toBeGreaterThan(formen[0].container.y);
    // A und C in derselben Spalte (gleiche x)
    expect(formen[2].container.x).toBe(formen[0].container.x);
  });

  it("gibt alle Formen in Eingabereihenfolge zurück", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const formen = grid(f, ["A", "B", "C"], { spalten: 2, typo: "kernbegriff" });
    expect(formen.map((x) => x.text.rawText)).toEqual(["A", "B", "C"]);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/layout-grid.test.js`
Expected: FAIL, `grid is not a function`

- [ ] **Step 3: Implementieren**

```js
// Ergänzung in lib/layout.js

/** Raster mit fester Spaltenzahl. Zeilen im Abstands-Token getrennt; die
 *  Zeilenhöhe folgt der höchsten Form der Zeile. */
export function grid(frame, inhalte, opts = {}) {
  const { spalten = 2, rolle = "neutral", typo = "standard", typ = "box", abstand = "normal", x = 0, y = 0 } = opts;
  const luecke = ABSTAND[abstand];
  const platziert = [];
  let cursorY = y;

  for (let i = 0; i < inhalte.length; i += spalten) {
    const zeileInhalte = inhalte.slice(i, i + spalten);
    // Eine Zeile über den bestehenden row-Helfer platzieren.
    const zeile = row(frame, zeileInhalte, { rolle, typo, typ, abstand, x, y: cursorY });
    platziert.push(...zeile);
    const zeilenHoehe = Math.max(...zeile.map((form) => form.container.height));
    cursorY += zeilenHoehe + luecke;
  }
  return platziert;
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/layout-grid.test.js`
Expected: PASS, 2 Tests

- [ ] **Step 5: Commit**

```bash
git add lib/layout.js tests/layout-grid.test.js
git commit -m "feat: Layout-Helfer grid"
```

---

### Task 3: radial

**Files:**
- Modify: `lib/layout.js`
- Test: `tests/layout-radial.test.js`

**Interfaces:**
- Consumes: `ABSTAND`
- Produces: `radial(frame, zentrumInhalt, satellitenInhalte, opts?): { zentrum, satelliten }` — eine Zentrumsform, um die herum die Satelliten auf einem Kreis mit `radius` verteilt werden. Rückgabe: `{ zentrum: {container,text}, satelliten: Array<{container,text}> }`.

Optionen: `{ typ = "box", rolle = "neutral", typo = "standard", radius = 400, x, y, startWinkel = -90 }`. `x`/`y` ist der Kreismittelpunkt (Frame-relativ); ohne Angabe die Frame-Mitte (960, 540 bei einem 1920×1080-Frame). `startWinkel` in Grad, Standard oben (−90°).

Weil die Formen um ihren eigenen Mittelpunkt auf dem Kreis sitzen sollen, wird jede Form am Kreispunkt platziert (dort landet ihre **obere linke Ecke**) und dann um ihre halbe Breite/Höhe zurückversetzt, sodass ihr **Mittelpunkt** auf dem Kreispunkt liegt. Die Größe steht erst nach dem Platzieren fest — also einmal platzieren, Maße aus der Rückgabe lesen, verschieben.

**Wichtig zum Koordinatenraum:** `frame.box(inhalt, { x, y })` interpretiert `x`/`y` als *frame-relativ* und rechnet sie selbst in absolute um (addiert die Frame-Position). Die zurückgegebene `container.x` ist also **absolut**. Die Zentrierung darf deshalb nicht die frame-relativen Zielkoordinaten mit `container.x` verrechnen — sonst läge die Anordnung in einem Frame, der nicht bei (0,0) liegt, daneben. Die Korrektur ist stattdessen eine reine Verschiebung um die halbe Formgröße: Die obere linke Ecke liegt am Kreispunkt, wir schieben um `(-width/2, -height/2)`, damit der Mittelpunkt dort liegt — frame-unabhängig.

- [ ] **Step 1: Test schreiben**

```js
// tests/layout-radial.test.js
import { describe, it, expect } from "vitest";
import { radial } from "../lib/layout.js";
import { scene } from "../lib/scene.js";

describe("radial", () => {
  it("platziert Zentrum und Satelliten", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const { zentrum, satelliten } = radial(f, "Mängelwesen", ["A", "B", "C", "D"], {
      typo: "kernbegriff", radius: 400, x: 960, y: 540,
    });
    expect(zentrum.text.rawText).toBe("Mängelwesen");
    expect(satelliten).toHaveLength(4);
  });

  it("verteilt die Satelliten rund um das Zentrum", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const { zentrum, satelliten } = radial(f, "Z", ["A", "B", "C", "D"], {
      typo: "kernbegriff", radius: 400, x: 960, y: 540,
    });
    // Mittelpunkte der Satelliten
    const zentrumMitte = { x: zentrum.container.x + zentrum.container.width / 2, y: zentrum.container.y + zentrum.container.height / 2 };
    // Jeder Satellit liegt ungefähr radius vom Zentrumsmittelpunkt entfernt
    for (const sat of satelliten) {
      const mx = sat.container.x + sat.container.width / 2;
      const my = sat.container.y + sat.container.height / 2;
      const dist = Math.hypot(mx - zentrumMitte.x, my - zentrumMitte.y);
      expect(dist).toBeCloseTo(400, 0); // auf ganze Pixel genau
    }
  });

  it("ist deterministisch", () => {
    const baue = () => {
      const s = scene();
      const f = s.frame("Kapitel");
      radial(f, "Z", ["A", "B", "C"], { typo: "kernbegriff" });
      return JSON.stringify(s.elements());
    };
    expect(baue()).toBe(baue());
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/layout-radial.test.js`
Expected: FAIL, `radial is not a function`

- [ ] **Step 3: Implementieren**

```js
// Ergänzung in lib/layout.js
import { FRAME_BREITE, FRAME_HOEHE } from "./style.js";

/** Verschiebt eine am Kreispunkt (obere linke Ecke) platzierte Form so, dass ihr
 *  Mittelpunkt dort liegt — reine Verschiebung um die halbe Formgröße, unabhängig
 *  vom Koordinatenraum. Die Rückgabereferenzen sind dieselben Objekte wie in der
 *  Szene (siehe scene.js), die Mutation bleibt also in elements() erhalten. */
function zentriereAufEigenenPunkt(form) {
  const dx = -form.container.width / 2;
  const dy = -form.container.height / 2;
  for (const teil of [form.container, form.text]) {
    teil.x += dx;
    teil.y += dy;
  }
}

/** Zentrum plus Satelliten auf einem Kreis. x/y ist der Kreismittelpunkt
 *  (frame-relativ); frame.box rechnet ihn in absolute Koordinaten um. */
export function radial(frame, zentrumInhalt, satellitenInhalte, opts = {}) {
  const {
    typ = "box", rolle = "neutral", typo = "standard",
    radius = 400, x = FRAME_BREITE / 2, y = FRAME_HOEHE / 2, startWinkel = -90,
  } = opts;

  // Zentrum an (x, y) platzieren, dann auf seinen eigenen Punkt zentrieren.
  const zentrum = platziere(frame, zentrumInhalt, { typ, rolle, typo, x, y });
  zentriereAufEigenenPunkt(zentrum);

  const satelliten = [];
  const schritt = 360 / satellitenInhalte.length;
  for (let i = 0; i < satellitenInhalte.length; i++) {
    const winkel = ((startWinkel + i * schritt) * Math.PI) / 180;
    const mx = x + radius * Math.cos(winkel);
    const my = y + radius * Math.sin(winkel);
    const sat = platziere(frame, satellitenInhalte[i], { typ, rolle, typo, x: mx, y: my });
    zentriereAufEigenenPunkt(sat);
    satelliten.push(sat);
  }
  return { zentrum, satelliten };
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/layout-radial.test.js`
Expected: PASS, 3 Tests

Schlägt der Determinismus-Test fehl, liegt es fast sicher an Fließkomma-Reihenfolge in `zentriereAuf` — die Mutation ist rein additiv und deterministisch, prüfe, ob `platziere` selbst deterministisch ist (es ruft `frame.box()`, das aus dem Inhalt ableitet).

- [ ] **Step 5: Commit**

```bash
git add lib/layout.js tests/layout-radial.test.js
git commit -m "feat: Layout-Helfer radial mit Zentrum und Satelliten"
```

---

### Task 4: timeline und stack

**Files:**
- Modify: `lib/layout.js`
- Test: `tests/layout-timeline-stack.test.js`

**Interfaces:**
- Consumes: `row`, `column` aus `lib/layout.js`
- Produces:
  - `stack(frame, inhalte, opts?)` — Alias-artiger Helfer: vertikal gestapelt, enger Standardabstand. Baut auf `column` auf. Rückgabe wie `column`.
  - `timeline(frame, inhalte, opts?): { formen, pfeile }` — Formen in einer Reihe (wie `row`), zusätzlich mit Übergangspfeilen zwischen benachbarten Formen verbunden. `frame` muss von einer Szene mit `connect` stammen — der Helfer bekommt daher zusätzlich die Szene über `opts.szene` gereicht, um `szene.connect(a, b)` aufzurufen. Rückgabe: `{ formen: Array<{container,text}>, pfeile: object[] }`.

Warum `timeline` die Szene braucht: Pfeile werden über `scene().connect(a, b)` gezogen, nicht über den Frame. Der Frame platziert Formen, die Szene verbindet sie.

- [ ] **Step 1: Test schreiben**

```js
// tests/layout-timeline-stack.test.js
import { describe, it, expect } from "vitest";
import { timeline, stack } from "../lib/layout.js";
import { scene } from "../lib/scene.js";

describe("stack", () => {
  it("stapelt vertikal", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const formen = stack(f, ["A", "B", "C"], { typo: "kernbegriff" });
    expect(formen).toHaveLength(3);
    expect(formen[1].container.x).toBe(formen[0].container.x);
    expect(formen[1].container.y).toBeGreaterThan(formen[0].container.y);
  });
});

describe("timeline", () => {
  it("reiht Formen und verbindet sie mit Pfeilen", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const { formen, pfeile } = timeline(f, ["Start", "Mitte", "Ende"], {
      szene: s, typo: "kernbegriff", x: 100, y: 300,
    });
    expect(formen).toHaveLength(3);
    expect(pfeile).toHaveLength(2); // n-1 Pfeile
    // Pfeile sind in der Szene
    const pfeileInSzene = s.elements().filter((e) => e.type === "arrow");
    expect(pfeileInSzene).toHaveLength(2);
  });

  it("verbindet jeweils benachbarte Formen", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const { formen, pfeile } = timeline(f, ["A", "B"], { szene: s, typo: "kernbegriff", x: 100, y: 300 });
    expect(pfeile[0].startBinding.elementId).toBe(formen[0].container.id);
    expect(pfeile[0].endBinding.elementId).toBe(formen[1].container.id);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/layout-timeline-stack.test.js`
Expected: FAIL, `timeline is not a function`

- [ ] **Step 3: Implementieren**

```js
// Ergänzung in lib/layout.js

/** Vertikaler Stapel — column mit engem Standardabstand. */
export function stack(frame, inhalte, opts = {}) {
  return column(frame, inhalte, { abstand: "eng", ...opts });
}

/** Formen in einer Reihe, benachbarte mit Übergangspfeilen verbunden.
 *  Braucht die Szene (opts.szene), weil Pfeile über szene.connect gezogen werden. */
export function timeline(frame, inhalte, opts = {}) {
  const { szene, ...rest } = opts;
  if (!szene) throw new Error("timeline braucht opts.szene, um die Formen zu verbinden");

  const formen = row(frame, inhalte, rest);
  const pfeile = [];
  for (let i = 1; i < formen.length; i++) {
    pfeile.push(szene.connect(formen[i - 1], formen[i]));
  }
  return { formen, pfeile };
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/layout-timeline-stack.test.js`
Expected: PASS, 3 Tests

- [ ] **Step 5: Layout-Helfer exportieren**

In `lib/index.js` ergänzen:

```js
export { row, column, grid, radial, timeline, stack } from "./layout.js";
```

- [ ] **Step 6: Volle Suite**

Run: `npx vitest run`
Expected: PASS, alle 288 plus die neuen.

- [ ] **Step 7: Commit**

```bash
git add lib/layout.js lib/index.js tests/layout-timeline-stack.test.js
git commit -m "feat: Layout-Helfer timeline und stack, Exporte"
```

---

### Task 5: sequence auf Frame-Ebene

**Files:**
- Modify: `lib/scene.js`, `lib/index.js`
- Test: `tests/scene-sequence.test.js`

**Interfaces:**
- Consumes: `arrowElement` aus `lib/connect.js` (schon in `scene.js` importiert)
- Produces:
  - `scene()` gibt zusätzlich `sequence(frames, opts?)` zurück
  - `sequence(frameObjekte, { nummeriert = true }?)` — verkettet die gegebenen Frames (die von `scene().frame(...)` zurückgegebenen Objekte) mit Übergangspfeilen von Frame zu Frame. Bei `nummeriert` bekommt jeder Pfeil ein Label mit der laufenden Nummer (`"1"`, `"2"`, …). Rückgabe: das Array der Übergangspfeile.

Die Pfeile binden direkt an die Frame-Elemente (durch Spike belegt, Spec 2.4.1). `sequence` nutzt dieselbe Bindungsmechanik wie `connect`, aber auf `frame.element` statt auf Container. Da `frame.element` eine `id`, `x`, `y`, `width`, `height` trägt, funktioniert `arrowElement` unverändert damit.

- [ ] **Step 1: Test schreiben**

```js
// tests/scene-sequence.test.js
import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";

describe("scene().sequence", () => {
  it("verkettet Frames mit Übergangspfeilen", () => {
    const s = scene();
    const a = s.frame("Kapitel 1");
    const b = s.frame("Kapitel 2");
    const c = s.frame("Kapitel 3");
    const pfeile = s.sequence([a, b, c]);

    expect(pfeile).toHaveLength(2); // n-1 Übergänge
    const pfeileInSzene = s.elements().filter((e) => e.type === "arrow");
    expect(pfeileInSzene).toHaveLength(2);
  });

  it("bindet die Pfeile an die Frame-Elemente", () => {
    const s = scene();
    const a = s.frame("Kapitel 1");
    const b = s.frame("Kapitel 2");
    const [pfeil] = s.sequence([a, b]);
    expect(pfeil.startBinding.elementId).toBe(a.element.id);
    expect(pfeil.endBinding.elementId).toBe(b.element.id);
    // Frames führen den Pfeil in boundElements
    const alle = s.elements();
    const frameA = alle.find((e) => e.id === a.element.id);
    expect(frameA.boundElements.some((x) => x.id === pfeil.id && x.type === "arrow")).toBe(true);
  });

  it("nummeriert die Übergänge, wenn gewünscht", () => {
    const s = scene();
    const a = s.frame("Kapitel 1");
    const b = s.frame("Kapitel 2");
    const c = s.frame("Kapitel 3");
    s.sequence([a, b, c], { nummeriert: true });

    const labels = s.elements().filter((e) => e.type === "text" && /^[0-9]+$/.test(e.rawText));
    expect(labels.map((l) => l.rawText).sort()).toEqual(["1", "2"]);
  });

  it("bleibt deterministisch", () => {
    const baue = () => {
      const s = scene();
      const a = s.frame("K1");
      const b = s.frame("K2");
      s.sequence([a, b], { nummeriert: true });
      return JSON.stringify(s.elements());
    };
    expect(baue()).toBe(baue());
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/scene-sequence.test.js`
Expected: FAIL, `s.sequence is not a function`

- [ ] **Step 3: Implementieren**

In `lib/scene.js` innerhalb von `scene()`, nach `connect`, eine Funktion `sequence` ergänzen. Sie hat Closure-Zugriff auf `kinder`, `ordnung`, `registry` und nutzt dieselbe Bindungslogik wie `connect`, aber auf `frame.element`.

```js
// In lib/scene.js, innerhalb von scene(), nach der connect-Funktion:
function sequence(frameObjekte, { nummeriert = true } = {}) {
  const pfeile = [];
  for (let i = 1; i < frameObjekte.length; i++) {
    const vonFrame = frameObjekte[i - 1].element;
    const nachFrame = frameObjekte[i].element;

    const pfeil = arrowElement({ a: vonFrame, b: nachFrame, ordnung: ordnung++ });
    kinder.push(pfeil);
    vonFrame.boundElements = [...(vonFrame.boundElements ?? []), { id: pfeil.id, type: "arrow" }];
    nachFrame.boundElements = [...(nachFrame.boundElements ?? []), { id: pfeil.id, type: "arrow" }];

    if (nummeriert) {
      const nummer = String(i);
      const mitteX = pfeil.x + pfeil.points.at(-1)[0] / 2;
      const mitteY = pfeil.y + pfeil.points.at(-1)[1] / 2;
      const labelEl = textElement(
        { inhalt: nummer, typo: "detail", x: mitteX, y: mitteY, containerId: pfeil.id, ordnung: ordnung++ },
        registry,
      );
      kinder.push(labelEl);
      pfeil.boundElements = [...pfeil.boundElements, { id: labelEl.id, type: "text" }];
    }
    pfeile.push(pfeil);
  }
  return pfeile;
}

// return-Zeile erweitern:
return { titel, frame, connect, sequence, elements, dimensions, registry };
```

**Wichtig zur `frameId`:** Der Übergangspfeil gehört keinem Frame — er verläuft *zwischen* Frames. `arrowElement` setzt `frameId: null`, das ist hier richtig und darf nicht überschrieben werden. Das nummerierte Label erbt ebenfalls `frameId: null` (es steht auf dem freien Pfeil zwischen den Frames).

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/scene-sequence.test.js`
Expected: PASS, 4 Tests

- [ ] **Step 5: Validator-Prüfung — Frame-gebundene Pfeile**

Der Validator aus Stufe 3a (`checkArrowBindings`) prüft beliebige Pfeil-Ziele, also auch Frames. Bestätige, dass eine `sequence`-Szene den Validator besteht:

```bash
node -e "
const { scene } = await import('./lib/scene.js');
const { validateScene } = await import('./lib/validate/index.js');
const s = scene();
const a = s.frame('K1'); const b = s.frame('K2'); const c = s.frame('K3');
a.text('Erstes', { typo: 'frametitel', x: 60, y: 60 });
b.text('Zweites', { typo: 'frametitel', x: 60, y: 60 });
c.text('Drittes', { typo: 'frametitel', x: 60, y: 60 });
s.sequence([a, b, c], { nummeriert: true });
const r = validateScene(s.elements(), { registry: s.registry, zoomL0: s.dimensions().zoomL0 });
console.log('Harte Fehler:', r.findings.filter(f => f.schwere === 'fehler').length, '| ok:', r.ok);
r.findings.filter(f => f.schwere === 'fehler').forEach(f => console.log('  FEHLER:', f.regel, f.meldung));
"
```

Expected: `Harte Fehler: 0 | ok: true`. Meldet der Validator hier Fehler, ist das ein echter Befund — entweder ist die Frame-Bindung fehlerhaft oder eine Prüfregel behandelt Frame-Ziele falsch. Beides gehört gemeldet und behoben, nicht überspielt.

- [ ] **Step 6: `lib/index.js`** — nichts zu tun; `sequence` ist eine Szenen-Methode, kein Modul-Export. (Nur prüfen, dass keine weitere Änderung nötig ist.)

- [ ] **Step 7: Volle Suite**

Run: `npx vitest run`
Expected: PASS, alles grün.

- [ ] **Step 8: Commit**

```bash
git add lib/scene.js tests/scene-sequence.test.js
git commit -m "feat: sequence verkettet Kapitel-Frames mit nummerierten Übergängen"
```

---

### Task 6: Golden-Referenzen für Layout und Sequenz

**Files:**
- Create: `tests/golden/radial.mjs`, `tests/golden/sequenz.mjs`, `tests/golden/*.png` (generiert)
- Modify: keine Produktionsdatei

**Interfaces:**
- Consumes: `scene`, Layout-Helfer, `sequence`
- Produces: zwei Golden-Referenzszenen, die eine radiale Anordnung und einen Präsentationsablauf abdecken

- [ ] **Step 1: Referenzszenen schreiben**

```js
// tests/golden/radial.mjs
// Deckt radiale Anordnung mit verbundenen Satelliten ab.
import { scene } from "../../lib/scene.js";
import { radial } from "../../lib/layout.js";

const s = scene();
const f = s.frame("Anthropologie");
f.text("Der Mensch als Mängelwesen", { typo: "frametitel", x: 60, y: 50 });

const { zentrum, satelliten } = radial(
  f, "Mängelwesen",
  ["Instinktarmut", "Weltoffenheit", "Kultur als 2. Natur", "Frühgeburt"],
  { rolle: "kern", typo: "kernbegriff", radius: 340, x: 960, y: 580 },
);
for (const sat of satelliten) s.connect(zentrum, sat);

export default s;
```

```js
// tests/golden/sequenz.mjs
// Deckt einen Präsentationsablauf über mehrere Frames ab.
import { scene } from "../../lib/scene.js";

const s = scene();
const a = s.frame("Einstieg");
a.text("Was ist der Mensch?", { typo: "frametitel", x: 60, y: 60 });
const b = s.frame("These");
b.text("Der Mensch als Mängelwesen", { typo: "frametitel", x: 60, y: 60 });
const c = s.frame("Folgerung");
c.text("Kultur als Ausgleich", { typo: "frametitel", x: 60, y: 60 });

s.sequence([a, b, c], { nummeriert: true });

export default s;
```

- [ ] **Step 2: Referenzbilder erzeugen**

```bash
npm run build-renderer   # nur nötig, wenn renderer/dist fehlt
npm run update-golden
```

- [ ] **Step 3: Die Bilder ansehen**

Öffne `tests/golden/radial.png` und `tests/golden/sequenz.png` und prüfe mit dem Auge:
- **radial:** Das Zentrum „Mängelwesen" sitzt in der Mitte, die vier Satelliten sind rundum verteilt, jeder mit einem Pfeil vom Zentrum verbunden. Keine Form überlappt eine andere unschön, kein Pfeil endet im Leeren.
- **sequenz:** Drei Kapitel-Frames nebeneinander, verbunden durch nummerierte Übergangspfeile (1, 2) von Frame zu Frame. Die Pfeile setzen an den Frame-Rändern an.

Sitzt etwas falsch, ist das ein echter Befund — er gehört gemeldet und die Geometrie korrigiert, nicht durch ein falsches Referenzbild zementiert.

- [ ] **Step 4: Volle Suite**

Run: `npx vitest run tests/golden-render.test.js`
Expected: PASS — die neuen Szenen rendern byte-identisch zu ihren frischen Referenzbildern.

- [ ] **Step 5: Bilder versioniert?**

Run: `git ls-files tests/golden/radial.png tests/golden/sequenz.png`
Expected: beide Pfade werden aufgelistet.

- [ ] **Step 6: Commit**

```bash
git add tests/golden/radial.mjs tests/golden/sequenz.mjs tests/golden/radial.png tests/golden/sequenz.png
git commit -m "feat: Golden-Referenzen für radiale Anordnung und Präsentationsablauf"
```

---

## Abschluss der Stufe 3b

Nach Task 6 gilt:

- Sechs Layout-Helfer ordnen Formen automatisch an: `row`, `column`, `grid`, `radial`, `timeline`, `stack`.
- `sequence()` verkettet Kapitel-Frames zu einem Präsentationsablauf mit nummerierten Übergangspfeilen, die direkt an die Frames binden.
- Beides ist visuell abgenommen und als Golden-Test festgeschrieben.

Damit sind die beiden Board-Muster der Spezifikation baubar: **Wandzeitung** (Frame-Raster) und **Präsentationsablauf** (`sequence`), und die Frame-internen Muster (Mindmap/Radial, Prozesskette via `timeline`, Vierfelder via `grid`).

**Noch nicht möglich:** Notiz-Links, eingebettete Bilder, Transklusion (Plan 3c) sowie die Spezialkomponenten Mengenkreise, Dreieck und Programmablaufplan (Stufe 4).
