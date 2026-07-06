/**
 * V5 smoke: 50-loop director standard.
 * The product must behave as a fixed, guided animated experience: opening motion,
 * gated boarding, travel/reveal/settle phases, disabled inputs until settle, outcome before explanation.
 */
import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(ROOT, "..");
const PORT = Number(process.env.LGS_PORT || 8787);
const DEBUG_PORT = Number(process.env.LGS_DEBUG_PORT || 9232);
const BASE = `http://127.0.0.1:${PORT}`;
const ARTIFACT_DIR = path.join(REPO, "artifacts", "learning-game-v6");
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
      res.on("end", () => { try { resolve(JSON.parse(body)); } catch (err) { reject(err); } });
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
    fetchText(`${BASE}/src/app.js?v=20260706f`),
    fetchText(`${BASE}/index.html`),
    fetchText(`${BASE}/src/styles.css?v=20260706f`),
  ]);
  const required = [
    [manifest, "nvidiaai-llm-memorization-capacity-20260706", "manifest contains current deck"],
    [html, "camera-shutter", "camera shutter first-paint motion"],
    [html, "boarding-gate", "boarding gate exists"],
    [html, "director-camera", "director camera exists"],
    [html, "focus-beam", "focus beam exists"],
    [html, "settle-gate", "settle gate exists"],
    [html, "decision-rack", "decision rack exists"],
    [html, "src/app.js?v=20260706f", "v6 JS cache marker"],
    [html, "src/styles.css?v=20260706f", "v6 CSS cache marker"],
    [appJs, "visual-selfplay-50-v6", "v6 marker"],
    [appJs, "forceHomeSettled", "home gate hook"],
    [appJs, "forceSceneSettled", "scene gate hook"],
    [appJs, "button.disabled = true", "input disabled outside settle"],
    [appJs, "phase !== \"settled\"", "early input guard"],
    [css, "position: fixed", "fixed app stage"],
    [css, "overflow: hidden", "no document scroll"],
    [css, "@keyframes shutterOpen", "opening animation"],
    [css, "@keyframes trackRush", "continuous track motion"],
    [css, ".director-camera[data-phase=\"settled\"]", "settled phase styling"],
    [css, ".settle-gate[data-open=\"false\"]", "locked interaction styling"],
  ];
  for (const [haystack, needle, label] of required) {
    if (!haystack.includes(needle)) throw new Error(`static contract failed: ${label}`);
  }
  const banned = ["story-stage", "story-ticket", "ticket-dock", "narrator-bubble"];
  for (const term of banned) {
    if (html.includes(term) || css.includes(term)) throw new Error(`old web-game shell term leaked: ${term}`);
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
      console.log("VISUAL_SELFPLAY_50_V6_PASS static-contract");
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
    await waitForExpr(cdp, "window.__MECHANISM_RUN_DEBUG__ && document.querySelectorAll('.ride-capsule').length >= 1");

    const opening = await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot()");
    if (opening.marker !== "visual-selfplay-50-v6" || opening.screen !== "home" || opening.homePhase !== "intro" || opening.bodyOverflow !== "hidden") {
      throw new Error(`opening is not a fixed cinematic stage ${JSON.stringify(opening)}`);
    }
    const openingShot = await screenshot(cdp, "phone-opening-camera.png");

    await evalExpr(cdp, "document.getElementById('boardButton').click(); true");
    const rejected = await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot()");
    if (rejected.screen !== "home") throw new Error(`boarding allowed before guide settled ${JSON.stringify(rejected)}`);

    await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.forceHomeSettled(); true");
    await waitForExpr(cdp, "document.getElementById('boardButton').disabled === false");
    await evalExpr(cdp, "document.getElementById('boardButton').click(); true");
    await waitForExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot().screen === 'run'");
    const travel = await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot()");
    if (travel.phase !== "travel" || travel.choicesEnabled || !travel.hasCamera || !travel.hasBeam || !travel.hasGuide) {
      throw new Error(`travel phase failed locked-motion contract ${JSON.stringify(travel)}`);
    }
    const travelShot = await screenshot(cdp, "phone-travel-locked.png");

    await evalExpr(cdp, "document.querySelector('.steer-lever').click(); true");
    const ignored = await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot()");
    if (ignored.answers !== 0) throw new Error(`steering accepted before settle ${JSON.stringify(ignored)}`);

    await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.forceSceneSettled(); true");
    await waitForExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot().choicesEnabled === true");
    const settled = await evalExpr(cdp, `({
      ...window.__MECHANISM_RUN_DEBUG__.snapshot(),
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      frameHeight: Math.round(document.querySelector('.director-frame').getBoundingClientRect().height),
      cameraHeight: Math.round(document.querySelector('.director-camera').getBoundingClientRect().height),
      guideText: document.getElementById('guideLine').textContent,
      cueText: document.getElementById('interactionCue').textContent,
      enabledChoices: [...document.querySelectorAll('.steer-lever')].filter((button) => !button.disabled).length,
    })`);
    if (settled.phase !== "settled" || settled.enabledChoices < 2 || !settled.guideText || !settled.cueText) {
      throw new Error(`settled gate failed ${JSON.stringify(settled)}`);
    }
    if (settled.scrollWidth > settled.viewportWidth + 1) throw new Error(`horizontal overflow ${JSON.stringify(settled)}`);
    if (settled.cameraHeight < 260) throw new Error(`director camera too small ${JSON.stringify(settled)}`);
    const settledShot = await screenshot(cdp, "phone-settled-levers.png");

    await evalExpr(cdp, "document.querySelector('.steer-lever').click(); true");
    await waitForExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot().feedbackVisible === true");
    const outcome = await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot()");
    if (outcome.phase !== "outcome" || outcome.answers !== 1 || !outcome.feedbackVisible) {
      throw new Error(`outcome did not animate before explanation ${JSON.stringify(outcome)}`);
    }
    const outcomeShot = await screenshot(cdp, "phone-outcome-scroll.png");

    console.log("VISUAL_SELFPLAY_50_V6_PASS continuous-guided-experience");
    console.log(`FIFTY_LOOP_SCREENSHOT_OPENING ${openingShot}`);
    console.log(`FIFTY_LOOP_SCREENSHOT_TRAVEL ${travelShot}`);
    console.log(`FIFTY_LOOP_SCREENSHOT_SETTLED ${settledShot}`);
    console.log(`FIFTY_LOOP_SCREENSHOT_OUTCOME ${outcomeShot}`);
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
  console.error("VISUAL_SELFPLAY_50_V6_FAIL", err.message);
  process.exit(1);
});
