export { scene } from "./scene.js";
export { FARBROLLEN, TYPO, ABSTAND, FRAME_BREITE, FRAME_HOEHE } from "./style.js";

// lib/document.js entsteht erst in Task 11. Ein Export von dort würde jeden
// Import aus lib/index.js scheitern lassen, solange die Datei nicht existiert —
// deshalb wird szeneZuMarkdown erst dort ergänzt, nicht hier.
