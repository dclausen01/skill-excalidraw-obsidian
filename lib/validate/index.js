import { createFindings, SCHWERE } from "./findings.js";
import { checkSchema, checkReferences, checkTextIndex, checkArrowBindings, checkNoteLinks, detectOutOfScope } from "./structure.js";
import { checkGeometry, checkTextFit, checkLegibility } from "./layout.js";
import { loadFontRegistry } from "../fonts.js";
import { VAULT_PATH } from "../config.js";

export { SCHWERE } from "./findings.js";

/**
 * Prüft eine Szene. Harte Fehler setzen ok auf false — dann wird nichts in den
 * Vault geschrieben. Warnungen werden gemeldet, blockieren aber nicht; über sie
 * entscheidet das Modell beim Ansehen des Renderings.
 *
 * markdown ist optional: nur damit lässt sich der Obsidian-Textindex abgleichen.
 *
 * ausserhalbDesSkills im Ergebnis ist null für Szenen, die ausschließlich aus
 * Elementtypen/Schriften bestehen, die dieser Skill selbst erzeugt, UND deren
 * Elemente alle Konventionsfelder tragen, die dieser Skill immer setzt; sonst
 * `{ fremdeTypen, fremdeSchriften, fehlendeKonventionsfelder }` (siehe
 * detectOutOfScope in structure.js — Konventionsfelder sind ein zusätzliches
 * Provenienzsignal neben Typ/Schrift, siehe dort für die Herleitung, Task-7-
 * Report, Schlussprüfung, Finding D). Für solche Szenen werden Geometrie-, Textpassungs- und Lesbarkeitsprüfung
 * übersprungen: Sie kodieren Stilkonventionen DIESES Skills (Abstandsraster aus
 * lib/style.js ABSTAND, Innenpolster BOUND_TEXT_PADDING, Mindestschriftgröße
 * LESBARKEIT_MIN) — für fremde Boards sind sie nicht nur bedeutungslos, die
 * Textpassungsprüfung würde für nicht erzeugte Schriften sogar hart abstürzen
 * (measureText/registry kennen nur fontFamily 5 und 6, siehe lib/fonts.js
 * covers()/fontFor()). Schema, Referenzen und Textindex bleiben aktiv: sie
 * prüfen formatweite Eigenschaften (Pflichtfelder, Bindungen, Obsidian-Index),
 * keine Stilkonventionen, und laufen gefahrlos auch auf fremdem Inhalt — ihre
 * Befunde sind für solche Dateien einfach erwartbar (Fix-Durchgang 1,
 * Task-7-Report, Finding 1).
 */
export function validateScene(elemente, { markdown = null, registry = loadFontRegistry(), zoomL0 = 1, vaultPath = VAULT_PATH } = {}) {
  const befunde = createFindings();
  const fremdesVorkommen = detectOutOfScope(elemente);
  const istFremd = fremdesVorkommen.fremdeTypen.length > 0
    || fremdesVorkommen.fremdeSchriften.length > 0
    || fremdesVorkommen.fehlendeKonventionsfelder.length > 0;

  checkSchema(elemente, befunde);
  checkReferences(elemente, befunde);
  // Unbedingt, auch wenn schon andere Fehler vorliegen: ein toter Notiz-Link
  // ist eine eigenständig sinnvolle Warnung, unabhängig vom Rest der Prüfung.
  checkNoteLinks(elemente, befunde, { vaultPath });
  checkArrowBindings(elemente, befunde);
  if (markdown !== null) checkTextIndex(elemente, markdown, befunde);

  // Die weiche Prüfschicht (Geometrie/Textpassung/Lesbarkeit) läuft nur, wenn bis
  // hierhin kein harter Fehler vorliegt — nicht nur, wenn die Szene nicht fremd ist.
  // Zwei unabhängige Gründe: (1) Warnungen über die Geometrie einer strukturell
  // kaputten Szene (fehlende Pflichtfelder, doppelte IDs, kaputte Bindungen) sind
  // nie handlungsleitend — wer einen harten Fehler beheben muss, braucht keine
  // Meldung über einen zu geringen Frame-Abstand daneben. (2) checkTextFit ruft
  // über measureText()/wrapText() (lib/text.js) text.split("\n") auf einem Feld
  // auf, dessen Existenz nur checkSchema erzwingt (originalText) — fehlt es, wirft
  // wrapText eine TypeError, die den bereits von checkSchema aufgenommenen Befund
  // mitsamt der gesamten Exception verwirft, statt Befunde zu liefern. Dasselbe
  // Muster wie schon bei fremden Schriften (Fix-Durchgang 1, Finding 1), nur ohne
  // dass die Szene selbst fremd sein muss: irgendein hartes strukturelles Problem
  // genügt (Schlussprüfung, Finding A).
  if (!istFremd && !befunde.hasErrors()) {
    checkGeometry(elemente, befunde);
    checkTextFit(elemente, registry, befunde);
    checkLegibility(elemente, zoomL0, befunde);
  }

  return {
    ok: !befunde.hasErrors(),
    findings: befunde.all(),
    ausserhalbDesSkills: istFremd ? fremdesVorkommen : null,
  };
}

