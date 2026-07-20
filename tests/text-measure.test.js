import { describe, it, expect } from "vitest";
import { measureLine, measureHeight } from "../lib/text.js";
import { loadFontRegistry, EXCALIFONT, NUNITO, LINE_HEIGHT } from "../lib/fonts.js";
import metriken from "./fixtures/text-metrics.json" with { type: "json" };

const register = loadFontRegistry();

describe("measureLine — Einzelwert", () => {
  it("misst 'Feline' in Excalifont 20 wie Excalidraw", () => {
    // Aus dem Vault erhoben: width 53.79994201660156
    const breite = measureLine("Feline", EXCALIFONT, 20, register);
    expect(breite).toBeCloseTo(53.8, 1);
  });

  it("liefert 0 für leeren Text", () => {
    expect(measureLine("", EXCALIFONT, 20, register)).toBe(0);
  });
});

describe("measureHeight", () => {
  // Grundformel: Zeilenzahl × fontSize × lineHeight — lineHeight ist eine
  // Konstante je Schrift (lib/fonts.js:LINE_HEIGHT), deshalb beide Schriften prüfen.
  it("berechnet die Höhe für Excalifont (lineHeight 1.25)", () => {
    expect(LINE_HEIGHT[EXCALIFONT]).toBe(1.25);
    expect(measureHeight(1, EXCALIFONT, 20)).toBe(25);
    expect(measureHeight(3, EXCALIFONT, 20)).toBe(75);
  });

  it("berechnet die Höhe für Nunito (lineHeight 1.35)", () => {
    expect(LINE_HEIGHT[NUNITO]).toBe(1.35);
    expect(measureHeight(1, NUNITO, 20)).toBe(27);
    expect(measureHeight(3, NUNITO, 20)).toBe(81);
  });
});

/**
 * Prüft, ob jedes Zeichen von text in einem geladenen Subset der fontFamily liegt.
 * 14 Excalifont-Proben enthalten Emoji (🌐, 📍) oder „§" — Zeichen außerhalb der
 * exportierten Subsets. Excalidraw rendert sie im Browser über einen System-
 * Fallback-Font, den wir nicht laden; solche Proben sind mit diesem Ansatz
 * strukturell nicht messbar (registry.fontFor würde werfen) und werden
 * ausgeschlossen — nicht als Toleranzfrage, sondern als Frage der Abdeckung.
 *
 * Alle anderen Ausschlüsse (autoResize:false-Boxen, widersprüchliche
 * Referenzwerte für denselben (fontFamily, fontSize, text)-Schlüssel) sind
 * strukturelle Eigenschaften der Quelldaten und werden bereits in
 * scripts/extract-text-metrics.mjs herausgefiltert — die Fixture enthält sie
 * gar nicht erst. Hier bleibt bewusst nur der Abdeckungsfilter übrig.
 */
function messbar(text, fontFamily) {
  for (const zeichen of text) {
    try {
      register.fontFor(zeichen.codePointAt(0), fontFamily);
    } catch {
      return false;
    }
  }
  return true;
}

function schlimmsteAbweichungen(proben) {
  return proben
    .map((p) => ({
      text: p.text,
      diff: Math.abs(measureLine(p.text, p.fontFamily, p.fontSize, register) - p.width),
    }))
    .sort((a, b) => b.diff - a.diff);
}

/**
 * Kennzahlen der Abweichungsverteilung — bewusst statt eines einzelnen
 * Höchstwert-Schwellwerts. Ein Höchstwert wird vom unrepräsentativsten
 * Sample bestimmt (bei Nunito: der Ausreißer "Ablauf", dessen Abweichung
 * durch Kerning gar nicht beeinflusst wird — dazu unten mehr) und sagt
 * nichts über die übrigen Proben aus. Median und Ausreißeranteil kollabieren
 * dagegen sofort, wenn die Messung strukturell kaputtgeht, und werden von
 * einem einzelnen unerklärten Ausreißer kaum verschoben.
 */
function verteilungsKennzahlen(proben) {
  const abweichungen = schlimmsteAbweichungen(proben).map((p) => p.diff);
  const sortiert = [...abweichungen].sort((a, b) => a - b);
  const mitte = sortiert.length / 2;
  const median = Number.isInteger(mitte)
    ? (sortiert[mitte - 1] + sortiert[mitte]) / 2
    : sortiert[Math.floor(mitte)];
  const anteilUeber05 = abweichungen.filter((d) => d > 0.5).length / abweichungen.length;
  return { median, anteilUeber05 };
}

