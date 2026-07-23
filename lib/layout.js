import { ABSTAND, FRAME_BREITE, FRAME_HOEHE } from "./style.js";

/** Formtypen, die platziere() an eine Frame-Fabrik weiterreichen darf. Andere
 *  frame-Eigenschaften (z. B. "text") liefern kein Element mit .container und
 *  dürfen platziere() deshalb nicht über eine bloße Truthiness-Prüfung erreichen
 *  (Schlussprüfung, Finding 3). */
const ERLAUBTE_FORMTYPEN = ["box", "ellipse", "diamond"];

/** Ruft die zum typ passende Fabrik des Frames auf. */
function platziere(frame, inhalt, { typ = "box", rolle, typo, x, y }) {
  if (!ERLAUBTE_FORMTYPEN.includes(typ)) {
    throw new Error(`Unbekannter Formtyp "${typ}" — erlaubt: ${ERLAUBTE_FORMTYPEN.join(", ")}`);
  }
  return frame[typ](inhalt, { rolle, typo, x, y });
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

/** Raster mit fester Spaltenzahl. Zeilen im Abstands-Token getrennt; die
 *  Zeilenhöhe folgt der höchsten Form der Zeile. */
export function grid(frame, inhalte, opts = {}) {
  const { spalten = 2, rolle = "neutral", typo = "standard", typ = "box", abstand = "normal", x = 0, y = 0 } = opts;
  // Ohne diese Wache läuft die for-Schleife unten mit i += spalten nie über
  // inhalte.length hinaus, wenn spalten <= 0 ist — eine Endlosschleife, die den
  // Prozess für immer blockiert (Schlussprüfung, Finding 1).
  if (!Number.isInteger(spalten) || spalten < 1) {
    throw new Error(`grid braucht spalten >= 1, bekam ${spalten}`);
  }
  const luecke = ABSTAND[abstand];
  const platziert = [];
  let cursorY = y;

  for (let i = 0; i < inhalte.length; i += spalten) {
    const zeileInhalte = inhalte.slice(i, i + spalten);
    // Eine Zeile über den bestehenden row-Helfer platzieren.
    const zeile = row(frame, zeileInhalte, { rolle, typo, typ, abstand, x, y: cursorY });
    platziert.push(...zeile);
    const zeilenHoehe = Math.max(...zeile.map((form) => form.container.height));
    cursorY += zeilenHoehe + luecke;
  }
  return platziert;
}

/** Verschiebt eine am Kreispunkt (obere linke Ecke) platzierte Form so, dass ihr
 *  Mittelpunkt dort liegt — reine Verschiebung um die halbe Formgröße, unabhängig
 *  vom Koordinatenraum. Die Rückgabereferenzen sind dieselben Objekte wie in der
 *  Szene (siehe scene.js), die Mutation bleibt also in elements() erhalten. */
function zentriereAufEigenenPunkt(form) {
  const dx = -form.container.width / 2;
  const dy = -form.container.height / 2;
  for (const teil of [form.container, form.text]) {
    teil.x += dx;
    teil.y += dy;
  }
}

/** Zentrum plus Satelliten auf einem Kreis. x/y ist der Kreismittelpunkt
 *  (frame-relativ); frame.box rechnet ihn in absolute Koordinaten um. */
export function radial(frame, zentrumInhalt, satellitenInhalte, opts = {}) {
  const {
    typ = "box", rolle = "neutral", typo = "standard",
    radius = 400, x = FRAME_BREITE / 2, y = FRAME_HOEHE / 2, startWinkel = -90,
  } = opts;

  // Zentrum an (x, y) platzieren, dann auf seinen eigenen Punkt zentrieren.
  const zentrum = platziere(frame, zentrumInhalt, { typ, rolle, typo, x, y });
  zentriereAufEigenenPunkt(zentrum);

  const satelliten = [];
  const schritt = 360 / satellitenInhalte.length;
  for (let i = 0; i < satellitenInhalte.length; i++) {
    const winkel = ((startWinkel + i * schritt) * Math.PI) / 180;
    const mx = x + radius * Math.cos(winkel);
    const my = y + radius * Math.sin(winkel);
    const sat = platziere(frame, satellitenInhalte[i], { typ, rolle, typo, x: mx, y: my });
    zentriereAufEigenenPunkt(sat);
    satelliten.push(sat);
  }
  return { zentrum, satelliten };
}

/** Vertikaler Stapel — column mit engem Standardabstand. */
export function stack(frame, inhalte, opts = {}) {
  return column(frame, inhalte, { abstand: "eng", ...opts });
}

/** Formen in einer Reihe, benachbarte mit Übergangspfeilen verbunden.
 *  Braucht die Szene (opts.szene), weil Pfeile über szene.connect gezogen werden. */
export function timeline(frame, inhalte, opts = {}) {
  const { szene, ...rest } = opts;
  if (!szene) throw new Error("timeline braucht opts.szene, um die Formen zu verbinden");

  const formen = row(frame, inhalte, rest);
  const pfeile = [];
  for (let i = 1; i < formen.length; i++) {
    pfeile.push(szene.connect(formen[i - 1], formen[i]));
  }
  return { formen, pfeile };
}

/**
 * Ausfüll- oder Vergleichstabelle. `kopf` = Spaltenüberschriften. Genau eine
 * Inhaltsangabe: `zeilen` (N leere Ausfüllzeilen) ODER `inhalt` (2D-Array,
 * "" = Ausfüllfeld). Rahmen standardmäßig nur Spalten-Trennlinien + Kopflinie;
 * "gitter" zusätzlich Zeilenlinien. Nutzt frame.text (Kopf/Zellen) und
 * frame.line (Trennlinien, kontext-Grau).
 */
export function tabelle(frame, kopf, { zeilen, inhalt, x = 0, y = 0, breite, zeilenhoehe = 100, rahmen = "spalten" } = {}) {
  if (!Array.isArray(kopf) || kopf.length === 0) throw new Error("tabelle braucht mindestens eine Kopfspalte");
  if (!breite) throw new Error("tabelle braucht eine breite");
  const hatZeilen = typeof zeilen === "number";
  const hatInhalt = Array.isArray(inhalt);
  if (hatZeilen === hatInhalt) throw new Error("tabelle braucht genau eines: zeilen ODER inhalt");

  const spalten = kopf.length;
  const zeilenInhalt = hatInhalt ? inhalt : Array.from({ length: zeilen }, () => Array(spalten).fill(""));
  for (const zeile of zeilenInhalt) {
    if (zeile.length !== spalten) throw new Error(`inhalt-Zeile hat ${zeile.length} Spalten, erwartet ${spalten}`);
  }

  const spaltenbreite = breite / spalten;
  const kopfhoehe = 60;
  const polster = 20;
  const anzahlZeilen = zeilenInhalt.length;
  const gesamthoehe = kopfhoehe + anzahlZeilen * zeilenhoehe;

  // Kopf
  const kopfTexte = kopf.map((titel, s) =>
    frame.text(titel, { typo: "kernbegriff", x: x + s * spaltenbreite + polster, y: y + polster }),
  );

  // Zellen. Leeres (""), null oder undefined ist ein Ausfüllfeld → kein Element (null).
  const zellen = zeilenInhalt.map((zeile, z) =>
    zeile.map((wert, s) =>
      wert
        ? frame.text(wert, { typo: "standard", x: x + s * spaltenbreite + polster, y: y + kopfhoehe + z * zeilenhoehe + polster })
        : null,
    ),
  );

  // Linien
  const linien = [];
  for (let s = 1; s < spalten; s++) {                 // senkrechte innere Trennlinien
    const lx = x + s * spaltenbreite;
    linien.push(frame.line([[lx, y], [lx, y + gesamthoehe]]));
  }
  linien.push(frame.line([[x, y + kopfhoehe], [x + breite, y + kopfhoehe]]));   // Kopflinie
  if (rahmen === "gitter") {
    for (let z = 1; z < anzahlZeilen; z++) {
      const ly = y + kopfhoehe + z * zeilenhoehe;
      linien.push(frame.line([[x, ly], [x + breite, ly]]));
    }
  }

  return { kopf: kopfTexte, zellen, linien };
}
