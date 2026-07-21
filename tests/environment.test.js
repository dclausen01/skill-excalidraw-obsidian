import { describe, it, expect } from "vitest";
import { checkNode, checkVault, readPluginVersion } from "../lib/environment.js";

describe("checkNode", () => {
  it("lehnt zu alte Node-Versionen ab und nennt die geforderte Version", () => {
    const check = checkNode("18.19.0");
    expect(check.ok).toBe(false);
    expect(check.message).toContain("20");
  });

  it("akzeptiert eine ausreichende Version", () => {
    expect(checkNode("22.1.0").ok).toBe(true);
  });
});

describe("checkVault", () => {
  it("meldet einen fehlenden Vault mit dem Pfad im Text", () => {
    const check = checkVault("/gibt/es/nicht");
    expect(check.ok).toBe(false);
    expect(check.message).toContain("/gibt/es/nicht");
  });
});

describe("readPluginVersion", () => {
  it("liest die Version aus dem echten Plugin-Manifest", () => {
    expect(readPluginVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });
});
