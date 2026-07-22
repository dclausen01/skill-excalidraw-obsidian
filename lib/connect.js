import { elementId, seedFor, versionNonceFor } from "./ids.js";
import { STRICH } from "./style.js";

/** Normalisierte Kantenmitte auf der Bounding-Box (Spec 2.4.1). Die 0.5001 statt
 *  0.5 stammt aus der echten Vault-Datei und vermeidet die Mehrdeutigkeit des
 *  exakten Mittelpunkts. */
export function fixedPointFor(seite) {
  switch (seite) {
    case "rechts": return [1.0, 0.5001];
    case "links":  return [0.0, 0.5001];
    case "unten":  return [0.5001, 1.0];
    case "oben":   return [0.5001, 0.0];
    default: throw new Error(`Unbekannte Seite "${seite}"`);
  }
}

/** Absoluter Punkt der Kantenmitte einer Box. */
export function edgeMidpoint(box, seite) {
  const [fx, fy] = fixedPointFor(seite);
  return [box.x + fx * box.width, box.y + fy * box.height];
}

/** Welche Kanten von A und B einander zugewandt sind — nach der dominanten Achse
 *  zwischen den Mittelpunkten. */
export function chooseSides(a, b) {
  const amx = a.x + a.width / 2;
  const amy = a.y + a.height / 2;
  const bmx = b.x + b.width / 2;
  const bmy = b.y + b.height / 2;
  const dx = bmx - amx;
  const dy = bmy - amy;

  // Bei exakt diagonaler Lage (dx === dy) gewinnt die horizontale Achse
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { start: "rechts", end: "links" } : { start: "links", end: "rechts" };
  }
  return dy >= 0 ? { start: "unten", end: "oben" } : { start: "oben", end: "unten" };
}

/**
 * Baut ein gebundenes Pfeilelement zwischen den Containern a und b.
 * Die points werden aus der echten Geometrie berechnet — der Renderpfad
 * zeichnet sie wie angegeben und reroutet nicht (Spec 2.4.1).
 */
export function arrowElement({ a, b, ordnung, seite = null }) {
  const seiten = seite ?? chooseSides(a, b);
  const [startX, startY] = edgeMidpoint(a, seiten.start);
  const [endX, endY] = edgeMidpoint(b, seiten.end);

  const id = elementId(`arrow:${a.id}->${b.id}`, ordnung);

  // points sind Offsets von der eigenen x,y. Erster Punkt liegt im Ursprung.
  const points = [[0, 0], [endX - startX, endY - startY]];

  return {
    id,
    type: "arrow",
    x: startX,
    y: startY,
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
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
    index: "a0",              // wird von scene.elements() überschrieben
    roundness: STRICH.roundnessArrow,
    seed: seedFor(id),
    version: 1,
    versionNonce: versionNonceFor(id),
    isDeleted: false,
    boundElements: [],
    updated: 1,
    link: null,
    locked: false,
    points,
    lastCommittedPoint: null,
    startArrowhead: null,
    endArrowhead: "arrow",
    elbowed: false,
    startBinding: { elementId: a.id, mode: "orbit", fixedPoint: fixedPointFor(seiten.start) },
    endBinding: { elementId: b.id, mode: "orbit", fixedPoint: fixedPointFor(seiten.end) },
    hasTextLink: false,
    moveMidPointsWithElement: false,
  };
}
