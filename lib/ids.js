import { createHash } from "node:crypto";
import { generateNKeysBetween } from "fractional-indexing";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function hash(inhalt, salz) {
  return createHash("sha1").update(`${salz}:${inhalt}`).digest();
}

/**
 * Deterministische Element-ID. Die Ordnungszahl geht mit ein, damit zwei
 * gleichlautende Kästen verschiedene IDs bekommen.
 */
export function elementId(inhalt, ordnung) {
  const bytes = hash(`${inhalt}#${ordnung}`, "id");
  let id = "";
  for (let i = 0; i < 8; i++) id += ALPHABET[bytes[i] % ALPHABET.length];
  return id;
}

function zahlAus(inhalt, salz) {
  // Oberstes Bit ausmaskieren, damit der Wert positiv und < 2^31 bleibt.
  return hash(inhalt, salz).readUInt32BE(0) & 0x7fffffff;
}

/** Steuert den handgezeichneten Zufall — aus dem Inhalt abgeleitet, nie gewürfelt. */
export const seedFor = (inhalt) => zahlAus(inhalt, "seed");

/** Excalidraws Konfliktauflösung; für uns nur ein stabiler Wert. */
export const versionNonceFor = (inhalt) => zahlAus(inhalt, "nonce");

/** Fraktionale Indizes für die z-Reihenfolge. */
export function indexSequence(anzahl) {
  return generateNKeysBetween(null, null, anzahl);
}
