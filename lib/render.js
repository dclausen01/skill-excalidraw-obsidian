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

    // Kein Ausbruch aus dem dist-Verzeichnis. Trailing-Separator-Vergleich, damit
    // ein Geschwisterverzeichnis wie "dist-x" (per "..") nicht durchrutscht.
    if (!datei.startsWith(DIST + path.sep) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) {
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

  // Nur für Tests: erlaubt, die geprüfte Bereitschafts-Eigenschaft und ihr Timeout
  // zu überschreiben, um den Aufräum-Pfad bei einem Startfehler (z. B. nach einem
  // Chromium-Update oder einem kaputten Bündel) reproduzierbar zu prüfen, ohne
  // echte Netzwerk- oder Bundle-Sabotage zu betreiben. Siehe render.test.js.
  const bereitschaftsEigenschaft = process.env.RENDERER_TEST_READY_PROP || "__excalidrawLibReady";
  const bereitschaftsTimeout = Number(process.env.RENDERER_TEST_READY_TIMEOUT_MS) || 30_000;

  const { server, port } = await starteServer();
  let browser;

  // Alles ab hier kann scheitern (Chromium-Start, Navigation, Bereitschafts-Check).
  // Ohne dieses try/catch würden Browser und lauschender Server bei einem
  // Startfehler nie geschlossen — der Aufrufer bekommt "close" nur im Erfolgsfall
  // zurück, sein try/finally läuft also gar nicht erst an.
  try {
    // Als root braucht Chromium --no-sandbox, sonst startet der Renderer gar nicht
    // (crbug.com/638180). Auf Servern/CI mit root-User die übliche Konfiguration;
    // auf Desktop-Systemen mit normalem User-Konto bleibt die Sandbox aktiv,
    // weil dieser Block nur dann greift.
    const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
    browser = await puppeteer.launch({
      headless: true,
      args: isRoot ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
    });
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
    await seite.waitForFunction((prop) => window[prop] === true, { timeout: bereitschaftsTimeout }, bereitschaftsEigenschaft);

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

    function frameNames(szene) {
      return (szene.elements ?? []).filter((e) => e.type === "frame" && !e.isDeleted).map((e) => e.name);
    }

    async function renderFrame(szene, frameName, { breite = 1920, hoehe = 1080 } = {}) {
      const names = frameNames(szene);
      if (!names.includes(frameName)) {
        throw new Error(`Frame "${frameName}" gibt es in dieser Szene nicht — vorhanden: ${names.join(", ") || "keine"}`);
      }

      // Prüfe auf Duplikate: mehrere Frames mit dem gleichen Namen sind eine stille Fehlerquelle
      const count = names.filter((n) => n === frameName).length;
      if (count > 1) {
        throw new Error(`Mehrere Frames haben den Namen "${frameName}" — das kann zu falschem Rendering führen. Bitte umbenennen.`);
      }

      const base64 = await seite.evaluate(async (eingabe, name, zielBreite, zielHoehe) => {
        const { exportToBlob, restoreElements, restoreAppState } = window.ExcalidrawLib;
        const elemente = restoreElements(eingabe.elements, null);
        const frame = elemente.find((el) => el.type === "frame" && el.name === name);

        const blob = await exportToBlob({
          elements: elemente,
          appState: { ...restoreAppState(eingabe.appState ?? {}, null), exportBackground: true },
          files: eingabe.files ?? {},
          mimeType: "image/png",
          exportingFrame: frame,          // schneidet exakt auf die Frame-Grenzen
          getDimensions: (w, h) => ({ width: zielBreite, height: zielHoehe, scale: zielBreite / w }),
        });

        const puffer = await blob.arrayBuffer();
        let binaer = "";
        const bytes = new Uint8Array(puffer);
        for (let i = 0; i < bytes.length; i++) binaer += String.fromCharCode(bytes[i]);
        return btoa(binaer);
      }, szene, frameName, breite, hoehe);

      return Buffer.from(base64, "base64");
    }

    async function close() {
      await browser.close();
      // Der lauschende Socket hält die Ereignisschleife sonst am Leben.
      await new Promise((erfuellen) => server.close(erfuellen));
    }

    return { renderBoard, renderFrame, frameNames, close, requestedUrls: () => [...angefragt] };
  } catch (fehler) {
    if (browser) await browser.close();
    await new Promise((erfuellen) => server.close(erfuellen));
    throw fehler;
  }
}
