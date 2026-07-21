import { LINE_HEIGHT } from "./fonts.js";

/**
 * Ersatzbreiten für Zeichen, die in keinem Subset abgedeckt sind — als Faktor
 * relativ zu fontSize (nicht als absolute Pixelzahl), damit measureLine sie wie
 * gemessene Breite behandeln kann.
 *
 * Es sind Schätzungen, keine Messwerte: Excalidraw rendert nicht abgedeckte
 * Zeichen über eine System-Fallback-Schrift, die wir nicht kennen und ohne
 * Browser nicht befragen können. Grundlage sind die vier im Vault tatsächlich
 * auftretenden nicht abgedeckten Zeichen (siehe Task-12-Bericht, Step-1-Erhebung):
 * 📍 U+1f4cd, 🌐 U+1f310, → U+2192, § U+a7.
 *
 * Klassifiziert wird pro Graphemcluster (siehe graphemSegmenter unten), nicht
 * pro Codepoint — eine Flagge (zwei Regional-Indicator-Codepoints), eine
 * ZWJ-Sequenz oder ein Emoji mit Hautton-Modifikator ist EIN gerendertes
 * Glyph und wird deshalb auch nur einmal bepreist (Fix-Durchgang 1,
 * Review-Finding 1 — vorher zählte codePointAt(0) > 0xFFFF pro einzelnem
 * Codepoint und lud eine Flagge doppelt).
 *
 * - emoji (1.0): Cluster, die mindestens einen Codepoint mit der
 *   Unicode-Eigenschaft Extended_Pictographic enthalten (Regex
 *   /\p{Extended_Pictographic}/u). Das ist die von Unicode selbst gepflegte
 *   Emoji-Klassifikation und trifft sowohl BMP-Symbole (❤ U+2764, ✅ U+2705,
 *   ⭐ U+2B50, ☀ U+2600) als auch astrale Emoji (📍 🌐) — anders als die
 *   frühere reine Astral-Schwelle, die BMP-Emoji fälschlich als "standard"
 *   einstufte und astrale Nicht-Emoji (z. B. Mathematical Alphanumeric
 *   Symbols U+1D400, CJK Extension B U+20000) fälschlich als "emoji". Farb-
 *   Emoji-Schriften (Apple Color Emoji, Noto Color Emoji) zeichnen ihre
 *   Glyphen praktisch immer in eine quadratische em-Box; ein Vorschubfaktor
 *   nahe 1.0 ist dafür die naheliegende Schätzung.
 * - standard (0.55): alles andere ohne Abdeckung, u. a. § und →. Der Paragraf
 *   ist in gängigen Sans-Fallbacks (z. B. Arial: advance ≈ 0.556em)
 *   ziffernbreit; der Pfeil dürfte eher etwas breiter sein (grobe
 *   Hausschätzung ≈ 0.6–0.7em in Arial/DejaVu Sans), aber mit nur zwei
 *   Belegzeichen lohnt keine dritte Klasse — 0.55 ist der gemeinsame
 *   Kompromisswert für "kein Emoji". Flaggen-Sequenzen (zwei Regional-
 *   Indicator-Codepoints, keiner davon Extended_Pictographic) landen ebenfalls
 *   hier; das ist eine bewusste Vereinfachung, keine dritte Klasse für einen
 *   im Vault bisher unbelegten Fall.
 *
 * Zu verfeinern: Abgleich gegen den browserbasierten Renderer einer späteren
 * Stufe, sobald echte gerenderte Breiten für diese Zeichen vorliegen.
 */
export const FALLBACK_WIDTH = { emoji: 1.0, standard: 0.55 };

/** Unicode-Eigenschaft, mit der Emoji-artige Codepoints erkannt werden — siehe FALLBACK_WIDTH. */
const EMOJI_PATTERN = /\p{Extended_Pictographic}/u;

/**
 * Segmentiert nach Graphemclustern statt nach Codepoints — eine Flagge, eine
 * ZWJ-Sequenz oder ein Emoji mit Variationsselektor/Hautton-Modifikator ist
 * ein Cluster. Einmal auf Modulebene gebaut, da die Konstruktion eines
 * Intl.Segmenter teuer ist und der Segmenter selbst zustandslos wiederverwendet
 * werden kann.
 */
const graphemSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Zerlegt text in Graphemcluster (als Strings), nicht in einzelne Codepoints. */
function grapheme(text) {
  return Array.from(graphemSegmenter.segment(text), (teil) => teil.segment);
}

/** Ob ein Graphemcluster als Emoji zu behandeln ist — siehe FALLBACK_WIDTH. */
function istEmoji(zeichen) {
  return EMOJI_PATTERN.test(zeichen);
}

