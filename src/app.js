const STORAGE_KEY = "mechanism-run-v7";
const EXPERIENCE_MARKER = "reference-structure-v7";
const TIMING = { opening: 1450, approach: 780, reveal: 620, outcome: 380 };

const els = {
  app: document.getElementById("app"),
  viewHome: document.getElementById("viewHome"),
  viewRun: document.getElementById("viewRun"),
  viewSummary: document.getElementById("viewSummary"),
  homeGuideLine: document.getElementById("homeGuideLine"),
  boardingTitle: document.getElementById("boardingTitle"),
  boardingCopy: document.getElementById("boardingCopy"),
  boardingGate: document.getElementById("boardingGate"),
  boardButton: document.getElementById("boardButton"),
  stationMenu: document.getElementById("stationMenu"),
  routeChooser: document.getElementById("routeChooser"),
  codexPanel: document.getElementById("codexPanel"),
  deckList: document.getElementById("deckList"),
  loadHint: document.getElementById("loadHint"),
  runArena: document.getElementById("runArena"),
  runTitle: document.getElementById("runTitle"),
  playerHpText: document.getElementById("playerHpText"),
  staticText: document.getElementById("staticText"),
  directorCamera: document.getElementById("directorCamera"),
  runMap: document.getElementById("runMap"),
  routeStrip: document.getElementById("routeStrip"),
  guideLine: document.getElementById("guideLine"),
  storyCounter: document.getElementById("storyCounter"),
  enemyAvatar: document.getElementById("enemyAvatar"),
  enemyName: document.getElementById("enemyName"),
  questionStem: document.getElementById("questionStem"),
  threatPill: document.getElementById("threatPill"),
  settleGate: document.getElementById("settleGate"),
  interactionCue: document.getElementById("interactionCue"),
  choices: document.getElementById("choices"),
  feedback: document.getElementById("feedback"),
  feedbackVerdict: document.getElementById("feedbackVerdict"),
  feedbackBody: document.getElementById("feedbackBody"),
  sourceLine: document.getElementById("sourceLine"),
  btnNext: document.getElementById("btnNext"),
  btnExitRun: document.getElementById("btnExitRun"),
  summaryTitle: document.getElementById("summaryTitle"),
  summaryScore: document.getElementById("summaryScore"),
  masteryFill: document.getElementById("masteryFill"),
  summaryReward: document.getElementById("summaryReward"),
  resultGrid: document.getElementById("resultGrid"),
  summaryTags: document.getElementById("summaryTags"),
  btnReplay: document.getElementById("btnReplay"),
  btnHome: document.getElementById("btnHome"),
};

const state = {
  manifest: null,
  packs: new Map(),
  activePackId: null,
  station: "board",
  routeMode: "guided",
  progress: loadProgress(),
  run: null,
  timers: [],
};

