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

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { start: "rechts", end: "links" } : { start: "links", end: "rechts" };
  }
  return dy >= 0 ? { start: "unten", end: "oben" } : { start: "oben", end: "unten" };
}
