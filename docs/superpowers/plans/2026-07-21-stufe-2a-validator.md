# Excalidraw-Tafelbild-Skill — Stufe 2a: Validator

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine Szene wird auf strukturelle Fehler und Layout-Schwächen geprüft, bevor irgendetwas in den Vault geschrieben wird.

**Architecture:** Ein Prüfmodul je Anliegen (`structure.js` für harte Fehler, `layout.js` für weiche Warnungen), die alle Befunde in einen gemeinsamen Sammler schreiben. `index.js` orchestriert und liefert ein Gesamturteil. Der Validator berechnet Geometrie nie selbst nach, sondern benutzt dieselben Funktionen wie die Element-Fabriken — sonst entstünden zwei Wahrheiten über dieselbe Form.

**Tech Stack:** Node ≥ 20 (ESM), vitest. Keine neuen Abhängigkeiten.

## Global Constraints

- **Node ≥ 20**, ausschließlich ESM (`"type": "module"`). Keine CommonJS-Dateien.
- **Vault-Pfad** nie fest verdrahtet — immer aus `lib/config.js`.
- **Sprache im Code:** Einheitlichkeit je Modul.
  - **Funktionsnamen englisch**, weil sie neben `measureText`, `loadFontRegistry` und `sceneToMarkdown` stehen: `validateScene`, `checkSchema`, `createFindings`, `hasErrors`.
  - **Die Befundstruktur ist deutsch** — `SCHWERE`, `schwere`, `regel`, `meldung` und die Werte `"fehler"`/`"warnung"`. Ein Befund ist fachliche Ausgabe, die Dennis liest, kein technisches Zwischenformat. Einzige Ausnahme: **`elementId`** bleibt englisch, weil es ein Excalidraw-Fachbegriff ist und im Dateiformat so heißt.
  - Lokale Variablen und Parameter dürfen deutsch sein. Kommentare deutsch. Befundtexte deutsch.

  Nach Task 1 präzisiert: Die erste Fassung verlangte pauschal englische Exporte, während der Beispielcode des Plans die deutsche Befundstruktur vorgab. Aufgelöst zugunsten des Beispielcodes — die Befunde sind Ausgabe für den Nutzer, nicht Maschinenschnittstelle.
- **Zwei Härtegrade.** `"fehler"` bricht ab, es wird nichts in den Vault geschrieben. `"warnung"` wird gemeldet, das Modell entscheidet.
- **Determinismus:** Dieselbe Szene ergibt dieselbe Befundliste in derselben Reihenfolge. Keine Iteration über unsortierte Mengen, kein `Date.now()`.
- **Umfang ist Stufe 1.** Es existieren nur die Elementtypen `text`, `rectangle`, `ellipse`, `diamond`, `frame`. Prüfungen für Pfeile (`startBinding`/`endBinding`), Bilder (`fileId`), Notiz-Links und Transklusionen gehören **nicht** in diese Stufe — die Features gibt es noch nicht.
- **Der Validator ändert nie eine Szene.** Er liest und urteilt.
- **Bestehende 140 Tests müssen grün bleiben.**

## Dateistruktur dieser Stufe

| Datei | Verantwortung |
|---|---|
| `lib/validate/findings.js` | Befund-Objekt, Sammler, Schweregrade |
| `lib/validate/structure.js` | Harte Fehler: Schema, Referenzen, Text-Index |
| `lib/validate/layout.js` | Weiche Warnungen: Geometrie, Textpassung, Lesbarkeit |
| `lib/validate/index.js` | Orchestrierung, Gesamturteil |
| `lib/elements.js` | **Änderung:** `innerDimension` und `innerOrigin` exportieren |
| `bin/validate.mjs` | Kommandozeile: Datei prüfen, Befunde ausgeben |

**Nicht in dieser Stufe:** Renderer (Plan 2b), Pfeile, Bilder, Links, Spezialkomponenten.

---

### Task 1: Befund-Modell

**Files:**
- Create: `lib/validate/findings.js`
- Test: `tests/validate-findings.test.js`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `SCHWERE = { fehler: "fehler", warnung: "warnung" }`
  - `createFindings(): Collector`
  - `Collector.error(regel: string, meldung: string, elementId?: string): void`
  - `Collector.warn(regel: string, meldung: string, elementId?: string): void`
  - `Collector.all(): Finding[]` — in Aufnahmereihenfolge, als **Kopie**. Nie die interne Liste selbst: Sonst könnte ein Aufrufer Befunde nachträglich ändern oder ergänzen und damit das Urteil von `hasErrors()` aushebeln.
  - `Collector.hasErrors(): boolean`
  - Typ `Finding = { schwere: "fehler"|"warnung", regel: string, meldung: string, elementId: string|null }`

- [ ] **Step 1: Test schreiben**

```js
// tests/validate-findings.test.js
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
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/validate-findings.test.js`
Expected: FAIL, `Cannot find module '../lib/validate/findings.js'`

- [ ] **Step 3: Implementieren**

