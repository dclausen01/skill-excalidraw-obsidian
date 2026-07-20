# Excalidraw-Tafelbild-Skill — Stufe 1: Fundament

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aus einem Szenen-Skript entsteht eine gültige `.excalidraw.md`, die sich in Obsidian öffnet und Kästen, Texte und Frames im Hausstil korrekt darstellt.

**Architecture:** Reine ESM-Node-Library ohne Framework. Die Textmessung (`lib/text.js`) steht am Anfang, weil sie das ganze Vorhaben trägt: Sie wird gegen echte Referenzwerte aus dem Vault geprüft, bevor irgendetwas darauf aufbaut (nach Filterung auf Einzeiler und Entdopplung: 454 Proben für Excalifont, 37 für Nunito). Darüber liegen Szenen-Objekt und Primitive, ganz oben die Serialisierung nach Markdown. Jedes Modul hat eine Aufgabe und kennt die Schichten über sich nicht.

**Tech Stack:** Node ≥ 20 (ESM), vitest, fontkit (Schriftmetrik), lz-string (Lesen bestehender Boards), fractional-indexing (z-Reihenfolge), `@excalidraw/excalidraw@0.18.1` (nur als Schriftquelle in dieser Stufe).

## Global Constraints

- **Node ≥ 20**, ausschließlich ESM (`"type": "module"`). Keine CommonJS-Dateien.
- **Vault-Pfad:** `/Users/dennis/Tafelbilder`. Nie fest verdrahtet — immer aus `lib/config.js`.
- **Erzeugt werden nur `fontFamily: 5`** (Excalifont, `lineHeight` **1.25**) **und `6`** (Nunito, `lineHeight` **1.35**). Beim *Lesen* müssen `1`, `2`, `3`, `7`, `8` toleriert werden; `1` ist im Vault der häufigste Wert.
- **Höhenformel:** `height = Zeilenzahl × fontSize × lineHeight`. Verifiziert, nicht zu messen.
- **Frame:** 1920 × 1080 Szeneneinheiten. Basiseinheit 20. Abstände: `eng` 40, `normal` 80, `weit` 160, zwischen Frames 240.
- **Strichstil:** `strokeWidth: 2`, `roughness: 1`, `fillStyle: "solid"`, Rechtecke `roundness: { type: 3 }`, Pfeile `roundness: { type: 2 }`.
- **Farbrollen** (Strich / Füllung), exakt diese Werte:
  `neutral` `#1e1e1e`/`#ffffff` · `kern` `#1971c2`/`#a5d8ff` · `kontra` `#e03131`/`#ffc9c9` · `ergebnis` `#2f9e44`/`#b2f2bb` · `frage` `#f08c00`/`#ffec99` · `kontext` `#868e96`/`#f1f3f5` · `technik` `#6741d9`/`#d0bfff`
- **Typo-Skala:** Board-Titel ≥ 120 (Excalifont, L0), Frame-Titel ≥ 72 (Excalifont, L0), Kernbegriff 36 (Excalifont, L1), Standard 24 (Nunito, L1), Detail 18 (Nunito, L1), Fußnote 14 (Nunito, L2).
- **Determinismus:** `id`, `seed` und `versionNonce` werden aus dem Elementinhalt abgeleitet, nie gewürfelt. Zweimal Bauen muss byte-identische Dateien ergeben.
- **Der Vault wird zuletzt angefasst.** Alle Zwischenergebnisse landen im Scratchpad. Kein stilles Überschreiben bestehender Dateien.
- **Die Plugin-Version für `source`** wird zur Laufzeit aus `.obsidian/plugins/obsidian-excalidraw-plugin/manifest.json` gelesen.
- **Sprache im Code:**
  - **Exportierte Namen englisch, wo der Code an Fremd-APIs grenzt** — Messung, Schriftladen, Dateiformat, Serialisierung (`measureLine`, `loadFontRegistry`, `szeneZuMarkdown`). Dort steht der Code neben fontkit, Node und Excalidraw und bleibt einsprachig.
  - **Ausnahme: das Gestaltungsvokabular in `lib/style.js` ist deutsch** (`FARBROLLEN`, `TYPO`, `ABSTAND`, `STRICH`, `zoomL0`, `titelGroesse`, `istLesbar`). Diese Datei ist keine technische Schnittstelle, sondern die Sprache, in der über das Tafelbild gesprochen wird — und ihre Werte (`kern`, `kontra`, `frametitel`) sind ohnehin deutsch. Eine Hälfte davon einzudeutschen und die andere nicht wäre die schlechtere Wahl. Nach Task 7 vom Nutzer so entschieden.
  - **Lokale Variablen und Parameter dürfen deutsch sein** (`pfad`, `zeilen`, `roh`, `fehler`). Ausdrücklich erlaubt, nicht nur geduldet.
  - **Semantische Werte und Optionsschlüssel deutsch** (`{ rolle: "kern", typo: "kernbegriff" }`).
  - **Kommentare deutsch.**

  Diese Regel wurde nach Task 1 präzisiert: Die ursprüngliche Fassung verlangte pauschal englische Bezeichner, während der Beispielcode des Plans durchgehend deutsche lokale Variablen verwendete. Aufgelöst zugunsten des Beispielcodes.

## Dateistruktur dieser Stufe

| Datei | Verantwortung |
|---|---|
| `lib/config.js` | Pfade (Vault, Schriften, Plugin-Manifest) an einer Stelle |
| `lib/environment.js` | Prüfbare Umgebungschecks für `doctor` |
| `lib/compress.js` | `compressed-json` lesen, Drawing-Block aus Markdown lösen |
| `lib/fonts.js` | Schriftregister: Codepoint → Subset-Datei, `unitsPerEm`, `lineHeight` |
| `lib/text.js` | Breitenmessung, Zeilenumbruch, Gesamtmaße |
| `lib/style.js` | Hausstil-Tokens, Zoomstufen, adaptive Titelgrößen |
| `lib/ids.js` | Deterministische IDs, `seed`, `versionNonce` |
| `lib/scene.js` | Szenen-Objekt, Frames, z-Reihenfolge |
| `lib/elements.js` | Primitive: `text`, `box`, `ellipse`, `diamond`, `frame` |
| `lib/document.js` | Szene ↔ `.excalidraw.md` |
| `lib/index.js` | Öffentliche API |
| `bin/doctor.mjs` | Umgebungsbericht |
| `bin/build.mjs` | Szenen-Skript ausführen → Datei schreiben |
| `scripts/sync-fonts.mjs` | Schriften aus node_modules nach `assets/fonts/` |
| `scripts/extract-text-metrics.mjs` | Golden-Werte aus dem Vault ziehen |

**Nicht in dieser Stufe:** Validator, Renderer, `connect()`, Layout-Helfer, Obsidian-Links, Bilder, Transklusion, Spezialkomponenten. Die kommen in den Stufen 2–4 mit eigenen Plänen.

---

### Task 1: Projektgerüst und Umgebungsprüfung

**Files:**
- Create: `package.json`, `lib/config.js`, `lib/environment.js`, `bin/doctor.mjs`
- Test: `tests/environment.test.js`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `lib/config.js`: `VAULT_PATH: string`, `FONT_DIR: string`, `PLUGIN_MANIFEST: string`, `REQUIRED_NODE_MAJOR: number`
  - `lib/environment.js`: `checkNode(version?: string): Check`, `checkVault(path?: string): Check`, `checkFonts(dir?: string): Check`, `readPluginVersion(manifestPath?: string): string`, `runAllChecks(): { ok: boolean, checks: Check[] }`
  - Typ `Check = { name: string, ok: boolean, message: string }`

- [ ] **Step 1: Projekt anlegen**

```bash
cd /Users/dennis/Projekte/Skill_Excalidraw_erstellen
npm init -y
npm pkg set type=module name=skill-excalidraw-obsidian version=0.1.0 license=MIT
npm pkg set scripts.test="vitest run" scripts.doctor="node bin/doctor.mjs"
npm i lz-string@1.5.0 fontkit@2.0.4 fractional-indexing@3.2.0
npm i -D vitest@2.1.8
npm i -D @excalidraw/excalidraw@0.18.1
```

`@excalidraw/excalidraw` ist bewusst eine Dev-Abhängigkeit: In Stufe 1 dient es ausschließlich als Schriftquelle, die einmalig nach `assets/fonts/` kopiert wird.

- [ ] **Step 2: Konfiguration schreiben**

```js
// lib/config.js
import path from "node:path";
import { fileURLToPath } from "node:url";

const HIER = path.dirname(fileURLToPath(import.meta.url));

/** Wurzel des Skill-Projekts (eine Ebene über lib/). */
export const PROJECT_ROOT = path.resolve(HIER, "..");

/** Obsidian-Vault mit den Tafelbildern. */
export const VAULT_PATH = process.env.TAFELBILDER_VAULT ?? "/Users/dennis/Tafelbilder";

/** Kopierte Schrift-Subsets für die Messung. */
export const FONT_DIR = path.join(PROJECT_ROOT, "assets", "fonts");

/** Manifest des Excalidraw-Plugins — Quelle der Versionsnummer im Szenen-JSON. */
export const PLUGIN_MANIFEST = path.join(
  VAULT_PATH, ".obsidian", "plugins", "obsidian-excalidraw-plugin", "manifest.json",
);

export const REQUIRED_NODE_MAJOR = 20;
```

- [ ] **Step 3: Test für die Umgebungsprüfung schreiben**

```js
// tests/environment.test.js
import { describe, it, expect } from "vitest";
import { checkNode, checkVault, readPluginVersion } from "../lib/environment.js";

describe("checkNode", () => {
  it("lehnt zu alte Node-Versionen ab und nennt die geforderte Version", () => {
    const check = checkNode("18.19.0");
    expect(check.ok).toBe(false);
    expect(check.message).toContain("20");
  });

  it("akzeptiert eine ausreichende Version", () => {
    expect(checkNode("22.1.0").ok).toBe(true);
  });
});

describe("checkVault", () => {
  it("meldet einen fehlenden Vault mit dem Pfad im Text", () => {
    const check = checkVault("/gibt/es/nicht");
    expect(check.ok).toBe(false);
    expect(check.message).toContain("/gibt/es/nicht");
  });
});

describe("readPluginVersion", () => {
  it("liest die Version aus dem echten Plugin-Manifest", () => {
    expect(readPluginVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });
});
```

- [ ] **Step 4: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/environment.test.js`
Expected: FAIL, `Cannot find module '../lib/environment.js'`

- [ ] **Step 5: Umgebungsprüfung implementieren**

```js
// lib/environment.js
import fs from "node:fs";
import { VAULT_PATH, FONT_DIR, PLUGIN_MANIFEST, REQUIRED_NODE_MAJOR } from "./config.js";

/** @typedef {{ name: string, ok: boolean, message: string }} Check */

export function checkNode(version = process.versions.node) {
  const major = Number.parseInt(version.split(".")[0], 10);
  const ok = major >= REQUIRED_NODE_MAJOR;
  return {
    name: "Node-Version",
    ok,
    message: ok
      ? `Node ${version}`
      : `Node ${version} ist zu alt — benötigt wird mindestens ${REQUIRED_NODE_MAJOR}.`,
  };
}

