// Gefüllte Variante: prüft die dezente Tönung (fuellung).
import { scene } from "../../lib/scene.js";
import { dreieck } from "../../lib/shapes/dreieck.js";

const s = scene();
const f = s.frame("These-Antithese-Synthese");
dreieck(f, ["These", "Antithese", "Synthese"], { x: 600, y: 300, breite: 700, fuellung: "ergebnis" });

export default s;
