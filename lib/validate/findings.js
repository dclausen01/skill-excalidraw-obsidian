/** Die beiden Härtegrade. "fehler" blockiert das Schreiben, "warnung" nicht. */
export const SCHWERE = { fehler: "fehler", warnung: "warnung" };

/** @typedef {{ schwere: string, regel: string, meldung: string, elementId: string|null }} Finding */

/**
 * Sammelt Befunde in Aufnahmereihenfolge. Bewusst eine Liste und kein Set oder
 * eine Map: Die Reihenfolge ist Teil der Ausgabe und muss deterministisch sein.
 */
export function createFindings() {
  const befunde = [];

  const aufnehmen = (schwere) => (regel, meldung, elementId = null) => {
    befunde.push({ schwere, regel, meldung, elementId });
  };

  return {
    error: aufnehmen(SCHWERE.fehler),
    warn: aufnehmen(SCHWERE.warnung),
    all: () => befunde,
    hasErrors: () => befunde.some((b) => b.schwere === SCHWERE.fehler),
  };
}