describe("measureLine — gegen alle Referenzwerte", () => {
  // Beide Tests prüfen dieselben zwei Kennzahlen der Abweichungsverteilung:
  // den Median (typischer Fall) und den Anteil der Proben über 0,5 px
  // (Ausreißerquote). Ein Höchstwert-Schwellwert wurde verworfen, weil ihn
  // ein einzelnes unerklärtes Sample dauerhaft anheben kann, wonach er für
  // echte Regressionen blind wird — siehe Fix-Durchgang 2 im Task-5-Report:
  // mit deaktiviertem Kerning liegt der Nunito-Höchstwert bei 2,66 px, klar
  // unter der alten 3,7-px-Schwelle, obwohl Kerning komplett fehlt.
  //
  // Empirisch verifiziert (Kontrollmessung mit deaktiviertem Kerning, siehe
  // Task-5-Report): Median UND Ausreißeranteil schnellen bei beiden
  // Schriften weit über die hier gesetzten Schwellen — der Median auf das
  // 1000-Fache, der Ausreißeranteil auf über 45 %. Ein Bruch der
  // Kerning-Berechnung fällt mit diesen Assertions also sicher auf.

  it("Excalifont: Median- und Ausreißeranteil bleiben im beobachteten Normalbereich", () => {
    // Beobachtet (aktuelle Fixture, 440 messbare Proben): Median 0,00033 px,
    // Anteil > 0,5 px: 18/440 = 4,1 %. Schwellen mit großzügigem Headroom
    // für gewöhnliche Fixture-Neuerzeugung (Median: >100-fach, Anteil:
    // >3-fach über dem Beobachteten), aber weit unter dem, was ein
    // Kerning-Ausfall verursacht (Median 0,400 px, Anteil 45,7 %).
    const proben = metriken.proben.filter((p) => p.fontFamily === EXCALIFONT && messbar(p.text, p.fontFamily));
    const schlimmste = schlimmsteAbweichungen(proben).slice(0, 5);
    const { median, anteilUeber05 } = verteilungsKennzahlen(proben);
    const kontext = `Median: ${median} px, Anteil > 0,5px: ${(anteilUeber05 * 100).toFixed(1)}%. Größte Abweichungen: ${JSON.stringify(schlimmste)}`;
    expect(median, kontext).toBeLessThan(0.05);
    expect(anteilUeber05, kontext).toBeLessThan(0.15);
  });

  it("Nunito: Median- und Ausreißeranteil bleiben im beobachteten Normalbereich", () => {
    // Beobachtet (aktuelle Fixture, 37 messbare Proben): Median 0,000035 px,
    // Anteil > 0,5 px: 1/37 = 2,7 % (dieser eine Ausreißer ist "Ablauf",
    // s.u.). Dieselben Schwellen wie bei Excalifont — großzügiger Headroom
    // gegenüber dem Beobachteten, weit unter dem Kerning-Ausfall-Wert
    // (Median 0,339 px, Anteil 45,9 %).
    //
    // Zum Ausreißer "Ablauf" (fontSize ≈ 74.56): measureLine liefert
    // 228.0828 gegen Referenz 231.7362 — 3,65 px Abweichung. Das Element
    // wurde untersucht und erfüllt keinen der mechanischen Ausschlussgründe
    // (autoResize:true, keine widersprüchliche Zweitreferenz, kein
    // Leerzeichen, keine Ligatur, Lauf-Split in laufweiten() nachweislich
    // nicht die Ursache — Kontrollmessung mit einer einzelnen Subset-Datei,
    // die "Ablauf" an einem Stück abdeckt, liefert exakt dieselbe Breite).
    // Mit deaktiviertem Kerning bleibt die Abweichung dieses Samples
    // unverändert bei 3,65 px — seine Kerning-Beteiligung ist null. Der
    // Median- und Anteils-Test lassen dieses eine unerklärte Sample bewusst
    // in der Fixture (kein Ausschluss von Proben), werden von ihm aber nicht
    // blind: ein zweites, drittes, ... Sample mit ähnlicher Abweichung würde
    // den Anteil schnell über die Schwelle heben.
    const proben = metriken.proben.filter((p) => p.fontFamily === NUNITO && messbar(p.text, p.fontFamily));
    const schlimmste = schlimmsteAbweichungen(proben).slice(0, 5);
    const { median, anteilUeber05 } = verteilungsKennzahlen(proben);
    const kontext = `Median: ${median} px, Anteil > 0,5px: ${(anteilUeber05 * 100).toFixed(1)}%. Größte Abweichungen: ${JSON.stringify(schlimmste)}`;
    expect(median, kontext).toBeLessThan(0.05);
    expect(anteilUeber05, kontext).toBeLessThan(0.15);
  });
});
