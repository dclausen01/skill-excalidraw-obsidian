// Deckt gebundene Pfeile mit Label und automatischer Kantenwahl ab.
import { scene } from "../../lib/scene.js";

const s = scene();
const f = s.frame("Verbindungen");
f.text("Ursache und Wirkung", { typo: "frametitel", x: 60, y: 50 });

const a = f.box("Instinktarmut", { rolle: "kern", typo: "kernbegriff", x: 120, y: 300 });
const b = f.box("Weltoffenheit", { rolle: "ergebnis", typo: "kernbegriff", x: 760, y: 300 });
const c = f.box("Kultur", { rolle: "technik", typo: "kernbegriff", x: 760, y: 650 });

s.connect(a, b, { label: "führt zu" });
s.connect(b, c);

export default s;