```js
// lib/validate/findings.js

/** Die beiden Härtegrade. "fehler" blockiert das Schreiben, "warnung" nicht. */
export const SCHWERE = { fehler: "fehler", warnung: "warnung" };

/** @typedef {{ schwere: string, regel: string, meldung: string, elementId: string|null }} Finding */

/**
 * Sammelt Befunde in Aufnahmereihenfolge. Bewusst eine Liste und kein Set oder
 * eine Map: Die Reihenfolge ist Teil der Ausgabe und muss deterministisch sein.
 */
export function createFindings() {
  const befunde = [];

  const aufnehmen = (schwere) => (regel, meldung, elementId = null) => {
    befunde.push({ schwere, regel, meldung, elementId });
  };

  return {
    error: aufnehmen(SCHWERE.fehler),
    warn: aufnehmen(SCHWERE.warnung),
    all: () => befunde,
    hasErrors: () => befunde.some((b) => b.schwere === SCHWERE.fehler),
  };
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/validate-findings.test.js`
Expected: PASS, 4 Tests

- [ ] **Step 5: Commit**

```bash
git add lib/validate/findings.js tests/validate-findings.test.js
git commit -m "feat: Befund-Modell für den Validator"
```

---

### Task 2: Schema und Pflichtfelder

**Files:**
- Create: `lib/validate/structure.js`
- Test: `tests/validate-schema.test.js`

**Interfaces:**
- Consumes: `createFindings` aus `lib/validate/findings.js`
- Produces: `checkSchema(elements: object[], befunde: Collector): void`

Geprüft werden nur die Elementtypen, die Stufe 1 erzeugt. Ein unbekannter Typ ist selbst ein Fehler — er bedeutet, dass etwas erzeugt wurde, das der Validator nicht beurteilen kann.

- [ ] **Step 1: Test schreiben**

```js
// tests/validate-schema.test.js
import { describe, it, expect } from "vitest";
import { createFindings } from "../lib/validate/findings.js";
import { checkSchema } from "../lib/validate/structure.js";

/** Ein minimal vollständiges Element, das alle Basisfelder trägt. */
function basis(ueberschreiben = {}) {
  return {
    id: "aaaaaaaa", type: "rectangle", x: 0, y: 0, width: 100, height: 50,
    angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent",
    fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 1,
    opacity: 100, groupIds: [], frameId: null, index: "a0", roundness: null,
    seed: 1, version: 1, versionNonce: 1, isDeleted: false, boundElements: [],
    updated: 1, link: null, locked: false,
    ...ueberschreiben,
  };
}

function pruefe(elemente) {
  const befunde = createFindings();
  checkSchema(elemente, befunde);
  return befunde.all();
}

describe("checkSchema", () => {
  it("akzeptiert ein vollständiges Rechteck", () => {
    expect(pruefe([basis()])).toEqual([]);
  });

  it("meldet ein fehlendes Pflichtfeld mit Element-ID und Feldnamen", () => {
    const kaputt = basis();
    delete kaputt.width;
    const befunde = pruefe([kaputt]);
    expect(befunde).toHaveLength(1);
    expect(befunde[0].schwere).toBe("fehler");
    expect(befunde[0].elementId).toBe("aaaaaaaa");
    expect(befunde[0].meldung).toContain("width");
  });

  it("meldet einen unbekannten Elementtyp", () => {
    const befunde = pruefe([basis({ type: "arrow" })]);
    expect(befunde.some((b) => b.meldung.includes("arrow"))).toBe(true);
  });

  it("verlangt bei Text die Textfelder", () => {
    const text = basis({ type: "text", id: "bbbbbbbb" });
    const befunde = pruefe([text]);
    for (const feld of ["text", "rawText", "originalText", "fontSize", "fontFamily", "lineHeight"]) {
      expect(befunde.some((b) => b.meldung.includes(feld)), `${feld} fehlt in der Meldung`).toBe(true);
    }
  });

  it("verlangt bei Frame den Namen", () => {
    const befunde = pruefe([basis({ type: "frame", id: "cccccccc" })]);
    expect(befunde.some((b) => b.meldung.includes("name"))).toBe(true);
  });

  it("meldet ungültige Aufzählungswerte", () => {
    const befunde = pruefe([basis({ fillStyle: "schraffiert" })]);
    expect(befunde.some((b) => b.meldung.includes("fillStyle"))).toBe(true);
  });

  it("meldet nur erzeugbare Schriften", () => {
    const text = basis({
      type: "text", id: "dddddddd", text: "x", rawText: "x", originalText: "x",
      fontSize: 20, fontFamily: 1, lineHeight: 1.25, textAlign: "left",
      verticalAlign: "top", containerId: null, autoResize: true, hasTextLink: false,
    });
    const befunde = pruefe([text]);
    expect(befunde.some((b) => b.meldung.includes("fontFamily"))).toBe(true);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/validate-schema.test.js`
Expected: FAIL, `Cannot find module '../lib/validate/structure.js'`

- [ ] **Step 3: Implementieren**

