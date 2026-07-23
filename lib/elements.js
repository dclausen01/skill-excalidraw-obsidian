import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { imageSize } from "image-size";
import { FARBROLLEN, TYPO, STRICH, FRAME_BREITE, FRAME_HOEHE, FRAME_STRICH } from "./style.js";
import { measureText, BOUND_TEXT_PADDING } from "./text.js";
import { LINE_HEIGHT } from "./fonts.js";
import { elementId, seedFor, versionNonceFor } from "./ids.js";
import { VAULT_PATH } from "./config.js";

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

const SQRT2 = Math.SQRT2;

/**
 * Tatsächliche Innenbreite/-höhe, die gebundener Text je Formtyp bei gegebener
 * Containergröße zur Verfügung hat. Rechteck: containerDimension - 2·Padding.
 * Ellipse und Raute haben eine kleinere einbeschriebene Fläche als ihre
 * Bounding-Box, deshalb die zusätzlichen Faktoren 1/√2 bzw. 1/2.
 *
 * Quelle (gegen die installierte Paketversion verifiziert, nicht nur behauptet):
 * @excalidraw/excalidraw, node_modules/@excalidraw/excalidraw/dist/dev/chunk-*.js,
 * Funktionen getBoundTextMaxWidth/getBoundTextMaxHeight (element/textElement.ts):
 *   ellipse:  Math.round(width / 2 * Math.sqrt(2)) - BOUND_TEXT_PADDING * 2
 *   diamond:  Math.round(width / 2) - BOUND_TEXT_PADDING * 2
 *   rectangle: width - BOUND_TEXT_PADDING * 2
 * (jeweils analog für height statt width). Diese Funktionen wenden Breite und
 * Höhe unabhängig voneinander an — Excalidraws eigenes Modell koppelt die
 * beiden Achsen nicht, anders als eine geometrisch exakte größte einbeschriebene
 * Rechtecksfläche es täte. Wir bilden bewusst dasselbe (vereinfachte) Modell
 * nach, nicht die geometrisch exaktere Variante — nur so berechnet Excalidraw
 * beim Öffnen der Datei dieselbe Größe, die wir bereits geschrieben haben.
 */
export function innerDimension(containerDimension, type) {
  if (type === "ellipse") return Math.round((containerDimension / 2) * SQRT2) - 2 * BOUND_TEXT_PADDING;
  if (type === "diamond") return Math.round(containerDimension / 2) - 2 * BOUND_TEXT_PADDING;
  return containerDimension - 2 * BOUND_TEXT_PADDING;
}

/**
 * Umkehrung von innerDimension: kleinste Containergröße, deren Innenmaß eine
 * gegebene Textgröße noch aufnimmt. Quelle (dieselbe Datei wie oben): Funktion
 * computeContainerDimensionForBoundText —
 *   ellipse:  Math.round((dimension + padding) / Math.sqrt(2) * 2)
 *   diamond:  2 * (dimension + padding)
 *   rectangle/generisch: dimension + padding
 * mit padding = BOUND_TEXT_PADDING * 2 und dimension = Math.ceil(textDimension).
 * Excalidraw ruft genau diese Funktion selbst auf, wenn ein Container um
 * gebundenen Text wachsen muss (z. B. beim Tippen); wir verwenden sie hier beim
 * Erststellen, damit unsere Maße mit dem übereinstimmen, was Excalidraw beim
 * Öffnen der Datei selbst berechnen würde — kein Relayout, keine Divergenz von
 * unseren deterministischen Bytes (Schlussprüfung, Finding 1).
 *
 * Für Rechtecke wird diese Funktion NICHT verwendet — dafür gilt weiterhin die
 * bestehende, großzügigere 20er-Schritt-Heuristik aus Fix-Durchgang 1 (siehe
 * formElement), die unverändert bleibt.
 */
function containerDimensionFor(textDimension, type) {
  const dimension = Math.ceil(textDimension);
  const padding = 2 * BOUND_TEXT_PADDING;
  if (type === "ellipse") return Math.round(((dimension + padding) / SQRT2) * 2);
  if (type === "diamond") return 2 * (dimension + padding);
  return dimension + padding;
}

