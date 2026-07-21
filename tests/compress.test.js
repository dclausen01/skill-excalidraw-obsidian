import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { decompress, extractDrawing } from "../lib/compress.js";
import { VAULT_PATH } from "../lib/config.js";

const REFERENZ = path.join(VAULT_PATH, "FoBi Nextcloud + EuroOffice.excalidraw.md");

describe("extractDrawing", () => {
  it("liest eine echte komprimierte Datei aus dem Vault", () => {
    const md = fs.readFileSync(REFERENZ, "utf8");
    const { json, komprimiert } = extractDrawing(md);
    expect(komprimiert).toBe(true);

    const szene = JSON.parse(json);
    expect(szene.type).toBe("excalidraw");
    expect(szene.elements.length).toBe(23);
  });

  it("liest auch einen unkomprimierten Block", () => {
    const md = "# Excalidraw Data\n%%\n## Drawing\n```json\n{\"type\":\"excalidraw\"}\n```\n%%";
    const { json, komprimiert } = extractDrawing(md);
    expect(komprimiert).toBe(false);
    expect(JSON.parse(json).type).toBe("excalidraw");
  });

  it("meldet fehlenden Drawing-Block verständlich", () => {
    expect(() => extractDrawing("# Nur eine Notiz")).toThrow(/Drawing-Block/);
  });
});

describe("decompress", () => {
  it("meldet unbrauchbare Eingabe verständlich", () => {
    expect(() => decompress("!!!kein-base64!!!")).toThrow(/dekomprimieren/);
  });
});
