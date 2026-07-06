const STORAGE_KEY = "mechanism-run-v3";
const EXPERIENCE_MARKER = "story-on-wheels";

const els = {
  app: document.getElementById("app"),
  deckList: document.getElementById("deckList"),
  loadHint: document.getElementById("loadHint"),
  viewHome: document.getElementById("viewHome"),
  viewRun: document.getElementById("viewRun"),
  viewSummary: document.getElementById("viewSummary"),
  runArena: document.getElementById("runArena"),
  runTitle: document.getElementById("runTitle"),
  runMap: document.getElementById("runMap"),
  storyStage: document.getElementById("storyStage"),
  sceneCard: document.getElementById("sceneCard"),
  storyCounter: document.getElementById("storyCounter"),
  narratorLine: document.getElementById("narratorLine"),
  enemyAvatar: document.getElementById("enemyAvatar"),
  enemyName: document.getElementById("enemyName"),
  comboText: document.getElementById("comboText"),
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
  run: null,
  progress: loadProgress(),
};

const worlds = [
  { key: "privacy", icon: "◇", name: "Whisper Fox", place: "Privacy Tunnel", line: "It whispers that finite capacity means zero risk." },
  { key: "capacity", icon: "◈", name: "Hydra of Units", place: "Capacity Bridge", line: "It grows heads whenever the units get sloppy." },
  { key: "scaling", icon: "⬡", name: "Scale Moth", place: "Scaling Lights", line: "It is drawn to bigger numbers without asking what changed." },
  { key: "generalization", icon: "△", name: "Mirage Cart", place: "Generalization Dunes", line: "It blurs copying and understanding into one haze." },
  { key: "interconnect", icon: "⌁", name: "Latency Serpent", place: "Interconnect Switchyard", line: "It punishes any move that ignores the bottleneck." },
  { key: "evidence", icon: "✦", name: "Proof Owl", place: "Evidence Orchard", line: "It demands the claim, the proof, and the counterexample." },
];

const steerLabels = ["lean left", "jump track", "cut the light", "hold the wheel"];

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { completed: {} };
  } catch {
    return { completed: {} };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
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
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
}

function profileLabel(profile) {
  return {
    "boss-fight": "boss road",
    "myth-bust": "myth road",
    "build-room": "build road",
    "failure-lab": "failure road",
    "map-expedition": "map road",
    courtroom: "proof road",
  }[profile] || "story road";
}

function renderDeckList() {
  els.deckList.innerHTML = "";
  const packs = state.manifest?.packs || [];
  if (!packs.length) {
    els.loadHint.hidden = false;
    els.loadHint.textContent = "No story runs yet.";
    return;
  }
  els.loadHint.hidden = true;
  packs.forEach((entry, index) => {
    const pack = state.packs.get(entry.pack_id);
    const best = state.progress.completed?.[entry.pack_id];
    const ticket = document.createElement("button");
    ticket.type = "button";
    ticket.className = "story-ticket";
    ticket.style.setProperty("--delay", `${index * 0.08}s`);
    ticket.setAttribute("role", "listitem");
    ticket.innerHTML = `
      <span class="ticket-punch"></span>
      <span class="ticket-route">${escapeHtml(profileLabel(entry.forge_profile || pack?.forge_profile))}</span>
      <strong>${escapeHtml(entry.title || pack?.title || entry.pack_id)}</strong>
      <small>${pack?.questions?.length || 0} scenes · ${best ? `best ${best.rank}` : "new ride"}</small>
      <span class="ticket-ride">ride →</span>
    `;
    ticket.addEventListener("click", () => startRun(entry.pack_id));
    els.deckList.appendChild(ticket);
  });
}

function pickWorld(question, index) {
  const tags = (question.mechanism_tags || []).map((t) => String(t).toLowerCase());
  const found = worlds.find((world) => tags.some((tag) => tag.includes(world.key)));
  return found || worlds[index % worlds.length];
}