```js
// lib/validate/structure.js

/** Felder, die jedes Element führt. */
const BASISFELDER = [
  "id", "type", "x", "y", "width", "height", "angle", "strokeColor",
  "backgroundColor", "fillStyle", "strokeWidth", "strokeStyle", "roughness",
  "opacity", "groupIds", "frameId", "index", "seed", "version", "versionNonce",
  "isDeleted", "boundElements", "updated", "locked",
];

/** Zusatzfelder je Typ. */
const ZUSATZFELDER = {
  text: ["text", "rawText", "originalText", "fontSize", "fontFamily", "lineHeight",
         "textAlign", "verticalAlign", "containerId", "autoResize"],
  frame: ["name"],
  rectangle: [],
  ellipse: [],
  diamond: [],
};

/** Nur diese Typen erzeugt Stufe 1. Alles andere kann der Validator nicht beurteilen. */
const ERLAUBTE_TYPEN = Object.keys(ZUSATZFELDER);

const AUFZAEHLUNGEN = {
  fillStyle: ["solid", "hachure", "cross-hatch", "zigzag"],
  strokeStyle: ["solid", "dashed", "dotted"],
  textAlign: ["left", "center", "right"],
  verticalAlign: ["top", "middle", "bottom"],
};

/** Der Skill erzeugt ausschließlich Excalifont und Nunito. */
const ERZEUGTE_SCHRIFTEN = [5, 6];

export function checkSchema(elemente, befunde) {
  for (const el of elemente) {
    const id = el.id ?? null;

    if (!ERLAUBTE_TYPEN.includes(el.type)) {
      befunde.error("schema", `Unbekannter Elementtyp "${el.type}" — Stufe 1 erzeugt nur ${ERLAUBTE_TYPEN.join(", ")}`, id);
      continue; // Ohne bekannten Typ sind die Feldprüfungen sinnlos.
    }

    for (const feld of [...BASISFELDER, ...ZUSATZFELDER[el.type]]) {
      if (el[feld] === undefined) {
        befunde.error("schema", `Pflichtfeld "${feld}" fehlt an einem Element vom Typ ${el.type}`, id);
      }
    }

    for (const [feld, erlaubt] of Object.entries(AUFZAEHLUNGEN)) {
      if (el[feld] !== undefined && !erlaubt.includes(el[feld])) {
        befunde.error("schema", `Ungültiger Wert "${el[feld]}" für ${feld} — erlaubt: ${erlaubt.join(", ")}`, id);
      }
    }

    if (el.type === "text" && el.fontFamily !== undefined && !ERZEUGTE_SCHRIFTEN.includes(el.fontFamily)) {
      befunde.error("schema", `fontFamily ${el.fontFamily} wird nicht erzeugt — erlaubt sind 5 (Excalifont) und 6 (Nunito)`, id);
    }
  }
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/validate-schema.test.js`
Expected: PASS, 7 Tests

- [ ] **Step 5: Commit**

```bash
git add lib/validate/structure.js tests/validate-schema.test.js
git commit -m "feat: Schema- und Pflichtfeldprüfung"
```

---

### Task 3: Referenzintegrität

**Files:**
- Modify: `lib/validate/structure.js`
- Test: `tests/validate-references.test.js`

**Interfaces:**
- Consumes: `createFindings`
- Produces: `checkReferences(elements: object[], befunde: Collector): void`

Geprüft wird: IDs eindeutig, `containerId` ↔ `boundElements` beidseitig, `frameId` zeigt auf einen existierenden Frame, `index`-Werte vorhanden und aufsteigend.

- [ ] **Step 1: Test schreiben**

```js
// tests/validate-references.test.js
import { describe, it, expect } from "vitest";
import { createFindings } from "../lib/validate/findings.js";
import { checkReferences } from "../lib/validate/structure.js";
import { scene } from "../lib/scene.js";

function pruefe(elemente) {
  const befunde = createFindings();
  checkReferences(elemente, befunde);
  return befunde.all();
}

/** Eine echte, gültige Szene aus der Bibliothek selbst. */
function echteSzene() {
  const s = scene();
  const f = s.frame("Kapitel");
  f.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
  f.text("Titel", { typo: "frametitel", x: 40, y: 40 });
  return s.elements();
}

describe("checkReferences", () => {
  it("akzeptiert eine echte, von der Bibliothek gebaute Szene", () => {
    expect(pruefe(echteSzene())).toEqual([]);
  });

  it("meldet doppelte IDs", () => {
    const alle = echteSzene();
    alle[1].id = alle[0].id;
    const befunde = pruefe(alle);
    expect(befunde.some((b) => b.regel === "ids" && b.schwere === "fehler")).toBe(true);
  });

  it("meldet einen gebundenen Text, dessen Container ihn nicht kennt", () => {
    const alle = echteSzene();
    const container = alle.find((e) => e.type === "rectangle");
    container.boundElements = [];
    const befunde = pruefe(alle);
    expect(befunde.some((b) => b.regel === "bindung")).toBe(true);
  });

  it("meldet einen Container, dessen gebundener Text fehlt", () => {
    const alle = echteSzene();
    const text = alle.find((e) => e.containerId);
    const ohneText = alle.filter((e) => e !== text);
    const befunde = pruefe(ohneText);
    expect(befunde.some((b) => b.regel === "bindung")).toBe(true);
  });

  it("meldet eine frameId, zu der es keinen Frame gibt", () => {
    const alle = echteSzene();
    alle.find((e) => e.type === "rectangle").frameId = "xxxxxxxx";
    const befunde = pruefe(alle);
    expect(befunde.some((b) => b.regel === "frame")).toBe(true);
  });

  it("meldet eine absteigende z-Reihenfolge", () => {
    const alle = echteSzene();
    alle[0].index = "zz";
    const befunde = pruefe(alle);
    expect(befunde.some((b) => b.regel === "reihenfolge")).toBe(true);
  });

  it("meldet ein fehlendes index-Feld", () => {
    const alle = echteSzene();
    delete alle[1].index;
    const befunde = pruefe(alle);
    expect(befunde.some((b) => b.regel === "reihenfolge")).toBe(true);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/validate-references.test.js`
Expected: FAIL, `checkReferences is not a function`

- [ ] **Step 3: Implementieren**