/**
 * Position der linken oberen Ecke der einbeschriebenen Box, in der gebundener
 * Text zentriert wird. Quelle (dieselbe Datei wie oben): Funktion
 * getContainerCoords —
 *   ellipse:  zusätzlicher Versatz width/2 · (1 - √2/2) bzw. height/2 · (1 - √2/2)
 *   diamond:  zusätzlicher Versatz width/4 bzw. height/4
 *   rectangle: kein zusätzlicher Versatz (nur BOUND_TEXT_PADDING)
 */
export function innerOrigin(container, type) {
  let offsetX = BOUND_TEXT_PADDING;
  let offsetY = BOUND_TEXT_PADDING;
  if (type === "ellipse") {
    offsetX += (container.width / 2) * (1 - SQRT2 / 2);
    offsetY += (container.height / 2) * (1 - SQRT2 / 2);
  }
  if (type === "diamond") {
    offsetX += container.width / 4;
    offsetY += container.height / 4;
  }
  return { x: container.x + offsetX, y: container.y + offsetY };
}

/**
 * @param {number} [hoehe] Feste Höhe des Containers. Wird sie kleiner gewählt als
 *   der Platzbedarf des (bei vorgegebener Breite umbrochenen) Texts, umschließt
 *   die Form den Text NICHT mehr — es gibt weder Clamping noch eine Fehlermeldung
 *   dafür. Das ist bewusst so belassen (Verantwortung der aufrufenden Stelle),
 *   siehe Schlussprüfung Finding 3.
 */
function formElement(type, { inhalt, rolle, typo, x, y, breite, hoehe, link, ordnung }, registry) {
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
  // um denselben unumbrochenen Umbruch zu reproduzieren — für jeden Formtyp, weil
  // containerDimensionFor/innerDimension exakte Umkehrfunktionen zueinander sind
  // (mit Stress-Test über 2000 Textbreiten verifiziert, siehe Task-9-Report).
  //
  // Mit vorgegebener Breite ist die Innenbreite dagegen von vornherein fest, und
  // der gebundene Text kann in mehr Zeilen umbrechen, als eine unumbrochene Messung
  // vermuten lässt. Die automatische Höhen-Fallback muss deshalb auf derselben
  // Zeilenaufteilung beruhen, die der tatsächlich gebundene Text bekommt — sonst
  // schließt der Container den Text nicht ein (Fix-Durchgang 1, Review-Finding 1:
  // 200×60-Container um 259px hohen, 8-zeiligen Text bei nur ~2 vermuteten Zeilen).
  const natuerlich = measureText(inhalt, { fontFamily, fontSize: groesse }, registry);
  // Rechteck behält die bisherige 20er-Schritt-Heuristik unverändert (Fix-Durchgang 1,
  // hier bewusst nicht angetastet — Constraint "Rechteck bytegleich"). Ellipse und
  // Raute nutzen containerDimensionFor (Excalidraws eigene Umkehrfunktion), weil ihre
  // einbeschriebene Fläche kleiner ist als die Bounding-Box und die Rechteck-Heuristik
  // sie deshalb nicht mehr zuverlässig einschließt (Schlussprüfung, Finding 1).
  const w = breite ?? (type === "rectangle"
    ? Math.ceil((natuerlich.breite + 4 * BOUND_TEXT_PADDING) / 20) * 20
    : containerDimensionFor(natuerlich.breite, type));

  const innerBreite = innerDimension(w, type);

  const umbrochen = breite !== undefined
    ? measureText(inhalt, { fontFamily, fontSize: groesse, maxBreite: innerBreite }, registry)
    : natuerlich;

  const h = hoehe ?? (type === "rectangle"
    ? Math.ceil((umbrochen.hoehe + 4 * BOUND_TEXT_PADDING) / 20) * 20
    : containerDimensionFor(umbrochen.hoehe, type));

  const text = textElement(
    { inhalt, typo, x: x + BOUND_TEXT_PADDING, y, maxBreite: innerBreite, containerId, ordnung },
    registry,
  );
  if (type === "rectangle") {
    // Unverändert seit Fix-Durchgang 1: vertikal in der vollen Containerhöhe zentriert,
    // horizontal am Innenrand verankert (x oben bereits gesetzt). Bewusst nicht auf
    // das Excalidraw-Zentrierungsschema unten umgestellt — Constraint "Rechteck bytegleich".
    text.y = y + (h - text.height) / 2;
  } else {
    // Ellipse/Raute: x wurde oben mit x + BOUND_TEXT_PADDING vorbelegt (Rechteck-Anker)
    // und muss hier durch die tatsächliche einbeschriebene Box ersetzt werden — sonst
    // stimmt zwar die Größe, aber nicht die Position. Formel aus derselben Quelle wie
    // innerOrigin/innerDimension: computeBoundTextPosition (element/textElement.ts) für
    // textAlign "center" / verticalAlign "middle" — das ist, was textElement für
    // gebundenen Text setzt (containerId gesetzt ⇒ center/middle).
    const innerHoehe = innerDimension(h, type);
    const ursprung = innerOrigin({ x, y, width: w, height: h }, type);
    text.x = ursprung.x + (innerBreite - text.width) / 2;
    text.y = ursprung.y + (innerHoehe - text.height) / 2;
  }

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

  container.link = link ?? null;

  return { container, text };
}

