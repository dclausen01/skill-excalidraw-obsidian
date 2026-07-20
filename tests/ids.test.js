import { describe, it, expect } from "vitest";
import { elementId, seedAus, versionNonceAus, indexFolge } from "../lib/ids.js";

describe("elementId", () => {
  it("ist für gleiche Eingabe stabil", () => {
    expect(elementId("Mängelwesen", 0)).toBe(elementId("Mängelwesen", 0));
  });

  it("unterscheidet gleiche Inhalte an verschiedenen Positionen", () => {
    expect(elementId("Box", 0)).not.toBe(elementId("Box", 1));
  });

  it("hat die von Excalidraw übliche Form", () => {
    expect(elementId("Test", 0)).toMatch(/^[A-Za-z0-9]{8}$/);
  });
});

describe("seedAus", () => {
  it("ist stabil und liegt im gültigen Bereich", () => {
    const seed = seedAus("Mängelwesen");
    expect(seed).toBe(seedAus("Mängelwesen"));
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 31);
  });

  it("unterscheidet sich vom versionNonce derselben Eingabe", () => {
    expect(seedAus("A")).not.toBe(versionNonceAus("A"));
  });
});

describe("indexFolge", () => {
  it("erzeugt aufsteigende Indizes", () => {
    const folge = indexFolge(5);
    expect(folge).toHaveLength(5);
    expect([...folge].sort()).toEqual(folge);
  });

  it("beginnt bei a0", () => {
    expect(indexFolge(1)[0]).toBe("a0");
  });
});
