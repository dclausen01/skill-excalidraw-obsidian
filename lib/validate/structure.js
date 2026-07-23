import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { markdownToScene, textElementeSektion } from "../document.js";

/**
 * Felder, ohne die ein Element kein gültiges Excalidraw-Element ist: Kern-
 * Geometrie/Identität (id, type, x, y, width, height), Stil (angle,
 * strokeColor, ..., roundness) und interne Buchführung, die die Excalidraw-
 * Anwendung selbst auf jedem Element führt (groupIds, seed, version,
 * versionNonce, isDeleted, boundElements, updated, locked). Fehlt eins davon,
 * ist die Datei tatsächlich kaputt — ein harter Fehler bleibt angemessen.
 */
const FORMAT_PFLICHTFELDER = [
  "id", "type", "x", "y", "width", "height", "angle", "strokeColor",
  "backgroundColor", "fillStyle", "strokeWidth", "strokeStyle", "roughness",
  "opacity", "groupIds", "seed", "version", "versionNonce",
  "isDeleted", "boundElements", "updated", "locked", "roundness",
];

/**
 * Felder, die DIESER SKILL beim Erzeugen immer setzt, die das Excalidraw-
 * Format selbst aber nicht verlangt — jüngere, optionale Zusatzfelder für
 * Frames (frameId), fraktionale z-Reihenfolge (index) und Links (link).
 * Gelten für alle Typen, siehe ZUSATZKONVENTIONSFELDER für typspezifische
 * Ergänzungen. Fehlt eins davon, ist die Datei nicht automatisch kaputt —
 * nur nicht (oder nicht vollständig) von diesem Skill erzeugt: ältere oder
 * von Hand gebaute Boards kennen diese Felder oft schlicht nicht.
 *
 * Vault-Beleg (632 Boards, alle öffnen anstandslos in Obsidian): index fehlt
 * 971×, frameId 218×, link 307× (siehe ZUSATZKONVENTIONSFELDER.text unten für
 * hasTextLink/autoResize). Test der Zugehörigkeit zu dieser Liste statt zu
 * FORMAT_PFLICHTFELDER: würde Excalidraw/Obsidian an einer fehlenden
 * Ausprägung tatsächlich scheitern? Für diese drei Felder nein — die Skill-
 * eigenen Fabriken (lib/elements.js basisFelder) setzen sie immer, aber ein
 * fehlender Wert bedeutet für Excalidraw selbst nur "kein Frame"/"unsortiert
 * am Ende"/"kein Link", keinen Ladefehler. Siehe Task-7-Report,
 * Schlussprüfung, Findings C+D für die volle Herleitung. Dieselbe Liste
 * fließt in detectOutOfScope() ein: ein Element, dem eines dieser Felder
 * fehlt, wurde vermutlich nicht von diesem Skill erzeugt — ein deutlich
 * verlässlicheres Provenienzsignal als Elementtyp/Schrift allein (Finding D).
 */
const KONVENTIONSFELDER = ["frameId", "index", "link"];

/** Zusatzfelder je Typ, die das Excalidraw-Format tatsächlich verlangt. */
const ZUSATZFELDER = {
  text: ["text", "rawText", "originalText", "fontSize", "fontFamily", "lineHeight",
         "textAlign", "verticalAlign", "containerId"],
  frame: ["name"],
  rectangle: [],
  ellipse: [],
  diamond: [],
  arrow: ["points", "startArrowhead", "endArrowhead", "elbowed",
          "startBinding", "endBinding", "lastCommittedPoint"],
  image: ["fileId", "status", "scale", "crop"],
  line: ["points"],
};

/**
 * Typspezifische Ergänzungen zu KONVENTIONSFELDER — siehe dort für die
 * Herleitung. autoResize/hasTextLink gelten nur für Text: Vault-Beleg
 * hasTextLink fehlt 2750×, autoResize 591×.
 */
const ZUSATZKONVENTIONSFELDER = {
  text: ["autoResize", "hasTextLink"],
};

/** Nur diese Typen erzeugt Stufe 1. Alles andere kann der Validator nicht beurteilen. */
const ERLAUBTE_TYPEN = Object.keys(ZUSATZFELDER);

/**
 * Typen, die gebundenen Text als Container tragen dürfen. Text und Frame nicht.
 * arrow gehört dazu, seit connect() ein Pfeil-Label anbietet: Excalidraw bindet
 * ein Pfeil-Label genauso wie Formtext — containerId zeigt auf den Pfeil, der
 * Pfeil führt das Label seinerseits in boundElements (siehe scene.js connect()).
 */
