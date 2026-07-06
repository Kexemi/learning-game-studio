/**
 * Runs 50 real visual self-play rounds in headless Chrome.
 * Each round sets a big-picture goal, drives the UI to a visible phase,
 * captures a phone-browser screenshot, and records DOM/interaction metrics.
 */
import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(ROOT, "..");
const PORT = Number(process.env.LGS_PORT || 8791);
const DEBUG_PORT = Number(process.env.LGS_DEBUG_PORT || 9236);
const BASE = `http://127.0.0.1:${PORT}`;
const ARTIFACT_DIR = path.join(REPO, "artifacts", "learning-game-v7", "visual-self-play-50");
const CHROME_PATHS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

const goals = [
  ["opening", "First second must feel like entering a ride, not reading a page."],
  ["opening", "The guide/orb should be visually dominant enough to imply direction."],
  ["opening", "The title must not turn the scene into a static hero section."],
  ["boarding", "Boarding should feel like a diegetic gate over the stage, not a form card."],
  ["route", "Route station should make risk/reward legible without becoming a settings menu."],
  ["codex", "Codex should disclose mechanisms without hijacking the ride."],
  ["route", "Choosing a route should feel meaningful before the run starts."],
  ["travel", "The run must immediately restore motion after boarding."],
  ["travel", "The player should understand they cannot interact yet."],
  ["travel", "The question should not dominate before the scene settles."],
  ["travel", "The rider/wheel should communicate continuous forward motion."],
  ["travel", "The enemy/claim spirit should feel like a staged encounter."],
  ["travel", "The HUD should feel like cockpit lights, not a dashboard."],
  ["settled", "The settle moment should clearly shift attention to player control."],
  ["settled", "Choices should read like levers/actions, not answer cards."],
  ["settled", "The cue should make the one allowed action unmistakable."],
  ["settled", "The learning prompt should be readable without freezing the world."],
  ["settled", "The stage should still feel alive even while waiting."],
  ["settled", "The controls should not consume more visual weight than the scene."],
  ["outcome", "The consequence should happen before explanation text takes over."],
  ["outcome", "Correct/wrong should feel like a physical reaction in the ride."],
  ["outcome", "The source/explanation should feel like an aftermath scroll, not quiz feedback."],
  ["outcome", "The next action should preserve momentum."],
  ["opening", "The first viewport should have strong visual depth."],
  ["route", "The station menu should read as part of the world, not a navbar."],
  ["travel", "The rail/light progress should feel embedded in the ride."],
  ["settled", "The player should not see dead or disabled controls as broken."],
  ["outcome", "The outcome panel should not flatten the experience into text."],
  ["travel", "The scene should carry source material as environment, not exposition."],
  ["settled", "The lever labels should help without becoming UI jargon."],
  ["opening", "The screen should invite watching before tapping."],
  ["codex", "Mechanism detail should be optional and glanceable."],
  ["travel", "The guide line should be the primary instruction channel."],
  ["settled", "Interaction should be a rare quiet window."],
  ["outcome", "The ride should visibly acknowledge the answer."],
  ["opening", "The experience should not resemble a website landing page."],
  ["route", "Route cards should feel like strategic branches, not cosmetic mode buttons."],
  ["travel", "Camera/beam language should be visible enough to read as direction."],
  ["settled", "The question should feel staged inside a beam."],
  ["outcome", "The explanation should be subordinate to the ride reaction."],
  ["travel", "The moving world should occupy most of the viewport."],
  ["settled", "The player should see exactly one job: steer."],
  ["opening", "Ambient motion should surround the stage, not just sit behind it."],
  ["codex", "Optional source context should not become the main experience."],
  ["travel", "Threat/heart meters should be readable but low-chrome."],
  ["settled", "The answer area should feel like a cockpit surface."],
  ["outcome", "The transition to continue should feel like resuming motion."],
  ["opening", "No static-card geometry should dominate the first impression."],
  ["boarding", "No separate web sections should be perceptible."],
  ["travel", "The player should feel carried by the ride between choices."],
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
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.exception?.value || result.exceptionDetails.text || "Runtime exception";
    throw new Error(detail);
  }
  return result.result?.value;
}
async function waitForExpr(cdp, expression, ms = 10000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const value = await evalExpr(cdp, expression).catch(() => false);
    if (value) return value;
    await new Promise((r) => setTimeout(r, 120));
  }
  throw new Error(`waitForExpr timeout: ${expression}`);
}
async function screenshot(cdp, name) {
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const out = path.join(ARTIFACT_DIR, name);
  writeFileSync(out, Buffer.from(shot.data, "base64"));
  return out;
}
async function fresh(cdp) {
  await cdp.send("Page.navigate", { url: `${BASE}/index.html?selfplay=${Date.now()}` });
  await waitForExpr(cdp, "document.readyState === 'complete'");
  await waitForExpr(cdp, "window.__MECHANISM_RUN_DEBUG__ && document.querySelectorAll('.ride-capsule').length >= 1");
}
async function gotoPhase(cdp, phase) {
  await fresh(cdp);
  if (phase === "opening") return;
  await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.forceHomeSettled(); true");
  await waitForExpr(cdp, "document.getElementById('boardButton').disabled === false");
  if (phase === "boarding") return;
  if (phase === "route") {
    await evalExpr(cdp, "document.querySelector('[data-station=route]').click(); true");
    await waitForExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot().station === 'route'");
    return;
  }
  if (phase === "codex") {
    await evalExpr(cdp, "document.querySelector('[data-station=codex]').click(); true");
    await waitForExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot().station === 'codex'");
    return;
  }
  await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.chooseRoute('transfer'); document.querySelector('[data-station=board]').click(); true");
  await evalExpr(cdp, "document.getElementById('boardButton').click(); true");
  await waitForExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot().screen === 'run'");
  if (phase === "travel") return;
  await evalExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.forceSceneSettled(); true");
  await waitForExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot().choicesEnabled === true");
  if (phase === "settled") return;
  await evalExpr(cdp, "document.querySelector('.steer-lever').click(); true");
  await waitForExpr(cdp, "window.__MECHANISM_RUN_DEBUG__.snapshot().feedbackVisible === true");
}
async function metrics(cdp, phase, goal) {
  return evalExpr(cdp, `(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width <= 5 || r.height <= 5 || cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || 1) <= 0.05) return null;
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), area: Math.round(r.width*r.height) };
    };
    const viewport = { w: window.innerWidth, h: window.innerHeight, area: window.innerWidth * window.innerHeight };
    const buttons = [...document.querySelectorAll('button')].filter(b => {
      const r = b.getBoundingClientRect();
      const cs = getComputedStyle(b);
      return r.width > 1 && r.height > 1 && cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) > 0.05;
    });
    const enabled = buttons.filter(b => !b.disabled).length;
    const stage = rect('.home-stage') || rect('.director-camera') || rect('.stage-shell');
    const controls = rect('.boarding-gate') || rect('.settle-gate') || rect('.outcome-panel');
    const text = document.body.innerText || '';
    const snap = window.__MECHANISM_RUN_DEBUG__.snapshot();
    return {
      phase: ${JSON.stringify(phase)},
      goal: ${JSON.stringify(goal)},
      snapshot: snap,
      viewport,
      stage,
      controls,
      stageRatio: stage ? +(stage.area / viewport.area).toFixed(3) : 0,
      controlRatio: controls ? +(controls.area / viewport.area).toFixed(3) : 0,
      buttonCount: buttons.length,
      enabledButtonCount: enabled,
      disabledButtonCount: buttons.length - enabled,
      textChars: text.length,
      lineCount: text.split(String.fromCharCode(10)).filter(Boolean).length,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyOverflow: getComputedStyle(document.body).overflow,
      visibleClasses: [...document.querySelectorAll('*')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 5 && r.height > 5;
      }).slice(0, 80).map(el => el.className || el.id || el.tagName),
    };
  })()`);
}

