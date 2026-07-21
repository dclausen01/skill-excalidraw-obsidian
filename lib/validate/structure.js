import { markdownToScene, textElementeSektion } from "../document.js";

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

/**
 * Erkennt Elementtypen und Schriften, die dieser Skill nicht selbst erzeugt —
 * z. B. freedraw, line, arrow, image, embeddable, iframe, magicframe, oder
 * fontFamily außerhalb von Excalifont/Nunito wie Virgil (1). Ein Vault-Lauf über
 * 632 echte Boards zeigte: das sind ganz normale, von Hand gezeichnete oder
 * ältere Boards, keine kaputten Dateien — nur beurteilt dieser Validator
 * ausschließlich, was dieser Skill selbst produzieren kann (siehe
 * Fix-Durchgang 1, Task-7-Report). validateScene() nutzt das Ergebnis, um
 * einen Scope-Hinweis voranzustellen und Prüfungen zu überspringen, die
 * Stilkonventionen DIESES Skills voraussetzen (siehe dort).
 *
 * Reihenfolge der Ergebnislisten ist Erstauftritt im Elemente-Array, nicht
 * alphabetisch oder numerisch — deterministisch bei deterministischer
 * Eingabe, und konsistent mit der Aufnahmereihenfolge von createFindings().
 */
export function detectOutOfScope(elemente) {
  const fremdeTypen = new Set();
  const fremdeSchriften = new Set();

  for (const el of elemente) {
    if (!ERLAUBTE_TYPEN.includes(el.type)) fremdeTypen.add(el.type);
    if (el.type === "text" && el.fontFamily !== undefined && !ERZEUGTE_SCHRIFTEN.includes(el.fontFamily)) {
      fremdeSchriften.add(el.fontFamily);
    }
  }

  return { fremdeTypen: [...fremdeTypen], fremdeSchriften: [...fremdeSchriften] };
}

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

  // z-Reihenfolge: die index-Werte SOLLEN in Array-Reihenfolge aufsteigen, wenn
  // dieser Skill die Szene baut — lib/scene.js vergibt Indizes exakt in
  // Array-Reihenfolge, ein Verstoß zeigt also einen Bug im eigenen Generator an.
  // Das ist aber eine Erzeugungs-KONVENTION dieses Skills, kein Excalidraw-
  // Formaterfordernis: Excalidraw sortiert beim Laden selbst nach index, Array-
  // Reihenfolge ist ihm gleichgültig. Ein Vault-Lauf über 618 echte, im
  // Alltag funktionierende Boards zeigte 90 Dateien mit genau diesem
  // "Verstoß" — ein hartes error hätte also reihenweise echte, unkaputte
  // Boards blockiert. Deshalb nur noch eine Warnung (Fix-Durchgang 1,
  // Task-7-Report, Finding 3): sie bleibt sichtbar (fängt weiterhin einen
  // Bug im eigenen Generator ab), setzt aber ok nicht auf false.
  //
  // Element und Index bleiben als Paar zusammen — ein Filtern auf reine
  // index-Strings würde bei fehlendem index an fremder Stelle die Positionen
  // von gefiltertem und ungefiltertem Array auseinanderlaufen lassen und die
  // Meldung am falschen Element verankern (Fix-Durchgang 1, Review-Finding 3).
  const mitIndex = elemente
    .map((element) => ({ element, index: element.index }))
    .filter((paar) => typeof paar.index === "string");
  for (let i = 1; i < mitIndex.length; i++) {
    if (mitIndex[i].index <= mitIndex[i - 1].index) {
      // Kein break: jede gebrochene Nachbarschaft wird einzeln gemeldet, damit der
      // Nutzer alle betroffenen Elemente gegenprüfen kann statt nur eines beliebigen
      // (Fix-Durchgang 1, Review-Finding 3 — die alte Ein-Meldung-genügt-Annahme
      // scheiterte schon daran, dass diese eine Meldung das falsche Element nannte).
      befunde.warn(
        "reihenfolge",
        `z-Index "${mitIndex[i].index}" steigt nicht gegenüber "${mitIndex[i - 1].index}" — ` +
          `kein Excalidraw-Formatfehler (Excalidraw sortiert selbst nach index), sondern ein ` +
          `Hinweis auf eine verletzte Erzeugungs-Konvention dieses Skills`,
        mitIndex[i].element.id ?? null,
      );
    }
  }
}

/**
 * Abgleich mit der Sektion "## Text Elements" — Obsidians Suchindex.
 *
 * Vorwärtsrichtung (fehlt ein Textelement im Index?) bleibt ein harter
 * FEHLER, denn fehlt der Eintrag, ist das Element in Obsidian unauffindbar —
 * das lässt sich zweifelsfrei feststellen. Statt die Sektion in eine Liste zu
 * zerlegen (angreifbar durch beliebigen Elementinhalt, der wie ein
 * Indexeintrag oder eine Überschrift aussieht — siehe Fix-Durchgang 2,
 * reproduzierte Fehlerbilder 1 und 2), wird pro Element gezielt nach der
 * einen konkreten Zeile gesucht, die es laut Serialisierungsformat erzeugt
 * haben muss: die letzte Zeile seines rawText, gefolgt von " ^" und seiner
 * id. Diese eine bekannte Nadel im Sektionstext kann nicht durch den Inhalt
 * ANDERER Elemente getäuscht werden.
 *
 * Rückrichtung (nennt der Index eine ID ohne Element?) ist nur noch eine
 * WARNUNG. Sie stützt sich auf markdownToScene()s Heuristik
 * (letzteZeilenProBlock in lib/document.js), die selbst durch Elementinhalt
 * getäuscht werden kann (z. B. ein Absatzumbruch, der zufällig wie die
 * Blocktrennung aussieht). Ein FEHLER an dieser Stelle würde ein gültiges
 * Board blockieren — schlimmer als ein übersehener Phantom-Eintrag.
 */
export function checkTextIndex(elemente, markdown, befunde) {
  const sektionstext = textElementeSektion(markdown);
  const textElemente = elemente.filter((e) => e.type === "text");

  for (const el of textElemente) {
    const letzteZeile = String(el.rawText ?? "").split("\n").at(-1);
    const erwarteteZeile = `${letzteZeile} ^${el.id}`;
    if (!sektionstext.includes(erwarteteZeile)) {
      befunde.error("textindex", `Textelement "${el.id}" fehlt in der Sektion "## Text Elements" — in Obsidian nicht auffindbar`, el.id);
    }
  }

  const vorhandene = new Set(textElemente.map((e) => e.id));
  const imIndex = new Set(markdownToScene(markdown).sektionen.textElemente);
  for (const id of imIndex) {
    if (!vorhandene.has(id)) {
      befunde.warn(
        "textindex",
        `Der Index nennt "${id}", wozu es kein Textelement gibt — kann ein Fehlalarm sein, falls Elementtext zufällig wie eine Obsidian-Blockreferenz aussieht`,
        id,
      );
    }
  }
}
