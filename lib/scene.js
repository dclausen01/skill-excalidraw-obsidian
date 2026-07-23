import { boxElement, ellipseElement, diamondElement, textElement, frameElement, imageElement } from "./elements.js";
import { arrowElement } from "./connect.js";
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
  // Bilder gehen nicht durch `kinder` allein — jede eingebettete Datei muss
  // zusätzlich einmal (nicht pro Vorkommen) in der Excalidraw-"files"-Sammlung
  // landen. Ein Map hält sie inhaltsadressiert nach fileId (SHA-1), doppelte
  // Einbettungen derselben Datei überschreiben sich deshalb einfach selbst.
  const embeds = new Map();
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
      // Bilder laufen nicht über `hinzu`: imageElement nimmt `pfad` statt
      // `inhalt` entgegen und liefert `{ element, embed }` statt eines einzelnen
      // Elements (bzw. { container, text }) — eine eigene Methode statt eines
      // weiteren hinzu(...)-Aufrufs.
      image: (pfad, opts = {}) => {
        const { element: bild, embed } = imageElement({
          pfad,
          x: posX + (opts.x ?? 0),
          y: posY + (opts.y ?? 0),
          breite: opts.breite,
          ordnung: ordnung++,
        });
        bild.frameId = element.id;
        embeds.set(embed.fileId, embed);
        kinder.push(bild);
        return { element: bild, embed };
      },
      transclusion: (verweis, opts = {}) => {
        const t = textElement(
          { inhalt: verweis, typo: opts.typo ?? "standard",
            x: posX + (opts.x ?? 0), y: posY + (opts.y ?? 0),
            maxBreite: opts.breite, ordnung: ordnung++ },
          registry,
        );
        t.frameId = element.id;
        kinder.push(t);
        return t;
      },
    };
  }

  function connect(a, b, { label = null, seite = null } = {}) {
    const ca = a.container ?? a;
    const cb = b.container ?? b;

    const pfeil = arrowElement({ a: ca, b: cb, ordnung: ordnung++, seite });
    kinder.push(pfeil);

    // Beidseitig binden: beide Container führen den Pfeil in ihren boundElements.
    ca.boundElements = [...(ca.boundElements ?? []), { id: pfeil.id, type: "arrow" }];
    cb.boundElements = [...(cb.boundElements ?? []), { id: pfeil.id, type: "arrow" }];

    if (label !== null) {
      // Label sitzt mittig auf dem Pfeil (Excalidraw positioniert gebundenen
      // Pfeiltext selbst; wir setzen es an die Pfeilmitte als Startwert).
      const mitteX = pfeil.x + pfeil.points.at(-1)[0] / 2;
      const mitteY = pfeil.y + pfeil.points.at(-1)[1] / 2;
      const labelEl = textElement(
        { inhalt: label, typo: "detail", x: mitteX, y: mitteY, containerId: pfeil.id, ordnung: ordnung++ },
        registry,
      );
      labelEl.frameId = pfeil.frameId;
      kinder.push(labelEl);
      pfeil.boundElements = [...pfeil.boundElements, { id: labelEl.id, type: "text" }];
    }

    return pfeil;
  }

  function sequence(frameObjekte, { nummeriert = true } = {}) {
    const pfeile = [];
    for (let i = 1; i < frameObjekte.length; i++) {
      const vonFrame = frameObjekte[i - 1].element;
      const nachFrame = frameObjekte[i].element;

      const pfeil = arrowElement({ a: vonFrame, b: nachFrame, ordnung: ordnung++ });
      kinder.push(pfeil);
      // Beidseitig binden, wie bei connect — aber auf den Frame-Elementen selbst.
      vonFrame.boundElements = [...(vonFrame.boundElements ?? []), { id: pfeil.id, type: "arrow" }];
      nachFrame.boundElements = [...(nachFrame.boundElements ?? []), { id: pfeil.id, type: "arrow" }];

      if (nummeriert) {
        // Label sitzt mittig auf dem Übergangspfeil, wie bei connect().
        const nummer = String(i);
        const mitteX = pfeil.x + pfeil.points.at(-1)[0] / 2;
        const mitteY = pfeil.y + pfeil.points.at(-1)[1] / 2;
        const labelEl = textElement(
          { inhalt: nummer, typo: "detail", x: mitteX, y: mitteY, containerId: pfeil.id, ordnung: ordnung++ },
          registry,
        );
        // labelEl.frameId bleibt der von textElement gesetzte Default (null) —
        // der Übergangspfeil gehört keinem Frame, sein Label ebensowenig.
        kinder.push(labelEl);
        pfeil.boundElements = [...pfeil.boundElements, { id: labelEl.id, type: "text" }];
      }
      pfeile.push(pfeil);
    }
    return pfeile;
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

  return { titel, frame, connect, sequence, elements, dimensions, registry, embeddedFiles: () => embeds };
}