/** Wie viele Element-IDs pro Sammelzeile höchstens genannt werden. */
const MAX_GEZEIGTE_IDS = 3;

/**
 * Fasst Befunde mit gleicher regel+meldung zu einer Zeile zusammen. Ein reales
 * Board erzeugte 18 wortgleiche "[schema] ... arrow"-Zeilen — für drei Funde ist
 * eine Zeile pro Fund lesbar, für dreißig nicht mehr (Fix-Durchgang 1,
 * Task-7-Report, Finding 2).
 *
 * Einzelfunde (Gruppengröße 1 — der Regelfall in den bisherigen Tests) sehen
 * dabei byte-identisch aus wie vor der Gruppierung; erst ab dem zweiten
 * gleichlautenden Fund ändert sich das Format. Gruppiert wird nach
 * Erstauftritt (Map bewahrt Einfügereihenfolge), nicht alphabetisch — die
 * Ausgabe bleibt so deterministisch, weil createFindings() Aufnahmereihenfolge
 * garantiert und dieselbe Eingabe dieselbe Reihenfolge ergibt.
 */
function gruppiereZeilen(befunde) {
  const gruppen = new Map();

  for (const b of befunde) {
    const schluessel = `${b.regel}::${b.meldung}`;
    if (!gruppen.has(schluessel)) gruppen.set(schluessel, { regel: b.regel, meldung: b.meldung, ids: [] });
    gruppen.get(schluessel).ids.push(b.elementId);
  }

  return [...gruppen.values()].map(({ regel, meldung, ids }) => {
    if (ids.length === 1) {
      return `  [${regel}]${ids[0] ? ` ${ids[0]}` : ""}: ${meldung}`;
    }

    const bekannteIds = ids.filter((id) => id);
    const gezeigt = bekannteIds.slice(0, MAX_GEZEIGTE_IDS);
    const rest = bekannteIds.length - gezeigt.length;
    const idHinweis = gezeigt.length > 0 ? ` (u. a. ${gezeigt.join(", ")}${rest > 0 ? `, +${rest} weitere` : ""})` : "";

    return `  [${regel}] ${ids.length}×${idHinweis}: ${meldung}`;
  });
}

/** Lesbare Ausgabe für die Kommandozeile und für das Modell. */
export function formatFindings(befunde) {
  if (befunde.length === 0) return "Keine Befunde.";

  const fehler = befunde.filter((b) => b.schwere === SCHWERE.fehler);
  const warnungen = befunde.filter((b) => b.schwere === SCHWERE.warnung);

  const teile = [];

  if (fehler.length > 0) teile.push(`${fehler.length} Fehler:`, ...gruppiereZeilen(fehler));
  if (warnungen.length > 0) teile.push(`${warnungen.length} Warnungen:`, ...gruppiereZeilen(warnungen));

  return teile.join("\n");
}
