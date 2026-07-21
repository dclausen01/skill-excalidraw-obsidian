# Excalidraw-Tafelbild-Skill — Stufe 2b: Renderer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine Szene wird mit Excalidraws echter Engine zu PNGs gerendert — ein Gesamtbild für die Übersichtsebene und je ein Bild pro Kapitel-Frame —, damit das Modell das Layout sieht, bevor ein Mensch es tut.

**Architecture:** Ein esbuild-Bündel packt Excalidraws Export-Funktionen in eine Browserdatei. Puppeteer lädt eine lokale Seite mit diesem Bündel, ein kleiner statischer Server liefert Bündel und Schriften von derselben Herkunft. Der Renderer hält Browser und Seite über mehrere Bilder am Leben, weil der Start zweihundertmal teurer ist als ein Rendering.

**Tech Stack:** Node ≥ 20 (ESM), vitest, puppeteer 25.3.0, esbuild, `@excalidraw/excalidraw@0.18.1` mit `react`/`react-dom` als Peer-Abhängigkeiten.

## Global Constraints

- **Node ≥ 20**, ausschließlich ESM. Keine CommonJS-Dateien.
- **Pfade nie fest verdrahtet** — immer aus `lib/config.js`.
- **Sprache im Code:** Einheitlichkeit je Modul. `lib/render.js` ist technisch → **exportierte Namen englisch**. Lokale Variablen und Parameter dürfen deutsch sein, Kommentare deutsch.
- **Kein Netzzugriff zur Laufzeit.** Das ist keine Stilfrage: Ohne gesetztes `window.EXCALIDRAW_ASSET_PATH` lädt Excalidraw seine Schriften stillschweigend von `https://esm.sh/`. Der Renderer wäre dann netzabhängig und würde die lokalen Schriften nie prüfen. **Ein Test muss belegen, dass keine Anfrage an `esm.sh` geht.**
- **`exportToBlob`, nicht `exportToSvg`.** Nur `exportToBlob` ruft intern `Fonts.loadElementsFonts()` und registriert echte `FontFace`-Objekte. `exportToSvg` holt die Schriftbytes nur zum Einbetten und fasst `document.fonts` nie an — eine Messung danach misst mit einer Ersatzschrift und bestätigt nichts.
- **`restoreElements` und `restoreAppState` sind Pflicht**, nicht Zierde: Sie füllen Felder nach, die der Renderpfad voraussetzt.
- **Der Vault wird zuletzt angefasst.** Gerendert wird ins Scratchpad; die Datei im Vault entsteht erst, wenn Validator und Renderer grün sind.
- **Bestehende Tests müssen grün bleiben** (140 aus Stufe 1 plus die aus Plan 2a).

## Verifizierte Grundlagen

Diese Angaben stammen aus einem technischen Spike vom 2026-07-21, nicht aus Dokumentation:

| Punkt | Befund |
|---|---|
| Bündelung | `esbuild --bundle --format=iife --platform=browser` genügt; `--splitting` ist unnötig und mit `iife` unverträglich |
| Bündelgröße | 13,6 MB, ~0,5 s Bauzeit |
| React | `react` und `react-dom` müssen installiert sein, obwohl kein React-Baum gemountet wird |
| Schrifttreue | Nach `exportToBlob` stimmen gemessene und gespeicherte Textbreiten bei allen 8 Testelementen **exakt** (0,0000); davor 7–19 % zu schmal |
| Schriftdateien | Die im npm-Paket sind byte-identisch mit denen unter `assets/fonts/` |
| Frame-Ausschnitt | `exportingFrame: <frameElement>` schneidet exakt; `exportPadding` wird dann ignoriert |
| Kosten | Chromium-Start ~2 s, Seitenaufbau ~0,6 s, danach **7–10 ms je Bild** |
| Konsolenwarnung | `Failed to use workers for subsetting, falling back to the main thread` ist harmlos, Rückfall erfolgt automatisch |

## Dateistruktur dieser Stufe

| Datei | Verantwortung |
|---|---|
| `renderer/entry.js` | Bündel-Einstieg: legt Excalidraws Export-Funktionen auf `window` |
| `renderer/page.html` | Trägerseite, setzt `EXCALIDRAW_ASSET_PATH` vor dem Laden des Bündels |
| `scripts/build-renderer.mjs` | Baut das Bündel und spiegelt die Schriften |
| `lib/render.js` | Puppeteer-Treiber: Browser-Lebenszyklus, Board- und Frame-Rendering |
| `bin/render.mjs` | Kommandozeile: Datei rendern, PNGs ablegen |
| `bin/build.mjs` | **Änderung:** Validator und Renderer als Gates vor dem Schreiben |

`renderer/dist/` (Bündel und gespiegelte Schriften) wird **nicht** versioniert — es ist reproduzierbar aus `node_modules` und 13,6 MB groß.

---

### Task 1: Renderer-Bündel bauen

**Files:**
- Create: `renderer/entry.js`, `renderer/page.html`, `scripts/build-renderer.mjs`
- Modify: `package.json` (Abhängigkeiten und Skript), `.gitignore`
- Test: `tests/renderer-bundle.test.js`

**Interfaces:**
- Consumes: `PROJECT_ROOT` aus `lib/config.js`
- Produces:
  - `renderer/dist/bundle.js` — IIFE-Bündel, legt `window.ExcalidrawLib` und `window.__excalidrawLibReady` an
  - `renderer/dist/index.html` — Trägerseite
  - `renderer/dist/fonts/…` — Spiegel von `node_modules/@excalidraw/excalidraw/dist/prod/fonts/`
  - `npm run build-renderer`