function buildScenes(pack) {
  return pack.questions.map((q, index) => {
    const world = pickWorld(q, index);
    const hit = 9 + Math.min(10, (q.mechanism_tags || []).length * 2) + (q.transfer_type === "no_hint" ? 9 : 0) + Math.floor(index / 2);
    return {
      id: q.id,
      q,
      index,
      world,
      hit,
      state: "locked",
      mood: q.transfer_type === "no_hint" ? "storm" : index % 2 ? "glow" : "ready",
      narration: q.transfer_type === "no_hint"
        ? `${world.place}. No hint lights. The wheel only moves if you really know the mechanism.`
        : `${world.place}. ${world.line}`,
    };
  });
}

function startRun(packId) {
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
    threatMax: Math.max(80, scenes.length * 18),
    threat: Math.max(80, scenes.length * 18),
    combo: 0,
    bestCombo: 0,
    correct: 0,
    answered: false,
    answers: [],
  };
  els.runArena.textContent = manifestEntry.arena || pack.game_hooks?.arena || "Story rail";
  els.runTitle.textContent = pack.title;
  els.feedback.hidden = true;
  showView("run");
  renderScene();
}

function pct(value, max) {
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function renderProgress() {
  const run = state.run;
  els.runMap.innerHTML = "";
  run.scenes.forEach((scene, index) => {
    const node = document.createElement("span");
    node.className = "story-node";
    node.dataset.state = index === run.index ? "current" : scene.state;
    node.textContent = index + 1;
    els.runMap.appendChild(node);
  });
}

function renderMeters() {
  const run = state.run;
  els.playerHpText.textContent = `♥ ${run.hp}`;
  els.bossHpText.textContent = `threat ${run.threat}`;
  els.comboText.textContent = `wheel x${run.combo}`;
  els.app.style.setProperty("--hp", `${pct(run.hp, 100)}%`);
  els.app.style.setProperty("--threat", `${pct(run.threat, run.threatMax)}%`);
}

function renderScene() {
  const run = state.run;
  const scene = run.scenes[run.index];
  const q = scene.q;
  run.answered = false;
  els.feedback.hidden = true;
  els.storyStage.dataset.mood = scene.mood;
  els.storyStage.dataset.result = "rolling";
  els.sceneCard.classList.remove("is-hit", "is-miss");
  els.storyCounter.textContent = `Scene ${run.index + 1} of ${run.scenes.length}`;
  els.narratorLine.textContent = scene.narration;
  els.enemyAvatar.textContent = scene.world.icon;
  els.enemyName.textContent = scene.world.name;
  els.threatPill.textContent = `if wrong: -${scene.hit} heart`;
  els.questionStem.textContent = q.stem;
  els.choices.innerHTML = "";
  q.choices.forEach((choice, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "steer-choice";
    button.setAttribute("role", "listitem");
    button.innerHTML = `<span>${escapeHtml(steerLabels[i] || "steer")}</span><strong>${escapeHtml(choice)}</strong>`;
    button.addEventListener("click", () => answerScene(i, button));
    els.choices.appendChild(button);
  });
  renderProgress();
  renderMeters();
}

function answerScene(choiceIndex, button) {
  const run = state.run;
  if (!run || run.answered) return;
  const scene = run.scenes[run.index];
  const q = scene.q;
  const correct = choiceIndex === q.correct_index;
  run.answered = true;
  for (const child of els.choices.children) child.disabled = true;
  button.classList.add(correct ? "is-correct" : "is-wrong");
  const right = els.choices.children[q.correct_index];
  if (right) right.classList.add("is-correct");

  if (correct) {
    const damage = Math.min(run.threat, 16 + run.combo * 6 + (q.transfer_type === "no_hint" ? 8 : 0));
    run.threat -= damage;
    run.combo += 1;
    run.bestCombo = Math.max(run.bestCombo, run.combo);
    run.correct += 1;
    run.hp = Math.min(100, run.hp + 2);
    scene.state = "cleared";
    els.feedbackVerdict.textContent = `The wheel catches — ${damage} threat falls away.`;
    els.storyStage.dataset.result = "hit";
    els.sceneCard.classList.add("is-hit");
  } else {
    run.hp = Math.max(1, run.hp - scene.hit);
    run.combo = 0;
    scene.state = "wounded";
    els.feedbackVerdict.textContent = `${scene.world.name} shakes the rail. The wheel wobbles.`;
    els.storyStage.dataset.result = "miss";
    els.sceneCard.classList.add("is-miss");
  }

  run.answers.push({ id: q.id, correct, hp: run.hp, threat: run.threat });
  els.feedbackBody.textContent = q.explanation;
  els.sourceLine.textContent = `Source: ${q.source_anchor || "source anchor missing"}`;
  els.btnNext.textContent = run.index + 1 >= run.scenes.length ? "finish the ride" : "roll to next scene";
  els.feedback.hidden = false;
  renderProgress();
  renderMeters();
}

function rankRun(score, hp, bestCombo) {
  if (score === 100 && hp >= 75) return "S";
  if (score >= 85) return "A";
  if (score >= 70 || bestCombo >= 3) return "B";
  if (score >= 50) return "C";
  return "D";
}

function finishRun() {
  const run = state.run;
  const total = run.scenes.length;
  const score = Math.round((run.correct / total) * 100);
  const rank = rankRun(score, run.hp, run.bestCombo);
  const reward = run.manifestEntry.reward_skin || run.pack.game_hooks?.reward_skin || "Story token";
  state.progress.completed[run.pack.pack_id] = { score, rank, hp: run.hp, bestCombo: run.bestCombo, at: Date.now() };
  saveProgress();
  renderDeckList();

  els.summaryTitle.textContent = score >= 70 ? "The ride breaks through." : "The ride makes it home.";
  els.summaryScore.textContent = `${run.correct}/${total} scenes held · rank ${rank} · heart ${run.hp}`;
  els.masteryFill.style.width = `${score}%`;
  els.summaryReward.textContent = score >= 70
    ? `Unlocked: ${reward}. The source now feels like a road you can ride, not a page you skimmed.`
    : `Replay this route. The scenes are short; the second ride is where the mechanism starts to stick.`;
  els.resultGrid.innerHTML = `
    <div><span>${rank}</span><small>rank</small></div>
    <div><span>${run.bestCombo}</span><small>best wheel</small></div>
    <div><span>${run.threat}</span><small>threat left</small></div>
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
  } catch (err) {
    els.loadHint.hidden = false;
    els.loadHint.textContent = `Could not load story runs: ${err.message}`;
  }
}

els.btnNext.addEventListener("click", () => {
  if (!state.run) return;
  if (state.run.index + 1 >= state.run.scenes.length) {
    finishRun();
    return;
  }
  state.run.index += 1;
  renderScene();
});
els.btnExitRun.addEventListener("click", () => showView("home"));
els.btnReplay.addEventListener("click", () => state.run && startRun(state.run.packId));
els.btnHome.addEventListener("click", () => showView("home"));

window.__MECHANISM_RUN_DEBUG__ = {
  state,
  snapshot() {
    const run = state.run;
    return run ? {
      screen: els.app.dataset.screen,
      hp: run.hp,
      threat: run.threat,
      combo: run.combo,
      scene: run.index,
      answered: run.answered,
      answers: run.answers.length,
      hasStoryStage: !!document.querySelector(".story-stage"),
      hasWheel: !!document.querySelector(".traveler-wheel"),
      hasTickets: document.querySelectorAll(".story-ticket").length,
    } : {
      screen: els.app.dataset.screen,
      hp: null,
      threat: null,
      combo: 0,
      scene: null,
      answered: false,
      answers: 0,
      hasStoryStage: !!document.querySelector(".story-stage"),
      hasWheel: !!document.querySelector(".traveler-wheel"),
      hasTickets: document.querySelectorAll(".story-ticket").length,
    };
  },
};

boot();
