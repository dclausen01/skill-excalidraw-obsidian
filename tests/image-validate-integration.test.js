import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";

// Muss VOR jedem Import gesetzt sein, der lib/config.js einzieht — dort wird
// VAULT_PATH einmalig aus process.env.TAFELBILDER_VAULT gelesen (Modul-Ebene,
// nicht neu ausgewertet). Vitest isoliert Modul-Register pro Testdatei, daher
// ist der Eingriff hier auf diese Datei beschränkt.
const VAULT = path.join(process.cwd(), "tests", "fixtures");
process.env.TAFELBILDER_VAULT = VAULT;

const { scene } = await import("../lib/scene.js");
const { sceneToMarkdown } = await import("../lib/document.js");
const { validateScene } = await import("../lib/validate/index.js");
const { PROJECT_ROOT } = await import("../lib/config.js");

const BILD_ABSOLUT = path.join(PROJECT_ROOT, "tests", "fixtures", "testbild.png");
const SHA1 = crypto.createHash("sha1").update(fs.readFileSync(BILD_ABSOLUT)).digest("hex");

describe("f.image mit relativem Pfad", () => {
  it("löst relativ zum Vault (VAULT_PATH) auf, nicht relativ zu process.cwd()", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    // "testbild.png" ist relativ — muss gegen VAULT_PATH (tests/fixtures) aufgelöst
    // werden, nicht gegen process.cwd() (Projektwurzel, wo die Datei nicht liegt).
    const bild = f.image("testbild.png", { x: 0, y: 0, breite: 400 });
    expect(bild.element.fileId).toBe(SHA1);
  });
});

describe("f.image mit absolutem Pfad bleibt unverändert", () => {
  it("liest die Datei unter dem absoluten Pfad direkt", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    const bild = f.image(BILD_ABSOLUT, { x: 0, y: 0, breite: 400 });
    expect(bild.element.fileId).toBe(SHA1);
  });
});

describe("Bild + Validator Ende-zu-Ende", () => {
  it("erzeugt keine harten bildreferenz-Fehler für ein Bild, das im Vault liegt", () => {
    const s = scene();
    const f = s.frame("Kapitel");
    f.text("Titel", { typo: "frametitel", x: 60, y: 55 });
    f.box("Kernbegriff", { rolle: "kern", typo: "kernbegriff", x: 120, y: 300 });
    f.image(BILD_ABSOLUT, { x: 700, y: 300, breite: 300 });

    const markdown = sceneToMarkdown(s, { pluginVersion: "x" });
    const ergebnis = validateScene(s.elements(), { markdown, vaultPath: VAULT });

    const harteBildFehler = ergebnis.findings.filter(
      (b) => b.regel === "bildreferenz" && b.schwere === "fehler",
    );
    expect(harteBildFehler).toEqual([]);
  });
});
