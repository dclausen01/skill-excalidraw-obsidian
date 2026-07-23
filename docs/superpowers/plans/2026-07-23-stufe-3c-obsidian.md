# Excalidraw-Tafelbild-Skill — Stufe 3c: Obsidian-Anbindung

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Boards binden an Obsidian an: klickbare Notiz-Links an Elementen, eingebettete Vault-Bilder, und Transklusionen von Notiz-Abschnitten.

**Architecture:** Die drei Features hängen an je einer Markdown-Sektion, die `sceneToMarkdown` schreibt (`## Element Links`, `## Embedded Files`) bzw. an einem Textelement (`rawText` = Transklusionsverweis). `markdownToScene` liest diese Sektionen bereits (aus Stufe 1). Bilder haben eine Besonderheit (durch Spike belegt, Spec 2.5.1): der Renderer zeigt sie nur, wenn `files` die dataURL trägt — die geschriebene Datei behält `files: {}` und nutzt `## Embedded Files`, der Render-Pfad wird befüllt.

**Tech Stack:** Node ≥ 20 (ESM), vitest, `image-size` (neue Dev-Abhängigkeit für Bildmaße).

## Global Constraints

- **Node ≥ 20**, ausschließlich ESM. Keine CommonJS-Dateien.
- **Vault-Pfad** nie fest verdrahtet — immer aus `lib/config.js`.
- **Sprache im Code:** technische Module englische Exporte; Validator-Befundstruktur deutsch (`schwere`, `regel`, `meldung`), `elementId` englisch; lokale Variablen und Kommentare deutsch; Optionsschlüssel deutsch (`{ link, breite }`).
- **Determinismus:** dieselbe Szene byte-identische Ausgabe. Bild-`fileId` ist der SHA-1 der Bytes (deterministisch).
- **files-Dualität (Spec 2.5.1):** Die **geschriebene** Datei behält `files: {}` und löst Bilder über `## Embedded Files` (`<sha1>: [[Datei.png]]`) auf. Der **Render-Pfad** befüllt `files[fileId] = { mimeType, id, dataURL }`, sonst zeigt der Renderer nur einen leeren Rahmen.
- **Datenschutz:** Golden-Tests nutzen ein neutrales, im Repo erzeugtes Bild — nie ein Vault-Bild (kann Schülerdaten enthalten, Spec 2.5.1).
- **Der Vault wird zuletzt angefasst.** Bestehende 312 Tests müssen grün bleiben.

## Dateistruktur dieser Stufe

| Datei | Verantwortung |
|---|---|
| `lib/elements.js` | **Änderung:** `imageElement`, `link`-Option an Formen, `transclusionElement` |
| `lib/scene.js` | **Änderung:** `frame.image(...)`, `frame.transclusion(...)`, `link`-Durchreichung; Szene sammelt die Embedded-Files-Map |
| `lib/document.js` | **Änderung:** `sceneToMarkdown` schreibt `## Element Links` und `## Embedded Files`; `sceneToObject` optional mit Bilddaten |
| `lib/validate/structure.js` | **Änderung:** Notiz-Link-Prüfung, Bild-Referenz-Prüfung, `image`/`transclusion` im Schema |
| `bin/render.mjs`, `bin/build.mjs` | **Änderung:** Render-Pfad mit Bilddaten |

**Nicht in dieser Stufe:** Spezialkomponenten (Mengenkreise, Dreieck, PAP), `line`-Primitiv/`tabelle` (aus dem Praxistest), `SKILL.md`-Erweiterung. Das ist Stufe 4.

---

### Task 1: Notiz-Links an Formen

**Files:**
- Modify: `lib/elements.js` (nur diese Datei)
- Test: `tests/element-links.test.js`

**Interfaces:**
- Consumes: bestehende Form-Fabriken
- Produces: `f.box("…", { link: "[[Zielnotiz]]" })` (und `.ellipse`/`.diamond`) setzt `link` am Container. Rückgabe unverändert `{ container, text }`.

Ein Excalidraw-Element trägt `link` (schon in `basisFelder`, Standard `null`; `link` ist zudem schon in `KONVENTIONSFELDER` des Validators, wird also bereits geprüft). **`scene.js` bleibt unangetastet:** der `hinzu`-Wrapper in `frame(...)` reicht die Optionen als `{ ...opts, inhalt, x, y, ordnung }` an die Fabrik durch — `link` fließt also automatisch bis `formElement`. Zu ändern ist nur `formElement` in `lib/elements.js`, das `link` bisher nicht ausliest. `sceneToMarkdown` schreibt die Sektion (Task 2).

- [ ] **Step 1: Test schreiben**

```js
// tests/element-links.test.js
import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";

describe("Notiz-Link an einer Form", () => {
  it("setzt link am Container", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const b = f.box("Mängelwesen", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100, link: "[[Der Mensch – ein Mängelwesen]]" });
    expect(b.container.link).toBe("[[Der Mensch – ein Mängelwesen]]");
  });

  it("lässt link null, wenn nicht gesetzt", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const b = f.box("Ohne Link", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100 });
    expect(b.container.link).toBe(null);
  });

  it("bleibt deterministisch", () => {
    const baue = () => {
      const s = scene();
      const f = s.frame("K");
      f.box("X", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0, link: "[[N]]" });
      return JSON.stringify(s.elements());
    };
    expect(baue()).toBe(baue());
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/element-links.test.js`
Expected: FAIL — `link` ist `null` statt gesetzt.