export function checkVault(pfad = VAULT_PATH) {
  const ok = fs.existsSync(pfad) && fs.statSync(pfad).isDirectory();
  return {
    name: "Vault",
    ok,
    message: ok ? pfad : `Vault nicht gefunden unter ${pfad}. Pfad über TAFELBILDER_VAULT setzen.`,
  };
}

export function checkFonts(dir = FONT_DIR) {
  const vorhanden = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".woff2")).length
    : 0;
  const ok = vorhanden > 0;
  return {
    name: "Schriften",
    ok,
    message: ok
      ? `${vorhanden} Schrift-Subsets in ${dir}`
      : `Keine Schriften in ${dir}. Abhilfe: npm run sync-fonts`,
  };
}

export function readPluginVersion(manifestPfad = PLUGIN_MANIFEST) {
  const roh = fs.readFileSync(manifestPfad, "utf8");
  const { version } = JSON.parse(roh);
  if (!version) throw new Error(`Keine Version in ${manifestPfad}`);
  return version;
}

export function runAllChecks() {
  const checks = [checkNode(), checkVault(), checkFonts()];
  try {
    checks.push({ name: "Plugin", ok: true, message: `Excalidraw-Plugin ${readPluginVersion()}` });
  } catch (fehler) {
    checks.push({ name: "Plugin", ok: false, message: `Manifest nicht lesbar: ${fehler.message}` });
  }
  return { ok: checks.every((c) => c.ok), checks };
}
```

- [ ] **Step 6: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/environment.test.js`
Expected: PASS, 4 Tests

- [ ] **Step 7: doctor-Kommando schreiben**

```js
// bin/doctor.mjs
import { runAllChecks } from "../lib/environment.js";

const { ok, checks } = runAllChecks();
for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.name.padEnd(14)} ${c.message}`);
}
console.log(ok ? "\nAlles bereit." : "\nEs fehlt etwas — siehe die mit ✗ markierten Zeilen.");
process.exit(ok ? 0 : 1);
```

- [ ] **Step 8: doctor ausführen**

Run: `node bin/doctor.mjs`
Expected: Vault, Node und Plugin mit ✓; Schriften mit ✗ (`npm run sync-fonts` — kommt in Task 4). Exit-Code 1.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json lib/config.js lib/environment.js bin/doctor.mjs tests/environment.test.js
git commit -m "feat: Projektgerüst und Umgebungsprüfung"
```

---

### Task 2: Bestehende Boards lesen

**Files:**
- Create: `lib/compress.js`
- Test: `tests/compress.test.js`

**Interfaces:**
- Consumes: `VAULT_PATH` aus `lib/config.js`
- Produces:
  - `decompress(block: string): string` — Base64-Block → JSON-Text
  - `extractDrawing(markdown: string): { json: string, komprimiert: boolean }` — löst den Drawing-Block aus einer `.excalidraw.md`
  - Beide werfen `Error` mit erklärender Meldung statt `null` zurückzugeben.

**Hinweis:** Eine Komprimierungsfunktion wird bewusst **nicht** gebaut. Der Skill schreibt immer unkomprimiert; das Plugin komprimiert beim nächsten eigenen Speichern selbst.

- [ ] **Step 1: Test schreiben**

```js
// tests/compress.test.js
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { decompress, extractDrawing } from "../lib/compress.js";
import { VAULT_PATH } from "../lib/config.js";

const REFERENZ = path.join(VAULT_PATH, "FoBi Nextcloud + EuroOffice.excalidraw.md");

describe("extractDrawing", () => {
  it("liest eine echte komprimierte Datei aus dem Vault", () => {
    const md = fs.readFileSync(REFERENZ, "utf8");
    const { json, komprimiert } = extractDrawing(md);
    expect(komprimiert).toBe(true);

    const szene = JSON.parse(json);
    expect(szene.type).toBe("excalidraw");
    expect(szene.elements.length).toBe(23);
  });

  it("liest auch einen unkomprimierten Block", () => {
    const md = "# Excalidraw Data\n%%\n## Drawing\n```json\n{\"type\":\"excalidraw\"}\n```\n%%";
    const { json, komprimiert } = extractDrawing(md);
    expect(komprimiert).toBe(false);
    expect(JSON.parse(json).type).toBe("excalidraw");
  });

  it("meldet fehlenden Drawing-Block verständlich", () => {
    expect(() => extractDrawing("# Nur eine Notiz")).toThrow(/Drawing-Block/);
  });
});

