import { extractDrawing } from "./compress.js";
import { readPluginVersion } from "./environment.js";

const FRONTMATTER = [
  "---",
  "excalidraw-plugin: parsed",
  "tags:",
  "  - excalidraw",
  `excalidraw-onload-script: "\\"if (app.isMobile) ea.getExcalidrawAPI().setActiveTool({type: 'hand'})\\""`,
  "---",
].join("\n");

const WARNUNG =
  "==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠== " +
  "You can decompress Drawing data with the command palette: 'Decompress current Excalidraw file'. " +
  "For more info check in plugin settings under 'Saving'";

function appState() {
  return {
    theme: "light",
    viewBackgroundColor: "#ffffff",
    currentItemStrokeColor: "#1e1e1e",
    currentItemBackgroundColor: "transparent",
    currentItemFillStyle: "solid",
    currentItemStrokeWidth: 2,
    currentItemStrokeStyle: "solid",
    currentItemRoughness: 1,
    currentItemOpacity: 100,
    currentItemFontFamily: 6,
    currentItemFontSize: 24,
    currentItemTextAlign: "left",
    currentItemRoundness: "round",
    gridSize: 20,
    gridStep: 5,
    gridModeEnabled: false,
    objectsSnapModeEnabled: false,
  };
}

/** Das Szenen-JSON-Objekt, wie es im Drawing-Block der Datei steht. */
export function sceneToObject(szene, { pluginVersion = readPluginVersion() } = {}) {
  return {
    type: "excalidraw",
    version: 2,
    source: `https://github.com/zsviczian/obsidian-excalidraw-plugin/releases/tag${pluginVersion}`,
    elements: szene.elements(),
    appState: appState(),
    files: {},
  };
}

/** Serialisiert eine Szene als vollständige .excalidraw.md. */
export function sceneToMarkdown(szene, { pluginVersion = readPluginVersion() } = {}) {
  const elements = szene.elements();

  // FRONTMATTER endet bereits auf "---" — der Warnhinweis folgt direkt
  // danach, ohne Leerzeile. So schreibt das echte Plugin die Datei.
  const teile = [FRONTMATTER, WARNUNG, "", "", "# Excalidraw Data", "", "## Text Elements"];

  // Obsidians Suchindex: jedes Textelement mit seiner Blockreferenz.
  for (const el of elements.filter((e) => e.type === "text")) {
    teile.push(`${el.rawText} ^${el.id}`, "");
  }

  teile.push(
    "%%",
    "## Drawing",
    "```json",
    JSON.stringify(sceneToObject(szene, { pluginVersion }), null, 2),
    "```",
    "%%",
  );

  return `${teile.join("\n")}\n`;
}

/**
 * Schneidet den Inhalt einer Sektion aus der Markdown-Datei heraus, ohne die
 * Überschriftszeile selbst. Das Dateilayout ist fix: Frontmatter, Warnhinweis,
 * "# Excalidraw Data", "## Text Elements", optional "## Element Links" und
 * "## Embedded Files", dann "%%", dann "## Drawing". Eine Sektion endet also
 * an einer der bekannten Folge-Überschriften oder an der "%%"-Zeile — je
 * nachdem, was zuerst kommt. Fehlt die Überschrift, ist die Sektion leer.
 *
 * Die Grenze ist bewusst auf die exakten, bekannten Überschriften verankert
 * ("## Element Links", "## Embedded Files", "## Drawing") statt auf ein
 * generisches "## .*"-Muster. Letzteres wurde von Elementinhalt getäuscht,
 * der zufällig mit "## " beginnt (z. B. bei einem Nutzer, der
 * Markdown-Überschriften unterrichtet) — die Sektion wurde dann mitten im
 * Element abgeschnitten und der echte Indexeintrag ging verloren
 * (Fix-Durchgang 2, reproduziertes Fehlerbild 2).
 *
 * Restrisiko, bewusst in Kauf genommen: Enthält Elementinhalt eine Zeile, die
 * exakt einer dieser vier Zeichenketten entspricht, schneidet die Sektion
 * trotzdem dort ab. Dieses Restrisiko ist durch die Wortwahl vernachlässigbar
 * klein geworden — anders als beim alten "## .*"-Muster, das jede beliebige
 * Überschrift traf.
 */