- [ ] **Step 3: Implementieren**

`formElement(type, { inhalt, rolle, typo, x, y, breite, hoehe, ordnung }, registry)` destrukturiert `link` bisher nicht. `link` in die Destrukturierung aufnehmen und am Container setzen — `basisFelder` setzt `link: null`, ein explizites `link` überschreibt das:

```js
// Signatur um link erweitern:
function formElement(type, { inhalt, rolle, typo, x, y, breite, hoehe, link, ordnung }, registry) {
  // … container entsteht aus basisFelder(...) …
  // nach dem Bau des Containers:
  container.link = link ?? null;
  // (oder link direkt in das Container-Literal aufnehmen)
}
```

`textElement` bleibt unverändert (Text bekommt keinen eigenen Link; der Link sitzt am Container). `scene.js` wird **nicht** angefasst — der `hinzu`-Wrapper übergibt `link` bereits über `...opts`.

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/element-links.test.js`
Expected: PASS, 3 Tests

- [ ] **Step 5: Commit**

```bash
git add lib/elements.js tests/element-links.test.js
git commit -m "feat: Notiz-Link-Option an Formen"
```

---

### Task 2: sceneToMarkdown schreibt ## Element Links

**Files:**
- Modify: `lib/document.js`
- Test: `tests/document-links.test.js`

**Interfaces:**
- Consumes: `sceneToMarkdown`
- Produces: `sceneToMarkdown` schreibt eine `## Element Links`-Sektion (zwischen `## Text Elements` und dem `%%`), mit je einer Zeile `<elementId>: <link>` für jedes Element mit gesetztem `link`. Fehlt jeder Link, entfällt die Sektion.

`markdownToScene` liest diese Sektion bereits (`sektionen.elementLinks`) — der Roundtrip schließt sich damit.

- [ ] **Step 1: Test schreiben**

```js
// tests/document-links.test.js
import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";
import { sceneToMarkdown, markdownToScene } from "../lib/document.js";

function baue() {
  const s = scene();
  const f = s.frame("Kapitel");
  f.box("Mängelwesen", { rolle: "kern", typo: "kernbegriff", x: 100, y: 100, link: "[[Mängelwesen]]" });
  f.box("Ohne", { rolle: "neutral", typo: "kernbegriff", x: 100, y: 400 });
  return s;
}

describe("## Element Links", () => {
  const md = sceneToMarkdown(baue(), { pluginVersion: "2.23.12" });

  it("schreibt die Sektion mit dem verlinkten Element", () => {
    expect(md).toContain("## Element Links");
    expect(md).toMatch(/^[A-Za-z0-9]{8}: \[\[Mängelwesen\]\]$/m);
  });

  it("nennt nur verlinkte Elemente", () => {
    const zeilen = md.split("\n").filter((z) => /^[A-Za-z0-9]{8}: \[\[/.test(z));
    expect(zeilen).toHaveLength(1);
  });

  it("lässt die Sektion weg, wenn kein Link existiert", () => {
    const s = scene();
    const f = s.frame("K");
    f.box("X", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0 });
    expect(sceneToMarkdown(s, { pluginVersion: "2.23.12" })).not.toContain("## Element Links");
  });

  it("round-trippt: markdownToScene liest den Link zurück", () => {
    const gelesen = markdownToScene(md);
    const linkWerte = Object.values(gelesen.sektionen.elementLinks);
    expect(linkWerte).toContain("[[Mängelwesen]]");
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/document-links.test.js`
Expected: FAIL — die Sektion fehlt.

- [ ] **Step 3: Implementieren**

In `lib/document.js`, `sceneToMarkdown`: Nach den `## Text Elements`-Blöcken und vor dem `%%` die Link-Sektion einfügen. Die Elemente kommen aus `szene.elements()` (einmal holen, nicht doppelt — falls `sceneToMarkdown` sie schon hat, wiederverwenden).

```js
// In sceneToMarkdown, nach der Text-Elements-Schleife, vor teile.push("%%", …):
const elemente = szene.elements();          // ggf. schon vorhanden — nicht doppelt aufrufen
const mitLink = elemente.filter((el) => el.link);
if (mitLink.length > 0) {
  teile.push("## Element Links", "");
  for (const el of mitLink) teile.push(`${el.id}: ${el.link}`, "");
}
```