describe("decompress", () => {
  it("meldet unbrauchbare Eingabe verständlich", () => {
    expect(() => decompress("!!!kein-base64!!!")).toThrow(/dekomprimieren/);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/compress.test.js`
Expected: FAIL, `Cannot find module '../lib/compress.js'`

- [ ] **Step 3: Implementieren**

```js
// lib/compress.js
import LZString from "lz-string";

const KOMPRIMIERT = /```compressed-json\n([\s\S]*?)\n```/;
const KLARTEXT = /```json\n([\s\S]*?)\n```/;

/** Wandelt den Inhalt eines compressed-json-Blocks in JSON-Text. */
export function decompress(block) {
  // Das Plugin bricht den Base64-String über mehrere Zeilen um.
  const bereinigt = block.replace(/[\n\r\t ]/g, "");
  const json = LZString.decompressFromBase64(bereinigt);
  if (!json) throw new Error("compressed-json ließ sich nicht dekomprimieren");
  return json;
}

/** Löst den Drawing-Block aus einer .excalidraw.md, komprimiert oder nicht. */
export function extractDrawing(markdown) {
  const k = markdown.match(KOMPRIMIERT);
  if (k) return { json: decompress(k[1]), komprimiert: true };

  const j = markdown.match(KLARTEXT);
  if (j) return { json: j[1], komprimiert: false };

  throw new Error("Kein Drawing-Block gefunden — ist das eine Excalidraw-Datei?");
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/compress.test.js`
Expected: PASS, 4 Tests

- [ ] **Step 5: Commit**

```bash
git add lib/compress.js tests/compress.test.js
git commit -m "feat: bestehende Excalidraw-Dateien einlesen"
```

---

### Task 3: Golden-Werte aus dem Vault extrahieren

**Files:**
- Create: `scripts/extract-text-metrics.mjs`
- Create (generiert): `tests/fixtures/text-metrics.json`
- Test: `tests/fixtures.test.js`

**Interfaces:**
- Consumes: `extractDrawing` aus `lib/compress.js`, `VAULT_PATH`
- Produces: `tests/fixtures/text-metrics.json` mit der Form
  `{ erzeugt: string, proben: Probe[] }`,
  `Probe = { text: string, fontFamily: number, fontSize: number, width: number, lineHeight: number, zeilen: number }`
  Nur einzeilige Proben mit `fontFamily` 5 oder 6. Diese Datei ist die Referenz für Task 5.

- [ ] **Step 1: Extraktionsskript schreiben**

```js
// scripts/extract-text-metrics.mjs
import fs from "node:fs";
import path from "node:path";
import { extractDrawing } from "../lib/compress.js";
import { VAULT_PATH, PROJECT_ROOT } from "../lib/config.js";

const ZIEL = path.join(PROJECT_ROOT, "tests", "fixtures", "text-metrics.json");
const ERZEUGTE_SCHRIFTEN = new Set([5, 6]);

function* excalidrawDateien(dir) {
  for (const eintrag of fs.readdirSync(dir, { withFileTypes: true })) {
    if (eintrag.name.startsWith(".")) continue;
    const p = path.join(dir, eintrag.name);
    if (eintrag.isDirectory()) yield* excalidrawDateien(p);
    else if (eintrag.name.endsWith(".excalidraw.md")) yield p;
  }
}

const proben = [];
const gesehen = new Set();
let dateienOk = 0;
let dateienUebersprungen = 0;
let hoehenfehler = 0;

for (const datei of excalidrawDateien(VAULT_PATH)) {
  let szene;
  try {
    szene = JSON.parse(extractDrawing(fs.readFileSync(datei, "utf8")).json);
  } catch {
    dateienUebersprungen++;
    continue;
  }
  dateienOk++;

  for (const el of szene.elements ?? []) {
    if (el.type !== "text" || el.isDeleted) continue;

    // Höhenformel gleich mitprüfen — sie ist die Grundlage aller Höhenrechnungen.
    const zeilen = el.text.split("\n").length;
    if (Math.abs(zeilen * el.fontSize * el.lineHeight - el.height) > 0.01) hoehenfehler++;

    if (zeilen > 1) continue;                       // Breite nur an Einzeilern messbar
    if (!ERZEUGTE_SCHRIFTEN.has(el.fontFamily)) continue;
    if (el.text.length === 0) continue;

    const schluessel = `${el.fontFamily}|${el.fontSize}|${el.text}`;
    if (gesehen.has(schluessel)) continue;
    gesehen.add(schluessel);

    proben.push({
      text: el.text,
      fontFamily: el.fontFamily,
      fontSize: el.fontSize,
      width: el.width,
      lineHeight: el.lineHeight,
      zeilen,
    });
  }
}

fs.mkdirSync(path.dirname(ZIEL), { recursive: true });
fs.writeFileSync(ZIEL, JSON.stringify({ erzeugt: new Date().toISOString(), proben }, null, 2));

const proSchrift = (ff) => proben.filter((p) => p.fontFamily === ff).length;
console.log(`Dateien gelesen: ${dateienOk}, übersprungen: ${dateienUebersprungen}`);
console.log(`Höhenformel verletzt: ${hoehenfehler}`);
console.log(`Proben: ${proben.length} (Excalifont ${proSchrift(5)}, Nunito ${proSchrift(6)})`);
console.log(`Geschrieben nach ${ZIEL}`);
```

- [ ] **Step 2: Skript ausführen**

Run: `node scripts/extract-text-metrics.mjs`
Expected: `Dateien gelesen: 627, übersprungen: 5`, `Höhenformel verletzt: 0`, und mehrere hundert Proben mit deutlichem Übergewicht bei Excalifont.

Ist `Höhenformel verletzt` größer als 0, hier anhalten und die Ursache klären — die Formel ist eine Grundannahme des gesamten Aufbaus.

- [ ] **Step 3: Test schreiben, der die Referenzdaten absichert**

```js
// tests/fixtures.test.js
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
```

- [ ] **Step 4: Test laufen lassen**

Run: `npx vitest run tests/fixtures.test.js`
Expected: PASS, 3 Tests

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-text-metrics.mjs tests/fixtures/text-metrics.json tests/fixtures.test.js
git commit -m "feat: Referenzwerte zur Textmessung aus dem Vault extrahieren"
```

---

### Task 4: Schriftregister

**Files:**
- Create: `scripts/sync-fonts.mjs`, `lib/fonts.js`
- Test: `tests/fonts.test.js`

**Interfaces:**
- Consumes: `FONT_DIR` aus `lib/config.js`
- Produces:
  - `EXCALIFONT = 5`, `NUNITO = 6`
  - `LINE_HEIGHT: Record<number, number>` → `{ 5: 1.25, 6: 1.35 }`
  - `loadFontRegistry(dir?: string): Registry`
  - `Registry.fontFor(codepoint: number, fontFamily: number): Font` — wirft, wenn kein Subset das Zeichen führt
  - `Registry.unitsPerEm(fontFamily: number): number`

**Hintergrund:** `@excalidraw/excalidraw` liefert Excalifont und Nunito als mehrere WOFF2-Dateien, aufgeteilt nach Unicode-Bereich. Ein einzelnes Subset enthält also nicht alle Zeichen. Das Register bildet deshalb Codepoint → passende Datei ab.

- [ ] **Step 1: Kopierskript schreiben**

```js
// scripts/sync-fonts.mjs
import fs from "node:fs";
import path from "node:path";
import { FONT_DIR, PROJECT_ROOT } from "../lib/config.js";

const QUELLE = path.join(PROJECT_ROOT, "node_modules", "@excalidraw", "excalidraw", "dist", "prod", "fonts");
const FAMILIEN = ["Excalifont", "Nunito"];

fs.mkdirSync(FONT_DIR, { recursive: true });
let kopiert = 0;

for (const familie of FAMILIEN) {
  const von = path.join(QUELLE, familie);
  if (!fs.existsSync(von)) throw new Error(`Schriftquelle fehlt: ${von} — npm i ausführen`);

  for (const datei of fs.readdirSync(von).filter((f) => f.endsWith(".woff2"))) {
    fs.copyFileSync(path.join(von, datei), path.join(FONT_DIR, `${familie}__${datei}`));
    kopiert++;
  }
}

console.log(`${kopiert} Schrift-Subsets nach ${FONT_DIR} kopiert.`);
```

- [ ] **Step 2: Skript eintragen und ausführen**

```bash
npm pkg set scripts.sync-fonts="node scripts/sync-fonts.mjs"
npm run sync-fonts
```

Expected: Meldung über kopierte Subsets (Excalifont 7, Nunito 5 laut Paketinhalt von 0.18.1). Danach meldet `node bin/doctor.mjs` alle Prüfungen mit ✓ und endet mit Exit-Code 0.

- [ ] **Step 3: Test schreiben**

```js
// tests/fonts.test.js
import { describe, it, expect } from "vitest";
import { loadFontRegistry, EXCALIFONT, NUNITO, LINE_HEIGHT } from "../lib/fonts.js";

const register = loadFontRegistry();

describe("Schriftregister", () => {
  it("kennt die Zeilenhöhe beider Schriften", () => {
    expect(LINE_HEIGHT[EXCALIFONT]).toBe(1.25);
    expect(LINE_HEIGHT[NUNITO]).toBe(1.35);
  });

  it("findet ein Subset für lateinische Buchstaben", () => {
    expect(register.fontFor("A".codePointAt(0), EXCALIFONT)).toBeTruthy();
    expect(register.fontFor("A".codePointAt(0), NUNITO)).toBeTruthy();
  });

  it("findet ein Subset für deutsche Umlaute", () => {
    for (const zeichen of ["ä", "ö", "ü", "ß", "Ä"]) {
      expect(register.fontFor(zeichen.codePointAt(0), EXCALIFONT)).toBeTruthy();
    }
  });

  it("liefert eine plausible Em-Größe", () => {
    expect(register.unitsPerEm(EXCALIFONT)).toBeGreaterThan(0);
  });

  it("meldet ein nicht abgedecktes Zeichen verständlich", () => {
    // Ein Zeichen aus der privaten Nutzungszone deckt keine Schrift ab.
    expect(() => register.fontFor(0xf8ff, EXCALIFONT)).toThrow(/Zeichen/);
  });
});
```

- [ ] **Step 4: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/fonts.test.js`
Expected: FAIL, `Cannot find module '../lib/fonts.js'`

- [ ] **Step 5: Implementieren**

```js
// lib/fonts.js
import fs from "node:fs";
import path from "node:path";
import * as fontkit from "fontkit";
import { FONT_DIR } from "./config.js";

export const EXCALIFONT = 5;
export const NUNITO = 6;

/** Zeilenhöhe je Schrift — Konstante der Schrift, kein globaler Wert. */
export const LINE_HEIGHT = { [EXCALIFONT]: 1.25, [NUNITO]: 1.35 };

const DATEIPRAEFIX = { [EXCALIFONT]: "Excalifont__", [NUNITO]: "Nunito__" };

/**
 * Lädt alle Schrift-Subsets und baut eine Zuordnung Codepoint → Subset.
 * Die Subsets einer Familie überschneiden sich nicht, die Zuordnung ist also eindeutig.
 */
export function loadFontRegistry(dir = FONT_DIR) {
  const proFamilie = new Map();

  for (const [familie, praefix] of Object.entries(DATEIPRAEFIX)) {
    const ff = Number(familie);
    const zeichenKarte = new Map();
    let unitsPerEm = null;

    const dateien = fs.readdirSync(dir).filter((f) => f.startsWith(praefix) && f.endsWith(".woff2"));
    if (dateien.length === 0) throw new Error(`Keine Subsets für fontFamily ${ff} in ${dir}`);

    for (const datei of dateien) {
      const font = fontkit.openSync(path.join(dir, datei));
      unitsPerEm ??= font.unitsPerEm;
      for (const codepoint of font.characterSet) {
        if (!zeichenKarte.has(codepoint)) zeichenKarte.set(codepoint, font);
      }
    }

    proFamilie.set(ff, { zeichenKarte, unitsPerEm });
  }

  return {
    fontFor(codepoint, fontFamily) {
      const eintrag = proFamilie.get(fontFamily);
      if (!eintrag) throw new Error(`Unbekannte fontFamily ${fontFamily} — erzeugt werden nur 5 und 6`);
      const font = eintrag.zeichenKarte.get(codepoint);
      if (!font) {
        const zeichen = String.fromCodePoint(codepoint);
        throw new Error(`Zeichen "${zeichen}" (U+${codepoint.toString(16)}) fehlt in fontFamily ${fontFamily}`);
      }
      return font;
    },
    unitsPerEm(fontFamily) {
      const eintrag = proFamilie.get(fontFamily);
      if (!eintrag) throw new Error(`Unbekannte fontFamily ${fontFamily}`);
      return eintrag.unitsPerEm;
    },
  };
}
```

- [ ] **Step 6: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/fonts.test.js`
Expected: PASS, 5 Tests

Schlägt der Umlaut-Test fehl, liegt es daran, dass die deutschen Zeichen in einem Subset stecken, das nicht mitkopiert wurde. Dann in `scripts/sync-fonts.mjs` prüfen, ob wirklich alle `.woff2`-Dateien der Familie kopiert wurden.

- [ ] **Step 7: assets/fonts von der Versionierung ausnehmen prüfen**

Die Schriften sind reproduzierbar aus `node_modules` erzeugbar. Sie werden trotzdem eingecheckt, damit der Skill ohne `npm i` auf einem anderen Rechner läuft. Sicherstellen, dass `.gitignore` sie nicht ausschließt:

Run: `git check-ignore -v assets/fonts/Excalifont__*.woff2 || echo "wird versioniert"`
Expected: `wird versioniert`

- [ ] **Step 8: Commit**

```bash
git add scripts/sync-fonts.mjs lib/fonts.js tests/fonts.test.js assets/fonts package.json
git commit -m "feat: Schriftregister mit Unicode-Subsets"
```

---

### Task 5: Breitenmessung gegen echte Referenzwerte

**Files:**
- Create: `lib/text.js`
- Test: `tests/text-measure.test.js`

**Interfaces:**
- Consumes: `loadFontRegistry`, `EXCALIFONT`, `NUNITO`, `LINE_HEIGHT` aus `lib/fonts.js`
- Produces: `measureLine(text: string, fontFamily: number, fontSize: number, registry): number`

Dies ist der Schlüsselschritt der ganzen Stufe. Stimmt die Messung hier nicht, stimmt später nichts.

- [ ] **Step 1: Test mit einem exakt bekannten Wert schreiben**

```js
// tests/text-measure.test.js
import { describe, it, expect } from "vitest";
import { measureLine } from "../lib/text.js";
import { loadFontRegistry, EXCALIFONT } from "../lib/fonts.js";
import metriken from "./fixtures/text-metrics.json" with { type: "json" };

const register = loadFontRegistry();

describe("measureLine — Einzelwert", () => {
  it("misst 'Feline' in Excalifont 20 wie Excalidraw", () => {
    // Aus dem Vault erhoben: width 53.79994201660156
    const breite = measureLine("Feline", EXCALIFONT, 20, register);
    expect(breite).toBeCloseTo(53.8, 1);
  });

  it("liefert 0 für leeren Text", () => {
    expect(measureLine("", EXCALIFONT, 20, register)).toBe(0);
  });
});

describe("measureLine — gegen alle Referenzwerte", () => {
  it("weicht bei Excalifont nirgends um mehr als 0,5 px ab", () => {
    const proben = metriken.proben.filter((p) => p.fontFamily === EXCALIFONT);
    const abweichungen = proben.map((p) => ({
      text: p.text,
      diff: Math.abs(measureLine(p.text, p.fontFamily, p.fontSize, register) - p.width),
    }));

    const schlimmste = abweichungen.sort((a, b) => b.diff - a.diff).slice(0, 5);
    expect(schlimmste[0]?.diff ?? 0, `Größte Abweichungen: ${JSON.stringify(schlimmste)}`)
      .toBeLessThan(0.5);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/text-measure.test.js`
Expected: FAIL, `Cannot find module '../lib/text.js'`

- [ ] **Step 3: Implementieren**

```js
// lib/text.js
import { LINE_HEIGHT } from "./fonts.js";

/**
 * Teilt einen Text in Abschnitte, die jeweils von derselben Subset-Datei
 * abgedeckt sind. Nötig, weil die Schriften nach Unicode-Bereich aufgeteilt sind.
 */
function laufweiten(text, fontFamily, registry) {
  const laeufe = [];
  for (const zeichen of text) {
    const font = registry.fontFor(zeichen.codePointAt(0), fontFamily);
    const letzter = laeufe.at(-1);
    if (letzter && letzter.font === font) letzter.text += zeichen;
    else laeufe.push({ font, text: zeichen });
  }
  return laeufe;
}

/** Breite einer einzelnen Zeile in Szeneneinheiten. */
export function measureLine(text, fontFamily, fontSize, registry) {
  if (text.length === 0) return 0;

  let einheiten = 0;
  for (const lauf of laufweiten(text, fontFamily, registry)) {
    einheiten += lauf.font.layout(lauf.text).advanceWidth;
  }
  return (einheiten / registry.unitsPerEm(fontFamily)) * fontSize;
}

/** Höhe eines Textblocks — berechenbar, nicht messbar. */
export function measureHeight(zeilenzahl, fontFamily, fontSize) {
  return zeilenzahl * fontSize * LINE_HEIGHT[fontFamily];
}
```

- [ ] **Step 4: Test laufen lassen und Abweichungen ansehen**

Run: `npx vitest run tests/text-measure.test.js`
Expected: PASS.

Schlägt der Referenztest fehl, gibt die Fehlermeldung die fünf schlimmsten Fälle mit Text aus. Typische Ursachen, in dieser Reihenfolge prüfen:
1. **Führende oder folgende Leerzeichen** — Browser und fontkit behandeln sie unterschiedlich. Falls das die Ursache ist, betroffene Proben im Extraktionsskript ausschließen und dort begründen.
2. **Ligaturen und Kerning** — `font.layout()` wendet beides an, der Browser bei `letterSpacing: 0` ebenfalls. Abweichungen nur an Subset-Grenzen sind erklärbar und dürfen dokumentiert werden.
3. **Toleranz zu streng** — nur wenn 1 und 2 ausgeschlossen sind, die Schwelle anheben und den gemessenen Höchstwert als Kommentar im Test festhalten.

- [ ] **Step 5: Commit**

```bash
git add lib/text.js tests/text-measure.test.js
git commit -m "feat: Textbreitenmessung, gegen Vault-Referenzwerte geprüft"
```

---

### Task 6: Zeilenumbruch und Gesamtmaße

**Files:**
- Modify: `lib/text.js`
- Test: `tests/text-wrap.test.js`

**Interfaces:**
- Consumes: `measureLine`, `measureHeight` aus `lib/text.js`
- Produces:
  - `wrapText(text: string, fontFamily: number, fontSize: number, maxBreite: number, registry): string[]`
  - `measureText(text: string, { fontFamily, fontSize, maxBreite? }, registry): { breite: number, hoehe: number, zeilen: string[] }`
  - `BOUND_TEXT_PADDING = 5`

- [ ] **Step 1: Test schreiben**

```js
// tests/text-wrap.test.js
import { describe, it, expect } from "vitest";
import { wrapText, measureText, measureLine } from "../lib/text.js";
import { loadFontRegistry, EXCALIFONT, NUNITO } from "../lib/fonts.js";

const register = loadFontRegistry();

describe("wrapText", () => {
  it("bricht an Leerzeichen um", () => {
    const zeilen = wrapText("Der Mensch ist ein Mängelwesen", NUNITO, 24, 200, register);
    expect(zeilen.length).toBeGreaterThan(1);
    for (const zeile of zeilen) {
      expect(measureLine(zeile, NUNITO, 24, register)).toBeLessThanOrEqual(200);
    }
  });

  it("erhält vorhandene Zeilenumbrüche", () => {
    expect(wrapText("A\nB", NUNITO, 24, 1000, register)).toEqual(["A", "B"]);
  });

  it("bricht ein einzelnes überlanges Wort zeichenweise", () => {
    const zeilen = wrapText("Donaudampfschifffahrtsgesellschaft", NUNITO, 24, 80, register);
    expect(zeilen.length).toBeGreaterThan(1);
    for (const zeile of zeilen) {
      expect(measureLine(zeile, NUNITO, 24, register)).toBeLessThanOrEqual(80);
    }
  });

  it("gibt bei ausreichender Breite eine einzige Zeile zurück", () => {
    expect(wrapText("Kurz", EXCALIFONT, 20, 1000, register)).toEqual(["Kurz"]);
  });
});

describe("measureText", () => {
  it("nimmt die breiteste Zeile als Gesamtbreite", () => {
    const { breite, zeilen } = measureText("kurz\nsehr viel laenger", { fontFamily: NUNITO, fontSize: 24 }, register);
    expect(zeilen).toHaveLength(2);
    expect(breite).toBeCloseTo(measureLine("sehr viel laenger", NUNITO, 24, register), 5);
  });

  it("berechnet die Höhe aus Zeilenzahl und schriftabhängiger Zeilenhöhe", () => {
    const { hoehe } = measureText("A\nB\nC", { fontFamily: NUNITO, fontSize: 20 }, register);
    expect(hoehe).toBeCloseTo(3 * 20 * 1.35, 5);
  });

  it("verwendet für Excalifont die Zeilenhöhe 1.25", () => {
    const { hoehe } = measureText("A", { fontFamily: EXCALIFONT, fontSize: 20 }, register);
    expect(hoehe).toBeCloseTo(25, 5);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/text-wrap.test.js`
Expected: FAIL, `wrapText is not a function`

- [ ] **Step 3: Implementieren**

```js
// Ergänzung in lib/text.js

/** Innenabstand zwischen Container-Rand und gebundenem Text (Excalidraw-Konstante). */
export const BOUND_TEXT_PADDING = 5;

/** Bricht ein überlanges Wort zeichenweise um. */
function brichWortUm(wort, fontFamily, fontSize, maxBreite, registry) {
  const teile = [];
  let aktuell = "";
  for (const zeichen of wort) {
    const versuch = aktuell + zeichen;
    if (aktuell && measureLine(versuch, fontFamily, fontSize, registry) > maxBreite) {
      teile.push(aktuell);
      aktuell = zeichen;
    } else {
      aktuell = versuch;
    }
  }
  if (aktuell) teile.push(aktuell);
  return teile;
}

/** Bricht Text auf eine Maximalbreite um; vorhandene Umbrüche bleiben erhalten. */
export function wrapText(text, fontFamily, fontSize, maxBreite, registry) {
  const ergebnis = [];

  for (const absatz of text.split("\n")) {
    let zeile = "";

    for (const wort of absatz.split(" ")) {
      const kandidat = zeile ? `${zeile} ${wort}` : wort;

      if (measureLine(kandidat, fontFamily, fontSize, registry) <= maxBreite) {
        zeile = kandidat;
        continue;
      }

      if (zeile) ergebnis.push(zeile);

      if (measureLine(wort, fontFamily, fontSize, registry) > maxBreite) {
        const teile = brichWortUm(wort, fontFamily, fontSize, maxBreite, registry);
        ergebnis.push(...teile.slice(0, -1));
        zeile = teile.at(-1);
      } else {
        zeile = wort;
      }
    }

    ergebnis.push(zeile);
  }

  return ergebnis;
}

/** Gesamtmaße eines Textblocks, wahlweise mit Umbruch. */
export function measureText(text, { fontFamily, fontSize, maxBreite }, registry) {
  const zeilen = maxBreite
    ? wrapText(text, fontFamily, fontSize, maxBreite, registry)
    : text.split("\n");

  const breite = Math.max(...zeilen.map((z) => measureLine(z, fontFamily, fontSize, registry)));
  return { breite, hoehe: measureHeight(zeilen.length, fontFamily, fontSize), zeilen };
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/text-wrap.test.js`
Expected: PASS, 7 Tests

- [ ] **Step 5: Container-Innenabstand am Datenbestand bestätigen**

Der Wert `BOUND_TEXT_PADDING = 5` stammt aus der Excalidraw-Quelle und ist noch nicht an echten Daten belegt. Prüfen:

```bash
node -e "
import('./lib/compress.js').then(async ({ extractDrawing }) => {
  const fs = await import('node:fs'); const path = await import('node:path');
  const { VAULT_PATH } = await import('./lib/config.js');
  function* d(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name.startsWith('.'))continue;
    const p=path.join(dir,e.name); if(e.isDirectory())yield* d(p); else if(e.name.endsWith('.excalidraw.md'))yield p;}}
  const rand=[];
  for(const f of d(VAULT_PATH)){
    let s; try{ s=JSON.parse(extractDrawing(fs.readFileSync(f,'utf8')).json);}catch{continue}
    const byId=new Map((s.elements??[]).map(e=>[e.id,e]));
    for(const e of s.elements??[]) if(e.type==='text'&&e.containerId){
      const c=byId.get(e.containerId); if(!c)continue;
      rand.push(+(((c.width-e.width)/2)).toFixed(2));
    }
  }
  rand.sort((a,b)=>a-b);
  console.log('Proben:',rand.length,'Median-Rand:',rand[Math.floor(rand.length/2)]);
});
"
```

Expected: Der Median liegt nahe 5. Weicht er deutlich ab, `BOUND_TEXT_PADDING` auf den erhobenen Wert setzen und die Herkunft als Kommentar vermerken.

- [ ] **Step 6: Commit**

```bash
git add lib/text.js tests/text-wrap.test.js
git commit -m "feat: Zeilenumbruch und Gesamtmaße für Textblöcke"
```

---

### Task 7: Hausstil-Tokens

**Files:**
- Create: `lib/style.js`
- Test: `tests/style.test.js`

**Interfaces:**
- Consumes: `EXCALIFONT`, `NUNITO` aus `lib/fonts.js`
- Produces:
  - `FARBROLLEN: Record<string, { strich: string, fuellung: string }>`
  - `TYPO: Record<string, { groesse: number, fontFamily: number, stufe: "L0"|"L1"|"L2" }>`
  - `ABSTAND: { eng: 40, normal: 80, weit: 160, frames: 240 }`
  - `BASIS = 20`, `FRAME_BREITE = 1920`, `FRAME_HOEHE = 1080`, `LESBARKEIT_MIN = 18`
  - `STRICH: { strokeWidth, roughness, fillStyle, roundnessBox, roundnessArrow }`
  - `zoomL0(boardBreite: number, boardHoehe: number): number`
  - `titelGroesse(untergrenze: number, zoom: number): number`
  - `istLesbar(fontSize: number, zoom: number): boolean`

- [ ] **Step 1: Test schreiben**

```js
// tests/style.test.js
import { describe, it, expect } from "vitest";
import { FARBROLLEN, TYPO, zoomL0, titelGroesse, istLesbar, FRAME_BREITE } from "../lib/style.js";
import { EXCALIFONT, NUNITO } from "../lib/fonts.js";

describe("Farbrollen", () => {
  it("umfasst genau die sieben vereinbarten Rollen", () => {
    expect(Object.keys(FARBROLLEN).sort()).toEqual(
      ["ergebnis", "frage", "kern", "kontext", "kontra", "neutral", "technik"],
    );
  });

  it("führt die vereinbarten Werte für 'kern'", () => {
    expect(FARBROLLEN.kern).toEqual({ strich: "#1971c2", fuellung: "#a5d8ff" });
  });
});

describe("Typo-Skala", () => {
  it("verwendet Excalifont für Titel und Nunito für Fließtext", () => {
    expect(TYPO.frametitel.fontFamily).toBe(EXCALIFONT);
    expect(TYPO.standard.fontFamily).toBe(NUNITO);
  });
});

describe("zoomL0", () => {
  it("ist 1 für ein Board von Frame-Größe", () => {
    expect(zoomL0(FRAME_BREITE, 1080)).toBeCloseTo(1, 5);
  });

  it("sinkt bei einem Board aus 3x2 Kapiteln auf etwa 0,31", () => {
    // 3 Frames + 2 Lücken à 240 = 6240 breit; 2 Frames + 1 Lücke = 2400 hoch
    expect(zoomL0(6240, 2400)).toBeCloseTo(0.31, 2);
  });
});

describe("titelGroesse", () => {
  it("hält die Untergrenze bei kleinen Boards ein", () => {
    expect(titelGroesse(72, 1)).toBe(72);
  });

  it("wächst, wenn die Untergrenze auf L0 unlesbar wäre", () => {
    const zoom = zoomL0(8160, 3480);          // 4x3 Kapitel
    const groesse = titelGroesse(72, zoom);
    expect(groesse).toBeGreaterThan(72);
    expect(istLesbar(groesse, zoom)).toBe(true);
  });

  it("liefert Vielfache von 4", () => {
    expect(titelGroesse(72, 0.23) % 4).toBe(0);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/style.test.js`
Expected: FAIL, `Cannot find module '../lib/style.js'`

- [ ] **Step 3: Implementieren**

```js
// lib/style.js
import { EXCALIFONT, NUNITO } from "./fonts.js";

export const BASIS = 20;
export const FRAME_BREITE = 1920;
export const FRAME_HOEHE = 1080;
export const LESBARKEIT_MIN = 18;

export const ABSTAND = { eng: 40, normal: 80, weit: 160, frames: 240 };

export const STRICH = {
  strokeWidth: 2,
  roughness: 1,
  fillStyle: "solid",
  roundnessBox: { type: 3 },
  roundnessArrow: { type: 2 },
};

/** Werte aus der offiziellen Excalidraw-Palette, damit sie im Farbwähler auffindbar sind. */
export const FARBROLLEN = {
  neutral:  { strich: "#1e1e1e", fuellung: "#ffffff" },
  kern:     { strich: "#1971c2", fuellung: "#a5d8ff" },
  kontra:   { strich: "#e03131", fuellung: "#ffc9c9" },
  ergebnis: { strich: "#2f9e44", fuellung: "#b2f2bb" },
  frage:    { strich: "#f08c00", fuellung: "#ffec99" },
  kontext:  { strich: "#868e96", fuellung: "#f1f3f5" },
  technik:  { strich: "#6741d9", fuellung: "#d0bfff" },
};

export const TYPO = {
  boardtitel:  { groesse: 120, fontFamily: EXCALIFONT, stufe: "L0" },
  frametitel:  { groesse: 72,  fontFamily: EXCALIFONT, stufe: "L0" },
  kernbegriff: { groesse: 36,  fontFamily: EXCALIFONT, stufe: "L1" },
  standard:    { groesse: 24,  fontFamily: NUNITO,     stufe: "L1" },
  detail:      { groesse: 18,  fontFamily: NUNITO,     stufe: "L1" },
  fussnote:    { groesse: 14,  fontFamily: NUNITO,     stufe: "L2" },
};

export const ZOOM = { L1: 1.0, L2: 2.5 };

/** Zoomfaktor, bei dem das gesamte Board auf einen Beamer passt. */
export function zoomL0(boardBreite, boardHoehe) {
  return Math.min(FRAME_BREITE / boardBreite, FRAME_HOEHE / boardHoehe);
}

/** Ein Text ist auf einer Stufe lesbar, wenn er dort mindestens 18 px groß erscheint. */
export function istLesbar(fontSize, zoom) {
  return fontSize * zoom >= LESBARKEIT_MIN;
}

/**
 * Titelgröße für die Übersichtsstufe. Feste Werte würden die Lesbarkeitsregel
 * ausgerechnet bei großen Wandzeitungen brechen — deshalb aus dem Zoomfaktor abgeleitet
 * und auf ein Vielfaches von 4 aufgerundet.
 */
export function titelGroesse(untergrenze, zoom) {
  const noetig = Math.ceil(LESBARKEIT_MIN / zoom / 4) * 4;
  return Math.max(untergrenze, noetig);
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/style.test.js`
Expected: PASS, 8 Tests

- [ ] **Step 5: Commit**

```bash
git add lib/style.js tests/style.test.js
git commit -m "feat: Hausstil-Tokens mit adaptiven Titelgrößen"
```

---

### Task 8: Deterministische Identität

**Files:**
- Create: `lib/ids.js`
- Test: `tests/ids.test.js`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `elementId(inhalt: string, ordnung: number): string` — 8 Zeichen, `[A-Za-z0-9]`
  - `seedAus(inhalt: string): number` — 0 … 2³¹−1
  - `versionNonceAus(inhalt: string): number` — 0 … 2³¹−1
  - `indexFolge(anzahl: number): string[]` — fraktionale Indizes `["a0", "a1", …]`

- [ ] **Step 1: Test schreiben**

```js
// tests/ids.test.js
import { describe, it, expect } from "vitest";
import { elementId, seedAus, versionNonceAus, indexFolge } from "../lib/ids.js";

describe("elementId", () => {
  it("ist für gleiche Eingabe stabil", () => {
    expect(elementId("Mängelwesen", 0)).toBe(elementId("Mängelwesen", 0));
  });

  it("unterscheidet gleiche Inhalte an verschiedenen Positionen", () => {
    expect(elementId("Box", 0)).not.toBe(elementId("Box", 1));
  });

  it("hat die von Excalidraw übliche Form", () => {
    expect(elementId("Test", 0)).toMatch(/^[A-Za-z0-9]{8}$/);
  });
});

describe("seedAus", () => {
  it("ist stabil und liegt im gültigen Bereich", () => {
    const seed = seedAus("Mängelwesen");
    expect(seed).toBe(seedAus("Mängelwesen"));
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 31);
  });

  it("unterscheidet sich vom versionNonce derselben Eingabe", () => {
    expect(seedAus("A")).not.toBe(versionNonceAus("A"));
  });
});

describe("indexFolge", () => {
  it("erzeugt aufsteigende Indizes", () => {
    const folge = indexFolge(5);
    expect(folge).toHaveLength(5);
    expect([...folge].sort()).toEqual(folge);
  });

  it("beginnt bei a0", () => {
    expect(indexFolge(1)[0]).toBe("a0");
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/ids.test.js`
Expected: FAIL, `Cannot find module '../lib/ids.js'`

- [ ] **Step 3: Implementieren**

```js
// lib/ids.js
import { createHash } from "node:crypto";
import { generateNKeysBetween } from "fractional-indexing";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function hash(inhalt, salz) {
  return createHash("sha1").update(`${salz}:${inhalt}`).digest();
}

/**
 * Deterministische Element-ID. Die Ordnungszahl geht mit ein, damit zwei
 * gleichlautende Kästen verschiedene IDs bekommen.
 */
export function elementId(inhalt, ordnung) {
  const bytes = hash(`${inhalt}#${ordnung}`, "id");
  let id = "";
  for (let i = 0; i < 8; i++) id += ALPHABET[bytes[i] % ALPHABET.length];
  return id;
}

function zahlAus(inhalt, salz) {
  // Oberstes Bit ausmaskieren, damit der Wert positiv und < 2^31 bleibt.
  return hash(inhalt, salz).readUInt32BE(0) & 0x7fffffff;
}

/** Steuert den handgezeichneten Zufall — aus dem Inhalt abgeleitet, nie gewürfelt. */
export const seedAus = (inhalt) => zahlAus(inhalt, "seed");

/** Excalidraws Konfliktauflösung; für uns nur ein stabiler Wert. */
export const versionNonceAus = (inhalt) => zahlAus(inhalt, "nonce");

/** Fraktionale Indizes für die z-Reihenfolge. */
export function indexFolge(anzahl) {
  return generateNKeysBetween(null, null, anzahl);
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/ids.test.js`
Expected: PASS, 7 Tests

Schlägt `beginnt bei a0` fehl, die tatsächliche Ausgabe von `generateNKeysBetween(null, null, 1)` ansehen und die Erwartung im Test an die Bibliothek anpassen — der Startwert ist eine Eigenschaft der Bibliothek, kein Verhalten unseres Codes.

- [ ] **Step 5: Commit**

```bash
git add lib/ids.js tests/ids.test.js
git commit -m "feat: deterministische IDs, Seeds und z-Reihenfolge"
```

---

### Task 9: Primitive

**Files:**
- Create: `lib/elements.js`
- Test: `tests/elements.test.js`

**Interfaces:**
- Consumes: `FARBROLLEN`, `TYPO`, `STRICH` aus `lib/style.js`; `measureText`, `BOUND_TEXT_PADDING` aus `lib/text.js`; `LINE_HEIGHT` aus `lib/fonts.js`; `elementId`, `seedAus`, `versionNonceAus` aus `lib/ids.js`
- Produces:
  - `textElement({ inhalt, typo, x, y, maxBreite?, containerId?, ordnung }, registry): object`
  - `boxElement({ inhalt, rolle, typo, x, y, breite?, hoehe?, ordnung }, registry): { container: object, text: object }`
  - `frameElement({ name, x, y, breite?, hoehe?, ordnung }): object`
  - `ellipseElement`, `diamondElement` — Signatur wie `boxElement`

- [ ] **Step 1: Test schreiben**

```js
// tests/elements.test.js
import { describe, it, expect } from "vitest";
import { textElement, boxElement, frameElement } from "../lib/elements.js";
import { loadFontRegistry } from "../lib/fonts.js";
import { FARBROLLEN, FRAME_BREITE, FRAME_HOEHE } from "../lib/style.js";

const register = loadFontRegistry();

describe("textElement", () => {
  it("übernimmt Größe und Schrift aus der Typo-Rolle", () => {
    const el = textElement({ inhalt: "Mängelwesen", typo: "kernbegriff", x: 0, y: 0, ordnung: 0 }, register);
    expect(el.type).toBe("text");
    expect(el.fontSize).toBe(36);
    expect(el.fontFamily).toBe(5);
    expect(el.lineHeight).toBe(1.25);
  });

  it("berechnet die Höhe aus Zeilenzahl und Zeilenhöhe", () => {
    const el = textElement({ inhalt: "A\nB", typo: "standard", x: 0, y: 0, ordnung: 0 }, register);
    expect(el.height).toBeCloseTo(2 * 24 * 1.35, 5);
  });

  it("führt text, rawText und originalText gleichlautend", () => {
    const el = textElement({ inhalt: "Hallo", typo: "standard", x: 0, y: 0, ordnung: 0 }, register);
    expect(el.rawText).toBe("Hallo");
    expect(el.originalText).toBe("Hallo");
  });
});

describe("boxElement", () => {
  it("verbindet Container und Text beidseitig", () => {
    const { container, text } = boxElement(
      { inhalt: "Kern", rolle: "kern", typo: "kernbegriff", x: 0, y: 0, ordnung: 0 }, register,
    );
    expect(text.containerId).toBe(container.id);
    expect(container.boundElements).toEqual([{ id: text.id, type: "text" }]);
  });

  it("nimmt die Farben aus der Rolle", () => {
    const { container } = boxElement(
      { inhalt: "Kern", rolle: "kern", typo: "kernbegriff", x: 0, y: 0, ordnung: 0 }, register,
    );
    expect(container.strokeColor).toBe(FARBROLLEN.kern.strich);
    expect(container.backgroundColor).toBe(FARBROLLEN.kern.fuellung);
  });

  it("umschließt den Text mit Rand, wenn keine Größe vorgegeben ist", () => {
    const { container, text } = boxElement(
      { inhalt: "Kern", rolle: "kern", typo: "kernbegriff", x: 0, y: 0, ordnung: 0 }, register,
    );
    expect(container.width).toBeGreaterThan(text.width);
    expect(container.height).toBeGreaterThan(text.height);
  });

  it("ist deterministisch", () => {
    const bauen = () => boxElement(
      { inhalt: "Kern", rolle: "kern", typo: "kernbegriff", x: 0, y: 0, ordnung: 0 }, register,
    );
    expect(JSON.stringify(bauen())).toBe(JSON.stringify(bauen()));
  });
});

describe("frameElement", () => {
  it("hat standardmäßig Beamer-Format", () => {
    const f = frameElement({ name: "Kapitel 1", x: 0, y: 0, ordnung: 0 });
    expect(f.type).toBe("frame");
    expect(f.width).toBe(FRAME_BREITE);
    expect(f.height).toBe(FRAME_HOEHE);
    expect(f.name).toBe("Kapitel 1");
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/elements.test.js`
Expected: FAIL, `Cannot find module '../lib/elements.js'`

- [ ] **Step 3: Implementieren**

```js
// lib/elements.js
import { FARBROLLEN, TYPO, STRICH, FRAME_BREITE, FRAME_HOEHE } from "./style.js";
import { measureText, BOUND_TEXT_PADDING } from "./text.js";
import { LINE_HEIGHT } from "./fonts.js";
import { elementId, seedAus, versionNonceAus } from "./ids.js";

/** Felder, die jedes Excalidraw-Element führt. */
function basisFelder({ id, seed, versionNonce, x, y, width, height }) {
  return {
    id, x, y, width, height,
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
    index: "a0",              // wird von scene.js überschrieben
    roundness: null,
    seed,
    version: 1,
    versionNonce,
    isDeleted: false,
    boundElements: [],
    updated: 1,               // fester Wert — sonst wäre die Ausgabe nicht deterministisch
    link: null,
    locked: false,
  };
}

export function textElement({ inhalt, typo, x, y, maxBreite, containerId = null, ordnung }, registry) {
  if (!TYPO[typo]) {
    throw new Error(`Unbekannte Typo-Rolle "${typo}" — erlaubt: ${Object.keys(TYPO).join(", ")}`);
  }
  const { groesse, fontFamily } = TYPO[typo];

  const { breite, hoehe, zeilen } = measureText(inhalt, { fontFamily, fontSize: groesse, maxBreite }, registry);
  const id = elementId(inhalt, ordnung);
  const text = zeilen.join("\n");

  return {
    ...basisFelder({ id, seed: seedAus(id), versionNonce: versionNonceAus(id), x, y, width: breite, height: hoehe }),
    type: "text",
    text,
    rawText: inhalt,
    originalText: inhalt,
    fontSize: groesse,
    fontFamily,
    textAlign: containerId ? "center" : "left",
    verticalAlign: containerId ? "middle" : "top",
    containerId,
    autoResize: !containerId,
    lineHeight: LINE_HEIGHT[fontFamily],
    hasTextLink: false,
  };
}

function formElement(type, { inhalt, rolle, typo, x, y, breite, hoehe, ordnung }, registry) {
  if (!FARBROLLEN[rolle]) {
    throw new Error(`Unbekannte Farbrolle "${rolle}" — erlaubt: ${Object.keys(FARBROLLEN).join(", ")}`);
  }
  const farben = FARBROLLEN[rolle];

  const containerId = elementId(`${type}:${inhalt}`, ordnung);

  // Ohne Vorgabe wächst der Container um den Text herum.
  const roh = measureText(inhalt, { fontFamily: TYPO[typo].fontFamily, fontSize: TYPO[typo].groesse }, registry);
  const w = breite ?? Math.ceil((roh.breite + 4 * BOUND_TEXT_PADDING) / 20) * 20;
  const h = hoehe ?? Math.ceil((roh.hoehe + 4 * BOUND_TEXT_PADDING) / 20) * 20;

  const text = textElement(
    { inhalt, typo, x: x + BOUND_TEXT_PADDING, y, maxBreite: w - 2 * BOUND_TEXT_PADDING, containerId, ordnung },
    registry,
  );
  // Gebundener Text wird von Excalidraw mittig gesetzt; wir spiegeln das für den Validator.
  text.y = y + (h - text.height) / 2;

  const container = {
    ...basisFelder({
      id: containerId,
      seed: seedAus(containerId),
      versionNonce: versionNonceAus(containerId),
      x, y, width: w, height: h,
    }),
    type,
    strokeColor: farben.strich,
    backgroundColor: farben.fuellung,
    roundness: type === "rectangle" ? STRICH.roundnessBox : null,
    boundElements: [{ id: text.id, type: "text" }],
  };

  return { container, text };
}

export const boxElement     = (opt, registry) => formElement("rectangle", opt, registry);
export const ellipseElement = (opt, registry) => formElement("ellipse", opt, registry);
export const diamondElement = (opt, registry) => formElement("diamond", opt, registry);

export function frameElement({ name, x, y, breite = FRAME_BREITE, hoehe = FRAME_HOEHE, ordnung }) {
  const id = elementId(`frame:${name}`, ordnung);
  return {
    ...basisFelder({ id, seed: seedAus(id), versionNonce: versionNonceAus(id), x, y, width: breite, height: hoehe }),
    type: "frame",
    name,
    strokeColor: "#bbb",
    backgroundColor: "transparent",
  };
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/elements.test.js`
Expected: PASS, 9 Tests

- [ ] **Step 5: Commit**

```bash
git add lib/elements.js tests/elements.test.js
git commit -m "feat: Primitive für Text, Formen und Frames"
```

---

### Task 10: Szenen-Objekt

**Files:**
- Create: `lib/scene.js`, `lib/index.js`
- Test: `tests/scene.test.js`

**Interfaces:**
- Consumes: alle Primitive aus `lib/elements.js`; `indexFolge` aus `lib/ids.js`; `ABSTAND`, `FRAME_BREITE`, `FRAME_HOEHE`, `zoomL0` aus `lib/style.js`
- Produces:
  - `scene({ titel? }): Szene`
  - `Szene.frame(name, opts?): Frame` — reiht Frames automatisch mit Abstand 240 nebeneinander
  - `Frame.box(inhalt, opts): { container, text }` — setzt `frameId` und rechnet relative in absolute Koordinaten um
  - `Frame.text(inhalt, opts)`, `Frame.ellipse(...)`, `Frame.diamond(...)`
  - `Szene.elemente(): object[]` — vergibt `index` in Einfügereihenfolge, Frames zuerst
  - `Szene.masse(): { breite: number, hoehe: number, zoomL0: number }`

- [ ] **Step 1: Test schreiben**

```js
// tests/scene.test.js
import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";
import { FRAME_BREITE, ABSTAND } from "../lib/style.js";

describe("Szene", () => {
  it("reiht Frames mit dem vereinbarten Abstand auf", () => {
    const s = scene();
    const a = s.frame("Erstes");
    const b = s.frame("Zweites");
    expect(a.element.x).toBe(0);
    expect(b.element.x).toBe(FRAME_BREITE + ABSTAND.frames);
  });

  it("rechnet Frame-relative Koordinaten in absolute um", () => {
    const s = scene();
    s.frame("Erstes");
    const zweiter = s.frame("Zweites");
    const { container } = zweiter.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 100, y: 50 });
    expect(container.x).toBe(FRAME_BREITE + ABSTAND.frames + 100);
    expect(container.y).toBe(50);
  });

  it("bindet Kinder an ihren Frame", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const { container, text } = f.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0 });
    expect(container.frameId).toBe(f.element.id);
    expect(text.frameId).toBe(f.element.id);
  });

  it("vergibt aufsteigende z-Indizes", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("A", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0 });
    f.box("B", { rolle: "kern", typo: "kernbegriff", x: 0, y: 200 });
    const indizes = s.elemente().map((e) => e.index);
    expect([...indizes].sort()).toEqual(indizes);
  });

  it("vergibt eindeutige IDs", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.box("Gleich", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0 });
    f.box("Gleich", { rolle: "kern", typo: "kernbegriff", x: 0, y: 300 });
    const ids = s.elemente().map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("berechnet Boardmaße und den L0-Zoomfaktor", () => {
    const s = scene();
    s.frame("A");
    s.frame("B");
    const { breite, zoomL0: zoom } = s.masse();
    expect(breite).toBe(2 * FRAME_BREITE + ABSTAND.frames);
    expect(zoom).toBeLessThan(1);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/scene.test.js`
Expected: FAIL, `Cannot find module '../lib/scene.js'`

- [ ] **Step 3: Implementieren**

```js
// lib/scene.js
import { boxElement, ellipseElement, diamondElement, textElement, frameElement } from "./elements.js";
import { indexFolge } from "./ids.js";
import { ABSTAND, FRAME_BREITE, FRAME_HOEHE, zoomL0 } from "./style.js";
import { loadFontRegistry } from "./fonts.js";

export function scene({ titel = null, registry = loadFontRegistry() } = {}) {
  const frames = [];
  const kinder = [];
  let ordnung = 0;

  function frame(name, { x, y, breite = FRAME_BREITE, hoehe = FRAME_HOEHE } = {}) {
    // Ohne Vorgabe wird der nächste Frame rechts angesetzt.
    const posX = x ?? frames.length * (FRAME_BREITE + ABSTAND.frames);
    const posY = y ?? 0;
    const element = frameElement({ name, x: posX, y: posY, breite, hoehe, ordnung: ordnung++ });
    frames.push(element);

    const hinzu = (bauer) => (inhalt, opts = {}) => {
      const ergebnis = bauer(
        { ...opts, inhalt, x: posX + (opts.x ?? 0), y: posY + (opts.y ?? 0), ordnung: ordnung++ },
        registry,
      );
      const teile = ergebnis.container ? [ergebnis.container, ergebnis.text] : [ergebnis];
      for (const teil of teile) {
        teil.frameId = element.id;
        kinder.push(teil);
      }
      return ergebnis;
    };

    return {
      element,
      box: hinzu(boxElement),
      ellipse: hinzu(ellipseElement),
      diamond: hinzu(diamondElement),
      text: hinzu(textElement),
    };
  }

  function elemente() {
    // Frames zuerst, damit ihre Kinder darüber liegen.
    const alle = [...frames, ...kinder];
    const indizes = indexFolge(alle.length);
    return alle.map((el, i) => ({ ...el, index: indizes[i] }));
  }

  function masse() {
    const alle = elemente();
    if (alle.length === 0) return { breite: FRAME_BREITE, hoehe: FRAME_HOEHE, zoomL0: 1 };

    const rechts = Math.max(...alle.map((e) => e.x + e.width));
    const unten = Math.max(...alle.map((e) => e.y + e.height));
    const links = Math.min(...alle.map((e) => e.x));
    const oben = Math.min(...alle.map((e) => e.y));
    const breite = rechts - links;
    const hoehe = unten - oben;

    return { breite, hoehe, zoomL0: zoomL0(breite, hoehe) };
  }

  return { titel, frame, elemente, masse, registry };
}
```

```js
// lib/index.js
export { scene } from "./scene.js";
export { FARBROLLEN, TYPO, ABSTAND, FRAME_BREITE, FRAME_HOEHE } from "./style.js";
```

`lib/document.js` entsteht erst in Task 11. Der Export von `szeneZuMarkdown` wird deshalb
dort ergänzt, nicht hier — ein Export auf ein noch nicht existierendes Modul würde jeden
Import von `lib/index.js` zum Scheitern bringen.

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/scene.test.js`
Expected: PASS, 6 Tests

- [ ] **Step 5: Commit**

```bash
git add lib/scene.js lib/index.js tests/scene.test.js
git commit -m "feat: Szenen-Objekt mit Frames und z-Reihenfolge"
```

---

### Task 11: Serialisierung und erstes Board in Obsidian

**Files:**
- Create: `lib/document.js`, `bin/build.mjs`
- Modify: `lib/index.js`
- Test: `tests/document.test.js`, `tests/roundtrip.test.js`

**Interfaces:**
- Consumes: `Szene` aus `lib/scene.js`, `readPluginVersion` aus `lib/environment.js`, `extractDrawing` aus `lib/compress.js`
- Produces:
  - `szeneZuMarkdown(szene, { pluginVersion? }): string`
  - `markdownZuSzene(markdown: string): { elements: object[], appState: object, sektionen: { textElemente: string[], elementLinks: Record<string,string>, embeddedFiles: Record<string,string> } }`

- [ ] **Step 1: Test für die Serialisierung schreiben**

```js
// tests/document.test.js
import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";
import { szeneZuMarkdown } from "../lib/document.js";

function beispiel() {
  const s = scene();
  const f = s.frame("Kapitel 1");
  f.box("Mängelwesen", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
  return s;
}

describe("szeneZuMarkdown", () => {
  const md = szeneZuMarkdown(beispiel(), { pluginVersion: "2.23.12" });

  it("beginnt mit dem erwarteten Frontmatter", () => {
    expect(md.startsWith("---\nexcalidraw-plugin: parsed\n")).toBe(true);
    expect(md).toContain("tags:\n  - excalidraw");
  });

  it("enthält den Warnhinweis für die Leseansicht", () => {
    expect(md).toContain("Switch to EXCALIDRAW VIEW");
  });

  it("spiegelt jedes Textelement mit Blockreferenz", () => {
    expect(md).toMatch(/^Mängelwesen \^[A-Za-z0-9]{8}$/m);
  });

  it("versteckt den Drawing-Block hinter %%", () => {
    const drawingPos = md.indexOf("## Drawing");
    const kommentarPos = md.indexOf("%%");
    expect(kommentarPos).toBeGreaterThan(-1);
    expect(kommentarPos).toBeLessThan(drawingPos);
  });

  it("schreibt unkomprimiertes JSON mit der Plugin-Version", () => {
    expect(md).toContain("```json");
    expect(md).not.toContain("compressed-json");
    const json = JSON.parse(md.match(/```json\n([\s\S]*?)\n```/)[1]);
    expect(json.type).toBe("excalidraw");
    expect(json.source).toContain("2.23.12");
    expect(json.files).toEqual({});
  });

  it("lässt leere Sektionen weg", () => {
    expect(md).not.toContain("## Element Links");
    expect(md).not.toContain("## Embedded Files");
  });

  it("ist deterministisch", () => {
    expect(szeneZuMarkdown(beispiel(), { pluginVersion: "2.23.12" }))
      .toBe(szeneZuMarkdown(beispiel(), { pluginVersion: "2.23.12" }));
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/document.test.js`
Expected: FAIL, `Cannot find module '../lib/document.js'`

- [ ] **Step 3: Serialisierung implementieren**

```js
// lib/document.js
import { extractDrawing } from "./compress.js";
import { readPluginVersion } from "./environment.js";

const FRONTMATTER = [
  "---",
  "excalidraw-plugin: parsed",
  "tags:",
  "  - excalidraw",
  `excalidraw-onload-script: "\\"if (app.isMobile) ea.getExcalidrawAPI().setActiveTool({type: 'hand'})\\""`,
  "---",
].join("\n");

const WARNUNG =
  "==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠== " +
  "You can decompress Drawing data with the command palette: 'Decompress current Excalidraw file'. " +
  "For more info check in plugin settings under 'Saving'";

function appState() {
  return {
    theme: "light",
    viewBackgroundColor: "#ffffff",
    currentItemStrokeColor: "#1e1e1e",
    currentItemBackgroundColor: "transparent",
    currentItemFillStyle: "solid",
    currentItemStrokeWidth: 2,
    currentItemStrokeStyle: "solid",
    currentItemRoughness: 1,
    currentItemOpacity: 100,
    currentItemFontFamily: 6,
    currentItemFontSize: 24,
    currentItemTextAlign: "left",
    currentItemRoundness: "round",
    gridSize: 20,
    gridStep: 5,
    gridModeEnabled: false,
    objectsSnapModeEnabled: false,
  };
}

/** Serialisiert eine Szene als vollständige .excalidraw.md. */
export function szeneZuMarkdown(szene, { pluginVersion = readPluginVersion() } = {}) {
  const elements = szene.elemente();

  const teile = [FRONTMATTER, "", WARNUNG, "", "", "# Excalidraw Data", "", "## Text Elements"];

  // Obsidians Suchindex: jedes Textelement mit seiner Blockreferenz.
  for (const el of elements.filter((e) => e.type === "text")) {
    teile.push(`${el.rawText} ^${el.id}`, "");
  }

  teile.push(
    "%%",
    "## Drawing",
    "```json",
    JSON.stringify(
      {
        type: "excalidraw",
        version: 2,
        source: `https://github.com/zsviczian/obsidian-excalidraw-plugin/releases/tag${pluginVersion}`,
        elements,
        appState: appState(),
        files: {},
      },
      null,
      2,
    ),
    "```",
    "%%",
  );

  return `${teile.join("\n")}\n`;
}

/** Liest eine bestehende Datei ein — Grundlage für den Bearbeiten-Pfad. */
export function markdownZuSzene(markdown) {
  const { json } = extractDrawing(markdown);
  const { elements = [], appState: state = {} } = JSON.parse(json);

  const textElemente = [...markdown.matchAll(/^(.+) \^([A-Za-z0-9]{8})$/gm)].map((m) => m[2]);
  const elementLinks = Object.fromEntries(
    [...markdown.matchAll(/^([A-Za-z0-9]{8}): (\[\[.+?\]\])$/gm)].map((m) => [m[1], m[2]]),
  );
  const embeddedFiles = Object.fromEntries(
    [...markdown.matchAll(/^([0-9a-f]{40}): (\[\[.+?\]\])$/gm)].map((m) => [m[1], m[2]]),
  );

  return { elements, appState: state, sektionen: { textElemente, elementLinks, embeddedFiles } };
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/document.test.js`
Expected: PASS, 7 Tests

- [ ] **Step 5: Roundtrip-Test gegen eine echte Vault-Datei schreiben**

```js
// tests/roundtrip.test.js
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { markdownZuSzene } from "../lib/document.js";
import { VAULT_PATH } from "../lib/config.js";

const REFERENZ = path.join(VAULT_PATH, "FoBi Nextcloud + EuroOffice.excalidraw.md");

describe("markdownZuSzene", () => {
  const md = fs.readFileSync(REFERENZ, "utf8");
  const gelesen = markdownZuSzene(md);

  it("liest alle Elemente", () => {
    expect(gelesen.elements).toHaveLength(23);
  });

  it("findet jedes Textelement in der Text-Elements-Sektion wieder", () => {
    const textIds = gelesen.elements.filter((e) => e.type === "text").map((e) => e.id);
    for (const id of textIds) {
      expect(gelesen.sektionen.textElemente).toContain(id);
    }
  });

  it("liest die eingebetteten Bilder mit ihrem SHA-1", () => {
    expect(Object.keys(gelesen.sektionen.embeddedFiles))
      .toContain("0b791c0243821e0971a3d4b2e758f65546e8b6e0");
  });

  it("toleriert alte Schriftwerte", () => {
    // Im Vault kommen fontFamily 1, 2, 3, 7 und 8 vor — das Lesen darf daran nicht scheitern.
    const schriften = new Set(gelesen.elements.filter((e) => e.type === "text").map((e) => e.fontFamily));
    expect(schriften.size).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 6: Roundtrip-Test laufen lassen**

Run: `npx vitest run tests/roundtrip.test.js`
Expected: PASS, 4 Tests

- [ ] **Step 7: build-Kommando schreiben**

```js
// bin/build.mjs
import fs from "node:fs";
import path from "node:path";
import { szeneZuMarkdown } from "../lib/document.js";

const [skriptPfad, zielPfad] = process.argv.slice(2);

if (!skriptPfad || !zielPfad) {
  console.error("Aufruf: node bin/build.mjs <szenen-skript.mjs> <ziel.excalidraw.md>");
  process.exit(1);
}

// Kein stilles Überschreiben — der Vault ist zu wertvoll für einen Flüchtigkeitsfehler.
if (fs.existsSync(zielPfad) && process.env.UEBERSCHREIBEN !== "ja") {
  console.error(`${zielPfad} existiert bereits. Zum Überschreiben UEBERSCHREIBEN=ja setzen.`);
  process.exit(1);
}

const szene = (await import(path.resolve(skriptPfad))).default;
const markdown = szeneZuMarkdown(szene);

fs.mkdirSync(path.dirname(zielPfad), { recursive: true });
fs.writeFileSync(zielPfad, markdown, "utf8");

const { breite, hoehe, zoomL0 } = szene.masse();
console.log(`Geschrieben: ${zielPfad}`);
console.log(`Elemente: ${szene.elemente().length} | Board: ${Math.round(breite)}×${Math.round(hoehe)} | L0-Zoom: ${zoomL0.toFixed(2)}`);
```

- [ ] **Step 8: `lib/index.js` vervollständigen**

```js
// lib/index.js
export { scene } from "./scene.js";
export { szeneZuMarkdown, markdownZuSzene } from "./document.js";
export { FARBROLLEN, TYPO, ABSTAND, FRAME_BREITE, FRAME_HOEHE } from "./style.js";
```

- [ ] **Step 9: Beispielszene bauen und in Obsidian abnehmen**

```js
// scratchpad/beispiel.mjs  (nicht einchecken)
import { scene } from "../lib/index.js";

const s = scene({ titel: "Der Mensch als Mängelwesen" });

const kap1 = s.frame("Instinktarmut");
kap1.text("Der Mensch als Mängelwesen", { typo: "frametitel", x: 80, y: 60 });
kap1.box("Mängelwesen", { rolle: "kern", typo: "kernbegriff", x: 760, y: 440 });
kap1.box("Keine spezialisierten Organe", { rolle: "neutral", typo: "standard", x: 160, y: 200 });
kap1.box("Kein Instinktkorsett", { rolle: "neutral", typo: "standard", x: 160, y: 700 });
kap1.box("Physiologische Frühgeburt", { rolle: "neutral", typo: "standard", x: 1360, y: 440 });

const kap2 = s.frame("Kultur als zweite Natur");
kap2.text("Kultur als zweite Natur", { typo: "frametitel", x: 80, y: 60 });
kap2.box("Entlastung", { rolle: "ergebnis", typo: "kernbegriff", x: 760, y: 440 });
kap2.box("Institutionen", { rolle: "technik", typo: "standard", x: 200, y: 700 });

export default s;
```

```bash
mkdir -p scratchpad
node bin/build.mjs scratchpad/beispiel.mjs "/Users/dennis/Tafelbilder/Excalidraw/Skill-Test Stufe 1.excalidraw.md"
```

Expected: Meldung mit 2 Frames, Board etwa 4080 × 1080, L0-Zoom um 0,47.

**Abnahme durch Dennis:** Die Datei in Obsidian öffnen. Zu prüfen ist:
1. Die Datei öffnet sich in der Excalidraw-Ansicht ohne Fehlermeldung.
2. Beide Frames tragen ihren Namen und liegen nebeneinander.
3. Jeder Text sitzt innerhalb seines Kastens, nichts läuft über den Rand.
4. Die Farben entsprechen den Rollen (blau für Kern, grün für Ergebnis, violett für Technik).
5. Herauszoomen auf die Gesamtübersicht — die Frame-Titel bleiben lesbar.

- [ ] **Step 10: Determinismus nachweisen**

```bash
node bin/build.mjs scratchpad/beispiel.mjs /tmp/a.excalidraw.md
node bin/build.mjs scratchpad/beispiel.mjs /tmp/b.excalidraw.md
diff /tmp/a.excalidraw.md /tmp/b.excalidraw.md && echo "identisch"
```

Expected: `identisch`

- [ ] **Step 11: Gesamte Testsuite laufen lassen**

Run: `npm test`
Expected: PASS, alle Testdateien, keine Fehler

- [ ] **Step 12: Commit**

```bash
git add lib/document.js lib/index.js bin/build.mjs tests/document.test.js tests/roundtrip.test.js
git commit -m "feat: Serialisierung nach .excalidraw.md und build-Kommando"
```

---

## Abschluss der Stufe

Nach Task 11 gilt:

- Ein Szenen-Skript erzeugt eine gültige `.excalidraw.md`, die sich in Obsidian öffnet.
- Die Textmessung ist gegen 491 echte Referenzwerte aus dem Vault abgesichert
  (454 Excalifont, 37 Nunito). Der Zeilenumbruch selbst ist damit **nicht** abgedeckt —
  das leistet erst der Renderer in Stufe 2.
- Die Ausgabe ist deterministisch — Voraussetzung für die Golden-Render-Tests der Stufe 2.
- `bin/doctor.mjs` meldet eine unvollständige Umgebung verständlich.

**Noch nicht möglich:** Pfeile, Layout-Helfer, Notiz-Links, Bilder, Validierung, Rendering. Stufe 2 (Validator und Renderer) bekommt einen eigenen Plan — sie schließt die beiden inneren Schleifen der Pipeline und macht den Skill erst wirklich benutzbar.

**Offene Verifikationspunkte, die in Stufe 1 beantwortet werden:**
- Genauigkeit der fontkit-Messung gegen Excalidraw (Task 5)
- Zeilenumbruchregeln (Task 6)
- `BOUND_TEXT_PADDING` am Datenbestand (Task 6, Step 5)

**Weiterhin offen für spätere Stufen:**
- Pfeilbindung an Frames (Stufe 3)
- Deckkraft bei Mengenkreisen (Stufe 4)

---

### Task 12: Ersatzbreite für nicht abgedeckte Zeichen

**Ausführungsreihenfolge:** nach Task 8, **vor** Task 9. Die Primitive rufen `measureText`
auf; solange ein unbekanntes Zeichen dort eine Ausnahme wirft, bricht jedes Board mit
einem `§` oder einem Emoji ab.

**Files:**
- Modify: `lib/fonts.js`, `lib/text.js`
- Test: `tests/text-fallback.test.js`

**Interfaces:**
- Consumes: `loadFontRegistry`, `EXCALIFONT`, `NUNITO` aus `lib/fonts.js`; `measureLine` aus `lib/text.js`
- Produces:
  - `Registry.fontFor(codepoint, fontFamily)` bleibt unverändert und wirft weiterhin — der Fallback gehört nicht in die Schriftauflösung.
  - `Registry.deckt(codepoint, fontFamily): boolean` — prüfungsfrei abfragbar, ob ein Zeichen abgedeckt ist.
  - `measureLine(...)` wirft nicht mehr, sondern rechnet nicht abgedeckte Zeichen mit einer Ersatzbreite.
  - `ERSATZBREITE: { emoji: number, standard: number }` — Faktoren relativ zu `fontSize`.
  - `unbekannteZeichen(text, fontFamily, registry): string[]` — welche Zeichen geschätzt wurden; der Validator meldet das später als weiche Warnung.

**Hintergrund.** Excalidraw rendert Zeichen, die Excalifont nicht führt, über eine
System-Fallback-Schrift. Welche das ist, wissen wir nicht — die Breite ist grundsätzlich
nicht vorhersagbar. Eine Schätzung ist deshalb keine Notlösung, sondern das Beste, was
ohne Browser möglich ist. Der Renderer in Stufe 2 deckt die Abweichung dann auf.

Vom Nutzer am 2026-07-21 so entschieden: Der Build soll durchlaufen, nicht abbrechen.

- [ ] **Step 1: Betroffene Zeichen im Vault erheben**

Vor dem Festlegen der Faktoren nachsehen, worum es tatsächlich geht:

```bash
node -e "
import('./lib/compress.js').then(async ({ extractDrawing }) => {
  const fs = await import('node:fs'); const path = await import('node:path');
  const { VAULT_PATH } = await import('./lib/config.js');
  const { loadFontRegistry } = await import('./lib/fonts.js');
  const reg = loadFontRegistry();
  function* d(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
    if(e.name.startsWith('.'))continue; const p=path.join(dir,e.name);
    if(e.isDirectory())yield* d(p); else if(e.name.endsWith('.excalidraw.md'))yield p;}}
  const fehlend = new Map();
  for(const f of d(VAULT_PATH)){
    let s; try{ s=JSON.parse(extractDrawing(fs.readFileSync(f,'utf8')).json);}catch{continue}
    for(const el of s.elements??[]) if(el.type==='text'&&!el.isDeleted&&(el.fontFamily===5||el.fontFamily===6))
      for(const z of el.text){ const cp=z.codePointAt(0);
        try{ reg.fontFor(cp, el.fontFamily); }catch{ fehlend.set(z,(fehlend.get(z)??0)+1); } }
  }
  console.log([...fehlend].sort((a,b)=>b[1]-a[1]).slice(0,40).map(([z,n])=>\`\${z} U+\${z.codePointAt(0).toString(16)} \${n}\`).join('\n'));
  console.log('verschiedene Zeichen:', fehlend.size);
});
"
```

Das Ergebnis in den Bericht übernehmen. Es entscheidet, ob zwei Klassen (Emoji /
sonstiges) ausreichen oder ob eine dritte nötig ist.

- [ ] **Step 2: Test schreiben**

```js
// tests/text-fallback.test.js
import { describe, it, expect } from "vitest";
import { measureLine, unbekannteZeichen, ERSATZBREITE } from "../lib/text.js";
import { loadFontRegistry, EXCALIFONT } from "../lib/fonts.js";

const register = loadFontRegistry();

describe("Ersatzbreite", () => {
  it("wirft nicht mehr bei einem Paragraphenzeichen", () => {
    expect(() => measureLine("§ 3 Abs. 2", EXCALIFONT, 20, register)).not.toThrow();
  });

  it("wirft nicht mehr bei einem Emoji", () => {
    expect(() => measureLine("Ziel 🌐 erreicht", EXCALIFONT, 20, register)).not.toThrow();
  });

  it("rechnet abgedeckte Zeichen unverändert", () => {
    // Referenzwert aus dem Vault, muss exakt gleich bleiben
    expect(measureLine("Feline", EXCALIFONT, 20, register)).toBeCloseTo(53.8, 1);
  });

  it("schätzt Emoji breiter als ein schmales Satzzeichen", () => {
    const emoji = measureLine("🌐", EXCALIFONT, 20, register);
    const paragraf = measureLine("§", EXCALIFONT, 20, register);
    expect(emoji).toBeGreaterThan(paragraf);
  });

  it("skaliert die Ersatzbreite mit der Schriftgröße", () => {
    const klein = measureLine("🌐", EXCALIFONT, 20, register);
    const gross = measureLine("🌐", EXCALIFONT, 40, register);
    expect(gross).toBeCloseTo(klein * 2, 5);
  });

  it("benennt die geschätzten Zeichen", () => {
    expect(unbekannteZeichen("§ 3 🌐", EXCALIFONT, register)).toEqual(["§", "🌐"]);
  });

  it("meldet nichts, wenn alles abgedeckt ist", () => {
    expect(unbekannteZeichen("Mängelwesen", EXCALIFONT, register)).toEqual([]);
  });

  it("bleibt deterministisch", () => {
    const a = measureLine("§ 3 🌐", EXCALIFONT, 20, register);
    const b = measureLine("§ 3 🌐", EXCALIFONT, 20, register);
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 3: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/text-fallback.test.js`
Expected: FAIL — `unbekannteZeichen is not a function`, und die ersten beiden Tests
scheitern an der geworfenen Ausnahme.

- [ ] **Step 4: Implementieren**

`Registry.deckt(codepoint, fontFamily)` in `lib/fonts.js` ergänzen — eine reine
Abfrage ohne Ausnahme, damit `lib/text.js` nicht über `try/catch` steuern muss.

In `lib/text.js`: `ERSATZBREITE` als Faktoren relativ zur Schriftgröße definieren
(Emoji annähernd quadratisch, also Faktor um 1,0; sonstige Zeichen etwa so breit wie
eine Ziffer, also um 0,5 — die genauen Werte aus Step 1 herleiten und im Kommentar
begründen). `laufweiten` so erweitern, dass nicht abgedeckte Zeichen als eigene Läufe
mit Ersatzbreite behandelt werden, statt `fontFor` werfen zu lassen. `unbekannteZeichen`
exportieren.

**Wichtig:** Die Messung abgedeckter Zeichen darf sich um keinen Millipixel ändern.
`tests/text-measure.test.js` muss unverändert grün bleiben — das ist die Probe darauf.

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run tests/text-fallback.test.js tests/text-measure.test.js tests/text-wrap.test.js`
Expected: PASS. Die Verteilungswerte in `text-measure.test.js` müssen unverändert sein.

- [ ] **Step 6: Commit**

```bash
git add lib/fonts.js lib/text.js tests/text-fallback.test.js
git commit -m "feat: Ersatzbreite für Zeichen ohne Schriftabdeckung"
```