- [ ] **Step 1: Abhängigkeiten installieren**

```bash
cd /Users/dennis/Projekte/Skill_Excalidraw_erstellen
npm i -D esbuild@0.28.1 puppeteer@25.3.0
npm i -D react@18 react-dom@18
npm pkg set scripts.build-renderer="node scripts/build-renderer.mjs"
```

`react` und `react-dom` sind nötig, obwohl kein React-Baum gemountet wird — `@excalidraw/excalidraw` importiert sie auf Modulebene.

Schlägt `esbuild` oder `puppeteer` später mit „binary not found" fehl, wurden die Postinstall-Skripte blockiert. Dann einmalig:

```bash
npm approve-scripts esbuild puppeteer
```

- [ ] **Step 2: Bündel-Einstieg schreiben**

```js
// renderer/entry.js
// Wird von esbuild zu einer einzigen Browserdatei gebündelt und legt genau die
// Funktionen offen, die der Puppeteer-Treiber braucht.
import { exportToBlob, restoreElements, restoreAppState } from "@excalidraw/excalidraw";

window.ExcalidrawLib = { exportToBlob, restoreElements, restoreAppState };
window.__excalidrawLibReady = true;
```

- [ ] **Step 3: Trägerseite schreiben**

```html
<!-- renderer/page.html -->
<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <title>Excalidraw-Renderer</title>
    <script>
      // MUSS vor dem Bündel stehen. Ohne diese Zeile löst Excalidraw seine
      // Schrift-URIs gegen https://esm.sh/ auf — der Renderer wäre netzabhängig
      // und würde die lokalen Schriften nie prüfen.
      window.EXCALIDRAW_ASSET_PATH = "/";
    </script>
    <script src="./bundle.js"></script>
  </head>
  <body></body>
</html>
```

- [ ] **Step 4: Bauskript schreiben**

```js
// scripts/build-renderer.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PROJECT_ROOT } from "../lib/config.js";

const RENDERER = path.join(PROJECT_ROOT, "renderer");
const DIST = path.join(RENDERER, "dist");
const SCHRIFTQUELLE = path.join(PROJECT_ROOT, "node_modules", "@excalidraw", "excalidraw", "dist", "prod", "fonts");

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// esbuild löst auch die dynamischen Chunk-Importe des Pakets auf; --splitting ist
// unnötig und mit iife ohnehin unverträglich.
execFileSync(
  path.join(PROJECT_ROOT, "node_modules", ".bin", "esbuild"),
  [
    path.join(RENDERER, "entry.js"),
    "--bundle",
    "--format=iife",
    "--platform=browser",
    `--outfile=${path.join(DIST, "bundle.js")}`,
    `--define:process.env.NODE_ENV="production"`,
  ],
  { stdio: "inherit" },
);

fs.copyFileSync(path.join(RENDERER, "page.html"), path.join(DIST, "index.html"));

// Excalidraw erwartet die Schriften unter ./fonts/<Familie>/<datei>.woff2 relativ
// zu EXCALIDRAW_ASSET_PATH.
fs.cpSync(SCHRIFTQUELLE, path.join(DIST, "fonts"), { recursive: true });

const groesse = fs.statSync(path.join(DIST, "bundle.js")).size;
const schriften = fs.readdirSync(path.join(DIST, "fonts"), { recursive: true }).filter((f) => String(f).endsWith(".woff2")).length;
console.log(`Bündel: ${(groesse / 1024 / 1024).toFixed(1)} MB, ${schriften} Schriftdateien gespiegelt nach ${DIST}`);
```

- [ ] **Step 5: Bauen und `.gitignore` ergänzen**

```bash
npm run build-renderer
printf "\n# Renderer-Bündel (reproduzierbar aus node_modules)\nrenderer/dist/\n" >> .gitignore
```

Expected: Meldung mit rund 13,6 MB und einer dreistelligen Zahl Schriftdateien.

- [ ] **Step 6: Test schreiben**

```js
// tests/renderer-bundle.test.js
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../lib/config.js";

const DIST = path.join(PROJECT_ROOT, "renderer", "dist");

describe("Renderer-Bündel", () => {
  it("ist gebaut", () => {
    expect(fs.existsSync(path.join(DIST, "bundle.js")), "renderer/dist/bundle.js fehlt — npm run build-renderer ausführen").toBe(true);
    expect(fs.existsSync(path.join(DIST, "index.html"))).toBe(true);
  });

  it("legt die benötigten Funktionen offen", () => {
    const quelle = fs.readFileSync(path.join(DIST, "bundle.js"), "utf8");
    expect(quelle).toContain("ExcalidrawLib");
    expect(quelle).toContain("__excalidrawLibReady");
  });

  it("setzt den Schriftpfad, bevor das Bündel geladen wird", () => {
    const html = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
    const pfadPos = html.indexOf("EXCALIDRAW_ASSET_PATH");
    const buendelPos = html.indexOf("bundle.js");
    expect(pfadPos).toBeGreaterThan(-1);
    expect(pfadPos, "EXCALIDRAW_ASSET_PATH muss vor dem Bündel stehen").toBeLessThan(buendelPos);
  });

  it("spiegelt Excalifont und Nunito", () => {
    const dateien = fs.readdirSync(path.join(DIST, "fonts"), { recursive: true }).map(String);
    expect(dateien.some((f) => f.includes("Excalifont"))).toBe(true);
    expect(dateien.some((f) => f.includes("Nunito"))).toBe(true);
  });
});
```