```js
// Ergänzung in lib/validate/structure.js

export function checkReferences(elemente, befunde) {
  const nachId = new Map();

  for (const el of elemente) {
    if (nachId.has(el.id)) {
      befunde.error("ids", `Element-ID "${el.id}" kommt mehrfach vor`, el.id);
    }
    nachId.set(el.id, el);
  }

  const frameIds = new Set(elemente.filter((e) => e.type === "frame").map((e) => e.id));

  for (const el of elemente) {
    // Gebundener Text: Container muss existieren und den Text seinerseits führen.
    if (el.type === "text" && el.containerId) {
      const container = nachId.get(el.containerId);
      if (!container) {
        befunde.error("bindung", `Text verweist auf Container "${el.containerId}", den es nicht gibt`, el.id);
      } else if (!(container.boundElements ?? []).some((b) => b.id === el.id && b.type === "text")) {
        befunde.error("bindung", `Container "${container.id}" führt den gebundenen Text "${el.id}" nicht in boundElements`, el.id);
      }
    }

    // Gegenrichtung: jeder in boundElements genannte Text muss existieren und zurückzeigen.
    for (const bezug of el.boundElements ?? []) {
      if (bezug.type !== "text") continue;
      const text = nachId.get(bezug.id);
      if (!text) {
        befunde.error("bindung", `boundElements nennt Text "${bezug.id}", den es nicht gibt`, el.id);
      } else if (text.containerId !== el.id) {
        befunde.error("bindung", `Text "${bezug.id}" zeigt nicht auf seinen Container "${el.id}" zurück`, el.id);
      }
    }

    if (el.frameId !== null && el.frameId !== undefined && !frameIds.has(el.frameId)) {
      befunde.error("frame", `frameId "${el.frameId}" verweist auf keinen existierenden Frame`, el.id);
    }

    if (typeof el.index !== "string" || el.index.length === 0) {
      befunde.error("reihenfolge", "index fehlt oder ist leer", el.id);
    }
  }

  // z-Reihenfolge: die index-Werte müssen in Array-Reihenfolge aufsteigen.
  const indizes = elemente.map((e) => e.index).filter((i) => typeof i === "string");
  for (let i = 1; i < indizes.length; i++) {
    if (indizes[i] <= indizes[i - 1]) {
      befunde.error("reihenfolge", `z-Index "${indizes[i]}" steigt nicht gegenüber "${indizes[i - 1]}"`, elemente[i]?.id ?? null);
      break; // Eine Meldung genügt; die Reihenfolge ist als Ganzes kaputt.
    }
  }
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/validate-references.test.js`
Expected: PASS, 7 Tests

- [ ] **Step 5: Commit**

```bash
git add lib/validate/structure.js tests/validate-references.test.js
git commit -m "feat: Prüfung der Referenzintegrität"
```

---

### Task 4: Abgleich mit dem Text-Index

**Files:**
- Modify: `lib/validate/structure.js`
- Test: `tests/validate-textindex.test.js`

**Interfaces:**
- Consumes: `markdownToScene` aus `lib/document.js`
- Produces: `checkTextIndex(elements: object[], markdown: string, befunde: Collector): void`

Die Sektion `## Text Elements` ist Obsidians Suchindex. Fehlt dort ein Textelement, ist es in Obsidian unauffindbar; steht dort eines zu viel, zeigt die Suche auf ein Element, das es nicht gibt.

**Nach Task 4 korrigiert — die Sektion ist grundsätzlich mehrdeutig.** Sie enthält beliebigen Nutzertext, der syntaktisch nicht von einem Indexeintrag zu unterscheiden ist (belegt: ein Text mit Absatz, dessen erster Teil auf `^abc12345` endet; ein Text, dessen Zeile mit `## ` beginnt). Deshalb:

