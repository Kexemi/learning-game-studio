const STORAGE_KEY = "mechanism-run-v1";

const els = {
  deckList: document.getElementById("deckList"),
  loadHint: document.getElementById("loadHint"),
  streakPill: document.getElementById("streakPill"),
  streakLabel: document.getElementById("streakLabel"),
  viewHome: document.getElementById("viewHome"),
  viewRun: document.getElementById("viewRun"),
  viewSummary: document.getElementById("viewSummary"),
  runArena: document.getElementById("runArena"),
  runTitle: document.getElementById("runTitle"),
  progressFill: document.getElementById("progressFill"),
  progressLabel: document.getElementById("progressLabel"),
  questionTag: document.getElementById("questionTag"),
  questionStem: document.getElementById("questionStem"),
  choices: document.getElementById("choices"),
  feedback: document.getElementById("feedback"),
  feedbackVerdict: document.getElementById("feedbackVerdict"),
  feedbackBody: document.getElementById("feedbackBody"),
  btnNext: document.getElementById("btnNext"),
  btnExitRun: document.getElementById("btnExitRun"),
  summaryTitle: document.getElementById("summaryTitle"),
  summaryScore: document.getElementById("summaryScore"),
  masteryFill: document.getElementById("masteryFill"),
  summaryReward: document.getElementById("summaryReward"),
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

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { completed: {}, streak: 0 };
  } catch {
    return { completed: {}, streak: 0 };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function showView(name) {
  for (const section of [els.viewHome, els.viewRun, els.viewSummary]) {
    const active = section.dataset.view === name;
    section.hidden = !active;
    section.classList.toggle("screen-active", active);
  }
}

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function profileLabel(profile) {
  const map = {
    "boss-fight": "Boss fight",
    "myth-bust": "Myth bust",
    "build-room": "Build room",
    "failure-lab": "Failure lab",
    "map-expedition": "Map expedition",
    courtroom: "Courtroom",
  };
  return map[profile] || "Custom run";
}

function renderStreak() {
  const count = Object.keys(state.progress.completed).length;
  state.progress.streak = count;
  if (count > 0) {
    els.streakPill.hidden = false;
    els.streakLabel.textContent = `${count} deck${count === 1 ? "" : "s"} cleared`;
  }
}

function renderDeckList() {
  els.deckList.innerHTML = "";
  const entries = state.manifest.packs || [];
  if (!entries.length) {
    els.loadHint.textContent = "No decks yet. Forge a pack first.";
    return;
  }
  els.loadHint.hidden = true;
  for (const entry of entries) {
    const pack = state.packs.get(entry.pack_id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "deck-card";
    btn.setAttribute("role", "listitem");
    const done = state.progress.completed[entry.pack_id];
    const qCount = pack?.questions?.length || 0;
    btn.innerHTML = `
      <p class="deck-profile">${profileLabel(entry.forge_profile || pack?.forge_profile)} · ${entry.difficulty_band || pack?.difficulty_band || "run"}</p>
      <p class="deck-title">${entry.title || pack?.title || entry.pack_id}</p>
      <p class="deck-meta">${entry.arena || entry.tone || "Mechanism run"} · ${qCount} questions${done ? " · cleared" : ""}</p>
    `;
    btn.addEventListener("click", () => startRun(entry.pack_id));
    els.deckList.appendChild(btn);
  }
}

function startRun(packId) {
  const pack = state.packs.get(packId);
  if (!pack) return;
  const manifestEntry = state.manifest.packs.find((p) => p.pack_id === packId) || {};
  state.run = {
    packId,
    pack,
    manifestEntry,
    index: 0,
    correct: 0,
    answers: [],
  };
  els.feedback.hidden = true;
  els.choices.innerHTML = "";
  els.runArena.textContent = manifestEntry.arena || pack.game_hooks?.arena || "Arena";
  els.runTitle.textContent = pack.title;
  showView("run");
  renderQuestion();
}

function renderQuestion() {
  const { pack, index } = state.run;
  const q = pack.questions[index];
  const total = pack.questions.length;
  const pct = Math.round((index / total) * 100);
  els.progressFill.style.width = `${pct}%`;
  els.progressLabel.textContent = `Question ${index + 1} of ${total}`;
  els.questionTag.textContent = q.transfer_type === "no_hint" ? "Cold transfer" : "Mechanism check";
  els.questionStem.textContent = q.stem;
  els.choices.innerHTML = "";
  els.feedback.hidden = true;

  q.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.setAttribute("role", "listitem");
    btn.textContent = choice;
    btn.addEventListener("click", () => answerQuestion(i, btn));
    els.choices.appendChild(btn);
  });
}

function answerQuestion(choiceIndex, btn) {
  const { pack, index } = state.run;
  const q = pack.questions[index];
  const correct = choiceIndex === q.correct_index;
  if (correct) state.run.correct += 1;
  state.run.answers.push({ id: q.id, correct });

  for (const child of els.choices.children) child.disabled = true;
  btn.classList.add(correct ? "is-correct" : "is-wrong");
  if (!correct) {
    const rightBtn = els.choices.children[q.correct_index];
    if (rightBtn) rightBtn.classList.add("is-correct");
  }

  els.feedback.hidden = false;
  els.feedbackVerdict.textContent = correct ? "Mechanism held." : "Worth another look.";
  els.feedbackBody.textContent = q.explanation;
  els.btnNext.textContent = index + 1 >= pack.questions.length ? "See results" : "Next";
}

function finishRun() {
  const { pack, manifestEntry, correct } = state.run;
  const total = pack.questions.length;
  const pct = Math.round((correct / total) * 100);
  state.progress.completed[pack.pack_id] = { score: correct, total, pct, at: Date.now() };
  saveProgress();
  renderStreak();

  els.summaryTitle.textContent = pack.title;
  els.summaryScore.textContent = `${correct} / ${total} correct · ${pct}%`;
  els.masteryFill.style.width = `${pct}%`;
  const reward = manifestEntry.reward_skin || pack.game_hooks?.reward_skin || "Insight badge";
  els.summaryReward.textContent = pct >= 80
    ? `Unlocked: ${reward}. You left with the mechanism, not just the thread vibe.`
    : `Replay recommended. The deck is short—another pass beats rereading the thread.`;
  els.summaryTags.innerHTML = "";
  const tags = new Set();
  for (const q of pack.questions) (q.mechanism_tags || []).forEach((t) => tags.add(t));
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
      const pack = await fetchJson(entry.path);
      state.packs.set(entry.pack_id, pack);
    }
    renderStreak();
    renderDeckList();
  } catch (err) {
    els.loadHint.textContent = `Could not load game content: ${err.message}`;
  }
}

els.btnNext.addEventListener("click", () => {
  if (!state.run) return;
  if (state.run.index + 1 >= state.run.pack.questions.length) {
    finishRun();
    return;
  }
  state.run.index += 1;
  renderQuestion();
});

els.btnExitRun.addEventListener("click", () => showView("home"));
els.btnReplay.addEventListener("click", () => state.run && startRun(state.run.packId));
els.btnHome.addEventListener("click", () => showView("home"));

boot();