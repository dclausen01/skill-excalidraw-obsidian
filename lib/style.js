import { EXCALIFONT, NUNITO } from "./fonts.js";

export const BASIS = 20;
export const FRAME_BREITE = 1920;
export const FRAME_HOEHE = 1080;
export const LESBARKEIT_MIN = 18;

export const ABSTAND = { eng: 40, normal: 80, weit: 160, frames: 240 };

export const STRICH = {
  strokeWidth: 2,
  roughness: 1,
  fillStyle: "solid",
  roundnessBox: { type: 3 },
  roundnessArrow: { type: 2 },
};

/** Werte aus der offiziellen Excalidraw-Palette, damit sie im Farbwähler auffindbar sind. */
export const FARBROLLEN = {
  neutral:  { strich: "#1e1e1e", fuellung: "#ffffff" },
  kern:     { strich: "#1971c2", fuellung: "#a5d8ff" },
  kontra:   { strich: "#e03131", fuellung: "#ffc9c9" },
  ergebnis: { strich: "#2f9e44", fuellung: "#b2f2bb" },
  frage:    { strich: "#f08c00", fuellung: "#ffec99" },
  kontext:  { strich: "#868e96", fuellung: "#f1f3f5" },
  technik:  { strich: "#6741d9", fuellung: "#d0bfff" },
};

export const TYPO = {
  boardtitel:  { groesse: 120, fontFamily: EXCALIFONT, stufe: "L0" },
  frametitel:  { groesse: 72,  fontFamily: EXCALIFONT, stufe: "L0" },
  kernbegriff: { groesse: 36,  fontFamily: EXCALIFONT, stufe: "L1" },
  standard:    { groesse: 24,  fontFamily: NUNITO,     stufe: "L1" },
  detail:      { groesse: 18,  fontFamily: NUNITO,     stufe: "L1" },
  fussnote:    { groesse: 14,  fontFamily: NUNITO,     stufe: "L2" },
};

export const ZOOM = { L1: 1.0, L2: 2.5 };

/** Zoomfaktor, bei dem das gesamte Board auf einen Beamer passt. */
export function zoomL0(boardBreite, boardHoehe) {
  return Math.min(FRAME_BREITE / boardBreite, FRAME_HOEHE / boardHoehe);
}

/** Ein Text ist auf einer Stufe lesbar, wenn er dort mindestens 18 px groß erscheint. */
export function istLesbar(fontSize, zoom) {
  return fontSize * zoom >= LESBARKEIT_MIN;
}

/**
 * Titelgröße für die Übersichtsstufe. Feste Werte würden die Lesbarkeitsregel
 * ausgerechnet bei großen Wandzeitungen brechen — deshalb aus dem Zoomfaktor abgeleitet
 * und auf ein Vielfaches von 4 aufgerundet.
 */
export function titelGroesse(untergrenze, zoom) {
  const noetig = Math.ceil(LESBARKEIT_MIN / zoom / 4) * 4;
  return Math.max(untergrenze, noetig);
}