- **Vorwärts** („steht jedes Textelement im Index?") wird geprüft, indem je Element gezielt nach seiner erwarteten Zeile gesucht wird, statt die Sektion in eine Liste zu zerlegen. Nicht täuschbar, bleibt **harter Fehler**.
- **Rückwärts** („nennt der Index ein unbekanntes Element?") ist nicht zuverlässig entscheidbar und ist nur eine **Warnung**, deren Meldung die mögliche Fehlmeldung benennt. Ein blockierter gültiger Entwurf wäre schlimmer als ein übersehener verwaister Eintrag.

- [ ] **Step 1: Test schreiben**

```js
// tests/validate-textindex.test.js
import { describe, it, expect } from "vitest";
import { createFindings } from "../lib/validate/findings.js";
import { checkTextIndex } from "../lib/validate/structure.js";
import { scene } from "../lib/scene.js";
import { sceneToMarkdown } from "../lib/document.js";

function baueSzene() {
  const s = scene();
  const f = s.frame("Kapitel");
  f.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
  f.text("Freitext", { typo: "standard", x: 40, y: 400 });
  return s;
}

function pruefe(elemente, markdown) {
  const befunde = createFindings();
  checkTextIndex(elemente, markdown, befunde);
  return befunde.all();
}

describe("checkTextIndex", () => {
  const s = baueSzene();
  const markdown = sceneToMarkdown(s, { pluginVersion: "2.23.12" });

  it("akzeptiert eine selbst erzeugte Datei", () => {
    expect(pruefe(s.elements(), markdown)).toEqual([]);
  });

  it("meldet ein Textelement, das im Index fehlt", () => {
    const textId = s.elements().find((e) => e.type === "text").id;
    const ohne = markdown.replace(new RegExp(`^.* \\^${textId}$`, "m"), "");
    const befunde = pruefe(s.elements(), ohne);
    expect(befunde.some((b) => b.regel === "textindex" && b.elementId === textId)).toBe(true);
  });

  it("meldet einen Index-Eintrag ohne zugehöriges Element", () => {
    const zuviel = markdown.replace("## Text Elements", "## Text Elements\nGespenst ^zzzzzzzz\n");
    const befunde = pruefe(s.elements(), zuviel);
    expect(befunde.some((b) => b.meldung.includes("zzzzzzzz"))).toBe(true);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/validate-textindex.test.js`
Expected: FAIL, `checkTextIndex is not a function`

- [ ] **Step 3: Implementieren**

```js
// Ergänzung in lib/validate/structure.js
import { markdownToScene } from "../document.js";

export function checkTextIndex(elemente, markdown, befunde) {
  const imIndex = new Set(markdownToScene(markdown).sektionen.textElemente);
  const textIds = elemente.filter((e) => e.type === "text").map((e) => e.id);

  for (const id of textIds) {
    if (!imIndex.has(id)) {
      befunde.error("textindex", `Textelement "${id}" fehlt in der Sektion "## Text Elements" — in Obsidian nicht auffindbar`, id);
    }
  }

  const vorhandene = new Set(textIds);
  for (const id of imIndex) {
    if (!vorhandene.has(id)) {
      befunde.error("textindex", `Der Index nennt "${id}", wozu es kein Textelement gibt`, id);
    }
  }
}
```

**Hinweis zum Import:** `lib/validate/structure.js` liegt eine Ebene tiefer als `lib/document.js`, deshalb `../document.js`.

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/validate-textindex.test.js`
Expected: PASS, 3 Tests

- [ ] **Step 5: Commit**

```bash
git add lib/validate/structure.js tests/validate-textindex.test.js
git commit -m "feat: Abgleich der Szene mit dem Obsidian-Textindex"
```

---

### Task 5: Geometrie-Warnungen

**Files:**
- Create: `lib/validate/layout.js`
- Test: `tests/validate-geometry.test.js`

**Interfaces:**
- Consumes: `ABSTAND` aus `lib/style.js`
- Produces: `checkGeometry(elements: object[], befunde: Collector): void`

Drei Warnungen: Elemente überlappen, ein Kind ragt über seinen Frame hinaus, zwei Frames stehen enger als `ABSTAND.frames`.

**Erlaubte Überlappungen** (keine Warnung): Container mit seinem gebundenen Text, Frame mit seinen Kindern, Frame mit Frame (die prüft die Abstandsregel). Alles andere ist ein Hinweis, dass die Komposition unsauber ist.

- [ ] **Step 1: Test schreiben**

```js
// tests/validate-geometry.test.js
import { describe, it, expect } from "vitest";
import { createFindings } from "../lib/validate/findings.js";
import { checkGeometry } from "../lib/validate/layout.js";
import { scene } from "../lib/scene.js";
import { ABSTAND } from "../lib/style.js";

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
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/validate-geometry.test.js`
Expected: FAIL, `Cannot find module '../lib/validate/layout.js'`

- [ ] **Step 3: Implementieren**

```js
// lib/validate/layout.js
import { ABSTAND } from "../style.js";

/** Überlappen sich zwei Rechtecke? Berührung zählt nicht. */
function ueberlappen(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width
      && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** Liegt das Kind vollständig im Frame? */
function liegtInnerhalb(kind, frame) {
  return kind.x >= frame.x && kind.y >= frame.y
      && kind.x + kind.width <= frame.x + frame.width
      && kind.y + kind.height <= frame.y + frame.height;
}

/** Kleinster Abstand zwischen zwei Rechtecken; 0 bei Überlappung. */
function abstand(a, b) {
  const dx = Math.max(0, Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)));
  const dy = Math.max(0, Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height)));
  return Math.max(dx, dy);
}