Die exakte Einfügestelle: zwischen dem letzten Text-Elements-Block und dem `teile.push("%%", "## Drawing", …)`. Die bestehende Reihenfolge (Frontmatter → Text Elements → [Element Links] → [Embedded Files] → %% → Drawing) einhalten.

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/document-links.test.js`
Expected: PASS, 4 Tests

- [ ] **Step 5: Bestehende Serialisierungstests prüfen**

Run: `npx vitest run tests/document.test.js tests/roundtrip.test.js`
Expected: PASS — die neue Sektion darf die bestehende Ausgabe für linkfreie Szenen nicht verändern.

- [ ] **Step 6: Commit**

```bash
git add lib/document.js tests/document-links.test.js
git commit -m "feat: sceneToMarkdown schreibt ## Element Links"
```

---

### Task 3: Notiz-Link-Prüfung im Validator

**Files:**
- Modify: `lib/validate/structure.js`, `lib/validate/index.js`
- Test: `tests/validate-links.test.js`

**Interfaces:**
- Consumes: `createFindings`, `VAULT_PATH` aus `lib/config.js`
- Produces: `checkNoteLinks(elements, befunde, { vaultPath })` — prüft für jedes Element mit `link`, ob die Zielnotiz im Vault existiert. **Warnung, kein harter Fehler.**

**Zur Härte:** Die Spezifikation nennt in Abschnitt 8 „verlinkte Notizen existieren" als harten Fehler, in Abschnitt 7 aber „warnt sonst". Aufgelöst zugunsten der **Warnung** — konsistent mit der in Stufe 2a gelernten Regel: einen gültigen Board-Entwurf nie blockieren. Dennis verlinkt womöglich eine Notiz, die er erst noch anlegt. Die Warnung nennt die fehlende Notiz, damit tote Links nicht erst vor der Klasse auffallen.

- [ ] **Step 1: Test schreiben**

```js
// tests/validate-links.test.js
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createFindings } from "../lib/validate/findings.js";
import { checkNoteLinks } from "../lib/validate/structure.js";

function element(link) {
  return { id: "aaaaaaaa", type: "rectangle", link };
}

