// Wird von esbuild zu einer einzigen Browserdatei gebündelt und legt genau die
// Funktionen offen, die der Puppeteer-Treiber braucht.
import { exportToBlob, restoreElements, restoreAppState } from "@excalidraw/excalidraw";

window.ExcalidrawLib = { exportToBlob, restoreElements, restoreAppState };
window.__excalidrawLibReady = true;
