const STORAGE_KEY = "mechanism-run-v2";

const els = {
  app: document.getElementById("app"),
  deckList: document.getElementById("deckList"),
  loadHint: document.getElementById("loadHint"),
  streakPill: document.getElementById("streakPill"),
  streakLabel: document.getElementById("streakLabel"),
  viewHome: document.getElementById("viewHome"),
  viewRun: document.getElementById("viewRun"),
  viewSummary: document.getElementById("viewSummary"),
  runArena: document.getElementById("runArena"),
  runTitle: document.getElementById("runTitle"),
  runMap: document.getElementById("runMap"),
  battlefield: document.getElementById("battlefield"),
  signalBeam: document.getElementById("signalBeam"),
  playerHpBar: document.getElementById("playerHpBar"),
  playerHpText: document.getElementById("playerHpText"),
  bossHpBar: document.getElementById("bossHpBar"),
  bossHpText: document.getElementById("bossHpText"),
  enemyKicker: document.getElementById("enemyKicker"),
  enemyAvatar: document.getElementById("enemyAvatar"),
  enemyName: document.getElementById("enemyName"),
  comboText: document.getElementById("comboText"),
  combatLog: document.getElementById("combatLog"),
  questionCard: document.getElementById("questionCard"),
  questionTag: document.getElementById("questionTag"),
  threatPill: document.getElementById("threatPill"),
  questionStem: document.getElementById("questionStem"),
  encounterBrief: document.getElementById("encounterBrief"),
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

const enemyCatalog = [
  { match: ["privacy", "extraction", "fine-tuning"], name: "Privacy Siren", icon: "◇", brief: "It lures you into overclaiming safety." },
  { match: ["scaling", "capacity", "parameter"], name: "Capacity Hydra", icon: "◈", brief: "Every head asks whether the units still hold." },
  { match: ["generalization", "measurement", "figure-reading"], name: "Generalization Mirage", icon: "△", brief: "It tries to make memorization and abstraction blur together." },
  { match: ["interconnect", "latency", "pipeline"], name: "Latency Wyrm", icon: "⌁", brief: "It punishes buzzwords that ignore the bottleneck." },
  { match: ["sovereignty", "risk", "evidence"], name: "Evidence Warden", icon: "⬡", brief: "It demands the claim, the proof, and the counterexample." },
];

const moveVerbs = ["Strike", "Parry", "Decode", "Trace"];

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { completed: {}, streak: 0, bestRank: null };
  } catch {
    return { completed: {}, streak: 0, bestRank: null };
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

function difficultyThreat(band) {
  return { trainee: 1, solid: 2, boss: 3 }[band] || 2;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderStreak() {
  const count = Object.keys(state.progress.completed || {}).length;
  state.progress.streak = count;
  if (count > 0) {
    els.streakPill.hidden = false;
    els.streakLabel.textContent = `${count} mission${count === 1 ? "" : "s"} cleared`;
  } else {
    els.streakPill.hidden = true;
  }
}

function renderDeckList() {
  els.deckList.innerHTML = "";
  const entries = state.manifest.packs || [];
  if (!entries.length) {
    els.loadHint.textContent = "No missions yet. Forge a pack first.";
    els.loadHint.hidden = false;
    return;
  }
  els.loadHint.hidden = true;

  for (const entry of entries) {
    const pack = state.packs.get(entry.pack_id);
    const done = state.progress.completed?.[entry.pack_id];
    const qCount = pack?.questions?.length || 0;
    const threat = difficultyThreat(entry.difficulty_band || pack?.difficulty_band);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "deck-card";
    btn.setAttribute("role", "listitem");
    btn.innerHTML = `
      <span class="deck-badge">${profileLabel(entry.forge_profile || pack?.forge_profile)}</span>
      <p class="deck-profile">Threat ${"▰".repeat(threat)}${"▱".repeat(3 - threat)} · ${qCount} encounters</p>
      <p class="deck-title">${escapeHtml(entry.title || pack?.title || entry.pack_id)}</p>
      <p class="deck-meta">${escapeHtml(entry.tone || pack?.game_hooks?.tone || "Beat the run by choosing the mechanism under pressure.")}</p>
      <span class="deck-cta">${done ? `Best ${done.rank} · rerun` : "Start mission"} →</span>
    `;
    btn.addEventListener("click", () => startRun(entry.pack_id));
    els.deckList.appendChild(btn);
  }
}

function chooseEnemy(q, index) {
  const tags = (q.mechanism_tags || []).map((t) => String(t).toLowerCase());
  const found = enemyCatalog.find((e) => e.match.some((m) => tags.some((t) => t.includes(m))));
  if (found) return found;
  const fallback = enemyCatalog[index % enemyCatalog.length];
  return { ...fallback, name: "Claim Imp", icon: "✦", brief: "It attacks weak mechanism links." };
}

function buildEncounters(pack) {
  return pack.questions.map((q, index) => {
    const enemy = chooseEnemy(q, index);
    const tags = q.mechanism_tags || [];
    const threat = 10 + Math.min(12, tags.length * 2) + (q.transfer_type === "no_hint" ? 8 : 0) + index;
    return {
      id: q.id,
      index,
      q,
      enemy,
      threat,
      result: "locked",
      brief: `${enemy.brief} Win by selecting the move that preserves ${tags[0] || "the mechanism"}.`,
    };
  });
}

function startRun(packId) {
  const pack = state.packs.get(packId);
  if (!pack) return;
  const manifestEntry = state.manifest.packs.find((p) => p.pack_id === packId) || {};
  const encounters = buildEncounters(pack);
  const bossMax = Math.max(80, encounters.length * 22);
  state.run = {
    packId,
    pack,
    manifestEntry,
    encounters,
    index: 0,
    correct: 0,
    combo: 0,
    bestCombo: 0,
    playerHp: 100,
    bossHp: bossMax,
    bossMax,
    answers: [],
    log: ["Mission loaded. Read the enemy, then pick the move that survives pressure."],
    awaitingAdvance: false,
  };
  els.runArena.textContent = manifestEntry.arena || pack.game_hooks?.arena || "Mechanism Arena";
  els.runTitle.textContent = pack.title;
  els.feedback.hidden = true;
  els.questionCard.classList.remove("hit", "miss");
  showView("run");
  renderRunFrame();
  renderQuestion();
}

function percent(value, max) {
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function renderMap() {
  const run = state.run;
  els.runMap.innerHTML = "";
  run.encounters.forEach((encounter, i) => {
    const node = document.createElement("span");
    node.className = "map-node";
    node.dataset.state = i === run.index ? "current" : encounter.result;
    node.textContent = i + 1;
    node.title = `${encounter.enemy.name}: ${encounter.result}`;
    els.runMap.appendChild(node);
  });
}

function renderRunFrame() {
  const run = state.run;
  const encounter = run.encounters[run.index] || run.encounters.at(-1);
  const playerPct = percent(run.playerHp, 100);
  const bossPct = percent(run.bossHp, run.bossMax);
  els.playerHpBar.style.width = `${playerPct}%`;
  els.playerHpText.textContent = `HP ${run.playerHp}/100`;
  els.bossHpBar.style.width = `${bossPct}%`;
  els.bossHpText.textContent = `Threat ${run.bossHp}/${run.bossMax}`;
  els.comboText.textContent = `Combo ×${run.combo}`;
  els.enemyKicker.textContent = encounter?.q?.transfer_type === "no_hint" ? "Cold boss" : "Encounter";
  els.enemyAvatar.textContent = encounter?.enemy?.icon || "◈";
  els.enemyName.textContent = encounter?.enemy?.name || "Claim Hydra";
  els.combatLog.textContent = run.log.at(-1) || "Mission active.";
  els.battlefield.dataset.combo = run.combo > 1 ? "hot" : "calm";
  els.signalBeam.dataset.state = run.awaitingAdvance ? "resolved" : "armed";
  renderMap();
}

function renderQuestion() {
  const run = state.run;
  const encounter = run.encounters[run.index];
  if (!encounter) return finishRun();
  const q = encounter.q;
  run.awaitingAdvance = false;
  els.feedback.hidden = true;
  els.questionCard.classList.remove("hit", "miss");
  els.questionTag.textContent = q.transfer_type === "no_hint" ? "Cold transfer encounter" : `Encounter ${run.index + 1}/${run.encounters.length}`;
  els.threatPill.textContent = `Enemy hit ${encounter.threat}`;
  els.questionStem.textContent = q.stem;
  els.encounterBrief.textContent = encounter.brief;
  els.choices.innerHTML = "";

  q.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.setAttribute("role", "listitem");
    btn.innerHTML = `<span class="move-label">${moveVerbs[i] || "Move"} ${String.fromCharCode(65 + i)}</span><span class="move-text">${escapeHtml(choice)}</span>`;
    btn.addEventListener("click", () => answerQuestion(i, btn));
    els.choices.appendChild(btn);
  });
  renderRunFrame();
}

function answerQuestion(choiceIndex, btn) {
  const run = state.run;
  if (!run || run.awaitingAdvance) return;
  const encounter = run.encounters[run.index];
  const q = encounter.q;
  const correct = choiceIndex === q.correct_index;
  run.awaitingAdvance = true;

  for (const child of els.choices.children) child.disabled = true;
  btn.classList.add(correct ? "is-correct" : "is-wrong");
  const rightBtn = els.choices.children[q.correct_index];
  if (rightBtn) rightBtn.classList.add("is-correct");

  if (correct) {
    const damage = Math.min(run.bossHp, 18 + run.combo * 6 + (q.transfer_type === "no_hint" ? 8 : 0));
    run.combo += 1;
    run.bestCombo = Math.max(run.bestCombo, run.combo);
    run.correct += 1;
    run.bossHp = Math.max(0, run.bossHp - damage);
    run.playerHp = Math.min(100, run.playerHp + 3);
    encounter.result = "cleared";
    run.log.push(`Direct hit: ${damage} threat burned. Combo is now ×${run.combo}.`);
    els.questionCard.classList.add("hit");
    els.feedbackVerdict.textContent = "Hit landed — mechanism held.";
  } else {
    run.combo = 0;
    run.playerHp = Math.max(1, run.playerHp - encounter.threat);
    encounter.result = "wounded";
    run.log.push(`${encounter.enemy.name} countered for ${encounter.threat}. Combo broke; stabilize and continue.`);
    els.questionCard.classList.add("miss");
    els.feedbackVerdict.textContent = "Counter-hit — the claim found a weak spot.";
  }

  run.answers.push({ id: q.id, correct, choiceIndex, hp: run.playerHp, bossHp: run.bossHp });
  els.feedbackBody.textContent = q.explanation;
  els.sourceLine.textContent = `Source anchor: ${q.source_anchor || "not provided"}`;
  els.feedback.hidden = false;
  els.btnNext.textContent = run.index + 1 >= run.encounters.length ? "Resolve mission" : "Advance to next encounter";
  renderRunFrame();
}

function rankRun(pct, hp, bestCombo) {
  if (pct === 100 && hp >= 75) return "S";
  if (pct >= 85) return "A";
  if (pct >= 70 || bestCombo >= 3) return "B";
  if (pct >= 50) return "C";
  return "D";
}

function finishRun() {
  const run = state.run;
  const total = run.encounters.length;
  const pct = Math.round((run.correct / total) * 100);
  const rank = rankRun(pct, run.playerHp, run.bestCombo);
  const victory = run.bossHp <= 0 || pct >= 70;
  state.progress.completed[run.pack.pack_id] = {
    score: run.correct,
    total,
    pct,
    rank,
    hp: run.playerHp,
    bestCombo: run.bestCombo,
    at: Date.now(),
  };
  state.progress.bestRank = state.progress.bestRank || rank;
  saveProgress();
  renderStreak();
  renderDeckList();

  els.summaryTitle.textContent = victory ? "Boss contained" : "Signal recovered";
  els.summaryScore.textContent = `${run.correct}/${total} correct · Rank ${rank} · HP ${run.playerHp}`;
  els.masteryFill.style.width = `${pct}%`;
  const reward = run.manifestEntry.reward_skin || run.pack.game_hooks?.reward_skin || "Mechanism badge";
  els.summaryReward.textContent = victory
    ? `Unlocked: ${reward}. You did not just reread the source — you used it under pressure.`
    : `Partial extraction. Replay to burn down the remaining threat and turn recognition into reflex.`;

  els.resultGrid.innerHTML = `
    <div><span>${run.bestCombo}</span><small>best combo</small></div>
    <div><span>${Math.max(0, run.bossHp)}</span><small>threat left</small></div>
    <div><span>${rank}</span><small>run rank</small></div>
  `;
  els.summaryTags.innerHTML = "";
  const tags = new Set();
  for (const q of run.pack.questions) (q.mechanism_tags || []).forEach((t) => tags.add(t));
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
    els.loadHint.hidden = false;
  }
}

els.btnNext.addEventListener("click", () => {
  if (!state.run) return;
  if (state.run.index + 1 >= state.run.encounters.length) {
    finishRun();
    return;
  }
  state.run.index += 1;
  renderQuestion();
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
      hp: run.playerHp,
      bossHp: run.bossHp,
      combo: run.combo,
      index: run.index,
      awaitingAdvance: run.awaitingAdvance,
      answers: run.answers.length,
    } : { screen: els.app.dataset.screen, hp: null, bossHp: null, combo: 0, index: null, awaitingAdvance: false, answers: 0 };
  },
};

boot();
