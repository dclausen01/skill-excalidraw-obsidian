import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { markdownToScene } from "../lib/document.js";
import { VAULT_PATH } from "../lib/config.js";

const REFERENZ = path.join(VAULT_PATH, "FoBi Nextcloud + EuroOffice.excalidraw.md");

describe("markdownToScene", () => {
  const md = fs.readFileSync(REFERENZ, "utf8");
  const gelesen = markdownToScene(md);

  it("liest alle Elemente", () => {
    expect(gelesen.elements).toHaveLength(23);
  });

  it("findet jedes Textelement in der Text-Elements-Sektion wieder", () => {
    const textIds = gelesen.elements.filter((e) => e.type === "text").map((e) => e.id);
    for (const id of textIds) {
      expect(gelesen.sektionen.textElemente).toContain(id);
    }
  });

  it("liest die eingebetteten Bilder mit ihrem SHA-1", () => {
    expect(Object.keys(gelesen.sektionen.embeddedFiles))
      .toContain("0b791c0243821e0971a3d4b2e758f65546e8b6e0");
  });

  it("toleriert alte Schriftwerte", () => {
    // Im Vault kommen fontFamily 1, 2, 3, 7 und 8 vor — das Lesen darf daran nicht scheitern.
    const schriften = new Set(gelesen.elements.filter((e) => e.type === "text").map((e) => e.fontFamily));
    expect(schriften.size).toBeGreaterThan(0);
  });
});
