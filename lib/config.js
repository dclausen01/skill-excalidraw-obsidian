import path from "node:path";
import { fileURLToPath } from "node:url";

const HIER = path.dirname(fileURLToPath(import.meta.url));

/** Wurzel des Skill-Projekts (eine Ebene über lib/). */
export const PROJECT_ROOT = path.resolve(HIER, "..");

/** Obsidian-Vault mit den Tafelbildern. */
export const VAULT_PATH = process.env.TAFELBILDER_VAULT ?? "/Users/dennis/Tafelbilder";

/** Kopierte Schrift-Subsets für die Messung. */
export const FONT_DIR = path.join(PROJECT_ROOT, "assets", "fonts");

/** Manifest des Excalidraw-Plugins — Quelle der Versionsnummer im Szenen-JSON. */
export const PLUGIN_MANIFEST = path.join(
  VAULT_PATH, ".obsidian", "plugins", "obsidian-excalidraw-plugin", "manifest.json",
);

export const REQUIRED_NODE_MAJOR = 20;
