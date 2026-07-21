import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { PROJECT_ROOT } from "./config.js";

const DIST = path.join(PROJECT_ROOT, "renderer", "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
  ".css": "text/css; charset=utf-8",
};

/**
 * Liefert Bündel und Schriften von derselben Herkunft aus. Nötig, weil
 * Excalidraw seine Schrift-URIs gegen EXCALIDRAW_ASSET_PATH auflöst — ohne
 * eigenen Server müsste man auf ein CDN ausweichen.
 */
function starteServer() {
  const server = http.createServer((anfrage, antwort) => {
    const relativ = decodeURIComponent(anfrage.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
    const datei = path.join(DIST, relativ);

    // Kein Ausbruch aus dem dist-Verzeichnis.
    if (!datei.startsWith(DIST) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) {
      antwort.writeHead(404).end("nicht gefunden");
      return;
    }

    antwort.writeHead(200, { "Content-Type": MIME[path.extname(datei)] ?? "application/octet-stream" });
    fs.createReadStream(datei).pipe(antwort);
  });

  return new Promise((erfuellen) => {
    server.listen(0, "127.0.0.1", () => erfuellen({ server, port: server.address().port }));
  });
}

export async function createRenderer() {
  if (!fs.existsSync(path.join(DIST, "bundle.js"))) {
    throw new Error("Renderer-Bündel fehlt. Abhilfe: npm run build-renderer");
  }

  const { server, port } = await starteServer();
  const browser = await puppeteer.launch({ headless: true });
  const seite = await browser.newPage();

  const angefragt = [];
  seite.on("request", (r) => {
    const url = r.url();
    // data:-URIs verlassen den Prozess nie (kein DNS, kein Socket) — Excalidraw
    // lädt so z. B. sein Broken-Image- und Link-Icon vorab für den Canvas.
    // Das sind keine Netzzugriffe, daher zählen nur http(s)-Anfragen.
    if (url.startsWith("http://") || url.startsWith("https://")) angefragt.push(url);
  });

  await seite.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "load" });
  await seite.waitForFunction("window.__excalidrawLibReady === true", { timeout: 30_000 });

  async function renderBoard(szene, { breite = 1920 } = {}) {
    const base64 = await seite.evaluate(async (eingabe, zielBreite) => {
      const { exportToBlob, restoreElements, restoreAppState } = window.ExcalidrawLib;

      const blob = await exportToBlob({
        elements: restoreElements(eingabe.elements, null),
        appState: { ...restoreAppState(eingabe.appState ?? {}, null), exportBackground: true },
        files: eingabe.files ?? {},
        mimeType: "image/png",
        exportPadding: 20,
        getDimensions: (w, h) => {
          const scale = zielBreite / w;
          return { width: zielBreite, height: Math.round(h * scale), scale };
        },
      });

      const puffer = await blob.arrayBuffer();
      let binaer = "";
      const bytes = new Uint8Array(puffer);
      for (let i = 0; i < bytes.length; i++) binaer += String.fromCharCode(bytes[i]);
      return btoa(binaer);
    }, szene, breite);

    return Buffer.from(base64, "base64");
  }

  async function close() {
    await browser.close();
    // Der lauschende Socket hält die Ereignisschleife sonst am Leben.
    await new Promise((erfuellen) => server.close(erfuellen));
  }

  return { renderBoard, close, requestedUrls: () => [...angefragt] };
}
