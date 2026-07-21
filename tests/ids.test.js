import { describe, it, expect } from "vitest";
import { elementId, seedFor, versionNonceFor, indexSequence } from "../lib/ids.js";

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

describe("seedFor", () => {
  it("ist stabil und liegt im gültigen Bereich", () => {
    const seed = seedFor("Mängelwesen");
    expect(seed).toBe(seedFor("Mängelwesen"));
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 31);
  });

  it("unterscheidet sich vom versionNonce derselben Eingabe", () => {
    expect(seedFor("A")).not.toBe(versionNonceFor("A"));
  });
});

describe("indexSequence", () => {
  it("erzeugt aufsteigende Indizes", () => {
    const seq = indexSequence(5);
    expect(seq).toHaveLength(5);
    expect([...seq].sort()).toEqual(seq);
  });

  it("beginnt bei a0", () => {
    expect(indexSequence(1)[0]).toBe("a0");
  });

  it("gibt leeres Array für 0 zurück", () => {
    expect(indexSequence(0)).toEqual([]);
  });
});

describe("Pinned values - regression test for algorithm changes", () => {
  // These assertions pin the actual current output for fixed inputs.
  // Their purpose is to make any algorithm change visible (e.g. swapping SHA-1 for SHA-256,
  // changing a salt string, or modifying the alphabet). If these values change, every
  // previously generated Excalidraw board would be regenerated with different element IDs,
  // making the change visible in version control and forcing deliberate review.
  // The test input "Mängelwesen" contains a German umlaut to cover UTF-8 handling.

  it("pins elementId output for determinism", () => {
    expect(elementId("Mängelwesen", 0)).toBe("nHf3zCIG");
  });

  it("pins elementId for empty content", () => {
    expect(elementId("", 0)).toBe("3eHJGE2t");
  });

  it("pins seedFor output for determinism", () => {
    expect(seedFor("Mängelwesen")).toBe(1048290360);
  });

  it("pins seedFor for empty content", () => {
    expect(seedFor("")).toBe(470921864);
  });

  it("pins versionNonceFor output for determinism", () => {
    expect(versionNonceFor("Mängelwesen")).toBe(305966956);
  });

  it("pins versionNonceFor for empty content", () => {
    expect(versionNonceFor("")).toBe(525194729);
  });

  it("pins first entries of indexSequence for determinism", () => {
    const seq = indexSequence(5);
    expect(seq).toEqual(["a0", "a1", "a2", "a3", "a4"]);
  });
});