export function checkGeometry(elemente, befunde) {
  const frames = elemente.filter((e) => e.type === "frame");
  const nachId = new Map(elemente.map((e) => [e.id, e]));

  // Frame-Abstand
  for (let i = 0; i < frames.length; i++) {
    for (let j = i + 1; j < frames.length; j++) {
      const d = abstand(frames[i], frames[j]);
      if (d < ABSTAND.frames) {
        befunde.warn(
          "frameabstand",
          `Frames "${frames[i].name}" und "${frames[j].name}" stehen ${Math.round(d)} Einheiten auseinander, vorgesehen sind ${ABSTAND.frames}`,
          frames[i].id,
        );
      }
    }
  }

  // Gebundene Texte werden durchgehend übersprungen: Sie sitzen definitionsgemäß in
  // ihrem Container und folgen ihm. Würden sie mitgeprüft, erzeugte eine einzige
  // Überlappung zweier Kästen bis zu vier Meldungen (Kasten/Kasten, Kasten/Text,
  // Text/Kasten, Text/Text) — und dieselbe Ursache viermal zu melden macht die
  // Warnliste unbrauchbar.
  const eigenstaendig = elemente.filter((e) => !(e.type === "text" && e.containerId));

  // Kind ragt über seinen Frame hinaus
  for (const el of eigenstaendig) {
    if (el.type === "frame" || !el.frameId) continue;
    const frame = nachId.get(el.frameId);
    if (frame && !liegtInnerhalb(el, frame)) {
      befunde.warn("framegrenze", `Element ragt über den Frame "${frame.name}" hinaus`, el.id);
    }
  }

  // Überlappungen zwischen eigenständigen Nicht-Frame-Elementen
  const koerper = eigenstaendig.filter((e) => e.type !== "frame");
  for (let i = 0; i < koerper.length; i++) {
    for (let j = i + 1; j < koerper.length; j++) {
      if (ueberlappen(koerper[i], koerper[j])) {
        befunde.warn("ueberlappung", `Element überlappt mit "${koerper[j].id}"`, koerper[i].id);
      }
    }
  }
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/validate-geometry.test.js`
Expected: PASS, 6 Tests

- [ ] **Step 5: Commit**

```bash
git add lib/validate/layout.js tests/validate-geometry.test.js
git commit -m "feat: Geometrie-Warnungen für Überlappung, Frame-Grenzen und Abstand"
```

---

### Task 6: Textpassung und Lesbarkeit

**Files:**
- Modify: `lib/elements.js` (zwei Funktionen exportieren), `lib/validate/layout.js`
- Test: `tests/validate-text.test.js`

**Interfaces:**
- Consumes: `innerDimension` aus `lib/elements.js`, `measureText` aus `lib/text.js`, `LESBARKEIT_MIN` aus `lib/style.js`
- Produces:
  - `lib/elements.js`: `innerDimension(containerDimension: number, type: string): number` und `innerOrigin(container: object, type: string): { x, y }` werden **exportiert** (bisher modulintern)
  - `lib/validate/layout.js`: `checkTextFit(elements, registry, befunde): void`, `checkLegibility(elements, zoomL0, befunde): void`

**Warum `innerDimension` exportiert wird:** Die Element-Fabriken berechnen damit die einbeschriebene Fläche von Ellipse und Raute. Würde der Validator diese Geometrie nachbauen, gäbe es zwei Formeln für dieselbe Sache — und die eine würde irgendwann von der anderen abweichen, ohne dass ein Test es merkt.

**Zur Lesbarkeitsregel:** Elemente tragen ihre Zielstufe nicht mit sich. Prüfbar ist deshalb zweierlei: Jedes Textelement muss auf L1 lesbar sein (`fontSize ≥ 18`, weil dort der Zoomfaktor 1,0 ist), und mindestens ein Element muss auf L0 lesbar sein — sonst zeigt die Übersicht des Boards nur Textur ohne jede Orientierung.

- [ ] **Step 1: Test schreiben**

```js
// tests/validate-text.test.js
import { describe, it, expect } from "vitest";
import { createFindings } from "../lib/validate/findings.js";
import { checkTextFit, checkLegibility } from "../lib/validate/layout.js";
import { scene } from "../lib/scene.js";
import { loadFontRegistry } from "../lib/fonts.js";

const register = loadFontRegistry();

function pruefeFit(elemente) {
  const befunde = createFindings();
  checkTextFit(elemente, register, befunde);
  return befunde.all();
}

function pruefeLesbar(elemente, zoom) {
  const befunde = createFindings();
  checkLegibility(elemente, zoom, befunde);
  return befunde.all();
}

describe("checkTextFit", () => {
  it("akzeptiert automatisch dimensionierte Formen", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Mängelwesen", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    f.ellipse("Entlastung", { rolle: "ergebnis", typo: "kernbegriff", x: 100, y: 500 });
    f.diamond("Frage?", { rolle: "frage", typo: "kernbegriff", x: 800, y: 500 });
    expect(pruefeFit(s.elements())).toEqual([]);
  });

  it("meldet einen Container, der zu niedrig für seinen Text ist", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Ein recht langer Satz, der umbrechen muss", {
      rolle: "kern", typo: "standard", x: 100, y: 100, breite: 300, hoehe: 40,
    });
    const befunde = pruefeFit(s.elements());
    expect(befunde.some((b) => b.regel === "textpassung" && b.schwere === "warnung")).toBe(true);
  });
});

