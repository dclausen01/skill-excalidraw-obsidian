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

/** Serialisiert eine Szene als vollständige .excalidraw.md. */
export function sceneToMarkdown(szene, { pluginVersion = readPluginVersion() } = {}) {
  const elements = szene.elements();

  const teile = [FRONTMATTER, "", WARNUNG, "", "", "# Excalidraw Data", "", "## Text Elements"];

  // Obsidians Suchindex: jedes Textelement mit seiner Blockreferenz.
  for (const el of elements.filter((e) => e.type === "text")) {
    teile.push(`${el.rawText} ^${el.id}`, "");
  }

  teile.push(
    "%%",
    "## Drawing",
    "```json",
    JSON.stringify(
      {
        type: "excalidraw",
        version: 2,
        source: `https://github.com/zsviczian/obsidian-excalidraw-plugin/releases/tag${pluginVersion}`,
        elements,
        appState: appState(),
        files: {},
      },
      null,
      2,
    ),
    "```",
    "%%",
  );

  return `${teile.join("\n")}\n`;
}

/** Liest eine bestehende Datei ein — Grundlage für den Bearbeiten-Pfad. */
export function markdownToScene(markdown) {
  const { json } = extractDrawing(markdown);
  const { elements = [], appState: state = {} } = JSON.parse(json);

  const textElemente = [...markdown.matchAll(/^(.+) \^([A-Za-z0-9]{8})$/gm)].map((m) => m[2]);
  const elementLinks = Object.fromEntries(
    [...markdown.matchAll(/^([A-Za-z0-9]{8}): (\[\[.+?\]\])$/gm)].map((m) => [m[1], m[2]]),
  );
  const embeddedFiles = Object.fromEntries(
    [...markdown.matchAll(/^([0-9a-f]{40}): (\[\[.+?\]\])$/gm)].map((m) => [m[1], m[2]]),
  );

  return { elements, appState: state, sektionen: { textElemente, elementLinks, embeddedFiles } };
}
