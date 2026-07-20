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

/**
 * Innenabstand zwischen Container-Rand und gebundenem Text (Excalidraw-Konstante).
 *
 * Vault-Herleitung (Fix-Durchgang 1, Review-Finding 2 — Details im
 * Task-6-Report): Rand := (container.width - text.width)/2 über alle 789
 * gebundenen Textelemente im Vault ist mit Median 27.01 und Werten bis 857
 * unbrauchbar kontaminiert, weil Nutzer Container manuell in der Breite
 * ziehen (autoResize bleibt dabei unberührt) — das kann den gemessenen Rand
 * nur vergrößern, nie unter das echte Padding drücken. Eine auf "vermutlich
 * nicht manuell verändert" gefilterte Teilmenge (vertikaler Rand nahe 5,
 * n=162) hat selbst noch Median 7.87 und Mittelwert 15.13 — auch dort
 * verschiebt der Schwanz aus teilweise vergrößerten Containern die Mitte
 * der Verteilung. Weil die Kontamination einseitig nach oben wirkt, ist der
 * korrekte Schätzer die UNTERE Kante der Verteilung, nicht ihre Mitte: die
 * 6 kleinsten Werte dieser Teilmenge liegen bei 4.63, danach folgt sofort
 * ein dichtes Cluster 5.00–5.5 (74 von 162 Werten, ~46 %), bevor ab ~5.5
 * der lange rechte Schwanz einsetzt. Das bestätigt 5 als echtes Padding;
 * geändert wurde die Konstante nicht.
 */
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

/**
 * Bricht Text auf eine Maximalbreite um; vorhandene Umbrüche bleiben erhalten.
 *
 * Content-preserving: wrapText entscheidet nur, WO gebrochen wird, und
 * verändert den Text selbst nicht — auch nicht ein führendes Leerzeichen
 * eines Absatzes oder eine rein aus Leerzeichen bestehende Zeile. Der
 * Zeilen-Akkumulator `zeile` wird deshalb per expliziter Start-Markierung
 * (`null`) geprüft, nicht per Falsy-Check auf einen leeren String — eine
 * leere Zeichenkette ist in JS falsy, kann hier aber ein bereits
 * konsumiertes führendes Leerzeichen bedeuten (Fix-Durchgang 1,
 * Review-Finding 1).
 *
 * Unverifiziert: ob Excalidraw selbst führende/mehrfache Leerzeichen beim
 * Rendern genauso behandelt (also nicht kollabiert), ist mit den hier
 * verfügbaren Mitteln nicht prüfbar — dafür fehlen Referenzdaten aus dem
 * echten Renderer. Die content-preserving-Entscheidung ist bewusst
 * konservativ (keine Whitespace-Interpretation erfinden) und gegen den
 * browserbasierten Renderer einer späteren Stufe zu bestätigen.
 */
export function wrapText(text, fontFamily, fontSize, maxBreite, registry) {
  const ergebnis = [];

  for (const absatz of text.split("\n")) {
    let zeile = null; // null = Absatz noch nicht begonnen (Unterschied zu "" = leerer, aber begonnener Inhalt)

    for (const wort of absatz.split(" ")) {
      const kandidat = zeile === null ? wort : `${zeile} ${wort}`;

      if (measureLine(kandidat, fontFamily, fontSize, registry) <= maxBreite) {
        zeile = kandidat;
        continue;
      }

      if (zeile !== null) ergebnis.push(zeile);

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