describe("checkLegibility", () => {
  it("akzeptiert die Standardgrößen auf L1", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.text("Titel", { typo: "frametitel", x: 40, y: 40 });
    f.box("Fließtext", { rolle: "neutral", typo: "standard", x: 100, y: 300 });
    expect(pruefeLesbar(s.elements(), s.dimensions().zoomL0).filter((b) => b.regel === "lesbarkeit-l1")).toEqual([]);
  });

  it("meldet Text unter der L1-Schwelle", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.text("Quellenangabe", { typo: "fussnote", x: 40, y: 40 });
    const befunde = pruefeLesbar(s.elements(), s.dimensions().zoomL0);
    expect(befunde.some((b) => b.regel === "lesbarkeit-l1")).toBe(true);
  });

  it("meldet ein Board ohne jede auf L0 lesbare Beschriftung", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Nur Fließtext", { rolle: "neutral", typo: "standard", x: 100, y: 100 });
    // Zoomfaktor eines sehr großen Boards
    const befunde = pruefeLesbar(s.elements(), 0.1);
    expect(befunde.some((b) => b.regel === "lesbarkeit-l0")).toBe(true);
  });

  it("meldet nichts, wenn ein Frame-Titel auf L0 trägt", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.text("Großer Titel", { typo: "frametitel", x: 40, y: 40 });
    const befunde = pruefeLesbar(s.elements(), 0.3);
    expect(befunde.filter((b) => b.regel === "lesbarkeit-l0")).toEqual([]);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/validate-text.test.js`
Expected: FAIL, `checkTextFit is not a function`

- [ ] **Step 3: `innerDimension` und `innerOrigin` exportieren**

In `lib/elements.js` die beiden bestehenden Funktionsdeklarationen um `export` ergänzen:

```js
export function innerDimension(containerDimension, type) {
```

```js
export function innerOrigin(container, type) {
```

Keine weitere Änderung an `lib/elements.js` — Verhalten und Signaturen bleiben.

- [ ] **Step 4: Prüfungen implementieren**

```js
// Ergänzung in lib/validate/layout.js
import { LESBARKEIT_MIN } from "../style.js";
import { innerDimension } from "../elements.js";
import { measureText } from "../text.js";

/**
 * Passt der gebundene Text in die einbeschriebene Fläche seines Containers?
 * Die Innenmaße kommen aus derselben Funktion, die die Element-Fabriken
 * benutzen — sonst gäbe es zwei Formeln für dieselbe Form.
 */
export function checkTextFit(elemente, registry, befunde) {
  const nachId = new Map(elemente.map((e) => [e.id, e]));

  for (const text of elemente) {
    if (text.type !== "text" || !text.containerId) continue;
    const container = nachId.get(text.containerId);
    if (!container) continue; // Fehlende Bindung meldet bereits checkReferences.

    const innenBreite = innerDimension(container.width, container.type);
    const innenHoehe = innerDimension(container.height, container.type);

    const gemessen = measureText(
      text.originalText,
      { fontFamily: text.fontFamily, fontSize: text.fontSize, maxBreite: innenBreite },
      registry,
    );

    if (gemessen.hoehe > innenHoehe) {
      befunde.warn(
        "textpassung",
        `Text braucht ${Math.round(gemessen.hoehe)} Einheiten Höhe, die einbeschriebene Fläche bietet ${Math.round(innenHoehe)}`,
        text.id,
      );
    }
  }
}

/**
 * Lesbarkeit auf den beiden Zoomstufen. Elemente tragen ihre Zielstufe nicht
 * mit sich, prüfbar ist deshalb: jeder Text muss auf L1 lesbar sein, und
 * mindestens einer auf L0 — sonst bietet die Übersicht keine Orientierung.
 */
export function checkLegibility(elemente, zoomL0, befunde) {
  const texte = elemente.filter((e) => e.type === "text");

  for (const text of texte) {
    if (text.fontSize < LESBARKEIT_MIN) {
      befunde.warn(
        "lesbarkeit-l1",
        `Schriftgröße ${text.fontSize} liegt unter ${LESBARKEIT_MIN} und ist auf Kapitelebene schwer lesbar`,
        text.id,
      );
    }
  }

  if (texte.length > 0 && !texte.some((t) => t.fontSize * zoomL0 >= LESBARKEIT_MIN)) {
    befunde.warn(
      "lesbarkeit-l0",
      `Kein Text ist in der Gesamtübersicht lesbar (Zoomfaktor ${zoomL0.toFixed(2)}); nötig wären mindestens ${Math.ceil(LESBARKEIT_MIN / zoomL0)} Einheiten Schriftgröße`,
    );
  }
}
```

- [ ] **Step 5: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/validate-text.test.js`
Expected: PASS, 6 Tests

- [ ] **Step 6: Volle Suite laufen lassen**

Run: `npx vitest run`
Expected: PASS, alle bisherigen 140 Tests plus die neuen

- [ ] **Step 7: Commit**

```bash
git add lib/elements.js lib/validate/layout.js tests/validate-text.test.js
git commit -m "feat: Prüfung von Textpassung und Lesbarkeit"
```

---

### Task 7: Orchestrierung und Kommandozeile

**Files:**
- Create: `lib/validate/index.js`, `bin/validate.mjs`
- Modify: `lib/index.js`
- Test: `tests/validate.test.js`

**Interfaces:**
- Consumes: alle Prüffunktionen aus `structure.js` und `layout.js`
- Produces:
  - `validateScene(elements: object[], optionen): { ok: boolean, findings: Finding[] }`
    mit `optionen = { markdown?: string, registry?: Registry, zoomL0?: number }`
  - `ok` ist `false`, sobald ein Befund der Schwere `"fehler"` vorliegt. Warnungen setzen `ok` **nicht** auf `false`.
  - `formatFindings(findings: Finding[]): string` — mehrzeilige, lesbare Ausgabe
  - `lib/index.js` re-exportiert `validateScene`

- [ ] **Step 1: Test schreiben**

```js
// tests/validate.test.js
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
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/validate.test.js`
Expected: FAIL, `Cannot find module '../lib/validate/index.js'`

- [ ] **Step 3: Implementieren**

```js
// lib/validate/index.js
import { createFindings, SCHWERE } from "./findings.js";
import { checkSchema, checkReferences, checkTextIndex } from "./structure.js";
import { checkGeometry, checkTextFit, checkLegibility } from "./layout.js";
import { loadFontRegistry } from "../fonts.js";

export { SCHWERE } from "./findings.js";

/**
 * Prüft eine Szene. Harte Fehler setzen ok auf false — dann wird nichts in den
 * Vault geschrieben. Warnungen werden gemeldet, blockieren aber nicht; über sie
 * entscheidet das Modell beim Ansehen des Renderings.
 *
 * markdown ist optional: nur damit lässt sich der Obsidian-Textindex abgleichen.
 */
export function validateScene(elemente, { markdown = null, registry = loadFontRegistry(), zoomL0 = 1 } = {}) {
  const befunde = createFindings();

  checkSchema(elemente, befunde);
  checkReferences(elemente, befunde);
  if (markdown !== null) checkTextIndex(elemente, markdown, befunde);

  checkGeometry(elemente, befunde);
  checkTextFit(elemente, registry, befunde);
  checkLegibility(elemente, zoomL0, befunde);

  return { ok: !befunde.hasErrors(), findings: befunde.all() };
}

/** Lesbare Ausgabe für die Kommandozeile und für das Modell. */
export function formatFindings(befunde) {
  if (befunde.length === 0) return "Keine Befunde.";

  const fehler = befunde.filter((b) => b.schwere === SCHWERE.fehler);
  const warnungen = befunde.filter((b) => b.schwere === SCHWERE.warnung);

  const zeile = (b) => `  [${b.regel}]${b.elementId ? ` ${b.elementId}` : ""}: ${b.meldung}`;
  const teile = [];

  if (fehler.length > 0) teile.push(`${fehler.length} Fehler:`, ...fehler.map(zeile));
  if (warnungen.length > 0) teile.push(`${warnungen.length} Warnungen:`, ...warnungen.map(zeile));

  return teile.join("\n");
}
```

```js
// bin/validate.mjs
import fs from "node:fs";
import { validateScene, formatFindings } from "../lib/validate/index.js";
import { markdownToScene } from "../lib/document.js";
import { zoomL0 } from "../lib/style.js";

const [dateiPfad] = process.argv.slice(2);

if (!dateiPfad) {
  console.error("Aufruf: node bin/validate.mjs <datei.excalidraw.md>");
  process.exit(1);
}

const markdown = fs.readFileSync(dateiPfad, "utf8");
const { elements } = markdownToScene(markdown);

// Boardmaße aus den Elementen selbst, damit die L0-Regel auch für fremde Dateien greift.
const rechts = Math.max(...elements.map((e) => e.x + e.width));
const unten = Math.max(...elements.map((e) => e.y + e.height));
const links = Math.min(...elements.map((e) => e.x));
const oben = Math.min(...elements.map((e) => e.y));

const ergebnis = validateScene(elements, {
  markdown,
  zoomL0: zoomL0(rechts - links, unten - oben),
});

console.log(formatFindings(ergebnis.findings));
console.log(ergebnis.ok ? "\nGültig." : "\nUngültig — harte Fehler vorhanden.");
process.exit(ergebnis.ok ? 0 : 1);
```

```js
// lib/index.js — Zeile ergänzen
export { validateScene, formatFindings } from "./validate/index.js";
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/validate.test.js`
Expected: PASS, 7 Tests

- [ ] **Step 5: Gegen das echte Board prüfen**

Run: `node bin/validate.mjs "/Users/dennis/Tafelbilder/Excalidraw/Skill-Test Stufe 1.excalidraw.md"`
Expected: `Keine Befunde.` und `Gültig.`, Exit-Code 0.

Meldet der Validator hier Befunde, ist das ein echtes Ergebnis — entweder ist das Board tatsächlich mangelhaft oder eine Prüfregel ist zu streng. Beides gehört in den Bericht, nichts davon wird stillschweigend weggeregelt.

- [ ] **Step 6: Volle Suite**

Run: `npx vitest run`
Expected: PASS, alle Tests

- [ ] **Step 7: Commit**

```bash
git add lib/validate/index.js lib/index.js bin/validate.mjs tests/validate.test.js
git commit -m "feat: Validator-Orchestrierung und Kommandozeile"
```

---

## Abschluss der Stufe 2a

Nach Task 7 gilt:

- Eine Szene lässt sich vor dem Schreiben auf harte Fehler und weiche Warnungen prüfen.
- Harte Fehler blockieren, Warnungen informieren.
- Der Validator benutzt dieselbe Geometrie wie die Element-Fabriken, nicht eine zweite Formel.
- `node bin/validate.mjs <datei>` prüft Dateien, die dieser Skill erzeugt hat.

**Nach Task 7 korrigiert.** Die erste Fassung behauptete, die Kommandozeile prüfe „auch bestehende Boards aus dem Vault". Das ist falsch. Der Validator beurteilt ausschließlich, was dieser Skill erzeugt. Gegen alle 632 Boards des Vaults gelaufen, meldete er zunächst bei 454 harte Fehler — nicht weil die Boards kaputt wären, sondern weil sie `freedraw` (12181 Vorkommen), `arrow`, `image`, `line` und die Virgil-Schrift benutzen, also Dinge aus späteren Stufen oder aus der Zeit vor Excalifont.

Deshalb erkennt die Kommandozeile jetzt Dateien außerhalb ihres Umfangs, sagt das **vor** den Befunden und beendet sich mit einem eigenen Exit-Code (2), der „kann ich nicht beurteilen" von „ist defekt" (1) unterscheidet. Nach dieser Änderung: 611 Boards als außerhalb des Umfangs erkannt, 5 mit echten Befunden.

**Noch nicht möglich:** Sehen, wie das Board aussieht. Das leistet Plan 2b (Renderer). Erst danach wird der Validator in `bin/build.mjs` als Gate vor dem Schreiben eingehängt — das gehört in 2b, weil beide Gates zusammen eingebaut werden sollen.

**Bewusst nicht geprüft, weil die Features erst später entstehen:** Pfeil-Bindungen, Bild-Referenzen und ihre SHA-1-Summen, Notiz-Links, Transklusionen, Mengenkreise.
