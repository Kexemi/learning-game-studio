/**
 * Headless smoke: the app must behave like a continuous directed animation.
 * It should move and guide from first paint, then settle only at interaction windows.
 */
import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(ROOT, "..");
const PORT = Number(process.env.LGS_PORT || 8786);
const DEBUG_PORT = Number(process.env.LGS_DEBUG_PORT || 9231);
const BASE = `http://127.0.0.1:${PORT}`;
const ARTIFACT_DIR = path.join(REPO, "artifacts", "learning-game-v4");
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
  const result = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Runtime exception");
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

async function screenshot(cdp, name) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const out = path.join(ARTIFACT_DIR, name);
  writeFileSync(out, Buffer.from(shot.data, "base64"));
  return out;
}

async function fetchText(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch ${url} ${res.status}`);
  return res.text();
}

async function runStaticContract() {
  const [manifest, appJs, html, css] = await Promise.all([
    fetchText(`${BASE}/content/pack-manifest.json`),
    fetchText(`${BASE}/src/app.js?v=20260706d`),
    fetchText(`${BASE}/index.html`),
    fetchText(`${BASE}/src/styles.css?v=20260706d`),
  ]);
  const required = [
    [manifest, "nvidiaai-llm-memorization-capacity-20260706", "manifest contains current deck"],
    [html, "opening-cinematic", "opening cinematic present"],
    [html, "settle-panel", "settle panel present"],
    [html, "ticket-rail", "ticket rail present"],
    [html, "director-stage", "director stage present"],
    [html, "interaction-window", "interaction window present"],
    [html, "src/app.js?v=20260706d", "index points at v4 JS"],
    [html, "src/styles.css?v=20260706d", "index points at v4 CSS"],
    [appJs, "continuous-directed-animation", "directed-animation marker present"],
    [appJs, "TIMING", "director timing present"],
    [appJs, "forceHomeSettled", "home settle test hook present"],
    [appJs, "forceSceneSettled", "scene settle test hook present"],
    [appJs, "setRunPhase", "phase director present"],
    [appJs, "button.disabled = true", "choices disabled outside interaction window"],
    [css, "@keyframes curtainOpen", "opening curtain animation present"],
    [css, "@keyframes trackRush", "track motion animation present"],
    [css, ".director-stage[data-phase=\"travel\"]", "travel phase CSS present"],
    [css, ".director-stage[data-phase=\"settled\"]", "settled phase CSS present"],
    [css, ".interaction-window[data-ready=\"false\"]", "non-interaction window muted"],
  ];
  for (const [haystack, needle, label] of required) {
    if (!haystack.includes(needle)) throw new Error(`static contract failed: ${label}`);
  }
}

async function runSmoke() {
  const server = spawn("python", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: REPO, stdio: "ignore", shell: false });
  let chromeProc = null;
  let userDataDir = null;
  let cdp = null;
  try {
    await waitForHttp(`${BASE}/index.html`);
    await runStaticContract();

    const chrome = CHROME_PATHS.find((p) => existsSync(p));
    if (!chrome || typeof WebSocket === "undefined") {
      console.log("LEARNING_GAME_SMOKE_PASS static-continuous-directed-animation");
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
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 665, deviceScaleFactor: 2, mobile: true });
    await cdp.send("Page.navigate", { url: `${BASE}/index.html` });
    await waitForExpr(cdp, "document.readyState === 'complete'");
    await waitForExpr(cdp, "window.__MECHANISM_RUN_DEBUG__ && document.querySelectorAll('.guided-ticket').length >= 1");

    const opening = await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot()");
    if (opening.marker !== "continuous-directed-animation" || opening.screen !== "home" || !opening.hasMotionLayers || !opening.hasGuidance) {
      throw new Error(`bad opening snapshot ${JSON.stringify(opening)}`);
    }
    await screenshot(cdp, "phone-opening-cinematic.png");

    await evalExpr(cdp, "document.getElementById('app').dataset.homePhase = 'arrival'; document.querySelector('.guided-ticket').click(); window.__MECHANISM_RUN_DEBUG__.snapshot()");
    const rejectedEarlyTap = await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot()");
    if (rejectedEarlyTap.screen !== "home") throw new Error(`ticket accepted before director settled ${JSON.stringify(rejectedEarlyTap)}`);

    await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.forceHomeSettled(); document.querySelector('.guided-ticket').click(); true");
    await waitForExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot().screen === 'run'");
    const travel = await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot()");
    if (travel.phase !== "travel" || travel.choicesEnabled) throw new Error(`travel phase should not accept input ${JSON.stringify(travel)}`);
    await screenshot(cdp, "phone-ride-travel.png");

    await evalExpr(cdp, "document.querySelector('.steer-card').click(); true");
    const ignoredTravelTap = await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot()");
    if (ignoredTravelTap.answers !== 0) throw new Error(`choice accepted while still traveling ${JSON.stringify(ignoredTravelTap)}`);

    await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.forceSceneSettled(); true");
    await waitForExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot().choicesEnabled === true");
    const settled = await evalExpr(cdp, `({
      ...window.__MECHANISM_RUN_DEBUG__.snapshot(),
      stageHeight: Math.round(document.querySelector('.director-stage').getBoundingClientRect().height),
      frameWidth: Math.round(document.querySelector('.experience-frame').getBoundingClientRect().width),
      viewportWidth: window.innerWidth,
      bodyOverflowX: getComputedStyle(document.body).overflowX,
      guideText: document.getElementById('directorLine').textContent,
      cueText: document.getElementById('interactionCue').textContent,
      enabledChoices: [...document.querySelectorAll('.steer-card')].filter((button) => !button.disabled).length,
    })`);
    if (settled.phase !== "settled" || settled.enabledChoices < 2 || !settled.guideText || !settled.cueText) {
      throw new Error(`settled interaction window failed ${JSON.stringify(settled)}`);
    }
    if (settled.stageHeight < 260) throw new Error(`director stage too small ${settled.stageHeight}`);
    if (settled.frameWidth > settled.viewportWidth + 1) throw new Error(`experience frame overflow ${JSON.stringify(settled)}`);
    const primaryScreenshot = await screenshot(cdp, "phone-directed-experience.png");

    await evalExpr(cdp, "document.querySelector('.steer-card').click(); true");
    await waitForExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot().feedbackVisible === true");
    const outcome = await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot()");
    if (outcome.phase !== "outcome" || outcome.answers !== 1 || !outcome.feedbackVisible) {
      throw new Error(`outcome did not animate then explain ${JSON.stringify(outcome)}`);
    }
    const outcomeScreenshot = await screenshot(cdp, "phone-outcome-scroll.png");

    console.log("LEARNING_GAME_SMOKE_PASS continuous-directed-animation");
    console.log(`LEARNING_GAME_SCREENSHOT ${primaryScreenshot}`);
    console.log(`LEARNING_GAME_SCREENSHOT_OUTCOME ${outcomeScreenshot}`);
  } finally {
    if (cdp) cdp.close();
    if (chromeProc) chromeProc.kill("SIGTERM");
    if (server) server.kill("SIGTERM");
    if (userDataDir) {
      try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); }
      catch { /* Windows can hold Chrome sqlite files briefly after SIGTERM; do not fail a passed smoke. */ }
    }
  }
}

runSmoke().catch((err) => {
  console.error("LEARNING_GAME_SMOKE_FAIL", err.message);
  process.exit(1);
});
