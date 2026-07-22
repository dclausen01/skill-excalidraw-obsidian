import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PROJECT_ROOT } from "../lib/config.js";

const RENDERER = path.join(PROJECT_ROOT, "renderer");
const DIST = path.join(RENDERER, "dist");
const SCHRIFTQUELLE = path.join(PROJECT_ROOT, "node_modules", "@excalidraw", "excalidraw", "dist", "prod", "fonts");

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// esbuild löst auch die dynamischen Chunk-Importe des Pakets auf; --splitting ist
// unnötig und mit iife ohnehin unverträglich.
execFileSync(
  path.join(PROJECT_ROOT, "node_modules", ".bin", "esbuild"),
  [
    path.join(RENDERER, "entry.js"),
    "--bundle",
    "--format=iife",
    "--platform=browser",
    `--outfile=${path.join(DIST, "bundle.js")}`,
    `--define:process.env.NODE_ENV="production"`,
  ],
  { stdio: "inherit" },
);

fs.copyFileSync(path.join(RENDERER, "page.html"), path.join(DIST, "index.html"));

// Excalidraw erwartet die Schriften unter ./fonts/<Familie>/<datei>.woff2 relativ
// zu EXCALIDRAW_ASSET_PATH.
fs.cpSync(SCHRIFTQUELLE, path.join(DIST, "fonts"), { recursive: true });

const groesse = fs.statSync(path.join(DIST, "bundle.js")).size;
const schriften = fs.readdirSync(path.join(DIST, "fonts"), { recursive: true }).filter((f) => String(f).endsWith(".woff2")).length;
console.log(`Bündel: ${(groesse / 1024 / 1024).toFixed(1)} MB, ${schriften} Schriftdateien gespiegelt nach ${DIST}`);
