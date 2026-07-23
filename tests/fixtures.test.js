import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import metriken from "./fixtures/text-metrics.json" with { type: "json" };

const HIER = path.dirname(fileURLToPath(import.meta.url));
const TESTBILD = path.join(HIER, "fixtures", "testbild.png");

const PNG_SIGNATUR = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Zerlegt eine PNG-Datei in ihre Chunks ({ typ, data }) — reicht für IHDR/IDAT,
 * ohne eine Bilddek­odier-Bibliothek zu brauchen. */
function pngChunks(bytes) {
  const chunks = [];
  let offset = PNG_SIGNATUR.length;
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const typ = bytes.toString("ascii", offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    chunks.push({ typ, data });
    offset += 8 + length + 4; // Länge + Typ + Daten + CRC
  }
  return chunks;
}

describe("Referenzdaten zur Textmessung", () => {
  it("enthält genug Proben für Excalifont", () => {
    const excalifont = metriken.proben.filter((p) => p.fontFamily === 5);
    expect(excalifont.length).toBeGreaterThan(200);
  });

  it("enthält Proben mit deutschen Umlauten", () => {
    const umlaute = metriken.proben.filter((p) => /[äöüßÄÖÜ]/.test(p.text));
    expect(umlaute.length).toBeGreaterThan(20);
  });

  it("führt für jede Schrift die erwartete Zeilenhöhe", () => {
    for (const probe of metriken.proben) {
      const erwartet = probe.fontFamily === 5 ? 1.25 : 1.35;
      // Ältere Nunito-Elemente tragen noch 1.25 — beide Werte sind zulässig.
      expect([erwartet, 1.25]).toContain(Math.round(probe.lineHeight * 100) / 100);
    }
  });
});

// Task-8-Befund (Schlussprüfung 3c, Finding 2): eine frühere Fixture hatte einen
// gültigen PNG-Header, aber einen KAPUTTEN IDAT-Chunk — image-size las Breite/
// Höhe klar aus dem Header, aber kein Browser konnte das Bild dekodieren
// (kaputtes Bild-Icon). Reine Feldform-Tests wie in image-element.test.js hätten
// das nie gefangen; nur die visuelle Kontrolle hat es aufgedeckt. Diese Prüfung
// entpackt den IDAT-Inhalt tatsächlich und vergleicht seine Länge gegen die aus
// Breite/Höhe erwartete Rohdatengröße — bei der kaputten Fixture wäre das
// inflateSync entweder fehlgeschlagen oder die Länge hätte nicht gepasst.
describe("PNG-Testbild ist dekodierbar", () => {
  const bytes = fs.readFileSync(TESTBILD);
  const chunks = pngChunks(bytes);

  it("beginnt mit der PNG-Signatur", () => {
    expect(bytes.subarray(0, 8).equals(PNG_SIGNATUR)).toBe(true);
  });

  it("hat eine IHDR mit 8 Bit RGB (bit-depth 8, color-type 2)", () => {
    const ihdr = chunks.find((c) => c.typ === "IHDR").data;
    const bitTiefe = ihdr.readUInt8(8);
    const farbTyp = ihdr.readUInt8(9);
    expect(bitTiefe).toBe(8);
    expect(farbTyp).toBe(2);
  });

  it("entpackt zu genau den Rohdaten, die Breite/Höhe erwarten lassen", () => {
    const ihdr = chunks.find((c) => c.typ === "IHDR").data;
    const width = ihdr.readUInt32BE(0);
    const height = ihdr.readUInt32BE(4);

    const idat = Buffer.concat(chunks.filter((c) => c.typ === "IDAT").map((c) => c.data));
    const roh = zlib.inflateSync(idat);

    // Pro Zeile: 1 Filter-Byte + width Pixel × 3 Byte (RGB, kein Alpha).
    const erwarteteLaenge = height * (1 + width * 3);
    expect(roh.length).toBe(erwarteteLaenge);
  });
});
