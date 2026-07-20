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