const FORM_TYPEN = ["rectangle", "ellipse", "diamond", "arrow"];

const AUFZAEHLUNGEN = {
  fillStyle: ["solid", "hachure", "cross-hatch", "zigzag"],
  strokeStyle: ["solid", "dashed", "dotted"],
  textAlign: ["left", "center", "right"],
  verticalAlign: ["top", "middle", "bottom"],
};

/** Der Skill erzeugt ausschließlich Excalifont und Nunito. */
const ERZEUGTE_SCHRIFTEN = [5, 6];

/**
 * Erkennt Elementtypen, Schriften und fehlende Konventionsfelder, die zeigen,
 * dass dieser Skill ein Element nicht selbst erzeugt hat — z. B. freedraw,
 * line, arrow, image, embeddable, iframe, magicframe, fontFamily außerhalb
 * von Excalifont/Nunito wie Virgil (1), oder ein fehlendes frameId/index/link
 * (bzw. bei Text zusätzlich autoResize/hasTextLink, siehe KONVENTIONSFELDER/
 * ZUSATZKONVENTIONSFELDER oben). Ein Vault-Lauf über 632 echte Boards zeigte:
 * das sind ganz normale, von Hand gezeichnete oder ältere Boards, keine
 * kaputten Dateien — nur beurteilt dieser Validator ausschließlich, was
 * dieser Skill selbst produzieren kann (siehe Fix-Durchgang 1, Task-7-Report).
 * validateScene() nutzt das Ergebnis, um einen Scope-Hinweis voranzustellen
 * und Prüfungen zu überspringen, die Stilkonventionen DIESES Skills
 * voraussetzen (siehe dort).
 *
 * Elementtyp allein war dabei unvollständig (Finding D): 5 von 632 echten
 * Boards nutzten ausschließlich erlaubte Typen/Schriften, waren aber trotzdem
 * von Hand gebaut — sie blieben fälschlich "in scope" und liefen in harte
 * Fehler statt in den Scope-Hinweis. Fehlende Konventionsfelder sind ein
 * unabhängiges, zusätzliches Provenienzsignal: nur die Fabriken dieses Skills
 * (lib/elements.js) setzen sie auf jedem erzeugten Element zuverlässig.
 * Konventionsfelder werden dabei nur bei ohnehin erlaubten Typen geprüft —
 * bei einem schon über den Typ fremden Element (z. B. arrow) sind sie
 * gar nicht definiert und ihr Fehlen ist kein zusätzliches Signal.
 *
 * Reihenfolge der Ergebnislisten ist Erstauftritt im Elemente-Array, nicht
 * alphabetisch oder numerisch — deterministisch bei deterministischer
 * Eingabe, und konsistent mit der Aufnahmereihenfolge von createFindings().
 */
export function detectOutOfScope(elemente) {
  const fremdeTypen = new Set();
  const fremdeSchriften = new Set();
  const fehlendeKonventionsfelder = new Set();

  for (const el of elemente) {
    if (!ERLAUBTE_TYPEN.includes(el.type)) {
      fremdeTypen.add(el.type);
      continue; // Konventionsfelder sind für einen fremden Typ nicht definiert.
    }

    if (el.type === "text" && el.fontFamily !== undefined && !ERZEUGTE_SCHRIFTEN.includes(el.fontFamily)) {
      fremdeSchriften.add(el.fontFamily);
    }

    for (const feld of [...KONVENTIONSFELDER, ...(ZUSATZKONVENTIONSFELDER[el.type] ?? [])]) {
      if (el[feld] === undefined) fehlendeKonventionsfelder.add(feld);
    }
  }

  return {
    fremdeTypen: [...fremdeTypen],
    fremdeSchriften: [...fremdeSchriften],
    fehlendeKonventionsfelder: [...fehlendeKonventionsfelder],
  };
}

