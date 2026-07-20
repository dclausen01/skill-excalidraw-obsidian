import fs from "node:fs";
import { VAULT_PATH, FONT_DIR, PLUGIN_MANIFEST, REQUIRED_NODE_MAJOR } from "./config.js";

/** @typedef {{ name: string, ok: boolean, message: string }} Check */

export function checkNode(version = process.versions.node) {
  const major = Number.parseInt(version.split(".")[0], 10);
  const ok = major >= REQUIRED_NODE_MAJOR;
  return {
    name: "Node-Version",
    ok,
    message: ok
      ? `Node ${version}`
      : `Node ${version} ist zu alt — benötigt wird mindestens ${REQUIRED_NODE_MAJOR}.`,
  };
}

export function checkVault(pfad = VAULT_PATH) {
  const ok = fs.existsSync(pfad) && fs.statSync(pfad).isDirectory();
  return {
    name: "Vault",
    ok,
    message: ok ? pfad : `Vault nicht gefunden unter ${pfad}. Pfad über TAFELBILDER_VAULT setzen.`,
  };
}

export function checkFonts(dir = FONT_DIR) {
  const vorhanden = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".woff2")).length
    : 0;
  const ok = vorhanden > 0;
  return {
    name: "Schriften",
    ok,
    message: ok
      ? `${vorhanden} Schrift-Subsets in ${dir}`
      : `Keine Schriften in ${dir}. Abhilfe: npm run sync-fonts`,
  };
}

export function readPluginVersion(manifestPfad = PLUGIN_MANIFEST) {
  const roh = fs.readFileSync(manifestPfad, "utf8");
  const { version } = JSON.parse(roh);
  if (!version) throw new Error(`Keine Version in ${manifestPfad}`);
  return version;
}

export function runAllChecks() {
  const checks = [checkNode(), checkVault(), checkFonts()];
  try {
    checks.push({ name: "Plugin", ok: true, message: `Excalidraw-Plugin ${readPluginVersion()}` });
  } catch (fehler) {
    checks.push({ name: "Plugin", ok: false, message: `Manifest nicht lesbar: ${fehler.message}` });
  }
  return { ok: checks.every((c) => c.ok), checks };
}
