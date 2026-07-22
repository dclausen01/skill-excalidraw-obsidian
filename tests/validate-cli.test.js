import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scene } from "../lib/scene.js";
import { sceneToMarkdown } from "../lib/document.js";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(HIER, "..", "bin", "validate.mjs");

/** Führt die CLI aus und gibt stdout/stderr + Exit-Code zurück, ohne bei Exit≠0 zu werfen. */
function fuehreAus(dateiPfad) {
  try {
    const stdout = execFileSync("node", [BIN, dateiPfad], { encoding: "utf8" });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (e) {
    return { stdout: e.stdout, stderr: e.stderr, exitCode: e.status };
  }
}

function gueltigeSzene() {
  const s = scene();
  const f = s.frame("Kapitel");
  f.text("Der Mensch", { typo: "frametitel", x: 60, y: 60 });
  f.box("Mängelwesen", { rolle: "kern", typo: "kernbegriff", x: 200, y: 400 });
  return s;
}

/** Schreibt eine .excalidraw.md aus einer beliebigen Elementliste (nicht nur aus scene()). */
function schreibeDatei(verzeichnis, name, elemente) {
  const pseudoSzene = { elements: () => elemente };
  const md = sceneToMarkdown(pseudoSzene, { pluginVersion: "2.23.12" });
  const pfad = path.join(verzeichnis, name);
  fs.writeFileSync(pfad, md, "utf8");
  return pfad;
}

describe("bin/validate.mjs", () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-cli-"));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("meldet eine gültige Szene mit Exit-Code 0 und ohne Scope-Hinweis", () => {
    const pfad = schreibeDatei(tmpDir, "gueltig.excalidraw.md", gueltigeSzene().elements());
    const { stdout, exitCode } = fuehreAus(pfad);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Keine Befunde.");
    expect(stdout).not.toContain("Hinweis:");
  });

  it("stellt bei fremden Elementtypen einen Scope-Hinweis voran und nennt den Typ", () => {
    const alle = gueltigeSzene().elements();
    alle.push({ ...alle[0], id: "fremdes-element", type: "line" });
    const pfad = schreibeDatei(tmpDir, "fremd.excalidraw.md", alle);
    const { stdout } = fuehreAus(pfad);

    expect(stdout).toContain("Hinweis:");
    expect(stdout).toContain("line");
    expect(stdout).toContain("stammt also nicht aus diesem Skill");
  });

  it("gibt für eine Datei außerhalb des Skill-Umfangs Exit-Code 2 zurück, nicht 1", () => {
    // Exit-Code 2 ist ein eigenes Signal: "kann ich nicht beurteilen", nicht "ist kaputt".
    // Automatisierung soll das unterscheiden können.
    const alle = gueltigeSzene().elements();
    alle.push({ ...alle[0], id: "fremdes-element", type: "line" });
    const pfad = schreibeDatei(tmpDir, "fremd-exit.excalidraw.md", alle);
    const { exitCode } = fuehreAus(pfad);
    expect(exitCode).toBe(2);
  });

  it("gibt für eine echte, in-scope kaputte Datei weiterhin Exit-Code 1 zurück", () => {
    const alle = gueltigeSzene().elements();
    alle[1].id = alle[0].id; // doppelte ID: ein echter, in-scope harter Fehler
    const pfad = schreibeDatei(tmpDir, "kaputt.excalidraw.md", alle);
    const { stdout, exitCode } = fuehreAus(pfad);
    expect(exitCode).toBe(1);
    expect(stdout).not.toContain("Hinweis:");
  });

  // Schlusspruefung Finding B: Lese-/Parsefehler dürfen nicht als Stacktrace auf
  // Exit-Code 1 landen — das ist der Code für "echter harter Befund", und
  // Automatisierung muss "Datei kaputt/nicht lesbar" davon unterscheiden können.

  it("meldet eine nicht existierende Datei ohne Stacktrace mit Exit-Code 3", () => {
    const pfad = path.join(tmpDir, "gibt-es-nicht.excalidraw.md");
    const { stdout, stderr, exitCode } = fuehreAus(pfad);
    expect(exitCode).toBe(3);
    expect(stdout).not.toContain("Hinweis:");
    expect(stderr).not.toContain("at "); // kein Node-Stacktrace ("at ... (...)")
    expect(stderr).not.toContain("TypeError");
    expect(stderr.length).toBeGreaterThan(0);
  });

  it("meldet eine Nicht-Excalidraw-Datei (kein Drawing-Block) ohne Stacktrace mit Exit-Code 3", () => {
    const pfad = path.join(tmpDir, "notiz.excalidraw.md");
    fs.writeFileSync(pfad, "# Nur eine gewöhnliche Notiz, kein Excalidraw-Inhalt.\n", "utf8");
    const { stdout, stderr, exitCode } = fuehreAus(pfad);
    expect(exitCode).toBe(3);
    expect(stdout).not.toContain("Hinweis:");
    expect(stderr).not.toContain("at ");
    expect(stderr.length).toBeGreaterThan(0);
  });

  it("meldet einen nicht dekomprimierbaren compressed-json-Block ohne Stacktrace mit Exit-Code 3", () => {
    const pfad = path.join(tmpDir, "kaputt-komprimiert.excalidraw.md");
    const inhalt = [
      "---",
      "excalidraw-plugin: parsed",
      "---",
      "",
      "# Excalidraw Data",
      "",
      "## Text Elements",
      "%%",
      "## Drawing",
      "```compressed-json",
      "das-ist-kein-gueltiges-lz-string-base64!!!",
      "```",
      "%%",
      "",
    ].join("\n");
    fs.writeFileSync(pfad, inhalt, "utf8");
    const { stdout, stderr, exitCode } = fuehreAus(pfad);
    expect(exitCode).toBe(3);
    expect(stdout).not.toContain("Hinweis:");
    expect(stderr).not.toContain("at ");
  });

  it("dokumentiert alle vier Exit-Codes im Usage-Text", () => {
    // Aufruf ohne Dateiargument löst den Usage-Text aus.
    let ausgabe;
    try {
      execFileSync("node", [BIN], { encoding: "utf8" });
    } catch (e) {
      ausgabe = e.stderr;
    }
    for (const code of ["0", "1", "2", "3"]) {
      expect(ausgabe).toContain(code);
    }
  });
});