export function checkSchema(elemente, befunde) {
  for (const el of elemente) {
    const id = el.id ?? null;

    if (!ERLAUBTE_TYPEN.includes(el.type)) {
      befunde.error("schema", `Unbekannter Elementtyp "${el.type}" — Stufe 1 erzeugt nur ${ERLAUBTE_TYPEN.join(", ")}`, id);
      continue; // Ohne bekannten Typ sind die Feldprüfungen sinnlos.
    }

    for (const feld of [...FORMAT_PFLICHTFELDER, ...ZUSATZFELDER[el.type]]) {
      if (el[feld] === undefined) {
        befunde.error("schema", `Pflichtfeld "${feld}" fehlt an einem Element vom Typ ${el.type}`, id);
      }
    }

    // Konventionsfelder (siehe KONVENTIONSFELDER oben): DIESER SKILL setzt sie
    // immer, das Excalidraw-Format verlangt sie aber nicht — fehlen sie, ist das
    // Element nicht automatisch kaputt, nur vermutlich nicht (vollständig) von
    // diesem Skill erzeugt. Deshalb eine Warnung statt eines harten Fehlers, im
    // Ton der bestehenden reihenfolge-Warnung (Fix-Durchgang 1, Finding 3).
    for (const feld of [...KONVENTIONSFELDER, ...(ZUSATZKONVENTIONSFELDER[el.type] ?? [])]) {
      if (el[feld] === undefined) {
        befunde.warn(
          "schema",
          `Feld "${feld}" fehlt an einem Element vom Typ ${el.type} — kein Excalidraw-Formatfehler ` +
            "(ältere oder von Hand erzeugte Boards lassen es oft weg), sondern eine Erzeugungs-Konvention dieses Skills",
          id,
        );
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

    // Nur der Fall, den checkSchema NICHT abdeckt: index ist vorhanden, aber leer
    // oder kein String. Ein komplett fehlendes index-Feld meldet bereits checkSchema
    // (index ist seit Finding C ein Konventionsfeld, siehe KONVENTIONSFELDER oben) —
    // ohne diese Einschränkung würde ein fehlendes index doppelt gemeldet: einmal
    // hier, einmal dort (Schlussprüfung, Finding E). Warnung statt Fehler, damit die
    // reihenfolge-Regel durchgehend eine Härtestufe trägt (vorher trug sie beide:
    // dieser Zweig war ein Fehler, der Ordnungs-Zweig unten schon eine Warnung) —
    // konsistent mit index als Konvention, nicht als Formaterfordernis.
    if (el.index !== undefined && (typeof el.index !== "string" || el.index.length === 0)) {
      befunde.warn("reihenfolge", "index ist vorhanden, aber leer oder kein String", el.id);
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
/**
 * Prüft Pfeil-Bindungen beidseitig. Ein Pfeil nennt seine Ziele in
 * startBinding/endBinding — jedes Ziel muss existieren und den Pfeil seinerseits
 * in boundElements führen. Umgekehrt muss jeder Pfeil-Eintrag in boundElements
 * einer Form ein existierender Pfeil sein, der auf sie zurückzeigt. Beides harte
 * Fehler: eine einseitige Bindung macht die Datei falsch (Stufe 2a klammerte das
 * noch aus, weil es damals keine Pfeile gab — jetzt erzeugt sie connect()).
 */
export function checkArrowBindings(elemente, befunde) {
  const nachId = new Map(elemente.map((e) => [e.id, e]));

  for (const el of elemente) {
    if (el.type !== "arrow") continue;

    // Entarteter Pfeil: Start- und Endpunkt fallen zusammen (width und height
    // beide 0) — meist weil die verbundenen Formen sich überlappen oder ihre
    // zugewandten Kanten exakt aufeinanderliegen (siehe connect.js arrowElement).
    // Kein Formatfehler, nur eine Kompositions-Warnung — sie blockiert nichts.
    if (el.width === 0 && el.height === 0) {
      befunde.warn(
        "pfeilentartet",
        "Pfeil hat keine Länge — Start- und Endpunkt fallen zusammen, die verbundenen Formen überlappen sich vermutlich",
        el.id,
      );
    }

    for (const [rolle, bindung] of [["start", el.startBinding], ["end", el.endBinding]]) {
      if (!bindung) continue;
      const ziel = nachId.get(bindung.elementId);
      if (!ziel) {
        befunde.error("pfeilbindung", `Pfeil ${rolle}Binding verweist auf Element "${bindung.elementId}", das es nicht gibt`, el.id);
      } else if (!(ziel.boundElements ?? []).some((x) => x.id === el.id && x.type === "arrow")) {
        befunde.error("pfeilbindung", `Ziel "${ziel.id}" des Pfeils führt ihn nicht in boundElements`, el.id);
      }
    }
  }

  // Gegenrichtung: jeder Pfeil-Eintrag in boundElements muss ein existierender
  // Pfeil sein, der auf dieses Element zurückzeigt.
  for (const el of elemente) {
    for (const bezug of el.boundElements ?? []) {
      if (bezug.type !== "arrow") continue;
      const pfeil = nachId.get(bezug.id);
      if (!pfeil) {
        befunde.error("pfeilbindung", `boundElements nennt Pfeil "${bezug.id}", den es nicht gibt`, el.id);
      } else if (pfeil.startBinding?.elementId !== el.id && pfeil.endBinding?.elementId !== el.id) {
        befunde.error("pfeilbindung", `Pfeil "${bezug.id}" zeigt nicht auf "${el.id}" zurück`, el.id);
      }
    }
  }
}

/** Sucht rekursiv unter vaultPath nach einer Datei mit exaktem Namen `ziel`
 *  (inkl. Endung) und gibt ihren vollen Pfad zurück, oder `null`, wenn sie
 *  nirgends liegt. Gemeinsamer Kern für notizExistiert (Task 3) und
 *  dateiImVaultFinden (Task 6) — beide unterscheiden sich nur darin, welchen
 *  Dateinamen sie suchen und ob sie einen Pfad oder ein Bool zurückgeben. */
function sucheDateiImVault(vaultPath, ziel) {
  const suche = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      const voll = path.join(dir, e.name);
      if (e.isDirectory()) { const treffer = suche(voll); if (treffer) return treffer; }
      else if (e.name === ziel) return voll;
    }
    return null;
  };
  try { return suche(vaultPath); } catch { return null; }
}

/** Existiert irgendwo unter vaultPath eine Datei "<name>.md"? Obsidian-Links sind
 *  nicht pfadgebunden — der Notizname genügt. */
function notizExistiert(name, vaultPath) {
  return sucheDateiImVault(vaultPath, `${name}.md`) !== null;
}

/** Sucht rekursiv unter vaultPath nach einer Datei mit exaktem Namen (inkl.
 *  Endung) und gibt ihren vollen Pfad zurück, oder `null`. */
function dateiImVaultFinden(name, vaultPath) {
  return sucheDateiImVault(vaultPath, name);
}

/**
 * Prüft, ob ein Element-Link auf eine Notiz zeigt, die im Vault existiert.
 * Bewusst nur eine WARNUNG, kein harter Fehler: Dennis verlinkt womöglich eine
 * Notiz, die er erst noch anlegt — ein gültiger Board-Entwurf darf dadurch
 * nie blockiert werden (konsistent mit der in Stufe 2a gelernten Regel).
 * Obsidian-Links sind nicht pfadgebunden: [[Ordner/Notiz#Abschnitt|Alias]]
 * löst auf den Notiznamen "Notiz" auf.
 */
export function checkNoteLinks(elemente, befunde, { vaultPath }) {
  for (const el of elemente) {
    if (!el.link) continue;
    // [[Ordner/Notiz#Abschnitt|Alias]] → "Notiz"
    const roh = el.link.replace(/^\[\[/, "").replace(/\]\]$/, "");
    const ohneAlias = roh.split("|")[0];
    const ohneAnker = ohneAlias.split("#")[0];
    const name = ohneAnker.split("/").pop().trim();
    if (name && !notizExistiert(name, vaultPath)) {
      befunde.warn("notizlink", `Verlinkte Notiz „${name}" existiert nicht im Vault — toter Link`, el.id);
    }
  }
}

/**
 * Prüft Bild-Referenzen gegen die Sektion "## Embedded Files" und den Vault.
 * Harter Fehler in allen drei Fällen — anders als bei checkNoteLinks (toter
 * Notiz-Link bleibt Warnung, weil die Notiz vielleicht erst noch entsteht):
 * ein Bild-Element ohne Entsprechung im Index, eine fehlende Bilddatei oder
 * ein veränderter Bildinhalt (SHA-1 weicht ab) macht die Datei tatsächlich
 * kaputt — Obsidian zeigt dann kein Bild, oder ein anderes als gemeint.
 */
export function checkImageRefs(elemente, markdown, befunde, { vaultPath }) {
  const zuordnung = markdownToScene(markdown).sektionen.embeddedFiles; // { fileId: "[[name.png]]" }
  for (const el of elemente) {
    if (el.type !== "image") continue;
    const eintrag = zuordnung[el.fileId];
    if (!eintrag) {
      befunde.error("bildreferenz", `Bild-Element hat keine Entsprechung in ## Embedded Files`, el.id);
      continue;
    }
    const name = eintrag.replace(/^\[\[/, "").replace(/\]\]$/, "");
    const pfad = dateiImVaultFinden(name, vaultPath);
    if (!pfad) {
      befunde.error("bildreferenz", `Bilddatei „${name}" existiert nicht im Vault`, el.id);
      continue;
    }
    const sha1 = crypto.createHash("sha1").update(fs.readFileSync(pfad)).digest("hex");
    if (sha1 !== el.fileId) {
      befunde.error("bildreferenz", `SHA-1 von „${name}" stimmt nicht mit fileId überein`, el.id);
    }
  }
}

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
