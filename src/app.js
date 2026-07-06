const STORAGE_KEY = "mechanism-run-v4";
const EXPERIENCE_MARKER = "continuous-directed-animation";
const TIMING = {
  homeArrival: 1200,
  sceneTravel: 760,
  sceneReveal: 520,
  outcomeBeat: 360,
};

const els = {
  app: document.getElementById("app"),
  deckList: document.getElementById("deckList"),
  loadHint: document.getElementById("loadHint"),
  homeGuide: document.getElementById("homeGuide"),
  homeSettlePanel: document.getElementById("homeSettlePanel"),
  viewHome: document.getElementById("viewHome"),
  viewRun: document.getElementById("viewRun"),
  viewSummary: document.getElementById("viewSummary"),
  runArena: document.getElementById("runArena"),
  runTitle: document.getElementById("runTitle"),
  runMap: document.getElementById("runMap"),
  directorStage: document.getElementById("directorStage"),
  directorLine: document.getElementById("directorLine"),
  directorCaption: document.getElementById("directorCaption"),
  storyCounter: document.getElementById("storyCounter"),
  interactionWindow: document.getElementById("interactionWindow"),
  interactionCue: document.getElementById("interactionCue"),
  enemyAvatar: document.getElementById("enemyAvatar"),
  enemyName: document.getElementById("enemyName"),
  playerHpText: document.getElementById("playerHpText"),
  bossHpText: document.getElementById("bossHpText"),
  threatPill: document.getElementById("threatPill"),
  questionStem: document.getElementById("questionStem"),
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
  progress: loadProgress(),
  run: null,
  timers: [],
};

