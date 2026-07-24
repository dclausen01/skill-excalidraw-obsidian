/**
 * Gleichseitiges Dreieck (Spitze oben) als geschlossene line mit drei
 * Ecken-Labels. ecken = [oben, unten-links, unten-rechts]; leerer String → kein
 * Label. Standard nur Umriss; mit fuellung dezent getönt. Labels sitzen außen an
 * den Ecken (AUSSEN Abstand), mittig zur jeweiligen Ecke.
 */
const AUSSEN = 24;

export function dreieck(frame, ecken, { x = 0, y = 0, breite, hoehe, fuellung, rolle = "neutral", typo = "kernbegriff" } = {}) {
  if (!Array.isArray(ecken) || ecken.length !== 3) throw new Error("dreieck braucht genau drei Ecken-Label (oben, unten-links, unten-rechts)");
  if (!breite) throw new Error("dreieck braucht eine breite");

  const h = hoehe ?? (breite * Math.sqrt(3)) / 2;
  const spitze = [x + breite / 2, y];
  const untenLinks = [x, y + h];
  const untenRechts = [x + breite, y + h];

  const linie = frame.line([spitze, untenLinks, untenRechts], { geschlossen: true, rolle, fuellung });

  const [obenText, ulText, urText] = ecken;
  const eckenEl = [null, null, null];

  if (obenText) {
    const l = frame.text(obenText, { typo, x: x + breite / 2, y });   // provisorisch an der Spitze
    l.x -= l.width / 2;                 // horizontal zentrieren
    l.y -= AUSSEN + l.height;           // über die Spitze
    eckenEl[0] = l;
  }
  if (ulText) {
    const l = frame.text(ulText, { typo, x, y: y + h });              // provisorisch an der linken Ecke
    l.x -= l.width;                     // links neben die Ecke
    l.y += AUSSEN;                      // unter die Basis
    eckenEl[1] = l;
  }
  if (urText) {
    const l = frame.text(urText, { typo, x: x + breite, y: y + h });  // rechte Ecke (kein x-Delta)
    l.y += AUSSEN;
    eckenEl[2] = l;
  }

  return { dreieck: linie, ecken: eckenEl };
}