const worlds = [
  { key: "privacy", icon: "◇", name: "Whisper Fox", place: "Privacy Tunnel", travel: "The tunnel tries to turn finite capacity into false safety. The guide slows the rail until risk has shape." },
  { key: "capacity", icon: "◈", name: "Hydra of Units", place: "Capacity Bridge", travel: "Numbers stack into towers. The guide waits for the units to become visible before you steer." },
  { key: "scaling", icon: "⬡", name: "Scale Moth", place: "Scaling Lights", travel: "Bigger-model lights rush past the windows. The guide asks which part truly scales." },
  { key: "generalization", icon: "△", name: "Mirage Cart", place: "Generalization Dunes", travel: "The dunes blur copying and understanding. The wheel looks for the boundary line." },
  { key: "interconnect", icon: "⌁", name: "Latency Serpent", place: "Interconnect Switchyard", travel: "Switches flash under the track. Any move that ignores the bottleneck will wobble." },
  { key: "evidence", icon: "✦", name: "Proof Owl", place: "Evidence Orchard", travel: "Claims hang like fruit. The guide waits for the one with proof behind it." },
];
const leverLabels = ["ease left", "cut inward", "hold center", "jump rail"];
const routeModes = {
  guided: {
    label: "Guided Path",
    short: "best first run",
    risk: "low static",
    reward: "clear sequence",
    copy: "A Duolingo-style path: the next best scene is obvious and the guide keeps the player moving.",
    hp: 100,
    staticBoost: 1,
    hitBoost: 1,
    verbs: ["trace proof", "name mechanism", "hold units", "reject decoy"],
  },
  boss: {
    label: "Boss Climb",
    short: "risk / reward",
    risk: "+30% jolts",
    reward: "+combo bite",
    copy: "A Slay-the-Spire-style route: the player knowingly chooses pressure for stronger rewards.",
    hp: 92,
    staticBoost: 1.25,
    hitBoost: 1.3,
    verbs: ["call bluff", "cut false path", "pressure test", "lock claim"],
  },
  transfer: {
    label: "Transfer Trial",
    short: "no-hint agency",
    risk: "less scaffolding",
    reward: "deeper memory",
    copy: "A mastery route: fewer hints, more applied choice, and explanation only after consequence.",
    hp: 96,
    staticBoost: 1.12,
    hitBoost: 1.15,
    verbs: ["apply elsewhere", "find boundary", "choose exception", "compress rule"],
  },
};
function activeRoute() { return routeModes[state.routeMode] || routeModes.guided; }
function choiceMove(index) {
  const route = activeRoute();
  return {
    verb: route.verbs[index % route.verbs.length],
    stakes: `${route.risk} · ${route.reward}`,
  };
}

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{\"completed\":{}}"); }
  catch { return { completed: {} }; }
}
function saveProgress() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); }
function clearTimers() { state.timers.forEach((id) => clearTimeout(id)); state.timers = []; }
function timer(fn, ms) { const id = setTimeout(fn, ms); state.timers.push(id); return id; }
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}
function showView(name) {
  els.app.dataset.screen = name;
  for (const view of [els.viewHome, els.viewRun, els.viewSummary]) {
    const active = view.dataset.view === name;
    view.hidden = !active;
    view.classList.toggle("is-active", active);
  }
}
function profileLabel(profile) {
  return { courtroom: "proof ride", "boss-fight": "boss ride", "myth-bust": "myth ride", "build-room": "build ride", "failure-lab": "failure ride", "map-expedition": "map ride" }[profile] || "guided ride";
}
function setHomePhase(phase) {
  els.app.dataset.homePhase = phase;
  const ready = phase === "board";
  els.boardButton.disabled = !ready || !state.activePackId;
  els.stationMenu.querySelectorAll("button[data-station]").forEach((button) => { button.disabled = !ready; });
  document.querySelectorAll(".ride-capsule").forEach((button) => { button.disabled = !ready; });
  if (phase === "intro") {
    els.homeGuideLine.textContent = "The camera is opening. Let the source become a ride.";
    els.boardingTitle.textContent = "Wait for the guide…";
    els.boardingCopy.textContent = "The gate unlocks after the opening motion lands.";
  } else if (phase === "approach") {
    els.homeGuideLine.textContent = "The rail is approaching. The guide is turning content into a path.";
    els.boardingTitle.textContent = "Almost settled.";
    els.boardingCopy.textContent = "The stage is still moving. Watch for the boarding cue.";
  } else {
    els.homeGuideLine.textContent = "Now board. The ride will carry the lesson and stop only when you steer.";
    els.boardingTitle.textContent = "Boarding window open.";
    els.boardingCopy.textContent = activePackTitle();
  }
}
function startOpening() {
  clearTimers();
  setHomePhase("intro");
  timer(() => setHomePhase("approach"), Math.floor(TIMING.opening * 0.55));
  timer(() => setHomePhase("board"), TIMING.opening);
}
function activePackTitle() {
  const pack = state.packs.get(state.activePackId);
  return pack ? `${pack.title} · ${(pack.questions || []).length} scenes · ${activeRoute().label}` : "Choose a ride capsule.";
}
function setStation(station) {
  state.station = station;
  els.app.dataset.station = station;
  els.stationMenu.querySelectorAll("button[data-station]").forEach((button) => {
    const active = button.dataset.station === station;
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  els.boardingGate.hidden = station !== "board";
  els.deckList.hidden = station !== "board";
  els.routeChooser.hidden = station !== "route";
  els.codexPanel.hidden = station !== "codex";
}
function renderRouteChooser() {
  els.routeChooser.innerHTML = Object.entries(routeModes).map(([key, route], index) => `
    <button type="button" class="route-card" data-route="${key}" data-active="${key === state.routeMode ? "true" : "false"}">
      <span class="route-number">0${index + 1}</span>
      <strong>${escapeHtml(route.label)}</strong>
      <small>${escapeHtml(route.short)} · ${escapeHtml(route.risk)}</small>
      <em>${escapeHtml(route.copy)}</em>
    </button>
  `).join("");
  els.routeChooser.querySelectorAll(".route-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.routeMode = button.dataset.route;
      renderRouteChooser();
      renderDeckList();
      renderCodexPanel();
      setHomePhase(els.app.dataset.homePhase || "board");
    });
  });
}
function renderCodexPanel() {
  const pack = state.packs.get(state.activePackId);
  if (!pack) {
    els.codexPanel.innerHTML = `<p class="system-label">codex</p><h2>No ride loaded.</h2>`;
    return;
  }
  const tags = new Map();
  (pack.questions || []).forEach((q) => (q.mechanism_tags || []).forEach((tag) => tags.set(tag, (tags.get(tag) || 0) + 1)));
  const tagRows = [...tags.entries()].slice(0, 9).map(([tag, count]) => `<li><span>${escapeHtml(tag)}</span><b>${count}</b></li>`).join("");
  els.codexPanel.innerHTML = `
    <p class="system-label">codex</p>
    <h2>${escapeHtml(pack.game_hooks?.arena || pack.title)}</h2>
    <p>${escapeHtml(activeRoute().label)} turns this deck into ${escapeHtml((pack.questions || []).length)} staged mechanism encounters.</p>
    <ul>${tagRows || "<li><span>mechanisms loading</span><b>0</b></li>"}</ul>
  `;
}
function renderDeckList() {
  els.deckList.innerHTML = "";
  const packs = state.manifest?.packs || [];
  if (!packs.length) {
    els.loadHint.hidden = false;
    els.loadHint.textContent = "No rides found.";
    return;
  }
  els.loadHint.hidden = true;
  state.activePackId ||= state.manifest.default_pack_id || packs[0].pack_id;
  packs.forEach((entry, index) => {
    const pack = state.packs.get(entry.pack_id);
    const best = state.progress.completed?.[entry.pack_id];
    const capsule = document.createElement("button");
    capsule.type = "button";
    capsule.className = "ride-capsule";
    capsule.dataset.active = entry.pack_id === state.activePackId ? "true" : "false";
    capsule.style.setProperty("--delay", `${index * 0.08}s`);
    capsule.setAttribute("role", "listitem");
    capsule.innerHTML = `
      <span class="capsule-light"></span>
      <span class="capsule-route">${escapeHtml(profileLabel(entry.forge_profile || pack?.forge_profile))}</span>
      <strong>${escapeHtml(entry.title || pack?.title || entry.pack_id)}</strong>
      <small>${pack?.questions?.length || 0} scenes${best ? ` · best ${best.rank}` : ""}</small>
    `;
    capsule.disabled = els.app.dataset.homePhase !== "board";
    capsule.addEventListener("click", () => {
      state.activePackId = entry.pack_id;
      renderDeckList();
      if (els.app.dataset.homePhase === "board") setHomePhase("board");
    });
    els.deckList.appendChild(capsule);
  });
  if (els.app.dataset.homePhase === "board") setHomePhase("board");
  renderRouteChooser();
  renderCodexPanel();
}
function pickWorld(question, index) {
  const tags = (question.mechanism_tags || []).map((tag) => String(tag).toLowerCase());
  return worlds.find((world) => tags.some((tag) => tag.includes(world.key))) || worlds[index % worlds.length];
}
function buildScenes(pack) {
  return pack.questions.map((q, index) => ({
    id: q.id,
    index,
    q,
    world: pickWorld(q, index),
    hit: 8 + Math.min(10, (q.mechanism_tags || []).length * 2) + (q.transfer_type === "no_hint" ? 8 : 0),
    state: "locked",
  }));
}
function pct(value, max) { return `${Math.max(0, Math.min(100, Math.round((value / max) * 100)))}%`; }
function renderRailLights() {
  const run = state.run;
  els.runMap.innerHTML = "";
  run.scenes.forEach((scene, index) => {
    const light = document.createElement("span");
    light.className = "rail-bulb";
    light.dataset.state = index === run.index ? "current" : scene.state;
    els.runMap.appendChild(light);
  });
  renderRouteStrip();
}
function renderRouteStrip() {
  const run = state.run;
  if (!run) return;
  const route = routeModes[run.routeMode] || routeModes.guided;
  const windowScenes = run.scenes.slice(run.index, run.index + 3);
  els.routeStrip.innerHTML = windowScenes.map((scene, offset) => {
    const stage = offset === 0 ? "now" : `next ${offset}`;
    const risk = scene.q.transfer_type === "no_hint" ? "transfer" : scene.world.place;
    return `<span class="route-node" data-now="${offset === 0 ? "true" : "false"}"><b>${escapeHtml(stage)}</b><strong>${escapeHtml(scene.world.name)}</strong><small>${escapeHtml(risk)}</small></span>`;
  }).join("") || `<span class="route-node" data-now="true"><b>arrival</b><strong>${escapeHtml(route.label)}</strong><small>route clear</small></span>`;
}
function renderMeters() {
  const run = state.run;
  els.playerHpText.textContent = `heart ${run.hp}`;
  els.staticText.textContent = `static ${run.static}`;
  els.app.style.setProperty("--hp", pct(run.hp, 100));
  els.app.style.setProperty("--static", pct(run.static, run.staticMax));
}
function setRunPhase(phase, line, cue) {
  const run = state.run;
  if (!run) return;
  run.phase = phase;
  els.directorCamera.dataset.phase = phase;
  els.settleGate.dataset.open = phase === "settled" ? "true" : "false";
  els.guideLine.textContent = line;
  els.interactionCue.textContent = cue;
}
function renderLevers(scene) {
  els.choices.innerHTML = "";
  scene.q.choices.forEach((choice, index) => {
    const move = choiceMove(index);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "steer-lever";
    button.dataset.move = move.verb;
    button.disabled = true;
    button.innerHTML = `<span>${escapeHtml(move.verb)}</span><strong>${escapeHtml(choice)}</strong><em>${escapeHtml(move.stakes)}</em>`;
    button.addEventListener("click", () => answerScene(index, button));
    els.choices.appendChild(button);
  });
}
function startRun(packId = state.activePackId) {
  clearTimers();
  const pack = state.packs.get(packId);
  if (!pack) return;
  const manifestEntry = state.manifest.packs.find((entry) => entry.pack_id === packId) || {};
  const scenes = buildScenes(pack);
  const route = activeRoute();
  const staticMax = Math.round(Math.max(96, scenes.length * 18) * route.staticBoost);
  state.run = { packId, pack, manifestEntry, scenes, routeMode: state.routeMode, index: 0, hp: route.hp, staticMax, static: staticMax, combo: 0, bestCombo: 0, correct: 0, phase: "travel", answers: [] };
  els.runArena.textContent = `${route.label} · ${manifestEntry.arena || pack.game_hooks?.arena || "guided rail"}`;
  els.runTitle.textContent = pack.title;
  showView("run");
  beginScene();
}
function beginScene() {
  clearTimers();
  const run = state.run;
  const scene = run.scenes[run.index];
  const q = scene.q;
  els.feedback.hidden = true;
  els.directorCamera.dataset.result = "none";
  els.enemyAvatar.textContent = scene.world.icon;
  els.enemyName.textContent = scene.world.name;
  els.storyCounter.textContent = `scene ${run.index + 1} / ${run.scenes.length}`;
  els.questionStem.textContent = q.stem;
  els.threatPill.textContent = q.transfer_type === "no_hint" ? "no hint lights" : scene.world.place;
  renderLevers(scene);
  renderRailLights();
  renderMeters();
  const route = routeModes[run.routeMode] || routeModes.guided;
  setRunPhase("travel", `${route.label}: ${scene.world.travel}`, "Do not steer yet — read the path, not the buttons.");
  timer(() => setRunPhase("reveal", `${scene.world.name} enters the beam. The route preview tells you what kind of decision this is.`, "Watch the beam. The levers are not ready."), TIMING.approach);
  timer(() => {
    setRunPhase("settled", `${route.label} has settled. Choose one move with a clear stake.`, "Your turn: pick the lever whose consequence you can defend.");
    [...els.choices.children].forEach((button) => { button.disabled = false; });
  }, TIMING.approach + TIMING.reveal);
}
function answerScene(choiceIndex, button) {
  const run = state.run;
  if (!run || run.phase !== "settled") return;
  const scene = run.scenes[run.index];
  const q = scene.q;
  const route = routeModes[run.routeMode] || routeModes.guided;
  const correct = choiceIndex === q.correct_index;
  [...els.choices.children].forEach((child) => { child.disabled = true; });
  button.classList.add(correct ? "is-correct" : "is-wrong");
  const right = els.choices.children[q.correct_index];
  if (right) right.classList.add("is-correct");
  setRunPhase("outcome", "The stage reacts before the explanation arrives…", "Watch the consequence. Then roll onward.");
  if (correct) {
    const damage = Math.min(run.static, Math.round((16 + run.combo * 5 + (q.transfer_type === "no_hint" ? 8 : 0)) * route.staticBoost));
    run.static -= damage;
    run.combo += 1;
    run.bestCombo = Math.max(run.bestCombo, run.combo);
    run.correct += 1;
    run.hp = Math.min(100, run.hp + 2);
    scene.state = "cleared";
    els.directorCamera.dataset.result = "clear";
    els.feedbackVerdict.textContent = `The wheel catches. Static falls by ${damage}.`;
  } else {
    const hit = Math.round(scene.hit * route.hitBoost);
    run.hp = Math.max(1, run.hp - hit);
    run.combo = 0;
    scene.state = "wounded";
    els.directorCamera.dataset.result = "wobble";
    els.feedbackVerdict.textContent = `${scene.world.name} jolts the rail. Heart drops by ${hit}.`;
  }
  run.answers.push({ id: q.id, correct, hp: run.hp, static: run.static });
  els.feedbackBody.textContent = q.explanation;
  els.sourceLine.textContent = `Source: ${q.source_anchor || "source anchor missing"}`;
  els.btnNext.textContent = run.index + 1 >= run.scenes.length ? "arrive" : "continue";
  renderRailLights();
  renderMeters();
  timer(() => { els.feedback.hidden = false; }, TIMING.outcome);
}
function rankRun(score, hp, bestCombo) {
  if (score === 100 && hp >= 75) return "S";
  if (score >= 85) return "A";
  if (score >= 70 || bestCombo >= 3) return "B";
  if (score >= 50) return "C";
  return "D";
}
function finishRun() {
  clearTimers();
  const run = state.run;
  const total = run.scenes.length;
  const score = Math.round((run.correct / total) * 100);
  const rank = rankRun(score, run.hp, run.bestCombo);
  const reward = run.manifestEntry.reward_skin || run.pack.game_hooks?.reward_skin || "Mechanism token";
  const route = routeModes[run.routeMode] || routeModes.guided;
  state.progress.completed[run.pack.pack_id] = { score, rank, hp: run.hp, bestCombo: run.bestCombo, route: run.routeMode, at: Date.now() };
  saveProgress();
  renderDeckList();
  els.summaryTitle.textContent = score >= 70 ? "The idea keeps moving in you." : "The guide marks the weak turns.";
  els.summaryScore.textContent = `${run.correct}/${total} scenes held · rank ${rank} · heart ${run.hp}`;
  els.masteryFill.style.width = `${score}%`;
  els.summaryReward.textContent = score >= 70 ? `Unlocked: ${reward}. ${route.label} turned the lesson into decisions, not menu hunting.` : `Ride ${route.label} again. The second pass should feel less like guessing and more like steering.`;
  els.resultGrid.innerHTML = `<div><span>${rank}</span><small>rank</small></div><div><span>${run.bestCombo}</span><small>best wheel</small></div><div><span>${run.static}</span><small>static left</small></div>`;
  els.summaryTags.innerHTML = "";
  const tags = new Set();
  run.pack.questions.forEach((q) => (q.mechanism_tags || []).forEach((tag) => tags.add(tag)));
  for (const tag of tags) {
    const li = document.createElement("li");
    li.textContent = tag;
    els.summaryTags.appendChild(li);
  }
  showView("summary");
}
async function boot() {
  try {
    state.manifest = await fetchJson("content/pack-manifest.json");
    for (const entry of state.manifest.packs) state.packs.set(entry.pack_id, await fetchJson(entry.path));
    state.activePackId = state.manifest.default_pack_id || state.manifest.packs?.[0]?.pack_id;
    renderDeckList();
    setStation("board");
    startOpening();
  } catch (err) {
    els.loadHint.hidden = false;
    els.loadHint.textContent = `Could not load ride: ${err.message}`;
  }
}

