// Deckt f.line (über tabelle) und den tabelle-Helfer ab: 3-Spalten-Ausfülltafel.
import { scene } from "../../lib/scene.js";
import { tabelle } from "../../lib/layout.js";

const s = scene();
const f = s.frame("Kategorientafel");
f.text("Die Kategorien nach Kant", { typo: "frametitel", x: 60, y: 55 });
tabelle(f, ["Kategorie", "Erklärung", "Beispiel"], { zeilen: 4, x: 120, y: 220, breite: 1600, zeilenhoehe: 120 });

export default s;