// Zur Erinnerung an der öffentlichen Schnittstelle (Details siehe JSDoc an
// formElement oben): ein zu klein vorgegebenes `hoehe` umschließt den Text nicht
// mehr — das ist bewusst Verantwortung der aufrufenden Stelle, kein Bug.
export const boxElement     = (opt, registry) => formElement("rectangle", opt, registry);
export const ellipseElement = (opt, registry) => formElement("ellipse", opt, registry);
export const diamondElement = (opt, registry) => formElement("diamond", opt, registry);

const STANDARD_BILDBREITE = 500;

/** Bekannte Rasterbild-Endungen → MIME-Type. Alles andere ist ein Fehler statt
 * einer stillen Falschbeschriftung (Fix-Durchgang 3c, Finding 4). */
const MIME_NACH_ENDUNG = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/**
 * Liest eine Bilddatei von der Platte, berechnet ihren SHA-1-Hash (dient als
 * fileId — inhaltsadressiert statt zufällig, damit dieselbe Datei immer
 * dieselbe fileId bekommt) und ihre echten Pixelmaße, um das Seitenverhältnis
 * beim Skalieren auf `breite` zu wahren. `embed` liefert alles, was die Szene
 * braucht, um die Datei später als Excalidraw-"files"-Eintrag zu serialisieren.
 */
export function imageElement({ pfad, x, y, breite, ordnung }) {
  // pfad ist relativ zum Vault (VAULT_PATH) oder absolut — sonst würde eine
  // relative Angabe relativ zu process.cwd() gelesen, während der Validator
  // (checkImageRefs) dieselbe Datei nur im Vault sucht (Fix-Durchgang 3c,
  // Finding 1).
  const aufgeloesterPfad = path.isAbsolute(pfad) ? pfad : path.join(VAULT_PATH, pfad);
  const bytes = fs.readFileSync(aufgeloesterPfad);
  const fileId = crypto.createHash("sha1").update(bytes).digest("hex");
  const { width: bw, height: bh } = imageSize(bytes);

  const w = breite ?? STANDARD_BILDBREITE;
  const h = Math.round((w * bh) / bw);
  const id = elementId(`image:${fileId}`, ordnung);
  const dateiname = path.basename(pfad);
  const endung = path.extname(dateiname).toLowerCase();
  const mimeType = MIME_NACH_ENDUNG[endung];
  if (!mimeType) {
    throw new Error(
      `Nicht unterstütztes Bildformat "${endung}" — unterstützt: png, jpg, jpeg, gif, webp`,
    );
  }

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
