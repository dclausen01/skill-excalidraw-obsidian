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