- [ ] **Step 7: Test laufen lassen**

Run: `npx vitest run tests/renderer-bundle.test.js`
Expected: PASS, 4 Tests

- [ ] **Step 8: Commit**

```bash
git add renderer/entry.js renderer/page.html scripts/build-renderer.mjs package.json package-lock.json .gitignore tests/renderer-bundle.test.js
git commit -m "feat: Renderer-Bündel aus Excalidraws Export-Funktionen"
```

---

### Task 2: Puppeteer-Treiber und Board-Rendering

**Files:**
- Create: `lib/render.js`
- Test: `tests/render.test.js`

**Interfaces:**
- Consumes: `PROJECT_ROOT` aus `lib/config.js`
- Produces:
  - `createRenderer(): Promise<Renderer>`
  - `Renderer.renderBoard(scene: object, { breite?: number }): Promise<Buffer>` — PNG des ganzen Boards
  - `Renderer.close(): Promise<void>`
  - `Renderer.requestedUrls(): string[]` — alle vom Browser angeforderten URLs, für den Netzzugriffs-Test

`scene` ist das Szenen-JSON-Objekt (`{ type, version, source, elements, appState, files }`), also genau das, was in einer `.excalidraw.md` steht.

**Zum Lebenszyklus:** Der Browserstart kostet ~2 s, ein Rendering 7–10 ms. Ein Renderer hält Browser, Seite und Server offen, bis `close()` gerufen wird — sonst kostet jedes Bild das Zweihundertfache.

- [ ] **Step 1: Test schreiben**

```js
// tests/render.test.js
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRenderer } from "../lib/render.js";
import { extractDrawing } from "../lib/compress.js";
import { VAULT_PATH } from "../lib/config.js";

const REFERENZ = path.join(VAULT_PATH, "Excalidraw", "Skill-Test Stufe 1.excalidraw.md");

describe("Renderer", () => {
  let renderer;
  let szene;

  beforeAll(async () => {
    szene = JSON.parse(extractDrawing(fs.readFileSync(REFERENZ, "utf8")).json);
    renderer = await createRenderer();
  }, 60_000);

  afterAll(async () => {
    await renderer?.close();
  });

  it("liefert ein PNG des ganzen Boards", async () => {
    const png = await renderer.renderBoard(szene, { breite: 1920 });
    expect(Buffer.isBuffer(png)).toBe(true);
    // PNG-Signatur
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(png.length).toBeGreaterThan(5000);
  }, 30_000);

  it("greift zur Laufzeit nicht auf das Netz zu", () => {
    const fremd = renderer.requestedUrls().filter((u) => !u.startsWith("http://127.0.0.1") && !u.startsWith("http://localhost"));
    expect(fremd, `Fremde Anfragen: ${fremd.join(", ")}`).toEqual([]);
  });

  it("lädt die Schriften lokal, nicht von esm.sh", () => {
    const urls = renderer.requestedUrls();
    expect(urls.some((u) => u.includes("esm.sh"))).toBe(false);
    expect(urls.some((u) => u.includes(".woff2"))).toBe(true);
  });

  it("ist reproduzierbar", async () => {
    const a = await renderer.renderBoard(szene, { breite: 800 });
    const b = await renderer.renderBoard(szene, { breite: 800 });
    expect(a.equals(b)).toBe(true);
  }, 30_000);
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/render.test.js`
Expected: FAIL, `Cannot find module '../lib/render.js'`

- [ ] **Step 3: Implementieren**

```js
// lib/render.js
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { PROJECT_ROOT } from "./config.js";

const DIST = path.join(PROJECT_ROOT, "renderer", "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
  ".css": "text/css; charset=utf-8",
};

/**
 * Liefert Bündel und Schriften von derselben Herkunft aus. Nötig, weil
 * Excalidraw seine Schrift-URIs gegen EXCALIDRAW_ASSET_PATH auflöst — ohne
 * eigenen Server müsste man auf ein CDN ausweichen.
 */
function starteServer() {
  const server = http.createServer((anfrage, antwort) => {
    const relativ = decodeURIComponent(anfrage.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
    const datei = path.join(DIST, relativ);

    // Kein Ausbruch aus dem dist-Verzeichnis.
    if (!datei.startsWith(DIST) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) {
      antwort.writeHead(404).end("nicht gefunden");
      return;
    }

    antwort.writeHead(200, { "Content-Type": MIME[path.extname(datei)] ?? "application/octet-stream" });
    fs.createReadStream(datei).pipe(antwort);
  });

  return new Promise((erfuellen) => {
    server.listen(0, "127.0.0.1", () => erfuellen({ server, port: server.address().port }));
  });
}

export async function createRenderer() {
  if (!fs.existsSync(path.join(DIST, "bundle.js"))) {
    throw new Error("Renderer-Bündel fehlt. Abhilfe: npm run build-renderer");
  }

  const { server, port } = await starteServer();
  const browser = await puppeteer.launch({ headless: true });
  const seite = await browser.newPage();

  const angefragt = [];
  seite.on("request", (r) => angefragt.push(r.url()));

  await seite.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "load" });
  await seite.waitForFunction("window.__excalidrawLibReady === true", { timeout: 30_000 });

  async function renderBoard(szene, { breite = 1920 } = {}) {
    const base64 = await seite.evaluate(async (eingabe, zielBreite) => {
      const { exportToBlob, restoreElements, restoreAppState } = window.ExcalidrawLib;

      const blob = await exportToBlob({
        elements: restoreElements(eingabe.elements, null),
        appState: { ...restoreAppState(eingabe.appState ?? {}, null), exportBackground: true },
        files: eingabe.files ?? {},
        mimeType: "image/png",
        exportPadding: 20,
        getDimensions: (w, h) => {
          const scale = zielBreite / w;
          return { width: zielBreite, height: Math.round(h * scale), scale };
        },
      });

      const puffer = await blob.arrayBuffer();
      let binaer = "";
      const bytes = new Uint8Array(puffer);
      for (let i = 0; i < bytes.length; i++) binaer += String.fromCharCode(bytes[i]);
      return btoa(binaer);
    }, szene, breite);

    return Buffer.from(base64, "base64");
  }

  async function close() {
    await browser.close();
    // Der lauschende Socket hält die Ereignisschleife sonst am Leben.
    await new Promise((erfuellen) => server.close(erfuellen));
  }

  return { renderBoard, close, requestedUrls: () => [...angefragt] };
}
```