const worlds = [
  { key: "privacy", icon: "◇", name: "Whisper Fox", place: "Privacy Tunnel", travel: "The tunnel whispers easy certainty. The guide slows the wheel until risk is visible." },
  { key: "capacity", icon: "◈", name: "Hydra of Units", place: "Capacity Bridge", travel: "Numbers rise like bridge towers. The wheel waits for the units to line up." },
  { key: "scaling", icon: "⬡", name: "Scale Moth", place: "Scaling Lights", travel: "Bright scaling lights rush past. The guide asks what the bigger model actually buys." },
  { key: "generalization", icon: "△", name: "Mirage Cart", place: "Generalization Dunes", travel: "The dunes shimmer between copying and understanding. The wheel settles at the boundary." },
  { key: "interconnect", icon: "⌁", name: "Latency Serpent", place: "Interconnect Switchyard", travel: "Switches spark under the track. The wheel listens for the bottleneck." },
  { key: "evidence", icon: "✦", name: "Proof Owl", place: "Evidence Orchard", travel: "Branches open into claims and counterclaims. The guide waits for proof." },
];
const steerLabels = ["steer gently", "cut across", "hold steady", "jump the rail"];

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { completed: {} };
  } catch {
    return { completed: {} };
  }
}
function saveProgress() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); }
function setTimer(fn, ms) {
  const id = setTimeout(fn, ms);
  state.timers.push(id);
  return id;
}
function clearDirectorTimers() {
  state.timers.forEach((id) => clearTimeout(id));
  state.timers = [];
}
async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function showView(name) {
  els.app.dataset.screen = name;
  for (const section of [els.viewHome, els.viewRun, els.viewSummary]) {
    const active = section.dataset.view === name;
    section.hidden = !active;
    section.classList.toggle("screen-active", active);
  }
}
function profileLabel(profile) {
  return {
    "boss-fight": "boss ride",
    "myth-bust": "myth ride",
    "build-room": "build ride",
    "failure-lab": "failure ride",
    "map-expedition": "map ride",
    courtroom: "proof ride",
  }[profile] || "story ride";
}
function startOpeningDirector() {
  els.app.dataset.homePhase = "arrival";
  els.homeGuide.textContent = "The ride is arriving. Watch the source turn into a moving path.";
  setTimer(() => {
    els.app.dataset.homePhase = "settling";
    els.homeGuide.textContent = "The guide is slowing the world so you can choose.";
  }, Math.floor(TIMING.homeArrival * 0.58));
  setTimer(() => {
    els.app.dataset.homePhase = "choose";
    els.homeGuide.textContent = "Now: tap the glowing ticket when you are ready to board.";
  }, TIMING.homeArrival);
}
function renderDeckList() {
  els.deckList.innerHTML = "";
  const packs = state.manifest?.packs || [];
  if (!packs.length) {
    els.loadHint.hidden = false;
    els.loadHint.textContent = "No rides yet.";
    return;
  }
  els.loadHint.hidden = true;
  packs.forEach((entry, index) => {
    const pack = state.packs.get(entry.pack_id);
    const best = state.progress.completed?.[entry.pack_id];
    const ticket = document.createElement("button");
    ticket.type = "button";
    ticket.className = "guided-ticket";
    ticket.style.setProperty("--delay", `${0.18 + index * 0.08}s`);
    ticket.setAttribute("role", "listitem");
    ticket.innerHTML = `
      <span class="ticket-light"></span>
      <span class="ticket-type">${escapeHtml(profileLabel(entry.forge_profile || pack?.forge_profile))}</span>
      <strong>${escapeHtml(entry.title || pack?.title || entry.pack_id)}</strong>
      <small>${pack?.questions?.length || 0} guided scenes · ${best ? `best ${best.rank}` : "unridden"}</small>
    `;
    ticket.addEventListener("click", () => {
      if (els.app.dataset.homePhase !== "choose") return;
      startRun(entry.pack_id);
    });
    els.deckList.appendChild(ticket);
  });
}
function pickWorld(question, index) {
  const tags = (question.mechanism_tags || []).map((tag) => String(tag).toLowerCase());
  return worlds.find((world) => tags.some((tag) => tag.includes(world.key))) || worlds[index % worlds.length];
}
function buildScenes(pack) {
  return pack.questions.map((q, index) => {
    const world = pickWorld(q, index);
    return {
      id: q.id,
      index,
      q,
      world,
      hit: 8 + Math.min(10, (q.mechanism_tags || []).length * 2) + (q.transfer_type === "no_hint" ? 8 : 0),
      state: "locked",
    };
  });
}
function pct(value, max) { return Math.max(0, Math.min(100, Math.round((value / max) * 100))); }
function startRun(packId) {
  clearDirectorTimers();
  const pack = state.packs.get(packId);
  if (!pack) return;
  const manifestEntry = state.manifest.packs.find((entry) => entry.pack_id === packId) || {};
  const scenes = buildScenes(pack);
  state.run = {
    packId,
    pack,
    manifestEntry,
    scenes,
    index: 0,
    hp: 100,
    staticMax: Math.max(90, scenes.length * 18),
    static: Math.max(90, scenes.length * 18),
    combo: 0,
    bestCombo: 0,
    correct: 0,
    phase: "travel",
    answers: [],
  };
  els.runArena.textContent = manifestEntry.arena || pack.game_hooks?.arena || "guided rail";
  els.runTitle.textContent = pack.title;
  showView("run");
  beginSceneDirector();
}
function renderSceneStrip() {
  const run = state.run;
  els.runMap.innerHTML = "";
  run.scenes.forEach((scene, index) => {
    const dot = document.createElement("span");
    dot.className = "scene-dot";
    dot.dataset.state = index === run.index ? "current" : scene.state;
    els.runMap.appendChild(dot);
  });
}
function renderMeters() {
  const run = state.run;
  els.playerHpText.textContent = `heart ${run.hp}`;
  els.bossHpText.textContent = `static ${run.static}`;
  els.app.style.setProperty("--hp", `${pct(run.hp, 100)}%`);
  els.app.style.setProperty("--static", `${pct(run.static, run.staticMax)}%`);
}
function setRunPhase(phase, line, cue) {
  const run = state.run;
  if (!run) return;
  run.phase = phase;
  els.directorStage.dataset.phase = phase;
  els.interactionWindow.dataset.ready = phase === "settled" ? "true" : "false";
  els.directorLine.textContent = line;
  els.interactionCue.textContent = cue;
}
function renderChoiceReel(scene) {
  const q = scene.q;
  els.choices.innerHTML = "";
  q.choices.forEach((choice, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "steer-card";
    button.disabled = true;
    button.innerHTML = `<span>${escapeHtml(steerLabels[i] || "steer")}</span><strong>${escapeHtml(choice)}</strong>`;
    button.addEventListener("click", () => answerScene(i, button));
    els.choices.appendChild(button);
  });
}
function beginSceneDirector() {
  clearDirectorTimers();
  const run = state.run;
  const scene = run.scenes[run.index];
  const q = scene.q;
  els.feedback.hidden = true;
  els.directorStage.dataset.result = "none";
  els.enemyAvatar.textContent = scene.world.icon;
  els.enemyName.textContent = scene.world.name;
  els.storyCounter.textContent = `scene ${run.index + 1} / ${run.scenes.length}`;
  els.questionStem.textContent = q.stem;
  els.threatPill.textContent = q.transfer_type === "no_hint" ? "no hint lights" : scene.world.place;
  renderChoiceReel(scene);
  renderSceneStrip();
  renderMeters();
  setRunPhase("travel", scene.world.travel, "Stay with the ride. The question is still moving.");
  setTimer(() => {
    setRunPhase("reveal", `${scene.world.name} appears. The guide is turning the moving claim into one clear choice.`, "Almost settled… watch for the quiet moment.");
  }, TIMING.sceneTravel);
  setTimer(() => {
    setRunPhase("settled", "The world has slowed. Choose the steering move that keeps the mechanism true.", "Your turn: steer once.");
    [...els.choices.children].forEach((button) => { button.disabled = false; });
  }, TIMING.sceneTravel + TIMING.sceneReveal);
}
function answerScene(choiceIndex, button) {
  const run = state.run;
  if (!run || run.phase !== "settled") return;
  const scene = run.scenes[run.index];
  const q = scene.q;
  const correct = choiceIndex === q.correct_index;
  [...els.choices.children].forEach((child) => { child.disabled = true; });
  button.classList.add(correct ? "is-correct" : "is-wrong");
  const right = els.choices.children[q.correct_index];
  if (right) right.classList.add("is-correct");
  setRunPhase("outcome", "The ride reacts to your steering…", "Watch the result, then roll onward.");
  if (correct) {
    const damage = Math.min(run.static, 16 + run.combo * 5 + (q.transfer_type === "no_hint" ? 8 : 0));
    run.static -= damage;
    run.combo += 1;
    run.bestCombo = Math.max(run.bestCombo, run.combo);
    run.correct += 1;
    run.hp = Math.min(100, run.hp + 2);
    scene.state = "cleared";
    els.directorStage.dataset.result = "clear";
    els.feedbackVerdict.textContent = `The wheel catches. Static drops by ${damage}.`;
  } else {
    run.hp = Math.max(1, run.hp - scene.hit);
    run.combo = 0;
    scene.state = "wounded";
    els.directorStage.dataset.result = "wobble";
    els.feedbackVerdict.textContent = `${scene.world.name} shakes the track. Heart drops by ${scene.hit}.`;
  }
  run.answers.push({ id: q.id, correct, hp: run.hp, static: run.static });
  els.feedbackBody.textContent = q.explanation;
  els.sourceLine.textContent = `Source: ${q.source_anchor || "source anchor missing"}`;
  els.btnNext.textContent = run.index + 1 >= run.scenes.length ? "finish the ride" : "roll onward";
  renderSceneStrip();
  renderMeters();
  setTimer(() => { els.feedback.hidden = false; }, TIMING.outcomeBeat);
}
function rankRun(score, hp, bestCombo) {
  if (score === 100 && hp >= 75) return "S";
  if (score >= 85) return "A";
  if (score >= 70 || bestCombo >= 3) return "B";
  if (score >= 50) return "C";
  return "D";
}
function finishRun() {
  clearDirectorTimers();
  const run = state.run;
  const total = run.scenes.length;
  const score = Math.round((run.correct / total) * 100);
  const rank = rankRun(score, run.hp, run.bestCombo);
  const reward = run.manifestEntry.reward_skin || run.pack.game_hooks?.reward_skin || "Mechanism token";
  state.progress.completed[run.pack.pack_id] = { score, rank, hp: run.hp, bestCombo: run.bestCombo, at: Date.now() };
  saveProgress();
  renderDeckList();
  els.summaryTitle.textContent = score >= 70 ? "The source becomes a road." : "The ride returns with sparks.";
  els.summaryScore.textContent = `${run.correct}/${total} scenes held · rank ${rank} · heart ${run.hp}`;
  els.masteryFill.style.width = `${score}%`;
  els.summaryReward.textContent = score >= 70
    ? `Unlocked: ${reward}. You did not read a page; you moved through the idea and steered it.`
    : "The guide marks the weak scenes. Ride again when the motion calls.";
  els.resultGrid.innerHTML = `
    <div><span>${rank}</span><small>rank</small></div>
    <div><span>${run.bestCombo}</span><small>best wheel</small></div>
    <div><span>${run.static}</span><small>static left</small></div>
  `;
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
    for (const entry of state.manifest.packs) {
      state.packs.set(entry.pack_id, await fetchJson(entry.path));
    }
    renderDeckList();
    startOpeningDirector();
  } catch (err) {
    els.loadHint.hidden = false;
    els.loadHint.textContent = `Could not load rides: ${err.message}`;
  }
}

