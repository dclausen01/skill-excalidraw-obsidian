import { FARBROLLEN, TYPO, STRICH, FRAME_BREITE, FRAME_HOEHE, FRAME_STRICH } from "./style.js";
import { measureText, BOUND_TEXT_PADDING } from "./text.js";
import { LINE_HEIGHT } from "./fonts.js";
import { elementId, seedFor, versionNonceFor } from "./ids.js";

/** Felder, die jedes Excalidraw-Element führt. */
function basisFelder({ id, seed, versionNonce, x, y, width, height }) {
  return {
    id, x, y, width, height,
    angle: 0,
    strokeColor: FARBROLLEN.neutral.strich,
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
  // Eigener Namensraum wie bei Containern (elementId(`${type}:...`, ordnung)) und
  // Frames (elementId(`frame:...`, ordnung)) — sonst könnten eigenständiger Text
  // und gebundener Text bei gleichem Inhalt und gleicher Ordnungszahl kollidieren.
  // Gebundener Text hängt zusätzlich an containerId (die selbst schon typ-präfigiert
  // ist), damit auch gebundener Text zweier verschiedener Formtypen mit gleichem
  // Inhalt und gleicher Ordnungszahl nicht kollidiert (Fix-Durchgang 1, Review-Finding 2).
  const id = containerId ? elementId(`text:${containerId}`, ordnung) : elementId(`text:${inhalt}`, ordnung);
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
  // Vor jedem Zugriff auf TYPO[typo] prüfen, sonst gewinnt beim nächsten Schritt
  // (roh via TYPO[typo].fontFamily) ein TypeError statt der verständlichen
  // Meldung, die textElement für denselben Fall wirft (Fix-Durchgang 1, Minor Finding).
  if (!TYPO[typo]) {
    throw new Error(`Unbekannte Typo-Rolle "${typo}" — erlaubt: ${Object.keys(TYPO).join(", ")}`);
  }
  const farben = FARBROLLEN[rolle];
  const { fontFamily, groesse } = TYPO[typo];

  const containerId = elementId(`${type}:${inhalt}`, ordnung);

  // Ohne vorgegebene Breite wächst der Container um den unumbrochenen Text herum,
  // und die spätere maxBreite (aus w abgeleitet) ist dadurch immer geräumig genug,
  // um denselben unumbrochenen Umbruch zu reproduzieren.
  //
  // Mit vorgegebener Breite ist die Innenbreite dagegen von vornherein fest, und
  // der gebundene Text kann in mehr Zeilen umbrechen, als eine unumbrochene Messung
  // vermuten lässt. Die automatische Höhen-Fallback muss deshalb auf derselben
  // Zeilenaufteilung beruhen, die der tatsächlich gebundene Text bekommt — sonst
  // schließt der Container den Text nicht ein (Fix-Durchgang 1, Review-Finding 1:
  // 200×60-Container um 259px hohen, 8-zeiligen Text bei nur ~2 vermuteten Zeilen).
  const natuerlich = measureText(inhalt, { fontFamily, fontSize: groesse }, registry);
  const w = breite ?? Math.ceil((natuerlich.breite + 4 * BOUND_TEXT_PADDING) / 20) * 20;
  const umbrochen = breite !== undefined
    ? measureText(inhalt, { fontFamily, fontSize: groesse, maxBreite: w - 2 * BOUND_TEXT_PADDING }, registry)
    : natuerlich;
  const h = hoehe ?? Math.ceil((umbrochen.hoehe + 4 * BOUND_TEXT_PADDING) / 20) * 20;

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
    strokeColor: FRAME_STRICH,
    backgroundColor: "transparent",
  };
}