- [ ] **Step 5: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/render.test.js`
Expected: PASS, 4 Tests. Der erste Lauf dauert länger (Chromium-Start).

Schlägt der Netzzugriffs-Test fehl, ist `EXCALIDRAW_ASSET_PATH` nicht wirksam — dann steht es in `renderer/page.html` nicht vor dem Bündel-Script oder das Bündel wurde nach einer Änderung nicht neu gebaut.

- [ ] **Step 5: Commit**

```bash
git add lib/render.js tests/render.test.js
git commit -m "feat: Puppeteer-Renderer für das Gesamtboard"
```

---

### Task 3: Frame-Rendering und Kommandozeile

**Files:**
- Modify: `lib/render.js`
- Create: `bin/render.mjs`
- Test: `tests/render-frames.test.js`

**Interfaces:**
- Consumes: `createRenderer` aus `lib/render.js`
- Produces:
  - `Renderer.renderFrame(scene, frameName: string, { breite?, hoehe? }): Promise<Buffer>`
  - `Renderer.frameNames(scene): string[]`
  - `bin/render.mjs <datei.excalidraw.md> <zielverzeichnis>` legt `uebersicht.png` und je Frame `frame-<n>-<name>.png` ab

- [ ] **Step 1: Test schreiben**

```js
// tests/render-frames.test.js
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRenderer } from "../lib/render.js";
import { extractDrawing } from "../lib/compress.js";
import { VAULT_PATH } from "../lib/config.js";

const REFERENZ = path.join(VAULT_PATH, "Excalidraw", "Skill-Test Stufe 1.excalidraw.md");