/**
 * Teilt einen Text in Abschnitte, die jeweils von derselben Subset-Datei
 * abgedeckt sind. Nötig, weil die Schriften nach Unicode-Bereich aufgeteilt sind.
 * Zeichen ohne Abdeckung bilden eigene Läufe mit font: null — measureLine
 * rechnet die mit FALLBACK_WIDTH statt mit einer echten Glyphenbreite.
 *
 * Iteriert pro Graphemcluster statt pro Codepoint. Für Text, in dem jedes
 * Zeichen ein einzelner Codepoint ist (der Regelfall bei lateinischer und
 * deutscher Schrift, siehe tests/text-measure.test.js), liefert das exakt
 * dieselben Läufe wie zuvor — Deckung wird weiterhin über den ersten
 * Codepoint des Clusters geprüft (zeichen.codePointAt(0)).
 */
function laufweiten(text, fontFamily, registry) {
  const laeufe = [];
  for (const zeichen of grapheme(text)) {
    const codepoint = zeichen.codePointAt(0);
    const font = registry.covers(codepoint, fontFamily) ? registry.fontFor(codepoint, fontFamily) : null;
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
  let ersatz = 0;
  for (const lauf of laufweiten(text, fontFamily, registry)) {
    if (lauf.font) {
      einheiten += lauf.font.layout(lauf.text).advanceWidth;
    } else {
      for (const zeichen of grapheme(lauf.text)) {
        ersatz += (istEmoji(zeichen) ? FALLBACK_WIDTH.emoji : FALLBACK_WIDTH.standard) * fontSize;
      }
    }
  }
  return (einheiten / registry.unitsPerEm(fontFamily)) * fontSize + ersatz;
}

/**
 * Zeichen aus text, deren Breite in fontFamily geschätzt statt gemessen wurde —
 * jedes davon nur einmal, in Reihenfolge des ersten Auftretens (Fix-Durchgang 1,
 * Review-Finding 2). Der Konsument ist ein Validator, der daraus eine weiche
 * Warnung baut; bei zehn § im selben Absatz soll eine Warnung entstehen, nicht
 * zehn. Ein Set genügt zum Deduplizieren, weil JS Sets Einfügereihenfolge
 * garantieren.
 */
export function estimatedCharacters(text, fontFamily, registry) {
  const ergebnis = new Set();
  for (const zeichen of grapheme(text)) {
    if (!registry.covers(zeichen.codePointAt(0), fontFamily)) ergebnis.add(zeichen);
  }
  return [...ergebnis];
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
 * Content-preserving *innerhalb* einer Zeile: Leerzeichen, die nicht genau
 * an einer Umbruchstelle liegen, bleiben unverändert erhalten — auch ein
 * führendes Leerzeichen eines Absatzes, mehrfache Leerzeichen zwischen
 * Wörtern oder eine rein aus Leerzeichen bestehende Zeile. Der
 * Zeilen-Akkumulator `zeile` wird deshalb per expliziter Start-Markierung
 * (`null`) geprüft, nicht per Falsy-Check auf einen leeren String — eine
 * leere Zeichenkette ist in JS falsy, kann hier aber ein bereits
 * konsumiertes führendes Leerzeichen bedeuten (Fix-Durchgang 1,
 * Review-Finding 1).
 *
 * An einer Umbruchstelle selbst wird das trennende Leerzeichen dagegen
 * konsumiert, nicht erhalten: passt der `kandidat` (alte Zeile + Leerzeichen
 * + neues Wort) nicht mehr, wird die alte Zeile ohne dieses Leerzeichen
 * gepusht und die neue Zeile beginnt direkt mit dem Wort — das Leerzeichen
 * taucht weder am Ende der alten noch am Anfang der neuen Zeile auf. Das
 * ist das in der Textverarbeitung übliche Verhalten ("Hello World" bricht
 * zu "Hello" / "World", nicht zu "Hello" / " World") und gilt unverändert
 * auch dann, wenn das konsumierte Leerzeichen selbst am Absatzanfang stand
 * oder Teil einer Folge mehrerer Leerzeichen war, die über die Umbruchstelle
 * hinwegreicht (Fix-Durchgang 2, Review-Finding).
 *
 * Unverifiziert: ob Excalidraw an genau denselben Stellen umbricht und das
 * trennende Leerzeichen ebenso konsumiert, ist mit den hier verfügbaren
 * Mitteln nicht prüfbar — dafür fehlen Referenzdaten aus dem echten
 * Renderer. Zuerst zu prüfen gegen den browserbasierten Renderer einer
 * späteren Stufe sind dabei die Umbruchstellen-Randfälle: ein führendes
 * Leerzeichen, das selbst den Umbruch auslöst, und eine Folge mehrerer
 * Leerzeichen, die über eine Umbruchstelle hinwegreicht (siehe die
 * charakterisierenden Tests in `tests/text-wrap.test.js`).
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
