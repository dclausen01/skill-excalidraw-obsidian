import fs from "node:fs";
import path from "node:path";
import { extractDrawing } from "../lib/compress.js";
import { VAULT_PATH, PROJECT_ROOT } from "../lib/config.js";

const ZIEL = path.join(PROJECT_ROOT, "tests", "fixtures", "text-metrics.json");
const ERZEUGTE_SCHRIFTEN = new Set([5, 6]);

/**
 * Toleranz dafür, wann zwei im Vault beobachtete Breiten für denselben
 * (fontFamily, fontSize, text)-Schlüssel als "gleich" gelten. Echte
 * Wiederholungsmessungen desselben Textes sind im Vault bit-identisch
 * (Differenz 0 — JSON-Rundtrip von Fließkommazahlen ist verlustfrei).
 * Widersprüchliche Proben unterscheiden sich dagegen deutlich (kleinste
 * beobachtete Differenz: ~1.48 px bei "Ja"/fontSize 20). 0.01 px liegt weit
 * unter jedem echten Widerspruch und weit über jeder denkbaren Rundungsdrift.
 */
const BREITEN_EPSILON = 0.01;

function* excalidrawDateien(dir) {
  // Sortiert, denn fs.readdirSync garantiert laut POSIX keine Reihenfolge —
  // ohne Sortierung wäre weder die Zuordnungsreihenfolge noch (über die
  // Konfliktschlüssel-Erkennung hinaus) die Fixture reproduzierbar. Bewusst
  // plain .sort() (ordinal, lokal-unabhängig) statt localeCompare(): Der
  // Vault enthält Dateinamen wie "Präsentation Elternabend.excalidraw.md"
  // oder "Überblick...", die unter deutscher vs. ordinaler Kollation
  // unterschiedlich sortieren würden — mit localeCompare hinge die
  // Traversierungsreihenfolge und damit der Byteinhalt der Fixture vom
  // Default-Intl-Locale der ausführenden Maschine ab. Gleiches Vorgehen wie
  // in lib/fonts.js:loadFontRegistry (dort ebenfalls plain .sort()).
  const eintraege = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const eintrag of eintraege) {
    if (eintrag.name.startsWith(".")) continue;
    const p = path.join(dir, eintrag.name);
    if (eintrag.isDirectory()) yield* excalidrawDateien(p);
    else if (eintrag.name.endsWith(".excalidraw.md")) yield p;
  }
}

// Erst alle Kandidaten pro Schlüssel sammeln (nicht sofort deduplizieren) —
// nur so lassen sich widersprüchliche Referenzwerte für denselben Schlüssel
// überhaupt erkennen, statt den erstgefundenen Wert blind zu übernehmen.
const kandidatenProSchluessel = new Map();
let dateienOk = 0;
let dateienUebersprungen = 0;
let hoehenfehler = 0;
let autoResizeFalseUebersprungen = 0;

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

    // autoResize: false → die Box wurde vom Nutzer manuell in der Breite
    // gezogen. `width` ist dann die Boxbreite, keine gemessene Textbreite —
    // beide Größen sind schlicht unabhängig voneinander (im Vault beobachtete
    // Differenzen: 10–110 px). Strukturelle Eigenschaft des Quellelements,
    // nicht erst am Messergebnis erkennbar.
    if (el.autoResize === false) {
      autoResizeFalseUebersprungen++;
      continue;
    }

    const schluessel = `${el.fontFamily}|${el.fontSize}|${el.text}`;
    let kandidat = kandidatenProSchluessel.get(schluessel);
    if (!kandidat) {
      kandidat = {
        text: el.text,
        fontFamily: el.fontFamily,
        fontSize: el.fontSize,
        lineHeight: el.lineHeight,
        zeilen,
        breiten: [],
      };
      kandidatenProSchluessel.set(schluessel, kandidat);
    }
    kandidat.breiten.push(el.width);
  }
}

const proben = [];
let widerspruechlicheSchluessel = 0;
for (const kandidat of kandidatenProSchluessel.values()) {
  const min = Math.min(...kandidat.breiten);
  const max = Math.max(...kandidat.breiten);
  if (max - min > BREITEN_EPSILON) {
    // Der Vault enthält für exakt diesen (fontFamily, fontSize, text)-Schlüssel
    // mehrere, sich widersprechende Breiten (z. B. unterschiedliche Excalidraw-/
    // Font-Stände zum Renderzeitpunkt). Ohne eindeutigen wahren Referenzwert ist
    // der Schlüssel als Prüfgrundlage untauglich — deterministisch verworfen,
    // nicht willkürlich der erstgefundene Wert genommen.
    widerspruechlicheSchluessel++;
    continue;
  }
  proben.push({
    text: kandidat.text,
    fontFamily: kandidat.fontFamily,
    fontSize: kandidat.fontSize,
    width: kandidat.breiten[0],
    lineHeight: kandidat.lineHeight,
    zeilen: kandidat.zeilen,
  });
}

fs.mkdirSync(path.dirname(ZIEL), { recursive: true });
fs.writeFileSync(ZIEL, JSON.stringify({ erzeugt: new Date().toISOString(), proben }, null, 2));

const proSchrift = (ff) => proben.filter((p) => p.fontFamily === ff).length;
console.log(`Dateien gelesen: ${dateienOk}, übersprungen: ${dateienUebersprungen}`);
console.log(`Höhenformel verletzt: ${hoehenfehler}`);
console.log(`autoResize:false übersprungen: ${autoResizeFalseUebersprungen}`);
console.log(`Widersprüchliche Schlüssel verworfen: ${widerspruechlicheSchluessel}`);
console.log(`Proben: ${proben.length} (Excalifont ${proSchrift(5)}, Nunito ${proSchrift(6)})`);
console.log(`Geschrieben nach ${ZIEL}`);