els.btnNext.addEventListener("click", () => {
  if (!state.run) return;
  if (state.run.index + 1 >= state.run.scenes.length) finishRun();
  else {
    state.run.index += 1;
    beginSceneDirector();
  }
});
els.btnExitRun.addEventListener("click", () => { clearDirectorTimers(); showView("home"); startOpeningDirector(); });
els.btnReplay.addEventListener("click", () => state.run && startRun(state.run.packId));
els.btnHome.addEventListener("click", () => { showView("home"); startOpeningDirector(); });

window.__MECHANISM_RUN_DEBUG__ = {
  marker: EXPERIENCE_MARKER,
  state,
  forceHomeSettled() {
    clearDirectorTimers();
    els.app.dataset.homePhase = "choose";
    els.homeGuide.textContent = "Now: tap the glowing ticket when you are ready to board.";
  },
  forceSceneSettled() {
    if (!state.run) return;
    clearDirectorTimers();
    setRunPhase("settled", "The world has slowed. Choose the steering move that keeps the mechanism true.", "Your turn: steer once.");
    [...els.choices.children].forEach((button) => { button.disabled = false; });
  },
  snapshot() {
    const run = state.run;
    return run ? {
      marker: EXPERIENCE_MARKER,
      screen: els.app.dataset.screen,
      homePhase: els.app.dataset.homePhase,
      phase: run.phase,
      hp: run.hp,
      static: run.static,
      combo: run.combo,
      scene: run.index,
      answers: run.answers.length,
      choicesEnabled: [...els.choices.children].some((button) => !button.disabled),
      feedbackVisible: !els.feedback.hidden,
      hasDirectorStage: !!document.querySelector(".director-stage"),
      hasMotionLayers: !!document.querySelector(".ambient-motion .aurora"),
      hasGuidance: !!els.directorLine.textContent,
    } : {
      marker: EXPERIENCE_MARKER,
      screen: els.app.dataset.screen,
      homePhase: els.app.dataset.homePhase,
      phase: null,
      hp: null,
      static: null,
      combo: 0,
      scene: null,
      answers: 0,
      choicesEnabled: false,
      feedbackVisible: false,
      hasDirectorStage: !!document.querySelector(".director-stage"),
      hasMotionLayers: !!document.querySelector(".ambient-motion .aurora"),
      hasGuidance: !!els.homeGuide.textContent,
    };
  },
};

boot();
