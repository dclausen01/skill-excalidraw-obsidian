import fs from "node:fs";
import { describe, it, expect, vi } from "vitest";
import { loadFontRegistry, EXCALIFONT, NUNITO, LINE_HEIGHT } from "../lib/fonts.js";
import { FONT_DIR } from "../lib/config.js";

const register = loadFontRegistry();

describe("Schriftregister", () => {
  it("kennt die Zeilenhöhe beider Schriften", () => {
    expect(LINE_HEIGHT[EXCALIFONT]).toBe(1.25);
    expect(LINE_HEIGHT[NUNITO]).toBe(1.35);
  });

  it("findet ein Subset für lateinische Buchstaben", () => {
    expect(register.fontFor("A".codePointAt(0), EXCALIFONT)).toBeTruthy();
    expect(register.fontFor("A".codePointAt(0), NUNITO)).toBeTruthy();
  });

  it("findet ein Subset für deutsche Umlaute", () => {
    for (const zeichen of ["ä", "ö", "ü", "ß", "Ä"]) {
      expect(register.fontFor(zeichen.codePointAt(0), EXCALIFONT)).toBeTruthy();
    }
  });

  it("liefert eine plausible Em-Größe", () => {
    expect(register.unitsPerEm(EXCALIFONT)).toBeGreaterThan(0);
  });

  it("meldet ein nicht abgedecktes Zeichen verständlich", () => {
    // Ein Zeichen aus der privaten Nutzungszone deckt keine Schrift ab.
    expect(() => register.fontFor(0xf8ff, EXCALIFONT)).toThrow(/Zeichen/);
  });
});

describe("Deterministische Subset-Auswahl bei überlappenden Codepoints", () => {
  // Die Nunito-Subsets überschneiden sich (u. a. bei "A", U+0041). fs.readdirSync
  // liefert laut POSIX keine garantierte Reihenfolge — welches Subset für einen
  // überlappenden Codepoint gewinnt, darf davon nicht abhängen.
  it("wählt für einen überlappenden Codepoint dasselbe Subset, unabhängig von der Reihenfolge aus fs.readdirSync", () => {
    const echteDateien = fs.readdirSync(FONT_DIR);
    const aufsteigend = [...echteDateien].sort();
    const absteigend = [...aufsteigend].reverse();

    const spy = vi.spyOn(fs, "readdirSync");

    spy.mockImplementation(() => aufsteigend);
    const registerAufsteigend = loadFontRegistry(FONT_DIR);
    const glyphenzahlAufsteigend = registerAufsteigend.fontFor("A".codePointAt(0), NUNITO).numGlyphs;

    spy.mockImplementation(() => absteigend);
    const registerAbsteigend = loadFontRegistry(FONT_DIR);
    const glyphenzahlAbsteigend = registerAbsteigend.fontFor("A".codePointAt(0), NUNITO).numGlyphs;

    spy.mockRestore();

    expect(glyphenzahlAbsteigend).toBe(glyphenzahlAufsteigend);
  });
});

describe("Prüfung der advanceWidth bei überlappenden Subsets", () => {
  it("wirft beim Laden, wenn zwei Subsets denselben Codepoint mit unterschiedlicher advanceWidth führen", async () => {
    vi.resetModules();
    vi.doMock("node:fs", () => {
      const dateien = ["Excalifont__Fake-A.woff2", "Excalifont__Fake-B.woff2"];
      const readdirSync = () => dateien;
      return { default: { readdirSync }, readdirSync };
    });
    vi.doMock("fontkit", () => {
      const openSync = (dateipfad) => {
        const istErsteDatei = dateipfad.endsWith("Fake-A.woff2");
        return {
          unitsPerEm: 1000,
          characterSet: [0x41],
          glyphForCodePoint: () => ({ advanceWidth: istErsteDatei ? 500 : 600 }),
        };
      };
      return { openSync, default: { openSync } };
    });

    const { loadFontRegistry: geladenesRegister } = await import("../lib/fonts.js");
    expect(() => geladenesRegister("/fake-dir")).toThrow(/advanceWidth/);

    vi.doUnmock("node:fs");
    vi.doUnmock("fontkit");
    vi.resetModules();
  });
});
