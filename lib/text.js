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

/** Innenabstand zwischen Container-Rand und gebundenem Text (Excalidraw-Konstante). */
export const BOUND_TEXT_PADDING = 5;

/** Bricht ein überlanges Wort zeichenweise um. */
function brichWortUm(wort, fontFamily, fontSize, maxBreite, registry) {
  const teile = [];
  let aktuell = "";
  for (const zeichen of wort) {
    const versuch = aktuell + zeichen;
    if (aktuell && measureLine(versuch, fontFamily, fontSize, registry) > maxBreite) {
      teile.push(aktuell);
      aktuell = zeichen;
    } else {
      aktuell = versuch;
    }
  }
  if (aktuell) teile.push(aktuell);
  return teile;
}

/** Bricht Text auf eine Maximalbreite um; vorhandene Umbrüche bleiben erhalten. */
export function wrapText(text, fontFamily, fontSize, maxBreite, registry) {
  const ergebnis = [];

  for (const absatz of text.split("\n")) {
    let zeile = "";

    for (const wort of absatz.split(" ")) {
      const kandidat = zeile ? `${zeile} ${wort}` : wort;

      if (measureLine(kandidat, fontFamily, fontSize, registry) <= maxBreite) {
        zeile = kandidat;
        continue;
      }

      if (zeile) ergebnis.push(zeile);

      if (measureLine(wort, fontFamily, fontSize, registry) > maxBreite) {
        const teile = brichWortUm(wort, fontFamily, fontSize, maxBreite, registry);
        ergebnis.push(...teile.slice(0, -1));
        zeile = teile.at(-1);
      } else {
        zeile = wort;
      }
    }

    ergebnis.push(zeile);
  }

  return ergebnis;
}

/** Gesamtmaße eines Textblocks, wahlweise mit Umbruch. */
export function measureText(text, { fontFamily, fontSize, maxBreite }, registry) {
  const zeilen = maxBreite
    ? wrapText(text, fontFamily, fontSize, maxBreite, registry)
    : text.split("\n");

  const breite = Math.max(...zeilen.map((z) => measureLine(z, fontFamily, fontSize, registry)));
  return { breite, hoehe: measureHeight(zeilen.length, fontFamily, fontSize), zeilen };
}