describe("Frame-Rendering", () => {
  let renderer;
  let szene;

  beforeAll(async () => {
    szene = JSON.parse(extractDrawing(fs.readFileSync(REFERENZ, "utf8")).json);
    renderer = await createRenderer();
  }, 60_000);

  afterAll(async () => {
    await renderer?.close();
  });

  it("findet die Frame-Namen der Szene", () => {
    const namen = renderer.frameNames(szene);
    expect(namen.length).toBe(2);
    expect(namen.every((n) => typeof n === "string" && n.length > 0)).toBe(true);
  });

  it("rendert einen einzelnen Frame in Beamer-Auflösung", async () => {
    const [erster] = renderer.frameNames(szene);
    const png = await renderer.renderFrame(szene, erster, { breite: 1920, hoehe: 1080 });
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(png.length).toBeGreaterThan(5000);
  }, 30_000);

  it("liefert für verschiedene Frames verschiedene Bilder", async () => {
    const [a, b] = renderer.frameNames(szene);
    const bildA = await renderer.renderFrame(szene, a, { breite: 960, hoehe: 540 });
    const bildB = await renderer.renderFrame(szene, b, { breite: 960, hoehe: 540 });
    expect(bildA.equals(bildB)).toBe(false);
  }, 30_000);

  it("meldet einen unbekannten Frame-Namen verständlich", async () => {
    await expect(renderer.renderFrame(szene, "Gibt es nicht", {})).rejects.toThrow(/Gibt es nicht/);
  }, 30_000);
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/render-frames.test.js`
Expected: FAIL, `renderer.frameNames is not a function`

- [ ] **Step 3: Implementieren**

```js
// Ergänzung in lib/render.js, innerhalb von createRenderer vor dem return

  function frameNames(szene) {
    return (szene.elements ?? []).filter((e) => e.type === "frame" && !e.isDeleted).map((e) => e.name);
  }

  async function renderFrame(szene, frameName, { breite = 1920, hoehe = 1080 } = {}) {
    if (!frameNames(szene).includes(frameName)) {
      throw new Error(`Frame "${frameName}" gibt es in dieser Szene nicht — vorhanden: ${frameNames(szene).join(", ") || "keine"}`);
    }

    const base64 = await seite.evaluate(async (eingabe, name, zielBreite, zielHoehe) => {
      const { exportToBlob, restoreElements, restoreAppState } = window.ExcalidrawLib;
      const elemente = restoreElements(eingabe.elements, null);
      const frame = elemente.find((el) => el.type === "frame" && el.name === name);

      const blob = await exportToBlob({
        elements: elemente,
        appState: { ...restoreAppState(eingabe.appState ?? {}, null), exportBackground: true },
        files: eingabe.files ?? {},
        mimeType: "image/png",
        exportingFrame: frame,          // schneidet exakt auf die Frame-Grenzen
        getDimensions: (w, h) => ({ width: zielBreite, height: zielHoehe, scale: zielBreite / w }),
      });

      const puffer = await blob.arrayBuffer();
      let binaer = "";
      const bytes = new Uint8Array(puffer);
      for (let i = 0; i < bytes.length; i++) binaer += String.fromCharCode(bytes[i]);
      return btoa(binaer);
    }, szene, frameName, breite, hoehe);

    return Buffer.from(base64, "base64");
  }
```

Und die Rückgabe erweitern:

```js
  return { renderBoard, renderFrame, frameNames, close, requestedUrls: () => [...angefragt] };
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/render-frames.test.js`
Expected: PASS, 4 Tests

- [ ] **Step 5: Kommandozeile schreiben**

```js
// bin/render.mjs
import fs from "node:fs";
import path from "node:path";
import { createRenderer } from "../lib/render.js";
import { extractDrawing } from "../lib/compress.js";

const [dateiPfad, zielVerzeichnis] = process.argv.slice(2);

if (!dateiPfad || !zielVerzeichnis) {
  console.error("Aufruf: node bin/render.mjs <datei.excalidraw.md> <zielverzeichnis>");
  process.exit(1);
}

const szene = JSON.parse(extractDrawing(fs.readFileSync(dateiPfad, "utf8")).json);
fs.mkdirSync(zielVerzeichnis, { recursive: true });

const renderer = await createRenderer();
try {
  const uebersicht = path.join(zielVerzeichnis, "uebersicht.png");
  fs.writeFileSync(uebersicht, await renderer.renderBoard(szene, { breite: 1920 }));
  console.log(`L0 Übersicht: ${uebersicht}`);

  const namen = renderer.frameNames(szene);
  for (const [nr, name] of namen.entries()) {
    // Dateiname aus dem Frame-Namen, ohne Zeichen, die Pfade zerlegen könnten.
    const sicher = name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "frame";
    const ziel = path.join(zielVerzeichnis, `frame-${nr + 1}-${sicher}.png`);
    fs.writeFileSync(ziel, await renderer.renderFrame(szene, name, { breite: 1920, hoehe: 1080 }));
    console.log(`L1 ${name}: ${ziel}`);
  }
} finally {
  await renderer.close();
}
```

- [ ] **Step 6: Gegen das echte Board ausführen**

```bash
mkdir -p scratchpad/renders
node bin/render.mjs "/Users/dennis/Tafelbilder/Excalidraw/Skill-Test Stufe 1.excalidraw.md" scratchpad/renders
```

Expected: drei PNGs — eine Übersicht und zwei Frames. **Sieh dir die Bilder tatsächlich an** und beschreibe im Bericht, was darauf zu erkennen ist: handgezeichnete Excalifont-Überschriften, serifenlose Nunito-Beschriftungen, korrekte Umlaute, Farben nach Rollen. Wirken die Schriften wie eine Systemschrift, laden die Schriften nicht — dann ist der Renderer wertlos, und das gehört gemeldet, nicht überspielt.

- [ ] **Step 7: Volle Suite**

Run: `npx vitest run`
Expected: PASS, alle Tests

- [ ] **Step 8: Commit**

```bash
git add lib/render.js bin/render.mjs tests/render-frames.test.js
git commit -m "feat: Frame-Rendering und render-Kommando"
```

---

### Task 4: Beide Gates in den Bauvorgang einhängen

**Files:**
- Modify: `lib/document.js`, `bin/build.mjs`
- Test: `tests/build-gates.test.js`

**Interfaces:**
- Consumes: `validateScene`, `formatFindings` aus `lib/validate/index.js`; `createRenderer` aus `lib/render.js`
- Produces:
  - `lib/document.js`: **neu** `sceneToObject(szene, { pluginVersion? }): object` — liefert das Szenen-JSON-Objekt (`{ type, version, source, elements, appState, files }`), das `sceneToMarkdown` bisher nur intern baute
  - `bin/build.mjs <szenen-skript> <ziel> [--renders <verzeichnis>] [--skip-render]`

**Warum `sceneToObject` zuerst entsteht:** Der Renderer braucht das Szenen-**Objekt**, `sceneToMarkdown` liefert eine **Zeichenkette**. Ohne diesen Export müsste jeder Aufrufer das JSON per Regex aus dem erzeugten Markdown zurückparsen — an drei Stellen dieselbe fragile Zeile, die bricht, sobald sich am Dateiformat etwas ändert. `sceneToMarkdown` ruft `sceneToObject` künftig selbst auf, damit es weiterhin genau eine Stelle gibt, an der das Objekt entsteht.

**Der Ablauf, den diese Task herstellt:**

```
Szenen-Skript
  → bauen
  → validieren      ← harte Fehler? Abbruch, nichts wird geschrieben
  → rendern         ← PNGs ins Scratchpad, das Modell sieht sie an
  → in den Vault schreiben
```

Der Vault wird zuletzt angefasst. Das ist der Kern der Stabilitätszusage aus der Spezifikation.

- [ ] **Step 1: Test schreiben**

```js
// tests/build-gates.test.js
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { PROJECT_ROOT } from "../lib/config.js";

function laufe(argumente) {
  try {
    const ausgabe = execFileSync("node", [path.join(PROJECT_ROOT, "bin", "build.mjs"), ...argumente], {
      cwd: PROJECT_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, ausgabe };
  } catch (fehler) {
    return { code: fehler.status, ausgabe: `${fehler.stdout ?? ""}${fehler.stderr ?? ""}` };
  }
}

describe("build-Gates", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "build-gates-"));

  it("schreibt nichts, wenn die Szene harte Fehler hat", () => {
    const skript = path.join(tmp, "kaputt.mjs");
    // Zwei Elemente mit derselben ID: verletzt die Eindeutigkeit.
    fs.writeFileSync(skript, `
      import { scene } from "${path.join(PROJECT_ROOT, "lib", "scene.js")}";
      const s = scene();
      const f = s.frame("Kapitel");
      f.box("Eins", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
      const echte = s.elements;
      s.elements = () => { const alle = echte(); alle[1].id = alle[0].id; return alle; };
      export default s;
    `);
    const ziel = path.join(tmp, "kaputt.excalidraw.md");
    const { code, ausgabe } = laufe([skript, ziel, "--skip-render"]);

    expect(code).not.toBe(0);
    expect(ausgabe).toMatch(/Fehler/);
    expect(fs.existsSync(ziel), "Bei harten Fehlern darf keine Datei entstehen").toBe(false);
  });

  it("schreibt bei einer sauberen Szene", () => {
    const skript = path.join(tmp, "sauber.mjs");
    fs.writeFileSync(skript, `
      import { scene } from "${path.join(PROJECT_ROOT, "lib", "scene.js")}";
      const s = scene();
      const f = s.frame("Kapitel");
      f.text("Titel", { typo: "frametitel", x: 60, y: 60 });
      f.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 200, y: 400 });
      export default s;
    `);
    const ziel = path.join(tmp, "sauber.excalidraw.md");
    const { code } = laufe([skript, ziel, "--skip-render"]);

    expect(code).toBe(0);
    expect(fs.existsSync(ziel)).toBe(true);
    expect(fs.readFileSync(ziel, "utf8")).toContain("excalidraw-plugin: parsed");
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/build-gates.test.js`
Expected: FAIL — `bin/build.mjs` kennt `--skip-render` noch nicht und validiert nicht.

- [ ] **Step 3: `sceneToObject` aus `lib/document.js` herauslösen**

In `lib/document.js` den Objektaufbau, der bisher inline in `sceneToMarkdown` steht, in eine eigene exportierte Funktion ziehen und von `sceneToMarkdown` aus aufrufen:

```js
/** Das Szenen-JSON-Objekt, wie es im Drawing-Block der Datei steht. */
export function sceneToObject(szene, { pluginVersion = readPluginVersion() } = {}) {
  return {
    type: "excalidraw",
    version: 2,
    source: `https://github.com/zsviczian/obsidian-excalidraw-plugin/releases/tag${pluginVersion}`,
    elements: szene.elements(),
    appState: appState(),
    files: {},
  };
}
```

`sceneToMarkdown` benutzt sie und serialisiert nur noch:

```js
    JSON.stringify(sceneToObject(szene, { pluginVersion }), null, 2),
```

Verhalten und Ausgabe bleiben unverändert — `tests/document.test.js` und `tests/roundtrip.test.js` müssen ohne Anpassung grün bleiben. Das ist die Probe darauf, dass es eine reine Umstrukturierung war.

Zusätzlich in `lib/index.js` mitexportieren:

```js
export { sceneToMarkdown, markdownToScene, sceneToObject } from "./document.js";
```

- [ ] **Step 4: `bin/build.mjs` umbauen**

```js
// bin/build.mjs
import fs from "node:fs";
import path from "node:path";
import { sceneToMarkdown, sceneToObject } from "../lib/document.js";
import { validateScene, formatFindings } from "../lib/validate/index.js";
import { createRenderer } from "../lib/render.js";

const argumente = process.argv.slice(2);
const kennzeichen = new Set(argumente.filter((a) => a.startsWith("--")));
const [skriptPfad, zielPfad] = argumente.filter((a) => !a.startsWith("--"));

const rendersIndex = argumente.indexOf("--renders");
const renderVerzeichnis = rendersIndex >= 0 ? argumente[rendersIndex + 1] : null;

if (!skriptPfad || !zielPfad) {
  console.error("Aufruf: node bin/build.mjs <szenen-skript.mjs> <ziel.excalidraw.md> [--renders <verzeichnis>] [--skip-render]");
  process.exit(1);
}

// Kein stilles Überschreiben — der Vault ist zu wertvoll für einen Flüchtigkeitsfehler.
if (fs.existsSync(zielPfad) && process.env.UEBERSCHREIBEN !== "ja") {
  console.error(`${zielPfad} existiert bereits. Zum Überschreiben UEBERSCHREIBEN=ja setzen.`);
  process.exit(1);
}

const szene = (await import(path.resolve(skriptPfad))).default;
const elemente = szene.elements();
const markdown = sceneToMarkdown(szene);
const { zoomL0 } = szene.dimensions();

// Gate 1: Validator. Harte Fehler beenden hier — der Vault bleibt unberührt.
const pruefung = validateScene(elemente, { markdown, registry: szene.registry, zoomL0 });
console.log(formatFindings(pruefung.findings));

if (!pruefung.ok) {
  console.error("\nAbbruch: harte Fehler. Es wurde nichts geschrieben.");
  process.exit(1);
}

// Gate 2: Rendering ins Scratchpad, damit das Layout vor dem Schreiben sichtbar ist.
if (!kennzeichen.has("--skip-render")) {
  const ziel = renderVerzeichnis ?? path.join(path.dirname(skriptPfad), "renders");
  fs.mkdirSync(ziel, { recursive: true });

  const renderer = await createRenderer();
  try {
    const szenenObjekt = sceneToObject(szene);
    fs.writeFileSync(path.join(ziel, "uebersicht.png"), await renderer.renderBoard(szenenObjekt, { breite: 1920 }));
    console.log(`\nL0 Übersicht: ${path.join(ziel, "uebersicht.png")}`);

    for (const [nr, name] of renderer.frameNames(szenenObjekt).entries()) {
      const sicher = name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "frame";
      const bild = path.join(ziel, `frame-${nr + 1}-${sicher}.png`);
      fs.writeFileSync(bild, await renderer.renderFrame(szenenObjekt, name, { breite: 1920, hoehe: 1080 }));
      console.log(`L1 ${name}: ${bild}`);
    }
  } finally {
    await renderer.close();
  }
}

// Erst jetzt in den Vault.
fs.mkdirSync(path.dirname(zielPfad), { recursive: true });
fs.writeFileSync(zielPfad, markdown, "utf8");

const { breite, hoehe } = szene.dimensions();
console.log(`\nGeschrieben: ${zielPfad}`);
console.log(`Elemente: ${elemente.length} | Board: ${Math.round(breite)}×${Math.round(hoehe)} | L0-Zoom: ${zoomL0.toFixed(2)}`);
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/build-gates.test.js`
Expected: PASS, 2 Tests

- [ ] **Step 6: Determinismus erneut belegen**

```bash
node bin/build.mjs scratchpad/beispiel.mjs /tmp/gate-a.excalidraw.md --skip-render
node bin/build.mjs scratchpad/beispiel.mjs /tmp/gate-b.excalidraw.md --skip-render
diff /tmp/gate-a.excalidraw.md /tmp/gate-b.excalidraw.md && echo "identisch"
```

Expected: `identisch`. Existiert `scratchpad/beispiel.mjs` nicht mehr, eine kleine Szene mit zwei Frames neu anlegen.

- [ ] **Step 6: Volle Suite**

Run: `npx vitest run`
Expected: PASS, alle Tests

- [ ] **Step 7: Commit**

```bash
git add bin/build.mjs tests/build-gates.test.js
git commit -m "feat: Validator und Renderer als Gates vor dem Schreiben in den Vault"
```

---

### Task 5: Golden-Render-Tests

**Files:**
- Create: `tests/golden/`, `scripts/update-golden.mjs`, `tests/golden-render.test.js`
- Modify: `.gitignore` (Ausnahme für die Golden-PNGs sicherstellen)

**Interfaces:**
- Consumes: `createRenderer`, `scene`, `sceneToMarkdown`
- Produces:
  - `tests/golden/<name>.mjs` — Referenzszenen
  - `tests/golden/<name>.png` — eingecheckte Referenzbilder
  - `npm run update-golden` — erzeugt die Referenzbilder neu

**Wozu:** Die Ausgabe ist deterministisch, also ist ein Pixelvergleich möglich. Ändert ein Umbau versehentlich das Aussehen, schlägt der Test an — das ist die einzige Prüfung, die eine rein optische Regression bemerkt.

- [ ] **Step 1: Referenzszenen schreiben**

```js
// tests/golden/formen.mjs
// Deckt alle Elementtypen und alle sieben Farbrollen ab.
import { scene } from "../../lib/scene.js";

const s = scene();
const f = s.frame("Formen und Rollen");
f.text("Alle Formen", { typo: "frametitel", x: 60, y: 50 });
f.box("Neutral", { rolle: "neutral", typo: "kernbegriff", x: 80, y: 250 });
f.box("Kern", { rolle: "kern", typo: "kernbegriff", x: 480, y: 250 });
f.box("Kontra", { rolle: "kontra", typo: "kernbegriff", x: 880, y: 250 });
f.ellipse("Ergebnis", { rolle: "ergebnis", typo: "kernbegriff", x: 80, y: 520 });
f.diamond("Frage", { rolle: "frage", typo: "kernbegriff", x: 640, y: 520 });
f.box("Kontext", { rolle: "kontext", typo: "detail", x: 1200, y: 250 });
f.box("Technik", { rolle: "technik", typo: "standard", x: 1200, y: 520 });
export default s;
```

```js
// tests/golden/umlaute.mjs
// Deckt deutsche Sonderzeichen und mehrzeiligen, umbrochenen Text ab.
import { scene } from "../../lib/scene.js";

const s = scene();
const f = s.frame("Umlaute und Umbruch");
f.text("Mängelwesen, Größe, Überfluß", { typo: "frametitel", x: 60, y: 50 });
f.box("Der Mensch ist ein Mängelwesen und muss die fehlende Instinktausstattung durch Kultur ausgleichen.", {
  rolle: "kern", typo: "standard", x: 120, y: 300, breite: 700,
});
f.box("§ 3 Abs. 2", { rolle: "kontext", typo: "detail", x: 1000, y: 300 });
export default s;
```

- [ ] **Step 2: Erzeugerskript schreiben**

```js
// scripts/update-golden.mjs
import fs from "node:fs";
import path from "node:path";
import { createRenderer } from "../lib/render.js";
import { sceneToObject } from "../lib/document.js";
import { PROJECT_ROOT } from "../lib/config.js";

const GOLDEN = path.join(PROJECT_ROOT, "tests", "golden");
const szenen = fs.readdirSync(GOLDEN).filter((f) => f.endsWith(".mjs"));

const renderer = await createRenderer();
try {
  for (const datei of szenen) {
    const szene = (await import(path.join(GOLDEN, datei))).default;
    const markdown = sceneToMarkdown(szene, { pluginVersion: "golden" });
    const szenenObjekt = sceneToObject(szene);

    const name = path.basename(datei, ".mjs");
    const png = await renderer.renderBoard(szenenObjekt, { breite: 1200 });
    fs.writeFileSync(path.join(GOLDEN, `${name}.png`), png);
    console.log(`${name}.png (${(png.length / 1024).toFixed(0)} kB)`);
  }
} finally {
  await renderer.close();
}
```

`pluginVersion: "golden"` ist bewusst fest: Sonst änderte jedes Plugin-Update im Vault die Referenzbilder, obwohl sich am Aussehen nichts geändert hat.

- [ ] **Step 3: Referenzbilder erzeugen und ansehen**

```bash
npm pkg set scripts.update-golden="node scripts/update-golden.mjs"
npm run update-golden
```

**Sieh dir beide PNGs an**, bevor du sie einchecken lässt — sie werden zum Maßstab. Zu prüfen: Alle sieben Farbrollen unterscheidbar, Ellipse und Raute umschließen ihren Text, Umlaute korrekt, `§` sichtbar, der lange Satz sauber umbrochen. Stimmt etwas nicht, ist das ein echter Befund und gehört gemeldet — ein falsches Referenzbild zementiert den Fehler.

- [ ] **Step 4: Test schreiben**

```js
// tests/golden-render.test.js
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRenderer } from "../lib/render.js";
import { sceneToObject } from "../lib/document.js";
import { PROJECT_ROOT } from "../lib/config.js";

const GOLDEN = path.join(PROJECT_ROOT, "tests", "golden");
const szenen = fs.readdirSync(GOLDEN).filter((f) => f.endsWith(".mjs"));

describe("Golden-Renderings", () => {
  let renderer;

  beforeAll(async () => {
    renderer = await createRenderer();
  }, 60_000);

  afterAll(async () => {
    await renderer?.close();
  });

  it("hat für jede Referenzszene ein Referenzbild", () => {
    expect(szenen.length).toBeGreaterThan(0);
    for (const datei of szenen) {
      const png = path.join(GOLDEN, `${path.basename(datei, ".mjs")}.png`);
      expect(fs.existsSync(png), `${png} fehlt — npm run update-golden ausführen`).toBe(true);
    }
  });

  for (const datei of szenen) {
    const name = path.basename(datei, ".mjs");

    it(`rendert "${name}" byte-identisch zum Referenzbild`, async () => {
      const szene = (await import(path.join(GOLDEN, datei))).default;
      const markdown = sceneToMarkdown(szene, { pluginVersion: "golden" });
      const szenenObjekt = sceneToObject(szene);

      const jetzt = await renderer.renderBoard(szenenObjekt, { breite: 1200 });
      const referenz = fs.readFileSync(path.join(GOLDEN, `${name}.png`));

      expect(
        jetzt.equals(referenz),
        `Das Rendering von "${name}" weicht vom Referenzbild ab. War die Änderung beabsichtigt, mit "npm run update-golden" neu erzeugen und die Bilder ansehen.`,
      ).toBe(true);
    }, 30_000);
  }
});
```

- [ ] **Step 5: Test laufen lassen**

Run: `npx vitest run tests/golden-render.test.js`
Expected: PASS

Schlägt der Vergleich unmittelbar nach dem Erzeugen fehl, ist das Rendering nicht reproduzierbar — dann liegt eine Quelle von Nichtdeterminismus im Renderpfad. Das ist ein blockierender Befund und keine Toleranzfrage: Ohne reproduzierbare Bilder ist ein Golden-Test wertlos.

- [ ] **Step 6: Sicherstellen, dass die Bilder versioniert werden**

Run: `git check-ignore -v tests/golden/formen.png || echo "wird versioniert"`
Expected: `wird versioniert`

- [ ] **Step 7: Volle Suite**

Run: `npx vitest run`
Expected: PASS, alle Tests

- [ ] **Step 8: Commit**

```bash
git add tests/golden scripts/update-golden.mjs tests/golden-render.test.js package.json
git commit -m "feat: Golden-Render-Tests gegen eingecheckte Referenzbilder"
```

---

## Abschluss der Stufe 2

Nach Task 5 laufen die beiden inneren Schleifen der Pipeline:

```
Anfrage → Struktur-Gate (Dennis) → Szenen-Skript → build
                                       ↓
                                   validate ──✗──┐
                                       ↓         │
                                    render ──✗───┤
                                       ↓         │
                              in den Vault       │
                                       ↓         │
                              Vorschau (Dennis)  │
                                                 │
                        Korrektur am Skript ◄────┘
```

Der Validator fängt, was rechenbar falsch ist. Der Renderer zeigt, was nur zu sehen ist. Beide laufen, bevor der Vault berührt wird.

**Was Stufe 2 nicht leistet:** Pfeile zwischen Formen, Layout-Helfer, Notiz-Links, Bilder, Transklusion, Mengenkreise, Dreieck, Programmablaufplan. Das sind die Stufen 3 und 4.

**Bekannte Grenze:** Die Golden-Tests vergleichen byte-genau. Ein Chromium-Update kann die Referenzbilder brechen, ohne dass sich am Code etwas geändert hat. Tritt das ein, ist der richtige Umgang, die Bilder anzusehen, die Änderung zu beurteilen und `npm run update-golden` auszuführen — nicht, den Vergleich aufzuweichen.
