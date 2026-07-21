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
