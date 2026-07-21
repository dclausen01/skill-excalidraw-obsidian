import { markdownToScene } from "../document.js";

/** Felder, die jedes Element führt. */
const BASISFELDER = [
  "id", "type", "x", "y", "width", "height", "angle", "strokeColor",
  "backgroundColor", "fillStyle", "strokeWidth", "strokeStyle", "roughness",
  "opacity", "groupIds", "frameId", "index", "seed", "version", "versionNonce",
  "isDeleted", "boundElements", "updated", "locked", "roundness", "link",
];

/** Zusatzfelder je Typ. */
const ZUSATZFELDER = {
  text: ["text", "rawText", "originalText", "fontSize", "fontFamily", "lineHeight",
         "textAlign", "verticalAlign", "containerId", "autoResize", "hasTextLink"],
  frame: ["name"],
  rectangle: [],
  ellipse: [],
  diamond: [],
};

/** Nur diese Typen erzeugt Stufe 1. Alles andere kann der Validator nicht beurteilen. */
const ERLAUBTE_TYPEN = Object.keys(ZUSATZFELDER);

/** Formtypen, die gebundenen Text als Container tragen dürfen. Text und Frame nicht. */
const FORM_TYPEN = ["rectangle", "ellipse", "diamond"];

const AUFZAEHLUNGEN = {
  fillStyle: ["solid", "hachure", "cross-hatch", "zigzag"],
  strokeStyle: ["solid", "dashed", "dotted"],
  textAlign: ["left", "center", "right"],
  verticalAlign: ["top", "middle", "bottom"],
};

/** Der Skill erzeugt ausschließlich Excalifont und Nunito. */
const ERZEUGTE_SCHRIFTEN = [5, 6];

export function checkSchema(elemente, befunde) {
  for (const el of elemente) {
    const id = el.id ?? null;

    if (!ERLAUBTE_TYPEN.includes(el.type)) {
      befunde.error("schema", `Unbekannter Elementtyp "${el.type}" — Stufe 1 erzeugt nur ${ERLAUBTE_TYPEN.join(", ")}`, id);
      continue; // Ohne bekannten Typ sind die Feldprüfungen sinnlos.
    }

    for (const feld of [...BASISFELDER, ...ZUSATZFELDER[el.type]]) {
      if (el[feld] === undefined) {
        befunde.error("schema", `Pflichtfeld "${feld}" fehlt an einem Element vom Typ ${el.type}`, id);
      }
    }

    for (const [feld, erlaubt] of Object.entries(AUFZAEHLUNGEN)) {
      if (el[feld] !== undefined && !erlaubt.includes(el[feld])) {
        befunde.error("schema", `Ungültiger Wert "${el[feld]}" für ${feld} — erlaubt: ${erlaubt.join(", ")}`, id);
      }
    }

    if (el.type === "text" && el.fontFamily !== undefined && !ERZEUGTE_SCHRIFTEN.includes(el.fontFamily)) {
      befunde.error("schema", `fontFamily ${el.fontFamily} wird nicht erzeugt — erlaubt sind 5 (Excalifont) und 6 (Nunito)`, id);
    }
  }
}