describe("checkNoteLinks", () => {
  const vault = fs.mkdtempSync(path.join(os.tmpdir(), "vault-links-"));
  fs.writeFileSync(path.join(vault, "Existiert.md"), "# da");

  function pruefe(elemente) {
    const b = createFindings();
    checkNoteLinks(elemente, b, { vaultPath: vault });
    return b.all();
  }

  it("akzeptiert einen Link auf eine existierende Notiz", () => {
    expect(pruefe([element("[[Existiert]]")])).toEqual([]);
  });

  it("warnt bei einem Link auf eine fehlende Notiz — als Warnung, nicht als Fehler", () => {
    const befunde = pruefe([element("[[Gibt es nicht]]")]);
    expect(befunde.some((b) => b.regel === "notizlink" && b.schwere === "warnung")).toBe(true);
    expect(befunde.some((b) => b.schwere === "fehler")).toBe(false);
    expect(befunde[0].meldung).toContain("Gibt es nicht");
  });

  it("ignoriert Elemente ohne Link", () => {
    expect(pruefe([element(null)])).toEqual([]);
  });

  it("löst einen Link mit Unterpfad und Anker auf den Dateinamen auf", () => {
    // [[Ordner/Notiz#Abschnitt]] → prüft, ob "Notiz.md" (irgendwo) existiert
    fs.mkdirSync(path.join(vault, "Unter"), { recursive: true });
    fs.writeFileSync(path.join(vault, "Unter", "Tief.md"), "x");
    expect(pruefe([element("[[Tief#Abschnitt]]")])).toEqual([]);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/validate-links.test.js`
Expected: FAIL — `checkNoteLinks is not a function`

- [ ] **Step 3: Implementieren**

In `lib/validate/structure.js`:

```js
import fs from "node:fs";
import path from "node:path";

/** Existiert irgendwo unter vaultPath eine Datei "<name>.md"? Obsidian-Links sind
 *  nicht pfadgebunden — der Notizname genügt. */
function notizExistiert(name, vaultPath) {
  const ziel = `${name}.md`;
  const suche = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      if (e.isDirectory()) { if (suche(path.join(dir, e.name))) return true; }
      else if (e.name === ziel) return true;
    }
    return false;
  };
  try { return suche(vaultPath); } catch { return false; }
}

export function checkNoteLinks(elemente, befunde, { vaultPath }) {
  for (const el of elemente) {
    if (!el.link) continue;
    // [[Ordner/Notiz#Abschnitt|Alias]] → "Notiz"
    const roh = el.link.replace(/^\[\[/, "").replace(/\]\]$/, "");
    const ohneAlias = roh.split("|")[0];
    const ohneAnker = ohneAlias.split("#")[0];
    const name = ohneAnker.split("/").pop().trim();
    if (name && !notizExistiert(name, vaultPath)) {
      befunde.warn("notizlink", `Verlinkte Notiz „${name}" existiert nicht im Vault — toter Link`, el.id);
    }
  }
}
```

In `lib/validate/index.js` einhängen. Aktuelle Signatur (Zeile 33):

```js
export function validateScene(elemente, { markdown = null, registry = loadFontRegistry(), zoomL0 = 1 } = {}) {
```

erweitern zu `{ …, vaultPath = VAULT_PATH } = {}` und `VAULT_PATH` aus `../config.js` importieren. `checkNoteLinks(elemente, befunde, { vaultPath })` **unbedingt** aufrufen (nicht im `if (!befunde.hasErrors())`-Block — ein toter Link ist unabhängig von anderen Fehlern eine sinnvolle Warnung), sinnvollerweise direkt nach `checkReferences` (Zeile 41). `checkNoteLinks` in `structure.js` neben die anderen `check*`-Funktionen exportieren und in `index.js` zur Importliste aus `./structure.js` hinzufügen.

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/validate-links.test.js`
Expected: PASS, 4 Tests

- [ ] **Step 5: Volle Suite**

Run: `npx vitest run`
Expected: PASS. Achtung: `validateScene`-Signatur erweitert — bestehende Aufrufer nutzen den Default.

- [ ] **Step 6: Commit**

```bash
git add lib/validate/structure.js lib/validate/index.js tests/validate-links.test.js
git commit -m "feat: Validator warnt bei toten Notiz-Links"
```

---

### Task 4: Bild-Element und frame.image()

**Files:**
- Modify: `package.json` (Abhängigkeit), `lib/elements.js`, `lib/scene.js`
- Test: `tests/image-element.test.js`

**Interfaces:**
- Consumes: `elementId`, `seedFor`, `versionNonceFor`; `image-size`
- Produces:
  - `imageElement({ pfad, x, y, breite?, ordnung }): { element, embed }` in `lib/elements.js` — liest die Datei, berechnet SHA-1 (= `fileId`), liest die Maße, baut das `image`-Element, und liefert zusätzlich `embed = { fileId, dateiname, dataURL, mimeType }` für die Szene.
  - `f.image(pfad, { x, y, breite? })` in `lib/scene.js` — platziert das Bild frame-relativ, trägt den `embed` in die Embedded-Files-Sammlung der Szene ein, gibt das Element zurück.
  - Die Szene sammelt Embeds und exponiert sie: `s.embeddedFiles()` → `Map<fileId, embed>`.

`pfad` ist relativ zum Vault (`lib/config.js:VAULT_PATH`) oder absolut. Ohne `breite` wird eine Standardbreite genommen; die Höhe folgt immer dem echten Seitenverhältnis.

- [ ] **Step 1: Abhängigkeit und neutrales Testbild**

```bash
npm i -D image-size@2.0.2
```

Ein neutrales Test-PNG im Repo erzeugen (kein Vault-Bild — Datenschutz, Spec 2.5.1). Ein winziges, deterministisches Bild:

```bash
node -e '
const fs = require("fs");
// 2x2 rotes PNG, von Hand gesetzte Bytes (deterministisch, keine Personendaten)
const png = Buffer.from(
  "89504e470d0a1a0a0000000d494844520000000200000002080200000090777653" +
  "0000001849444154789c62f8cfc0f01f8c0c0c0c8c0c0c00003c00051f8d3b6f0000000049454e44ae426082",
  "hex");
fs.mkdirSync("tests/fixtures", { recursive: true });
fs.writeFileSync("tests/fixtures/testbild.png", png);
console.log("tests/fixtures/testbild.png:", png.length, "bytes");
'
```

Läuft dieser Byte-String nicht als gültiges PNG durch (image-size wirft), stattdessen mit einem minimalen PNG-Encoder oder dem `pngjs`-Paket ein 2×2-Bild erzeugen — Hauptsache klein, neutral, im Repo eingecheckt.

- [ ] **Step 2: Test schreiben**

```js
// tests/image-element.test.js
import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { scene } from "../lib/scene.js";
import { PROJECT_ROOT } from "../lib/config.js";

const BILD = path.join(PROJECT_ROOT, "tests", "fixtures", "testbild.png");
const SHA1 = crypto.createHash("sha1").update(fs.readFileSync(BILD)).digest("hex");

describe("frame.image", () => {
  it("baut ein image-Element mit SHA-1 als fileId", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const bild = f.image(BILD, { x: 100, y: 100, breite: 400 });
    expect(bild.element.type).toBe("image");
    expect(bild.element.fileId).toBe(SHA1);
    expect(bild.element.status).toBeDefined();
    expect(bild.element.scale).toEqual([1, 1]);
    expect(bild.element.crop).toBe(null);
  });

  it("übernimmt das Seitenverhältnis aus den echten Bildmaßen", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const bild = f.image(BILD, { x: 100, y: 100, breite: 400 });
    // testbild ist 2x2 (quadratisch) → Höhe = Breite
    expect(bild.element.height).toBeCloseTo(bild.element.width, 5);
  });

  it("trägt das Bild in die Embedded-Files-Sammlung ein", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.image(BILD, { x: 100, y: 100 });
    const embeds = s.embeddedFiles();
    expect(embeds.has(SHA1)).toBe(true);
    expect(embeds.get(SHA1).dataURL).toMatch(/^data:image\/png;base64,/);
  });

  it("ist deterministisch", () => {
    const baue = () => {
      const s = scene();
      const f = s.frame("K");
      f.image(BILD, { x: 0, y: 0, breite: 400 });
      return JSON.stringify(s.elements());
    };
    expect(baue()).toBe(baue());
  });
});
```

- [ ] **Step 3: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/image-element.test.js`
Expected: FAIL — `f.image is not a function`

- [ ] **Step 4: Implementieren**

`lib/elements.js` — `imageElement` (nutzt `basisFelder` für die Basisfelder):

```js
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { imageSize } from "image-size";

const STANDARD_BILDBREITE = 500;

export function imageElement({ pfad, x, y, breite, ordnung }) {
  const bytes = fs.readFileSync(pfad);
  const fileId = crypto.createHash("sha1").update(bytes).digest("hex");
  const { width: bw, height: bh } = imageSize(bytes);

  const w = breite ?? STANDARD_BILDBREITE;
  const h = Math.round((w * bh) / bw);
  const id = elementId(`image:${fileId}`, ordnung);
  const dateiname = path.basename(pfad);
  const mimeType = dateiname.toLowerCase().endsWith(".png") ? "image/png"
                 : dateiname.toLowerCase().match(/\.jpe?g$/) ? "image/jpeg" : "image/png";

  const element = {
    ...basisFelder({ id, seed: seedFor(id), versionNonce: versionNonceFor(id), x, y, width: w, height: h }),
    type: "image",
    strokeColor: "transparent",
    fileId,
    status: "saved",
    scale: [1, 1],
    crop: null,
  };

  const embed = {
    fileId, dateiname,
    dataURL: `data:${mimeType};base64,${bytes.toString("base64")}`,
    mimeType,
  };
  return { element, embed };
}
```

`lib/scene.js` — Bilder können **nicht** über den `hinzu`-Wrapper laufen (der erwartet ein einzelnes Element als Rückgabe und übergibt `inhalt`; `imageElement` gibt `{ element, embed }` und nimmt `pfad`). Daher eine eigene Methode. Achtung: das Frame-Element heißt innerhalb von `frame(...)` bereits `element` — die Kollision durch einen anderen Namen (`bild`) vermeiden.

```js
// In scene(), neben `const frames = []` / `const kinder = []`:
const embeds = new Map();

// In der frame(...)-Funktion: import imageElement oben ergänzen.
// Im zurückgegebenen Objekt-Literal (neben box/ellipse/diamond/text):
image: (pfad, opts = {}) => {
  const { element: bild, embed } = imageElement({
    pfad,
    x: posX + (opts.x ?? 0),
    y: posY + (opts.y ?? 0),
    breite: opts.breite,
    ordnung: ordnung++,
  });
  bild.frameId = element.id;        // `element` = das Frame-Element dieses Closures
  embeds.set(embed.fileId, embed);
  kinder.push(bild);
  return { element: bild, embed };
},

// In der Rückgabe von scene() (aktuell: { titel, frame, connect, sequence, elements, dimensions, registry }):
embeddedFiles: () => embeds,
```

`imageElement` in die bestehende Importzeile aus `./elements.js` aufnehmen. Der Test greift auf `bild.element` zu — die Methode gibt `{ element: bild, embed }` zurück, daher stimmt `f.image(...).element`.

- [ ] **Step 5: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/image-element.test.js`
Expected: PASS, 4 Tests

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tests/fixtures/testbild.png lib/elements.js lib/scene.js tests/image-element.test.js
git commit -m "feat: frame.image — Bild-Element mit SHA-1 und Bildmaßen"
```

---

### Task 5: files-Dualität und ## Embedded Files

**Files:**
- Modify: `lib/document.js`, `bin/render.mjs`, `bin/build.mjs`
- Test: `tests/document-images.test.js`

**Interfaces:**
- Consumes: `sceneToObject`, `sceneToMarkdown`, `s.embeddedFiles()`
- Produces:
  - `sceneToObject(szene, { pluginVersion?, mitBilddaten = false })` — bei `mitBilddaten` wird `files` aus `szene.embeddedFiles()` befüllt (`files[fileId] = { mimeType, id: fileId, dataURL, created: 1, lastRetrieved: 1 }`); sonst bleibt `files: {}`.
  - `sceneToMarkdown` schreibt `## Embedded Files` (`<fileId>: [[<dateiname>]]`) für jedes Embed; die geschriebene Datei behält `files: {}`.
  - Der Render-Pfad in `bin/render.mjs`/`bin/build.mjs` ruft `sceneToObject(..., { mitBilddaten: true })`.

**Der Kern (Spec 2.5.1):** Datei = `files: {}` + `## Embedded Files`; Render = `files` befüllt. Sonst zeigt der Renderer nur einen leeren Rahmen.

- [ ] **Step 1: Test schreiben**

```js
// tests/document-images.test.js
import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { scene } from "../lib/scene.js";
import { sceneToMarkdown, sceneToObject } from "../lib/document.js";
import { PROJECT_ROOT } from "../lib/config.js";

const BILD = path.join(PROJECT_ROOT, "tests", "fixtures", "testbild.png");
const SHA1 = crypto.createHash("sha1").update(fs.readFileSync(BILD)).digest("hex");

function baue() {
  const s = scene();
  const f = s.frame("Kapitel");
  f.image(BILD, { x: 100, y: 100, breite: 400 });
  return s;
}

describe("Bilder in Markdown und Render-Objekt", () => {
  it("schreibt ## Embedded Files mit fileId und Dateinamen", () => {
    const md = sceneToMarkdown(baue(), { pluginVersion: "2.23.12" });
    expect(md).toContain("## Embedded Files");
    expect(md).toContain(`${SHA1}: [[testbild.png]]`);
  });

  it("hält files der geschriebenen Datei leer", () => {
    const md = sceneToMarkdown(baue(), { pluginVersion: "2.23.12" });
    const json = JSON.parse(md.match(/```json\n([\s\S]*?)\n```/)[1]);
    expect(json.files).toEqual({});
  });

  it("befüllt files nur mit mitBilddaten für den Render-Pfad", () => {
    const obj = sceneToObject(baue(), { pluginVersion: "2.23.12", mitBilddaten: true });
    expect(obj.files[SHA1]).toBeDefined();
    expect(obj.files[SHA1].dataURL).toMatch(/^data:image\/png;base64,/);
    expect(obj.files[SHA1].id).toBe(SHA1);
  });

  it("lässt ## Embedded Files weg, wenn kein Bild da ist", () => {
    const s = scene();
    s.frame("K").box("X", { rolle: "kern", typo: "kernbegriff", x: 0, y: 0 });
    expect(sceneToMarkdown(s, { pluginVersion: "2.23.12" })).not.toContain("## Embedded Files");
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/document-images.test.js`
Expected: FAIL — Sektion fehlt, `mitBilddaten` unbekannt.

- [ ] **Step 3: Implementieren**

`lib/document.js`:
- `sceneToObject` um `mitBilddaten = false` erweitern. Bei `true` und vorhandenem `szene.embeddedFiles` das `files`-Objekt aus der Map bauen; sonst `files: {}`.
- `sceneToMarkdown`: nach der `## Element Links`-Sektion (und vor `%%`) die `## Embedded Files`-Sektion schreiben, wenn `szene.embeddedFiles()` nicht leer ist — je Embed `${fileId}: [[${dateiname}]]`. Die geschriebene Datei ruft `sceneToObject` **ohne** `mitBilddaten` (files bleibt `{}`).

`bin/render.mjs` und `bin/build.mjs`: wo das Szenen-Objekt für den Renderer entsteht, `sceneToObject(szene, { mitBilddaten: true })` verwenden, damit Bilder im Rendering erscheinen.

**Achtung Determinismus/Golden:** Golden-Renderings, die kein Bild enthalten, bleiben unverändert (`files: {}` wie bisher). Nur bildhaltige Szenen bekommen befüllte `files` im Render.

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/document-images.test.js`
Expected: PASS, 4 Tests

- [ ] **Step 5: Bestehende Serialisierungs- und Golden-Tests**

Run: `npx vitest run tests/document.test.js tests/roundtrip.test.js tests/golden-render.test.js`
Expected: PASS — bildfreie Szenen unverändert, Golden byte-identisch.

- [ ] **Step 6: Commit**

```bash
git add lib/document.js bin/render.mjs bin/build.mjs tests/document-images.test.js
git commit -m "feat: ## Embedded Files schreiben, files-Dualität für Bild-Rendering"
```

---

### Task 6: Bild-Validierung und Schema

**Files:**
- Modify: `lib/validate/structure.js`, `lib/validate/index.js`
- Test: `tests/validate-images.test.js`

**Interfaces:**
- Consumes: `createFindings`
- Produces:
  - `image` in `ZUSATZFELDER` (Schema kennt den Typ)
  - `checkImageRefs(elements, markdown, befunde, { vaultPath })` — für jedes `image`-Element: existiert die in `## Embedded Files` genannte Datei im Vault, und stimmt ihr SHA-1 mit dem `fileId` überein? **Harter Fehler** — ein fehlendes/verändertes Bild macht die Datei kaputt.

- [ ] **Step 1: Test schreiben**

```js
// tests/validate-images.test.js
import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createFindings } from "../lib/validate/findings.js";
import { checkImageRefs } from "../lib/validate/structure.js";
import { scene } from "../lib/scene.js";
import { sceneToMarkdown } from "../lib/document.js";
import { PROJECT_ROOT } from "../lib/config.js";

const BILD = path.join(PROJECT_ROOT, "tests", "fixtures", "testbild.png");
// Der Vault für den Test ist der Ordner, in dem testbild.png liegt.
const VAULT = path.join(PROJECT_ROOT, "tests", "fixtures");
const SHA1 = crypto.createHash("sha1").update(fs.readFileSync(BILD)).digest("hex");

function baue() {
  const s = scene();
  const f = s.frame("Kapitel");
  f.image(BILD, { x: 100, y: 100, breite: 400 });
  return s;
}

function pruefe(elemente, markdown, vaultPath = VAULT) {
  const b = createFindings();
  checkImageRefs(elemente, markdown, b, { vaultPath });
  return b.all();
}

describe("checkImageRefs", () => {
  it("akzeptiert ein Bild, dessen Datei existiert und dessen SHA-1 stimmt", () => {
    const s = baue();
    expect(pruefe(s.elements(), sceneToMarkdown(s, { pluginVersion: "x" }))).toEqual([]);
  });

  it("meldet ein fehlendes Bild als harten Fehler", () => {
    const s = baue();
    const md = sceneToMarkdown(s, { pluginVersion: "x" }).replace("testbild.png", "gibtsnicht.png");
    const befunde = pruefe(s.elements(), md);
    expect(befunde.some((b) => b.regel === "bildreferenz" && b.schwere === "fehler")).toBe(true);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/validate-images.test.js`
Expected: FAIL — `checkImageRefs is not a function`

- [ ] **Step 3: Implementieren**

`lib/validate/structure.js`:
- `image: ["fileId", "status", "scale", "crop"]` in `ZUSATZFELDER` (→ automatisch in `ERLAUBTE_TYPEN` und `detectOutOfScope`). Die Basis-/Geometriefelder und `KONVENTIONSFELDER` (`frameId`, `index`, `link`) bringt das Bild-Element über `basisFelder` bzw. `frame.image` (setzt `frameId`) mit; `ZUSATZKONVENTIONSFELDER` braucht keinen `image`-Eintrag (die dortigen `autoResize`/`hasTextLink` gelten nur für Text).
- `checkImageRefs`: aus dem Markdown die `## Embedded Files`-Zuordnung `fileId → dateiname` lesen (über `markdownToScene(markdown).sektionen.embeddedFiles`). Für jedes `image`-Element: den Dateinamen zum `fileId` finden, die Datei im Vault suchen, ihren SHA-1 berechnen und mit `fileId` vergleichen.

```js
export function checkImageRefs(elemente, markdown, befunde, { vaultPath }) {
  const zuordnung = markdownToScene(markdown).sektionen.embeddedFiles; // { fileId: "[[name.png]]" }
  for (const el of elemente) {
    if (el.type !== "image") continue;
    const eintrag = zuordnung[el.fileId];
    if (!eintrag) {
      befunde.error("bildreferenz", `Bild-Element hat keine Entsprechung in ## Embedded Files`, el.id);
      continue;
    }
    const name = eintrag.replace(/^\[\[/, "").replace(/\]\]$/, "");
    const pfad = dateiImVaultFinden(name, vaultPath);   // rekursiv wie bei notizExistiert
    if (!pfad) {
      befunde.error("bildreferenz", `Bilddatei „${name}" existiert nicht im Vault`, el.id);
      continue;
    }
    const sha1 = crypto.createHash("sha1").update(fs.readFileSync(pfad)).digest("hex");
    if (sha1 !== el.fileId) {
      befunde.error("bildreferenz", `SHA-1 von „${name}" stimmt nicht mit fileId überein`, el.id);
    }
  }
}
```

`dateiImVaultFinden(name, vaultPath)` gibt den vollen Pfad zurück oder `null` — rekursive Suche wie `notizExistiert` aus Task 3, aber mit exaktem Dateinamen (inkl. Endung) und Rückgabe des Pfads. Beide teilen sinnvoll einen Helfer.

In `lib/validate/index.js` `checkImageRefs` bei den harten Strukturprüfungen einhängen (braucht `markdown` und `vaultPath` — beide hat `validateScene` bereits bzw. nach Task 3).

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/validate-images.test.js`
Expected: PASS, 2 Tests

