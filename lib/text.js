import { LINE_HEIGHT } from "./fonts.js";

/**
 * Teilt einen Text in Abschnitte, die jeweils von derselben Subset-Datei
 * abgedeckt sind. Nötig, weil die Schriften nach Unicode-Bereich aufgeteilt sind.
 */
function laufweiten(text, fontFamily, registry) {
  const laeufe = [];
  for (const zeichen of text) {
    const font = registry.fontFor(zeichen.codePointAt(0), fontFamily);
    const letzter = laeufe.at(-1);
    if (letzter && letzter.font === font) letzter.text += zeichen;
    else laeufe.push({ font, text: zeichen });
  }
  return laeufe;
}

/** Breite einer einzelnen Zeile in Szeneneinheiten. */
export function measureLine(text, fontFamily, fontSize, registry) {
  if (text.length === 0) return 0;

  let einheiten = 0;
  for (const lauf of laufweiten(text, fontFamily, registry)) {
    einheiten += lauf.font.layout(lauf.text).advanceWidth;
  }
  return (einheiten / registry.unitsPerEm(fontFamily)) * fontSize;
}

/** Höhe eines Textblocks — berechenbar, nicht messbar. */
export function measureHeight(zeilenzahl, fontFamily, fontSize) {
  return zeilenzahl * fontSize * LINE_HEIGHT[fontFamily];
}
