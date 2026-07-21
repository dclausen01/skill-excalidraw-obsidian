import { FARBROLLEN, TYPO, STRICH, FRAME_BREITE, FRAME_HOEHE } from "./style.js";
import { measureText, BOUND_TEXT_PADDING } from "./text.js";
import { LINE_HEIGHT } from "./fonts.js";
import { elementId, seedFor, versionNonceFor } from "./ids.js";

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
    ...basisFelder({ id, seed: seedFor(id), versionNonce: versionNonceFor(id), x, y, width: breite, height: hoehe }),
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
      seed: seedFor(containerId),
      versionNonce: versionNonceFor(containerId),
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
    ...basisFelder({ id, seed: seedFor(id), versionNonce: versionNonceFor(id), x, y, width: breite, height: hoehe }),
    type: "frame",
    name,
    strokeColor: "#bbb",
    backgroundColor: "transparent",
  };
}