els.boardButton.addEventListener("click", () => {
  if (els.app.dataset.homePhase !== "board" || els.boardButton.disabled) return;
  startRun(state.activePackId);
});
els.stationMenu.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-station]");
  if (!button || button.disabled) return;
  setStation(button.dataset.station);
});
els.btnNext.addEventListener("click", () => {
  if (!state.run) return;
  if (state.run.index + 1 >= state.run.scenes.length) finishRun();
  else { state.run.index += 1; beginScene(); }
});
els.btnExitRun.addEventListener("click", () => { clearTimers(); showView("home"); startOpening(); });
els.btnReplay.addEventListener("click", () => state.run && startRun(state.run.packId));
els.btnHome.addEventListener("click", () => { showView("home"); startOpening(); });

window.__MECHANISM_RUN_DEBUG__ = {
  marker: EXPERIENCE_MARKER,
  state,
  forceHomeSettled() { clearTimers(); setHomePhase("board"); },
  chooseRoute(mode) {
    if (!routeModes[mode]) return false;
    state.routeMode = mode;
    renderRouteChooser();
    renderDeckList();
    renderCodexPanel();
    return true;
  },
  forceSceneSettled() {
    if (!state.run) return;
    clearTimers();
    setRunPhase("settled", "The ride has settled. Steer once, then let the motion answer.", "Your turn: choose the lever that keeps the mechanism true.");
    [...els.choices.children].forEach((button) => { button.disabled = false; });
  },
  snapshot() {
    const run = state.run;
    return run ? {
      marker: EXPERIENCE_MARKER,
      station: state.station,
      routeMode: run.routeMode,
      routeNodes: document.querySelectorAll('.route-node').length,
      routeCards: document.querySelectorAll('.route-card').length,
      screen: els.app.dataset.screen,
      homePhase: els.app.dataset.homePhase,
      phase: run.phase,
      hp: run.hp,
      static: run.static,
      scene: run.index,
      answers: run.answers.length,
      choicesEnabled: [...els.choices.children].some((button) => !button.disabled),
      feedbackVisible: !els.feedback.hidden,
      hasCamera: !!document.querySelector(".director-camera"),
      hasBeam: !!document.querySelector(".focus-beam"),
      hasGuide: !!document.querySelector(".guide-orb"),
      bodyOverflow: getComputedStyle(document.body).overflow,
      frameHeight: Math.round(document.querySelector(".director-frame").getBoundingClientRect().height),
    } : {
      marker: EXPERIENCE_MARKER,
      station: state.station,
      routeMode: state.routeMode,
      routeNodes: document.querySelectorAll('.route-node').length,
      routeCards: document.querySelectorAll('.route-card').length,
      screen: els.app.dataset.screen,
      homePhase: els.app.dataset.homePhase,
      phase: null,
      hp: null,
      static: null,
      scene: null,
      answers: 0,
      choicesEnabled: false,
      feedbackVisible: false,
      hasCamera: !!document.querySelector(".director-camera"),
      hasBeam: !!document.querySelector(".focus-beam"),
      hasGuide: !!document.querySelector(".guide-orb"),
      bodyOverflow: getComputedStyle(document.body).overflow,
      frameHeight: Math.round(document.querySelector(".director-frame").getBoundingClientRect().height),
    };
  },
};

boot();
