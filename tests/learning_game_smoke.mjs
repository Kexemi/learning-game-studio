/**
 * Headless smoke: verify this is a playable game loop, not just static flashcards.
 * Starts a local server, drives Chrome through CDP with no npm dependencies,
 * captures a phone screenshot, and asserts HP/boss/combo/map state changes.
 */
import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(ROOT, "..");
const PORT = Number(process.env.LGS_PORT || 8765);
const DEBUG_PORT = Number(process.env.LGS_DEBUG_PORT || 9227);
const BASE = `http://127.0.0.1:${PORT}`;
const ARTIFACT_DIR = path.join(REPO, "artifacts", "learning-game-v2");
const CHROME_PATHS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

function waitForHttp(url, ms = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve(res.statusCode);
        else if (Date.now() - start > ms) reject(new Error(`timeout ${url}`));
        else setTimeout(tick, 150);
      }).on("error", () => {
        if (Date.now() - start > ms) reject(new Error(`timeout ${url}`));
        else setTimeout(tick, 150);
      });
    };
    tick();
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch (err) { reject(err); }
      });
    }).on("error", reject);
  });
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let seq = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result || {});
    }
  });
  return {
    send(method, params = {}) {
      const id = ++seq;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() { ws.close(); },
  };
}

async function evalExpr(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime.evaluate exception");
  }
  return result.result?.value;
}

async function waitForExpr(cdp, expression, ms = 10000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const value = await evalExpr(cdp, expression).catch(() => false);
    if (value) return value;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`waitForExpr timeout: ${expression}`);
}

async function runStaticContract() {
  const [manifest, appJs, html, css] = await Promise.all([
    fetch(`${BASE}/content/pack-manifest.json`).then((r) => r.text()),
    fetch(`${BASE}/src/app.js?v=20260706b`).then((r) => r.text()),
    fetch(`${BASE}/index.html`).then((r) => r.text()),
    fetch(`${BASE}/src/styles.css?v=20260706b`).then((r) => r.text()),
  ]);
  const required = [
    [manifest, "nvidiaai-llm-memorization-capacity-20260706", "manifest contains current deck"],
    [html, "battlefield", "battlefield present"],
    [html, "runMap", "run map present"],
    [html, "playerHpBar", "player HP present"],
    [html, "bossHpBar", "boss HP present"],
    [appJs, "bossHp", "boss HP mechanic present"],
    [appJs, "combo", "combo mechanic present"],
    [appJs, "buildEncounters", "encounter generator present"],
    [appJs, "__MECHANISM_RUN_DEBUG__", "debug snapshot exposed"],
    [css, ".battlefield", "battle CSS present"],
    [css, ".map-node", "map CSS present"],
  ];
  for (const [haystack, needle, label] of required) {
    if (!haystack.includes(needle)) throw new Error(`static contract failed: ${label}`);
  }
}

async function runSmoke() {
  const server = spawn("python", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
    cwd: REPO,
    stdio: "ignore",
    shell: false,
  });
  let chromeProc = null;
  let userDataDir = null;
  let cdp = null;
  try {
    await waitForHttp(`${BASE}/index.html`);
    await runStaticContract();

    const chrome = CHROME_PATHS.find((p) => existsSync(p));
    if (!chrome || typeof WebSocket === "undefined") {
      console.log("LEARNING_GAME_SMOKE_PASS static-contract");
      return;
    }

    userDataDir = mkdtempSync(path.join(tmpdir(), "lgs-chrome-"));
    chromeProc = spawn(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${userDataDir}`,
      `${BASE}/index.html`,
    ], { stdio: "ignore" });

    await waitForHttp(`http://127.0.0.1:${DEBUG_PORT}/json/version`, 12000);
    const pages = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
    const page = pages.find((p) => p.type === "page") || pages[0];
    cdp = await connect(page.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 665,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await cdp.send("Page.navigate", { url: `${BASE}/index.html` });
    await waitForExpr(cdp, "document.readyState === 'complete'");
    await waitForExpr(cdp, "document.querySelectorAll('.deck-card').length >= 1");

    await evalExpr(cdp, "document.querySelector('.deck-card').click(); true");
    await waitForExpr(cdp, "document.querySelector('.battlefield') && document.querySelectorAll('.choice-btn').length >= 2");
    const before = await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot()");
    if (before.screen !== "run" || before.hp !== 100 || before.bossHp <= 0) throw new Error(`bad initial snapshot ${JSON.stringify(before)}`);
    await evalExpr(cdp, "document.querySelector('.choice-btn').click(); true");
    await waitForExpr(cdp, "!document.getElementById('feedback').hidden");
    const after = await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot()");
    if (after.answers !== 1 || !after.awaitingAdvance) throw new Error(`answer did not advance combat state ${JSON.stringify(after)}`);
    const mechanics = await evalExpr(cdp, `({
      hasBattlefield: !!document.querySelector('.battlefield'),
      mapNodes: document.querySelectorAll('.map-node').length,
      feedback: document.getElementById('feedbackVerdict').textContent,
      bossText: document.getElementById('bossHpText').textContent,
      comboText: document.getElementById('comboText').textContent,
      sourceLine: document.getElementById('sourceLine').textContent,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    })`);
    if (!mechanics.hasBattlefield || mechanics.mapNodes < 3 || !mechanics.feedback || !mechanics.sourceLine.includes('Source anchor')) {
      throw new Error(`mechanic DOM contract failed ${JSON.stringify(mechanics)}`);
    }
    if (mechanics.overflowX > 1) throw new Error(`horizontal overflow ${mechanics.overflowX}`);

    mkdirSync(ARTIFACT_DIR, { recursive: true });
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(path.join(ARTIFACT_DIR, "phone-battle.png"), Buffer.from(shot.data, "base64"));
    console.log("LEARNING_GAME_SMOKE_PASS browser-game-loop");
    console.log(`LEARNING_GAME_SCREENSHOT ${path.join(ARTIFACT_DIR, "phone-battle.png")}`);
  } finally {
    if (cdp) cdp.close();
    if (chromeProc) chromeProc.kill("SIGTERM");
    if (server) server.kill("SIGTERM");
    if (userDataDir) {
      try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); }
      catch { /* Windows can keep Chrome profile sqlite files locked briefly after SIGTERM; do not fail a passed smoke. */ }
    }
  }
}

runSmoke().catch((err) => {
  console.error("LEARNING_GAME_SMOKE_FAIL", err.message);
  process.exit(1);
});