async function run() {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const chrome = CHROME_PATHS.find((p) => existsSync(p));
  if (!chrome || typeof WebSocket === "undefined") throw new Error("System Chrome or WebSocket missing; cannot run visual self-play.");
  const server = spawn("python", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: REPO, stdio: "ignore", shell: false });
  let chromeProc = null;
  let userDataDir = null;
  let cdp = null;
  try {
    await waitForHttp(`${BASE}/index.html`);
    userDataDir = mkdtempSync(path.join(tmpdir(), "lgs-visual-loop-"));
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

    const rounds = [];
    for (let i = 0; i < goals.length; i += 1) {
      const [phase, goal] = goals[i];
      await gotoPhase(cdp, phase);
      const shot = await screenshot(cdp, `round-${String(i + 1).padStart(2, "0")}-${phase}.png`);
      const m = await metrics(cdp, phase, goal);
      rounds.push({ round: i + 1, phase, goal, screenshot: shot, metrics: m });
      console.log(`VISUAL_SELF_PLAY_ROUND ${i + 1}/50 ${phase}`);
    }
    const out = path.join(ARTIFACT_DIR, "raw-rounds.json");
    writeFileSync(out, JSON.stringify({ generated_at: new Date().toISOString(), base: BASE, rounds }, null, 2));
    console.log(`VISUAL_SELF_PLAY_RAW ${out}`);
    console.log("VISUAL_SELF_PLAY_CAPTURE_PASS 50");
  } finally {
    if (cdp) cdp.close();
    if (chromeProc) chromeProc.kill("SIGTERM");
    if (server) server.kill("SIGTERM");
    if (userDataDir) {
      try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); }
      catch { /* ignore transient Chrome locks */ }
    }
  }
}

run().catch((err) => {
  console.error("VISUAL_SELF_PLAY_CAPTURE_FAIL", err.message);
  process.exit(1);
});