export function checkReferences(elemente, befunde) {
  const nachId = new Map();

  for (const el of elemente) {
    if (nachId.has(el.id)) {
      befunde.error("ids", `Element-ID "${el.id}" kommt mehrfach vor`, el.id);
    }
    nachId.set(el.id, el);
  }

  const frameIds = new Set(elemente.filter((e) => e.type === "frame").map((e) => e.id));

  for (const el of elemente) {
    // Gebundener Text: Container muss existieren, tatsächlich eine Form sein
    // (nicht selbst Text oder Frame) und den Text seinerseits führen.
    if (el.type === "text" && el.containerId) {
      const container = nachId.get(el.containerId);
      if (!container) {
        befunde.error("bindung", `Text verweist auf Container "${el.containerId}", den es nicht gibt`, el.id);
      } else if (!FORM_TYPEN.includes(container.type)) {
        befunde.error("bindung", `Text "${el.id}" verweist auf Container "${el.containerId}" vom Typ "${container.type}" — erlaubt sind nur ${FORM_TYPEN.join(", ")}`, el.id);
      } else if (!(container.boundElements ?? []).some((b) => b.id === el.id && b.type === "text")) {
        befunde.error("bindung", `Container "${container.id}" führt den gebundenen Text "${el.id}" nicht in boundElements`, el.id);
      }
    }

    // Gegenrichtung: jeder in boundElements genannte Text muss existieren, tatsächlich
    // vom Typ "text" sein (nicht nur mit type: "text" markiert) und zurückzeigen.
    for (const bezug of el.boundElements ?? []) {
      if (bezug.type !== "text") continue;
      const text = nachId.get(bezug.id);
      if (!text) {
        befunde.error("bindung", `boundElements nennt Text "${bezug.id}", den es nicht gibt`, el.id);
      } else if (text.type !== "text") {
        befunde.error("bindung", `boundElements führt "${bezug.id}" als Text, tatsächlich ist es vom Typ "${text.type}"`, el.id);
      } else if (text.containerId !== el.id) {
        befunde.error("bindung", `Text "${bezug.id}" zeigt nicht auf seinen Container "${el.id}" zurück`, el.id);
      }
    }

    if (el.frameId !== null && el.frameId !== undefined && !frameIds.has(el.frameId)) {
      befunde.error("frame", `frameId "${el.frameId}" verweist auf keinen existierenden Frame`, el.id);
    }

    if (typeof el.index !== "string" || el.index.length === 0) {
      befunde.error("reihenfolge", "index fehlt oder ist leer", el.id);
    }
  }

  // z-Reihenfolge: die index-Werte müssen in Array-Reihenfolge aufsteigen. Element und
  // Index bleiben hier als Paar zusammen — ein Filtern auf reine index-Strings (wie
  // zuvor) würde bei fehlendem index an fremder Stelle die Positionen von gefiltertem
  // und ungefiltertem Array auseinanderlaufen lassen und die Meldung am falschen
  // Element verankern (Fix-Durchgang 1, Review-Finding 3).
  const mitIndex = elemente
    .map((element) => ({ element, index: element.index }))
    .filter((paar) => typeof paar.index === "string");
  for (let i = 1; i < mitIndex.length; i++) {
    if (mitIndex[i].index <= mitIndex[i - 1].index) {
      // Kein break: jede gebrochene Nachbarschaft wird einzeln gemeldet, damit der
      // Nutzer alle betroffenen Elemente gegenprüfen kann statt nur eines beliebigen
      // (Fix-Durchgang 1, Review-Finding 3 — die alte Ein-Meldung-genügt-Annahme
      // scheiterte schon daran, dass diese eine Meldung das falsche Element nannte).
      befunde.error(
        "reihenfolge",
        `z-Index "${mitIndex[i].index}" steigt nicht gegenüber "${mitIndex[i - 1].index}"`,
        mitIndex[i].element.id ?? null,
      );
    }
  }
}

/**
 * Abgleich mit der Sektion "## Text Elements" — Obsidians Suchindex. Fehlt dort
 * ein Textelement, ist es in Obsidian unauffindbar; steht dort ein Eintrag zu
 * viel, zeigt die Suche auf ein Element, das es nicht gibt.
 */
export function checkTextIndex(elemente, markdown, befunde) {
  const imIndex = new Set(markdownToScene(markdown).sektionen.textElemente);
  const textIds = elemente.filter((e) => e.type === "text").map((e) => e.id);

  for (const id of textIds) {
    if (!imIndex.has(id)) {
      befunde.error("textindex", `Textelement "${id}" fehlt in der Sektion "## Text Elements" — in Obsidian nicht auffindbar`, id);
    }
  }

  const vorhandene = new Set(textIds);
  for (const id of imIndex) {
    if (!vorhandene.has(id)) {
      befunde.error("textindex", `Der Index nennt "${id}", wozu es kein Textelement gibt`, id);
    }
  }
}
