import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createFindings } from "../lib/validate/findings.js";
import { checkNoteLinks } from "../lib/validate/structure.js";

function element(link) {
  return { id: "aaaaaaaa", type: "rectangle", link };
}

describe("checkNoteLinks", () => {
  const vault = fs.mkdtempSync(path.join(os.tmpdir(), "vault-links-"));
  fs.writeFileSync(path.join(vault, "Existiert.md"), "# da");

  function pruefe(elemente) {
    const b = createFindings();
    checkNoteLinks(elemente, b, { vaultPath: vault });
    return b.all();
  }

  it("akzeptiert einen Link auf eine existierende Notiz", () => {
    expect(pruefe([element("[[Existiert]]")])).toEqual([]);
  });

  it("warnt bei einem Link auf eine fehlende Notiz — als Warnung, nicht als Fehler", () => {
    const befunde = pruefe([element("[[Gibt es nicht]]")]);
    expect(befunde.some((b) => b.regel === "notizlink" && b.schwere === "warnung")).toBe(true);
    expect(befunde.some((b) => b.schwere === "fehler")).toBe(false);
    expect(befunde[0].meldung).toContain("Gibt es nicht");
  });

  it("ignoriert Elemente ohne Link", () => {
    expect(pruefe([element(null)])).toEqual([]);
  });

  it("löst einen Link mit Unterpfad und Anker auf den Dateinamen auf", () => {
    // [[Ordner/Notiz#Abschnitt]] → prüft, ob "Notiz.md" (irgendwo) existiert
    fs.mkdirSync(path.join(vault, "Unter"), { recursive: true });
    fs.writeFileSync(path.join(vault, "Unter", "Tief.md"), "x");
    expect(pruefe([element("[[Tief#Abschnitt]]")])).toEqual([]);
  });
});
