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
 * Die Subsets einer Familie können sich überschneiden (bei Nunito ist das der Fall,
 * bei Excalifont nicht) — die Zuordnung ist also nicht von vornherein eindeutig.
 * Für einen überlappenden Codepoint wird verlangt, dass alle beteiligten Subsets
 * dieselbe advanceWidth liefern; sonst würde das Ergebnis vom Dateisystem abhängen.
 * Das wird beim Laden geprüft — bei Abweichung wirft loadFontRegistry sofort, statt
 * still ein Subset zu wählen. Stimmen die Breiten überein, gewinnt deterministisch
 * das alphabetisch erste Subset; dafür wird die Dateiliste sortiert, denn
 * fs.readdirSync liefert laut POSIX keine garantierte Reihenfolge.
 */
export function loadFontRegistry(dir = FONT_DIR) {
  const proFamilie = new Map();

  for (const [familie, praefix] of Object.entries(DATEIPRAEFIX)) {
    const ff = Number(familie);
    const zeichenKarte = new Map();
    let unitsPerEm = null;

    const dateien = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(praefix) && f.endsWith(".woff2"))
      .sort();
    if (dateien.length === 0) throw new Error(`Keine Subsets für fontFamily ${ff} in ${dir}`);

    for (const datei of dateien) {
      const font = fontkit.openSync(path.join(dir, datei));
      unitsPerEm ??= font.unitsPerEm;
      for (const codepoint of font.characterSet) {
        const vorhandenerFont = zeichenKarte.get(codepoint);
        if (!vorhandenerFont) {
          zeichenKarte.set(codepoint, font);
          continue;
        }
        const vorherigeBreite = vorhandenerFont.glyphForCodePoint(codepoint).advanceWidth;
        const neueBreite = font.glyphForCodePoint(codepoint).advanceWidth;
        if (vorherigeBreite !== neueBreite) {
          const zeichen = String.fromCodePoint(codepoint);
          throw new Error(
            `Zeichen "${zeichen}" (U+${codepoint.toString(16)}) hat in überlappenden Subsets von fontFamily ${ff} ` +
              `unterschiedliche advanceWidth (${vorherigeBreite} vs. ${neueBreite}, Datei ${datei})`,
          );
        }
        // Gleiche advanceWidth: bleibt beim zuerst gesetzten (alphabetisch ersten) Subset.
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
      if (!eintrag) throw new Error(`Unbekannte fontFamily ${fontFamily} — erzeugt werden nur 5 und 6`);
      return eintrag.unitsPerEm;
    },
  };
}
