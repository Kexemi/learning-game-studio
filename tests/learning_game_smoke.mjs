/**
 * Headless smoke: load home, start deck, answer first question, see feedback.
 * Requires: local server on BASE_URL (default http://127.0.0.1:8765)
 */
import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(ROOT, "..");
const PORT = Number(process.env.LGS_PORT || 8765);
const BASE = `http://127.0.0.1:${PORT}`;

function waitForServer(ms = 8000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      http.get(`${BASE}/index.html`, (res) => {
        res.resume();
        if (res.statusCode === 200) resolve();
        else if (Date.now() - start > ms) reject(new Error("server timeout"));
        else setTimeout(tick, 200);
      }).on("error", () => {
        if (Date.now() - start > ms) reject(new Error("server timeout"));
        else setTimeout(tick, 200);
      });
    };
    tick();
  });
}

async function runSmoke() {
  const chromePaths = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  let chrome = chromePaths.find((p) => existsSync(p));
  if (!chrome) {
    const manifest = await fetch(`${BASE}/content/pack-manifest.json`).then((r) => r.json());
    if (!manifest.packs?.length) throw new Error("empty manifest");
    const first = manifest.packs[0];
    const pack = await fetch(`${BASE}/${first.path}`).then((r) => r.json());
    if (!pack.questions?.length) throw new Error("empty pack");
    console.log("LEARNING_GAME_SMOKE_PASS static-fetch");
    return;
  }

  const server = spawn("python", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
    cwd: REPO,
    stdio: "ignore",
    shell: false,
  });

  try {
    await waitForServer();
    const puppeteer = await import("puppeteer-core").catch(() => null);
    if (!puppeteer) {
      // Fallback: fetch manifest + pack JSON only
      const manifest = await fetch(`${BASE}/content/pack-manifest.json`).then((r) => r.json());
      if (!manifest.packs?.length) throw new Error("empty manifest");
      const first = manifest.packs[0];
      const pack = await fetch(`${BASE}/${first.path}`).then((r) => r.json());
      if (!pack.questions?.length) throw new Error("empty pack");
      console.log("LEARNING_GAME_SMOKE_PASS static-fetch");
      return;
    }
    const browser = await puppeteer.default.launch({
      executablePath: chrome,
      headless: true,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle0", timeout: 20000 });
    await page.waitForSelector(".deck-card", { timeout: 10000 });
    await page.click(".deck-card");
    await page.waitForSelector(".choice-btn", { timeout: 10000 });
    await page.click(".choice-btn");
    await page.waitForSelector("#feedback:not([hidden])", { timeout: 10000 });
    const verdict = await page.$eval("#feedbackVerdict", (el) => el.textContent);
    if (!verdict) throw new Error("no feedback");
    await browser.close();
    console.log("LEARNING_GAME_SMOKE_PASS browser");
  } finally {
    server.kill("SIGTERM");
  }
}

runSmoke().catch((err) => {
  console.error("LEARNING_GAME_SMOKE_FAIL", err.message);
  process.exit(1);
});