function abschnitt(markdown, ueberschrift) {
  const start = markdown.match(new RegExp(`^${ueberschrift}$`, "m"));
  if (!start) return "";

  const rest = markdown.slice(start.index + start[0].length);
  const ende = rest.match(/^(?:## Element Links|## Embedded Files|## Drawing|%%)$/m);
  return ende ? rest.slice(0, ende.index) : rest;
}

/**
 * HEURISTIK, kein verlässlicher Parser — siehe checkTextIndex in
 * lib/validate/structure.js für die verlässliche Gegenprüfung. sceneToMarkdown
 * trennt die Blöcke der Text Elements-Sektion durch je eine Leerzeile
 * (teile.push(`${el.rawText} ^${el.id}`, "")). Innerhalb eines Blocks kann
 * rawText selbst mehrzeilig sein — nur die jeweils LETZTE Zeile trägt die
 * Blockreferenz "^id", alle vorherigen Zeilen sind reiner Elementinhalt.
 * Diese Funktion zerlegt die Sektion an Doppel-Leerzeilen in Blöcke und
 * liefert je Block nur die letzte, nicht-leere Zeile.
 *
 * Das Splitten auf /\n{2,}/ kann selbst getäuscht werden: Enthält rawText
 * einen Absatzumbruch (also selbst eine Leerzeile), zerfällt EIN Element in
 * zwei vermeintliche Blöcke, und der erste kann wie ein Phantom-Indexeintrag
 * aussehen, wenn seine letzte Zeile zufällig auf " ^xxxxxxxx" endet
 * (Fix-Durchgang 2, reproduziertes Fehlerbild 1). Kein Muster über freien
 * Text lässt sich wasserdicht machen — deshalb liefert diese Funktion nur
 * noch das Material für die Rückrichtungs-WARNUNG in checkTextIndex (Index
 * nennt eine ID ohne Element), nicht mehr für einen harten Fehler.
 */
function letzteZeilenProBlock(sektionsText) {
  return sektionsText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => block.split("\n").at(-1));
}

/**
 * Roher, ungeparster Text der "## Text Elements"-Sektion. Grundlage für die
 * verlässliche Vorwärtsprüfung in checkTextIndex: dort wird pro Textelement
 * nach der einen konkreten Zeile gesucht, die es laut Serialisierungsformat
 * erzeugt haben muss ("<letzte Zeile von rawText> ^<id>"). Eine gezielte
 * Suche nach einer bekannten, spezifischen Zeichenkette lässt sich nicht vom
 * Inhalt anderer Elemente täuschen — anders als der Versuch, die Sektion
 * generisch in eine Liste zu zerlegen (siehe letzteZeilenProBlock oben).
 */
export function textElementeSektion(markdown) {
  return abschnitt(markdown, "## Text Elements");
}

/** Liest eine bestehende Datei ein — Grundlage für den Bearbeiten-Pfad. */
export function markdownToScene(markdown) {
  const { json } = extractDrawing(markdown);
  const { elements = [], appState: state = {} } = JSON.parse(json);

  const textElementeAbschnitt = textElementeSektion(markdown);
  const elementLinksAbschnitt = abschnitt(markdown, "## Element Links");
  const embeddedFilesAbschnitt = abschnitt(markdown, "## Embedded Files");

  const textElemente = letzteZeilenProBlock(textElementeAbschnitt)
    .map((zeile) => zeile.match(/^(.+) \^([A-Za-z0-9]{8})$/))
    .filter(Boolean)
    .map((m) => m[2]);
  const elementLinks = Object.fromEntries(
    [...elementLinksAbschnitt.matchAll(/^([A-Za-z0-9]{8}): (\[\[.+?\]\])$/gm)].map((m) => [
      m[1],
      m[2],
    ]),
  );
  const embeddedFiles = Object.fromEntries(
    [...embeddedFilesAbschnitt.matchAll(/^([0-9a-f]{40}): (\[\[.+?\]\])$/gm)].map((m) => [
      m[1],
      m[2],
    ]),
  );

  return { elements, appState: state, sektionen: { textElemente, elementLinks, embeddedFiles } };
}
