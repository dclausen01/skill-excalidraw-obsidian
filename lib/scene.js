import { boxElement, ellipseElement, diamondElement, textElement, frameElement } from "./elements.js";
import { indexSequence } from "./ids.js";
import { ABSTAND, FRAME_BREITE, FRAME_HOEHE, zoomL0 } from "./style.js";
import { loadFontRegistry } from "./fonts.js";

/**
 * Eine Szene hält Kapitel-Frames, die nebeneinander liegen, plus deren Kinder.
 * Frame-relative Koordinaten werden hier in absolute umgerechnet, die
 * fraktionalen z-Order-Indizes vergeben und die Boardmaße berichtet.
 */
export function scene({ titel = null, registry = loadFontRegistry() } = {}) {
  const frames = [];
  const kinder = [];
  // Eine einzige, über die ganze Szene laufende Ordnungszahl — sie geht in jede
  // elementId ein (siehe lib/ids.js) und macht dadurch alle IDs eindeutig,
  // auch bei gleichlautendem Inhalt und gleichem Elementtyp.
  let ordnung = 0;

  function frame(name, { x, y, breite = FRAME_BREITE, hoehe = FRAME_HOEHE } = {}) {
    // Ohne Vorgabe wird der nächste Frame rechts an den vorherigen angesetzt.
    const posX = x ?? frames.length * (FRAME_BREITE + ABSTAND.frames);
    const posY = y ?? 0;
    const element = frameElement({ name, x: posX, y: posY, breite, hoehe, ordnung: ordnung++ });
    frames.push(element);

    const hinzu = (bauer) => (inhalt, opts = {}) => {
      const ergebnis = bauer(
        { ...opts, inhalt, x: posX + (opts.x ?? 0), y: posY + (opts.y ?? 0), ordnung: ordnung++ },
        registry,
      );
      const teile = ergebnis.container ? [ergebnis.container, ergebnis.text] : [ergebnis];
      for (const teil of teile) {
        teil.frameId = element.id;
        kinder.push(teil);
      }
      return ergebnis;
    };

    return {
      element,
      box: hinzu(boxElement),
      ellipse: hinzu(ellipseElement),
      diamond: hinzu(diamondElement),
      text: hinzu(textElement),
    };
  }

  function elements() {
    // Frames zuerst, damit ihre Kinder im Editor darüber liegen. elements() liest
    // nur die bereits gebauten frames/kinder-Arrays und verändert sie nicht —
    // wiederholte Aufrufe liefern deshalb dasselbe Ergebnis (Determinismus).
    const alle = [...frames, ...kinder];
    const indizes = indexSequence(alle.length);
    return alle.map((el, i) => ({ ...el, index: indizes[i] }));
  }

  function dimensions() {
    const alle = elements();
    if (alle.length === 0) return { breite: FRAME_BREITE, hoehe: FRAME_HOEHE, zoomL0: 1 };

    const rechts = Math.max(...alle.map((e) => e.x + e.width));
    const unten = Math.max(...alle.map((e) => e.y + e.height));
    const links = Math.min(...alle.map((e) => e.x));
    const oben = Math.min(...alle.map((e) => e.y));
    const breite = rechts - links;
    const hoehe = unten - oben;

    return { breite, hoehe, zoomL0: zoomL0(breite, hoehe) };
  }

  return { titel, frame, elements, dimensions, registry };
}