- [ ] **Step 5: Volle Suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/validate/structure.js lib/validate/index.js tests/validate-images.test.js
git commit -m "feat: Validator prüft Bild-Referenzen (Datei existiert, SHA-1 stimmt)"
```

---

### Task 7: Transklusion

**Files:**
- Modify: `lib/elements.js`, `lib/scene.js`
- Test: `tests/transclusion.test.js`

**Interfaces:**
- Consumes: `textElement`
- Produces: `f.transclusion("[[Notiz#Abschnitt]]", { x, y, breite })` — ein Textelement, dessen `rawText` der Transklusionsverweis ist. `text`/`originalText` = derselbe Verweis (Obsidian löst ihn beim Öffnen auf). Rückgabe: das Textelement.

**Bekannte Einschränkung (Spec 7):** Die Höhe hängt vom transkludierten Inhalt ab, der beim Bauen unbekannt ist. Der Builder reserviert einen Platzhalterbereich nach der `breite`-Angabe; beim ersten Öffnen in Obsidian kann er nachrutschen. **Regel im Kommentar und in der `muster.md`:** Transklusionen erhalten einen eigenen Frame-Bereich, nie mitten in dichter Komposition.

- [ ] **Step 1: Test schreiben**

```js
// tests/transclusion.test.js
import { describe, it, expect } from "vitest";
import { scene } from "../lib/scene.js";
import { sceneToMarkdown } from "../lib/document.js";

