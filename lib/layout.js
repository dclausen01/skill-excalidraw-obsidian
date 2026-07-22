import { ABSTAND } from "./style.js";

/** Ruft die zum typ passende Fabrik des Frames auf. */
function platziere(frame, inhalt, { typ = "box", rolle, typo, x, y }) {
  const fabrik = frame[typ];
  if (!fabrik) throw new Error(`Unbekannter Formtyp "${typ}" — erlaubt: box, ellipse, diamond`);
  return fabrik(inhalt, { rolle, typo, x, y });
}

/** Formen nebeneinander, linksbündig, gleiche Höhe. */
export function row(frame, inhalte, opts = {}) {
  const { rolle = "neutral", typo = "standard", typ = "box", abstand = "normal", x = 0, y = 0 } = opts;
  const luecke = ABSTAND[abstand];
  const platziert = [];
  let cursorX = x;

  for (const inhalt of inhalte) {
    const form = platziere(frame, inhalt, { typ, rolle, typo, x: cursorX, y });
    platziert.push(form);
    cursorX += form.container.width + luecke;
  }
  return platziert;
}

/** Formen untereinander, gleiche x. */
export function column(frame, inhalte, opts = {}) {
  const { rolle = "neutral", typo = "standard", typ = "box", abstand = "normal", x = 0, y = 0 } = opts;
  const luecke = ABSTAND[abstand];
  const platziert = [];
  let cursorY = y;

  for (const inhalt of inhalte) {
    const form = platziere(frame, inhalt, { typ, rolle, typo, x, y: cursorY });
    platziert.push(form);
    cursorY += form.container.height + luecke;
  }
  return platziert;
}
