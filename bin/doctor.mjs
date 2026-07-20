import { runAllChecks } from "../lib/environment.js";

const { ok, checks } = runAllChecks();
for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.name.padEnd(14)} ${c.message}`);
}
console.log(ok ? "\nAlles bereit." : "\nEs fehlt etwas — siehe die mit ✗ markierten Zeilen.");
process.exit(ok ? 0 : 1);