describe("frame.transclusion", () => {
  it("erzeugt ein Textelement mit dem Verweis als rawText", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const t = f.transclusion("[[Mängelwesen#Definition]]", { x: 100, y: 100, breite: 600 });
    expect(t.type).toBe("text");
    expect(t.rawText).toBe("[[Mängelwesen#Definition]]");
    expect(t.originalText).toBe("[[Mängelwesen#Definition]]");
  });

  it("erscheint in der ## Text Elements-Sektion", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const t = f.transclusion("[[N#A]]", { x: 100, y: 100, breite: 600 });
    const md = sceneToMarkdown(s, { pluginVersion: "x" });
    expect(md).toContain(`[[N#A]] ^${t.id}`);
  });

  it("bleibt deterministisch", () => {
    const baue = () => {
      const s = scene();
      s.frame("K").transclusion("[[N#A]]", { x: 0, y: 0, breite: 600 });
      return JSON.stringify(s.elements());
    };
    expect(baue()).toBe(baue());
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run tests/transclusion.test.js`
Expected: FAIL — `f.transclusion is not a function`

- [ ] **Step 3: Implementieren**

`lib/scene.js` — `frame.transclusion` ergänzen. Es baut ein `textElement` mit `inhalt` = dem Verweis, `typo: "standard"`, an der frame-relativen Position, und reiht es wie andere Kinder ein. Der Verweis landet als `rawText`/`originalText`/`text` (der bestehende `textElement`-Bau setzt alle drei aus `inhalt`).

```js
// Im zurückgegebenen Objekt-Literal von frame(...), neben box/ellipse/diamond/text/image:
transclusion: (verweis, opts = {}) => {
  const t = textElement(
    { inhalt: verweis, typo: opts.typo ?? "standard",
      x: posX + (opts.x ?? 0), y: posY + (opts.y ?? 0),
      maxBreite: opts.breite, ordnung: ordnung++ },
    registry,
  );
  t.frameId = element.id;   // `element` = das Frame-Element dieses Closures
  kinder.push(t);
  return t;
},
```

`textElement` ist bereits aus `./elements.js` importiert (wird für `f.text` genutzt).

Weil `textElement` bei gesetztem `maxBreite` umbricht, wird der Verweis selbst umbrochen dargestellt — das ist akzeptabel; in Obsidian ersetzt die Transklusion den Text ohnehin. Die Höhe bleibt die des Verweistexts (Platzhalter); die bekannte Einschränkung greift.

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx vitest run tests/transclusion.test.js`
Expected: PASS, 3 Tests

- [ ] **Step 5: Volle Suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/elements.js lib/scene.js tests/transclusion.test.js
git commit -m "feat: frame.transclusion für Notiz-Abschnitte"
```

---

### Task 8: Golden-Referenz mit Bild und Link

**Files:**
- Create: `tests/golden/bild-und-link.mjs`, `tests/golden/bild-und-link.png` (generiert)
- Modify: keine Produktionsdatei

**Interfaces:**
- Consumes: `scene`, `f.image`, `link`, der Renderer
- Produces: eine Golden-Referenzszene, die ein eingebettetes Bild und einen verlinkten Kasten abdeckt — mit dem **neutralen** `tests/fixtures/testbild.png`, nie einem Vault-Bild.

- [ ] **Step 1: Referenzszene schreiben**

```js
// tests/golden/bild-und-link.mjs
// Deckt ein eingebettetes Bild und einen Notiz-Link ab. Neutrales Testbild.
import path from "node:path";
import { scene } from "../../lib/scene.js";
import { PROJECT_ROOT } from "../../lib/config.js";

const s = scene();
const f = s.frame("Bild und Link");
f.text("Anschauungsmaterial", { typo: "frametitel", x: 60, y: 55 });
f.box("Zur Vertiefung", { rolle: "kern", typo: "kernbegriff", x: 120, y: 300, link: "[[Vertiefungsnotiz]]" });
f.image(path.join(PROJECT_ROOT, "tests", "fixtures", "testbild.png"), { x: 700, y: 300, breite: 300 });

export default s;
```

- [ ] **Step 2: Referenzbild erzeugen**

```bash
npm run update-golden
```

Der Golden-Generator und -Test müssen den Render-Pfad **mit Bilddaten** nutzen (`sceneToObject(..., { mitBilddaten: true })`), sonst erscheint das Bild als leerer Rahmen. Prüfen, dass `scripts/update-golden.mjs` und `tests/golden-render.test.js` diesen Pfad verwenden — falls sie `sceneToObject` ohne `mitBilddaten` aufrufen, dort ergänzen (das ist die Render-Variante).

- [ ] **Step 3: Das Bild ansehen**

`tests/golden/bild-und-link.png` öffnen und prüfen: Das neutrale Testbild erscheint (kein leerer Rahmen), der verlinkte Kasten ist normal gezeichnet (der Link ist im Bild nicht sichtbar, aber in Obsidian klickbar), Titel korrekt.

- [ ] **Step 4: Golden-Test**

Run: `npx vitest run tests/golden-render.test.js`
Expected: PASS — die neue Szene byte-identisch. Schlägt der Vergleich fehl, weil das Bild fehlt, nutzt der Golden-Pfad noch nicht `mitBilddaten` — in Step 2 beheben.

- [ ] **Step 5: Bild versioniert?**

Run: `git ls-files tests/golden/bild-und-link.png tests/fixtures/testbild.png`
Expected: beide gelistet.

- [ ] **Step 6: Commit**

```bash
git add tests/golden/bild-und-link.mjs tests/golden/bild-und-link.png
git commit -m "feat: Golden-Referenz mit eingebettetem Bild und Notiz-Link"
```

---

## Abschluss der Stufe 3c

Nach Task 8 gilt:

- Formen tragen klickbare Notiz-Links (`{ link: "[[…]]" }`), geschrieben als `## Element Links`; der Validator warnt bei toten Links.
- Vault-Bilder werden eingebettet (`f.image(...)`), geschrieben als `## Embedded Files` mit `files: {}`, und **im Renderer sichtbar** (files-Dualität); der Validator prüft Existenz und SHA-1 hart.
- Notiz-Abschnitte lassen sich transkludieren (`f.transclusion(...)`), mit der bekannten Höhen-Einschränkung.

**Noch offen (Stufe 4):** Mengenkreise, Dreieck, Programmablaufplan; das `line`-Primitiv / der `tabelle`-Helfer mit Trennlinien (aus dem Praxistest); Erweiterung der `SKILL.md`-Referenzen um die neuen Features; Aufräumarbeiten in der Vault-`CLAUDE.md` (der `ob sync`-Abschnitt).
