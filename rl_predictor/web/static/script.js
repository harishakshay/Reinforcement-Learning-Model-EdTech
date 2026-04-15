// DiscoverSense AI - Discovery Terminal + Graph Discovery Lab

function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-title">${type === "success" ? "Update" : "Notice"}</div>
        <div class="toast-msg">${message}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("fade-out");
        setTimeout(() => toast.remove(), 500);
    }, 3500);
}

// Tab routing
document.addEventListener("click", (e) => {
    const link = e.target.closest(".tab-link");
    if (!link) return;

    e.preventDefault();
    const tabId = link.getAttribute("data-tab");
    if (!tabId) return;

    document.querySelectorAll(".tab-link").forEach((l) => l.classList.remove("active"));
    document.querySelectorAll(`.tab-link[data-tab="${tabId}"]`).forEach((l) => l.classList.add("active"));
    document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));

    const activePane = document.getElementById(tabId);
    if (activePane) activePane.classList.add("active");

    if (tabId === "demo-section") initTerminal();
    if (tabId === "journey-section") initJourney();
    if (tabId === "graph-section") initGraphLab();
});

const FEATURE_NAMES = [
    "Novelty Score",
    "Repeat Exposure",
    "Interest Momentum",
    "Creator Diversity",
    "Session Fatigue",
    "Topic Drift",
    "Engagement Depth",
    "Serendipity Potential",
    "Bubble Risk",
    "Cognitive Load"
];

let sessionInitialized = false;
let trendHistory = [];
let totalReward = 0;
let correctCount = 0;
let stepCount = 0;
let currentStreak = 0;
let autoRunInterval = null;
let chartInitialized = false;
let explorationLevel = 0.5;

const el = {
    signalBars: document.getElementById("signal-bars"),
    stateVector: document.getElementById("state-vector"),
    predDisplay: document.getElementById("prediction-display"),
    predText: document.getElementById("prediction-text"),
    confBadge: document.getElementById("confidence-badge"),
    explText: document.getElementById("explanation-text"),
    rewardPulse: document.getElementById("reward-pulse"),
    rewardBars: document.getElementById("reward-bars"),
    logContainer: document.getElementById("log-container"),
    stepBtn: document.getElementById("step-btn"),
    autoBtn: document.getElementById("auto-btn"),
    resetBtn: document.getElementById("reset-btn"),
    stepCount: document.getElementById("step-count"),
    liveIndicator: document.getElementById("live-indicator"),
    actualLabel: document.getElementById("actual-label"),
    predictedLabel: document.getElementById("predicted-label"),
    verdictBadge: document.getElementById("verdict-badge"),
    statStep: document.getElementById("stat-step"),
    statAcc: document.getElementById("stat-acc"),
    statReward: document.getElementById("stat-reward"),
    statCorrect: document.getElementById("stat-correct"),
    statStreak: document.getElementById("stat-streak"),
    explorationSlider: document.getElementById("exploration-level"),
    explorationValue: document.getElementById("exploration-level-value"),
    explorationLabel: document.getElementById("exploration-level-label")
};

function explorationModeLabel(level) {
    if (level < 0.34) return "Focused";
    if (level < 0.67) return "Balanced";
    return "Exploratory";
}

function setupExplorationControl() {
    if (!el.explorationSlider) return;
    const sliderValue = Number(el.explorationSlider.value || 50);
    explorationLevel = sliderValue / 100;
    if (el.explorationValue) el.explorationValue.textContent = String(sliderValue);
    if (el.explorationLabel) el.explorationLabel.textContent = explorationModeLabel(explorationLevel);

    el.explorationSlider.addEventListener("input", () => {
        const raw = Number(el.explorationSlider.value || 50);
        explorationLevel = raw / 100;
        if (el.explorationValue) el.explorationValue.textContent = String(raw);
        if (el.explorationLabel) el.explorationLabel.textContent = explorationModeLabel(explorationLevel);
    });
}

async function initTerminal() {
    if (sessionInitialized) return;
    el.liveIndicator.textContent = "CONNECTING...";
    el.liveIndicator.className = "live-dot connecting";

    try {
        const res = await fetch("/api/init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
        });
        const data = await res.json();

        sessionInitialized = true;
        renderSignalBars(data.initial_state);
        el.stateVector.textContent = formatVector(data.initial_state);
        el.liveIndicator.textContent = "LIVE";
        el.liveIndicator.className = "live-dot live";
        addLog("System", "Discovery simulator connected. Ready to recommend.");
    } catch (e) {
        el.liveIndicator.textContent = "ERROR";
        el.liveIndicator.className = "live-dot error";
        addLog("Error", "Failed to connect to backend.");
    }
}

function renderSignalBars(state) {
    if (!el.signalBars) return;
    el.signalBars.innerHTML = "";
    state.forEach((val, i) => {
        const pct = Math.min(Math.max((val + 1) / 2, 0), 1);
        const color = pct > 0.65 ? "#00ff88" : pct > 0.35 ? "#00e5ff" : "#ff3e3e";
        const bar = document.createElement("div");
        bar.className = "signal-row";
        bar.innerHTML = `
            <span class="sig-name">${FEATURE_NAMES[i]}</span>
            <div class="sig-track">
                <div class="sig-fill" style="width:${(pct * 100).toFixed(1)}%; background:${color};"></div>
            </div>
            <span class="sig-val" style="color:${color}">${val.toFixed(3)}</span>
        `;
        el.signalBars.appendChild(bar);
    });
}

function formatVector(state) {
    return "[" + state.map((v) => v.toFixed(2)).join(", ") + "]";
}

async function takeStep() {
    if (!sessionInitialized) await initTerminal();

    el.stepBtn.disabled = true;
    el.liveIndicator.textContent = "ANALYZING";
    el.liveIndicator.className = "live-dot connecting";

    try {
        const res = await fetch("/api/step", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ exploration_level: explorationLevel })
        });
        const data = await res.json();

        stepCount++;
        const isCorrect = data.prediction === data.actual_trend;
        if (isCorrect) {
            correctCount++;
            currentStreak++;
        } else {
            currentStreak = 0;
        }
        totalReward += data.reward;

        renderSignalBars(data.state);
        updatePrediction(data.prediction_label, data.prediction_class, data.confidence);

        const actualLbl = getActionLabel(data.actual_trend);
        el.actualLabel.textContent = "Actual Need: " + actualLbl;
        el.predictedLabel.textContent = "RL Action: " + data.prediction_label;
        el.verdictBadge.textContent = isCorrect ? "ALIGNED" : "MISS";
        el.verdictBadge.className = "result-verdict " + (isCorrect ? "correct" : "wrong");

        el.explText.textContent = data.explanation;
        el.stepCount.textContent = "STEP " + data.next_step;

        const rew = data.reward;
        el.rewardPulse.textContent = (rew >= 0 ? "+" : "") + rew.toFixed(2);
        el.rewardPulse.className = "reward-num " + (rew > 0 ? "pos" : rew < 0 ? "neg" : "");
        renderRewardBars(data.reward_detail);

        el.statStep.textContent = stepCount;
        el.statAcc.textContent = ((correctCount / stepCount) * 100).toFixed(1) + "%";
        el.statReward.textContent = totalReward >= 0 ? "+" + totalReward.toFixed(2) : totalReward.toFixed(2);
        el.statCorrect.textContent = correctCount;
        el.statStreak.textContent = currentStreak;

        const modeLabel = explorationModeLabel(data.exploration_level ?? explorationLevel);
        addLog(
            isCorrect ? "[OK]" : "[--]",
            `Action: ${data.prediction_label} | Actual: ${actualLbl} | Mode: ${modeLabel} | Conf: ${(data.confidence * 100).toFixed(0)}% | Reward: ${rew.toFixed(2)}`
        );
        updateTrendChart(data.next_step, data.actual_trend, data.prediction);

        if (data.done) {
            stopAutoRun();
            addLog("[END]", "Simulation complete.");
        }

        el.liveIndicator.textContent = "LIVE";
        el.liveIndicator.className = "live-dot live";
    } catch (e) {
        addLog("[ERR]", "Data stream interrupted: " + e.message);
        el.liveIndicator.textContent = "ERROR";
        el.liveIndicator.className = "live-dot error";
        stopAutoRun();
    }

    el.stepBtn.disabled = false;
}

function updatePrediction(label, className, conf) {
    const normalizedClass = className === "upward" ? "up" : className === "downward" ? "down" : className;
    el.predText.textContent = label.toUpperCase();
    el.predDisplay.className = "prediction-display " + (normalizedClass || "neutral");
    el.confBadge.textContent = (conf * 100).toFixed(1) + "% CONF";
    el.confBadge.className = "conf-badge " + (conf > 0.7 ? "high" : conf > 0.5 ? "mid" : "low");
}

function renderRewardBars(detail) {
    el.rewardBars.innerHTML = "";
    const entries = Object.entries(detail).filter(([, v]) => v !== 0);

    if (entries.length === 0) {
        el.rewardBars.innerHTML = '<span class="no-reward">No reward components this step.</span>';
        return;
    }

    const displayNames = {
        decision_match: "decision match",
        early_diversity_bonus: "early diversity bonus",
        high_confidence_bonus: "high confidence bonus",
        mismatch_penalty: "mismatch penalty"
    };

    entries.forEach(([k, v]) => {
        const row = document.createElement("div");
        row.className = "rbar-row";
        const isPos = v > 0;
        const label = displayNames[k] || k.replace(/_/g, " ");
        row.innerHTML = `
            <span class="rbar-label">${label}</span>
            <div class="rbar-track">
                <div class="rbar-fill ${isPos ? "pos" : "neg"}" style="width:${Math.min(Math.abs(v), 2) / 2 * 100}%"></div>
            </div>
            <span class="rbar-val ${isPos ? "pos" : "neg"}">${isPos ? "+" : ""}${v.toFixed(2)}</span>
        `;
        el.rewardBars.appendChild(row);
    });
}

function addLog(tag, msg) {
    if (!el.logContainer) return;
    const entry = document.createElement("div");
    entry.className = "log-entry";
    const ts = new Date().toTimeString().slice(0, 8);
    entry.innerHTML = `<span class="log-ts">${ts}</span> <span class="log-tag">${tag}</span> ${msg}`;
    el.logContainer.prepend(entry);
    while (el.logContainer.children.length > 100) el.logContainer.removeChild(el.logContainer.lastChild);
}

function updateTrendChart(step, actual, pred) {
    trendHistory.push({ step, actual, pred });
    if (trendHistory.length > 50) trendHistory.shift();

    const x = trendHistory.map((d) => d.step);
    const yActual = trendHistory.map((d) => d.actual - 1);
    const yPred = trendHistory.map((d) => d.pred - 1);

    const layout = {
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        margin: { t: 5, b: 30, l: 40, r: 10 },
        font: { color: "#94a3b8", size: 10, family: "JetBrains Mono" },
        xaxis: { gridcolor: "rgba(255,255,255,0.04)", zeroline: false },
        yaxis: {
            gridcolor: "rgba(255,255,255,0.04)",
            tickvals: [-1, 0, 1],
            ticktext: ["DIVERSIFY", "BALANCE", "DEEPEN"],
            zeroline: false
        },
        showlegend: false,
        hovermode: "x unified"
    };

    const traces = [
        { x, y: yActual, mode: "lines", name: "Actual Need", line: { color: "rgba(255,255,255,0.5)", width: 2 } },
        { x, y: yPred, mode: "markers", name: "RL Policy", marker: { color: trendHistory.map((d) => d.pred === d.actual ? "#00ff88" : "#ff3e3e"), size: 8 } }
    ];

    if (!chartInitialized) {
        Plotly.newPlot("trend-chart", traces, layout, { displayModeBar: false, responsive: true });
        chartInitialized = true;
    } else {
        Plotly.react("trend-chart", traces, layout);
    }
}

function getActionLabel(val) {
    if (val === 2) return "Deepen Interest";
    if (val === 0) return "Diversify Feed";
    return "Stay Balanced";
}

function startAutoRun() {
    if (autoRunInterval) return;
    el.autoBtn.textContent = "Stop Auto";
    el.autoBtn.classList.add("active");
    autoRunInterval = setInterval(async () => { await takeStep(); }, 700);
}

function stopAutoRun() {
    if (autoRunInterval) {
        clearInterval(autoRunInterval);
        autoRunInterval = null;
    }
    el.autoBtn.textContent = "Auto Run";
    el.autoBtn.classList.remove("active");
}

async function resetSession() {
    stopAutoRun();
    resetState();
    await initTerminal();
}

function resetState() {
    sessionInitialized = false;
    trendHistory = [];
    totalReward = 0;
    correctCount = 0;
    stepCount = 0;
    currentStreak = 0;
    chartInitialized = false;

    el.logContainer.innerHTML = "";
    el.statStep.textContent = "0";
    el.statAcc.textContent = "-";
    el.statReward.textContent = "0.00";
    el.statCorrect.textContent = "0";
    el.statStreak.textContent = "0";
    el.predText.textContent = "STANDBY";
    el.explText.textContent = "Waiting for discovery data stream...";
    el.stateVector.textContent = "[-]";
    el.stepCount.textContent = "STEP 0";
    Plotly.purge("trend-chart");
}

if (el.stepBtn) el.stepBtn.onclick = takeStep;
if (el.autoBtn) el.autoBtn.onclick = () => autoRunInterval ? stopAutoRun() : startAutoRun();
if (el.resetBtn) el.resetBtn.onclick = resetSession;
setupExplorationControl();

// Feed Journey
let journeyInitialized = false;
let journeyAutoInterval = null;
let journeyExplorationLevel = 0.55;

const journeyEl = {
    personaName: document.getElementById("journey-persona-name"),
    personaSummary: document.getElementById("journey-persona-summary"),
    coreInterests: document.getElementById("journey-core-interests"),
    fatigueSignal: document.getElementById("journey-fatigue-signal"),
    personaIntent: document.getElementById("journey-persona-intent"),
    stepIndicator: document.getElementById("journey-step-indicator"),
    narration: document.getElementById("journey-narration"),
    deltaBubble: document.getElementById("journey-delta-bubble"),
    deltaDiversity: document.getElementById("journey-delta-diversity"),
    deltaRepeat: document.getElementById("journey-delta-repeat"),
    deltaSatisfaction: document.getElementById("journey-delta-satisfaction"),
    explorationSlider: document.getElementById("journey-exploration-level"),
    explorationValue: document.getElementById("journey-exploration-value"),
    explorationLabel: document.getElementById("journey-exploration-label"),
    stepBtn: document.getElementById("journey-step-btn"),
    autoBtn: document.getElementById("journey-auto-btn"),
    resetBtn: document.getElementById("journey-reset-btn"),
    baselinePolicy: document.getElementById("journey-baseline-policy"),
    baselineTag: document.getElementById("journey-baseline-tag"),
    baselineTitle: document.getElementById("journey-baseline-title"),
    baselineTopic: document.getElementById("journey-baseline-topic"),
    baselineCreator: document.getElementById("journey-baseline-creator"),
    baselineReason: document.getElementById("journey-baseline-reason"),
    baselineRepeat: document.getElementById("journey-baseline-repeat"),
    baselineDiversity: document.getElementById("journey-baseline-diversity"),
    baselineBubble: document.getElementById("journey-baseline-bubble"),
    baselineSatisfaction: document.getElementById("journey-baseline-satisfaction"),
    baselineTrail: document.getElementById("journey-baseline-trail"),
    rlPolicy: document.getElementById("journey-rl-policy"),
    rlTag: document.getElementById("journey-rl-tag"),
    rlTitle: document.getElementById("journey-rl-title"),
    rlTopic: document.getElementById("journey-rl-topic"),
    rlCreator: document.getElementById("journey-rl-creator"),
    rlReason: document.getElementById("journey-rl-reason"),
    rlRepeat: document.getElementById("journey-rl-repeat"),
    rlDiversity: document.getElementById("journey-rl-diversity"),
    rlBubble: document.getElementById("journey-rl-bubble"),
    rlSatisfaction: document.getElementById("journey-rl-satisfaction"),
    rlTrail: document.getElementById("journey-rl-trail")
};

function setupJourneyControls() {
    if (!journeyEl.explorationSlider) return;
    const raw = Number(journeyEl.explorationSlider.value || 55);
    journeyExplorationLevel = raw / 100;
    journeyEl.explorationValue.textContent = String(raw);
    journeyEl.explorationLabel.textContent = explorationModeLabel(journeyExplorationLevel);

    journeyEl.explorationSlider.addEventListener("input", () => {
        const value = Number(journeyEl.explorationSlider.value || 55);
        journeyExplorationLevel = value / 100;
        journeyEl.explorationValue.textContent = String(value);
        journeyEl.explorationLabel.textContent = explorationModeLabel(journeyExplorationLevel);
    });

    if (journeyEl.stepBtn) journeyEl.stepBtn.onclick = stepJourney;
    if (journeyEl.autoBtn) journeyEl.autoBtn.onclick = () => journeyAutoInterval ? stopJourneyAuto() : startJourneyAuto();
    if (journeyEl.resetBtn) journeyEl.resetBtn.onclick = resetJourney;
}

async function initJourney(forceReset = false) {
    if (journeyInitialized && !forceReset) return;
    try {
        const res = await fetch("/api/journey/init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reset: forceReset })
        });
        const data = await res.json();
        journeyInitialized = true;
        renderJourneyState(data);
    } catch (e) {
        if (journeyEl.narration) journeyEl.narration.textContent = "Unable to initialize the feed journey right now.";
    }
}

async function stepJourney() {
    if (!journeyInitialized) await initJourney();
    if (journeyEl.stepBtn) journeyEl.stepBtn.disabled = true;
    try {
        const res = await fetch("/api/journey/step", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ exploration_level: journeyExplorationLevel })
        });
        const data = await res.json();
        renderJourneyState(data);
        if (data.done) stopJourneyAuto();
    } catch (e) {
        if (journeyEl.narration) journeyEl.narration.textContent = "The feed journey could not advance.";
        stopJourneyAuto();
    }
    if (journeyEl.stepBtn) journeyEl.stepBtn.disabled = false;
}

function startJourneyAuto() {
    if (journeyAutoInterval) return;
    if (journeyEl.autoBtn) {
        journeyEl.autoBtn.textContent = "Stop Auto";
        journeyEl.autoBtn.classList.add("active");
    }
    journeyAutoInterval = setInterval(async () => { await stepJourney(); }, 950);
}

function stopJourneyAuto() {
    if (journeyAutoInterval) {
        clearInterval(journeyAutoInterval);
        journeyAutoInterval = null;
    }
    if (journeyEl.autoBtn) {
        journeyEl.autoBtn.textContent = "Auto Run";
        journeyEl.autoBtn.classList.remove("active");
    }
}

async function resetJourney() {
    stopJourneyAuto();
    journeyInitialized = false;
    await initJourney(true);
}

function formatJourneyDelta(value) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${Number(value || 0).toFixed(1)}`;
}

function applyJourneyDeltaTone(node, value) {
    if (!node) return;
    node.classList.remove("good", "bad", "neutral");
    if (value > 0.05) node.classList.add("good");
    else if (value < -0.05) node.classList.add("bad");
    else node.classList.add("neutral");
}

function renderJourneyTrail(container, trail, toneClass) {
    if (!container) return;
    if (!trail || trail.length === 0) {
        container.innerHTML = '<div class="journey-trail-empty">No recommendations yet.</div>';
        return;
    }
    container.innerHTML = trail.map((item) => `
        <div class="journey-trail-item ${toneClass}">
            <div class="journey-trail-step">Step ${item.step}</div>
            <div class="journey-trail-body">
                <span class="journey-trail-tag">${item.tag}</span>
                <strong>${item.title}</strong>
                <span>${item.topic_label} · ${item.creator_name}</span>
            </div>
        </div>
    `).join("");
}

function renderJourneyLane(lane, refs, toneClass) {
    if (!lane) return;
    const current = lane.current_item || {};
    refs.policy.textContent = current.policy_label || lane.lane_label || "-";
    refs.tag.textContent = current.tag || "Waiting";
    refs.tag.className = `journey-current-tag ${toneClass}`;
    refs.title.textContent = current.title || "Waiting for first feed step.";
    refs.topic.textContent = current.topic_label || "-";
    refs.creator.textContent = current.creator_name || "-";
    refs.reason.textContent = current.reason || "Run the journey to compare how each lane evolves.";

    const metrics = lane.metrics || {};
    refs.repeat.textContent = `${Number(metrics.repeat_rate || 0).toFixed(1)}%`;
    refs.diversity.textContent = `${Number(metrics.topic_diversity || 0).toFixed(1)}%`;
    refs.bubble.textContent = `${Number(metrics.bubble_risk || 0).toFixed(1)}%`;
    refs.satisfaction.textContent = `${Number(metrics.satisfaction || 0).toFixed(1)}%`;

    renderJourneyTrail(refs.trail, lane.trail, toneClass);
}

function renderJourneyState(data) {
    if (!data) return;
    const persona = data.persona || {};
    if (journeyEl.personaName) journeyEl.personaName.textContent = persona.name || "Maya";
    if (journeyEl.personaSummary) journeyEl.personaSummary.textContent = persona.summary || "";
    if (journeyEl.coreInterests) journeyEl.coreInterests.textContent = (persona.core_interests || []).join(", ");
    if (journeyEl.fatigueSignal) journeyEl.fatigueSignal.textContent = persona.fatigue_signal || "";
    if (journeyEl.personaIntent) journeyEl.personaIntent.textContent = persona.intent || "";
    if (journeyEl.stepIndicator) journeyEl.stepIndicator.textContent = `STEP ${data.step || 0} / ${data.max_steps || 12}`;
    if (journeyEl.narration) journeyEl.narration.textContent = data.narration || "";

    const delta = data.delta_summary || {};
    if (journeyEl.deltaBubble) {
        journeyEl.deltaBubble.textContent = formatJourneyDelta(delta.bubble_risk_gap);
        applyJourneyDeltaTone(journeyEl.deltaBubble, delta.bubble_risk_gap);
    }
    if (journeyEl.deltaDiversity) {
        journeyEl.deltaDiversity.textContent = formatJourneyDelta(delta.diversity_gap);
        applyJourneyDeltaTone(journeyEl.deltaDiversity, delta.diversity_gap);
    }
    if (journeyEl.deltaRepeat) {
        journeyEl.deltaRepeat.textContent = formatJourneyDelta(delta.repeat_gap);
        applyJourneyDeltaTone(journeyEl.deltaRepeat, delta.repeat_gap);
    }
    if (journeyEl.deltaSatisfaction) {
        journeyEl.deltaSatisfaction.textContent = formatJourneyDelta(delta.satisfaction_gap);
        applyJourneyDeltaTone(journeyEl.deltaSatisfaction, delta.satisfaction_gap);
    }

    renderJourneyLane(data.baseline, {
        policy: journeyEl.baselinePolicy,
        tag: journeyEl.baselineTag,
        title: journeyEl.baselineTitle,
        topic: journeyEl.baselineTopic,
        creator: journeyEl.baselineCreator,
        reason: journeyEl.baselineReason,
        repeat: journeyEl.baselineRepeat,
        diversity: journeyEl.baselineDiversity,
        bubble: journeyEl.baselineBubble,
        satisfaction: journeyEl.baselineSatisfaction,
        trail: journeyEl.baselineTrail
    }, "baseline");

    renderJourneyLane(data.rl_guided, {
        policy: journeyEl.rlPolicy,
        tag: journeyEl.rlTag,
        title: journeyEl.rlTitle,
        topic: journeyEl.rlTopic,
        creator: journeyEl.rlCreator,
        reason: journeyEl.rlReason,
        repeat: journeyEl.rlRepeat,
        diversity: journeyEl.rlDiversity,
        bubble: journeyEl.rlBubble,
        satisfaction: journeyEl.rlSatisfaction,
        trail: journeyEl.rlTrail
    }, "success");
}

setupJourneyControls();

const runCompareBtn = document.getElementById("run-compare-btn");
if (runCompareBtn) {
    runCompareBtn.onclick = async () => {
        runCompareBtn.disabled = true;
        runCompareBtn.textContent = "Running Benchmark...";
        document.getElementById("compare-loading").classList.remove("hidden");
        document.getElementById("compare-results").classList.add("hidden");

        try {
            const res = await fetch("/api/compare", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            });
            const data = await res.json();

            document.getElementById("compare-loading").classList.add("hidden");
            document.getElementById("compare-results").classList.remove("hidden");

            document.getElementById("ml-acc-num").textContent = data.traditional_ml.accuracy + "%";
            document.getElementById("dqn-acc-num").textContent = data.dqn.accuracy + "%";
            document.getElementById("edge-gain-num").textContent = "+" + data.edge + "%";
            document.getElementById("reward-edge-num").textContent = (data.reward_edge >= 0 ? "+" : "") + data.reward_edge;

            document.getElementById("ml-correct").textContent = data.traditional_ml.correct;
            document.getElementById("ml-reward").textContent = data.traditional_ml.total_reward;
            document.getElementById("ml-steps").textContent = data.traditional_ml.steps;
            document.getElementById("dqn-correct").textContent = data.dqn.correct;
            document.getElementById("dqn-reward").textContent = data.dqn.total_reward;
            document.getElementById("dqn-steps").textContent = data.dqn.steps;

            const x = Array.from({ length: data.dqn.rolling_accuracy.length }, (_, i) => i);
            Plotly.newPlot("compare-chart", [
                { x, y: data.traditional_ml.rolling_accuracy, type: "scatter", name: "Engagement Baseline", line: { color: "#ff3e3e" } },
                { x, y: data.dqn.rolling_accuracy, type: "scatter", name: "RL Discovery Policy", line: { color: "#00ff88" } }
            ], {
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
                font: { color: "#94a3b8" }
            }, { displayModeBar: false, responsive: true });
        } catch (e) {
            alert("Benchmark failed: " + e.message);
        }

        runCompareBtn.disabled = false;
        runCompareBtn.textContent = "Run Discovery Benchmark (500 Steps)";
    };
}

// Graph Discovery Lab
let graphInitialized = false;
let graphAutoInterval = null;
let graphNetworkDrawn = false;
let graphOutcomeDrawn = false;
let graphMode = "hybrid";
let graphExplorationLevel = 0.5;

const graphEl = {
    modeSelect: document.getElementById("graph-mode-select"),
    explorationSlider: document.getElementById("graph-exploration-level"),
    explorationValue: document.getElementById("graph-exploration-value"),
    explorationLabel: document.getElementById("graph-exploration-label"),
    stepBtn: document.getElementById("graph-step-btn"),
    autoBtn: document.getElementById("graph-auto-btn"),
    resetBtn: document.getElementById("graph-reset-btn"),
    stepIndicator: document.getElementById("graph-step-indicator"),
    pathReason: document.getElementById("graph-path-reason"),
    pathList: document.getElementById("graph-path-list"),
    recoAction: document.getElementById("graph-reco-action"),
    recoTopic: document.getElementById("graph-reco-topic"),
    recoCreator: document.getElementById("graph-reco-creator"),
    recoContent: document.getElementById("graph-reco-content"),
    kpiNovelty: document.getElementById("graph-kpi-novelty"),
    kpiBubble: document.getElementById("graph-kpi-bubble"),
    kpiDiversity: document.getElementById("graph-kpi-diversity"),
    kpiRepeat: document.getElementById("graph-kpi-repeat"),
    kpiReward: document.getElementById("graph-kpi-reward"),
    deltaBubble: document.getElementById("graph-delta-bubble"),
    deltaDiversity: document.getElementById("graph-delta-diversity"),
    deltaReward: document.getElementById("graph-delta-reward"),
    logContainer: document.getElementById("graph-log-container")
};

function graphModeLabel(mode) {
    return mode === "hybrid" ? "RL + Graph" : "RL Only";
}

function setupGraphControls() {
    if (!graphEl.modeSelect || !graphEl.explorationSlider) return;

    graphMode = graphEl.modeSelect.value || "hybrid";
    const raw = Number(graphEl.explorationSlider.value || 50);
    graphExplorationLevel = raw / 100;
    graphEl.explorationValue.textContent = String(raw);
    graphEl.explorationLabel.textContent = explorationModeLabel(graphExplorationLevel);

    graphEl.modeSelect.addEventListener("change", async () => {
        graphMode = graphEl.modeSelect.value;
        if (graphInitialized) await fetchGraphState();
    });

    graphEl.explorationSlider.addEventListener("input", () => {
        const value = Number(graphEl.explorationSlider.value || 50);
        graphExplorationLevel = value / 100;
        graphEl.explorationValue.textContent = String(value);
        graphEl.explorationLabel.textContent = explorationModeLabel(graphExplorationLevel);
    });

    if (graphEl.stepBtn) graphEl.stepBtn.onclick = stepGraphLab;
    if (graphEl.autoBtn) graphEl.autoBtn.onclick = () => graphAutoInterval ? stopGraphAuto() : startGraphAuto();
    if (graphEl.resetBtn) graphEl.resetBtn.onclick = resetGraphLab;
}

async function initGraphLab(forceReset = false) {
    if (graphInitialized && !forceReset) return;
    try {
        const res = await fetch("/api/graph/init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: graphMode, reset: forceReset })
        });
        const data = await res.json();
        graphInitialized = true;
        renderGraphSnapshot(data);
        addGraphLog("SYS", "Graph Discovery Lab initialized.");
    } catch (e) {
        addGraphLog("ERR", "Failed to initialize graph simulation.");
    }
}

async function fetchGraphState() {
    try {
        const res = await fetch("/api/graph/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: graphMode })
        });
        const data = await res.json();
        renderGraphSnapshot(data);
    } catch (e) {
        addGraphLog("ERR", "Failed to fetch graph state.");
    }
}

async function stepGraphLab() {
    if (!graphInitialized) await initGraphLab();
    if (graphEl.stepBtn) graphEl.stepBtn.disabled = true;
    try {
        const res = await fetch("/api/graph/step", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mode: graphMode,
                exploration_level: graphExplorationLevel
            })
        });
        const data = await res.json();
        renderGraphSnapshot(data);
        addGraphLog(
            data.mode === "hybrid" ? "HBR" : "RLO",
            `${data.policy.final_action_label} -> ${data.recommendation.content_title} | Reward ${data.metrics.satisfaction_reward.toFixed(2)}`
        );
    } catch (e) {
        addGraphLog("ERR", "Graph step failed.");
        stopGraphAuto();
    }
    if (graphEl.stepBtn) graphEl.stepBtn.disabled = false;
}

function startGraphAuto() {
    if (graphAutoInterval) return;
    if (graphEl.autoBtn) {
        graphEl.autoBtn.textContent = "Stop Auto";
        graphEl.autoBtn.classList.add("active");
    }
    graphAutoInterval = setInterval(async () => { await stepGraphLab(); }, 850);
}

function stopGraphAuto() {
    if (graphAutoInterval) {
        clearInterval(graphAutoInterval);
        graphAutoInterval = null;
    }
    if (graphEl.autoBtn) {
        graphEl.autoBtn.textContent = "Auto Run";
        graphEl.autoBtn.classList.remove("active");
    }
}

async function resetGraphLab() {
    stopGraphAuto();
    graphNetworkDrawn = false;
    graphOutcomeDrawn = false;
    await initGraphLab(true);
    addGraphLog("SYS", "Graph session reset.");
}

function renderGraphSnapshot(data) {
    if (!data) return;

    if (graphEl.stepIndicator) graphEl.stepIndicator.textContent = `STEP ${data.step || 0}`;

    const m = data.metrics || {};
    if (graphEl.kpiNovelty) graphEl.kpiNovelty.textContent = `${(m.novelty_score ?? 0).toFixed(1)}%`;
    if (graphEl.kpiBubble) graphEl.kpiBubble.textContent = `${(m.bubble_risk ?? 0).toFixed(1)}%`;
    if (graphEl.kpiDiversity) graphEl.kpiDiversity.textContent = `${(m.creator_diversity ?? 0).toFixed(1)}%`;
    if (graphEl.kpiRepeat) graphEl.kpiRepeat.textContent = `${(m.repeat_rate ?? 0).toFixed(1)}%`;
    if (graphEl.kpiReward) graphEl.kpiReward.textContent = `${(m.satisfaction_reward ?? 0).toFixed(2)}`;

    const rec = data.recommendation || {};
    const policy = data.policy || {};
    if (graphEl.recoAction) graphEl.recoAction.textContent = policy.final_action_label || "-";
    if (graphEl.recoTopic) graphEl.recoTopic.textContent = rec.topic_label || "-";
    if (graphEl.recoCreator) graphEl.recoCreator.textContent = rec.creator_name || "-";
    if (graphEl.recoContent) graphEl.recoContent.textContent = rec.content_title || "-";
    if (graphEl.pathReason) graphEl.pathReason.textContent = data.path_explanation || "Waiting for first graph-backed recommendation.";

    const comp = data.comparison || {};
    if (graphEl.deltaBubble) graphEl.deltaBubble.textContent = `${(comp.bubble_delta ?? 0).toFixed(1)}`;
    if (graphEl.deltaDiversity) graphEl.deltaDiversity.textContent = `${(comp.diversity_delta ?? 0).toFixed(1)}`;
    if (graphEl.deltaReward) graphEl.deltaReward.textContent = `${(comp.reward_delta ?? 0).toFixed(2)}`;

    renderGraphPath(data.path || []);
    renderGraphNetwork(data.network || { nodes: [], edges: [] });
    renderGraphOutcomeChart(data.trends || {});
}

function renderGraphPath(pathNodes) {
    if (!graphEl.pathList) return;
    graphEl.pathList.innerHTML = "";
    if (!pathNodes || pathNodes.length === 0) {
        graphEl.pathList.innerHTML = "<li>No traversal yet.</li>";
        return;
    }
    pathNodes.forEach((node) => {
        const li = document.createElement("li");
        li.textContent = node;
        graphEl.pathList.appendChild(li);
    });
}

function renderGraphNetwork(network) {
    const nodes = network.nodes || [];
    const edges = network.edges || [];
    const nodeMap = {};
    nodes.forEach((n) => { nodeMap[n.id] = n; });

    const edgeX = [];
    const edgeY = [];
    const edgeHighlightX = [];
    const edgeHighlightY = [];

    edges.forEach((edge) => {
        const src = nodeMap[edge.source];
        const dst = nodeMap[edge.target];
        if (!src || !dst) return;
        if (edge.highlight) {
            edgeHighlightX.push(src.x, dst.x, null);
            edgeHighlightY.push(src.y, dst.y, null);
        } else {
            edgeX.push(src.x, dst.x, null);
            edgeY.push(src.y, dst.y, null);
        }
    });

    const nodeX = nodes.map((n) => n.x);
    const nodeY = nodes.map((n) => n.y);
    const nodeText = nodes.map((n) => n.label);
    const nodeColor = nodes.map((n) => n.color || "#94a3b8");
    const nodeSize = nodes.map((n) => n.size || 12);

    const traces = [
        {
            x: edgeX,
            y: edgeY,
            mode: "lines",
            line: { width: 1, color: "rgba(148,163,184,0.25)" },
            hoverinfo: "skip",
            type: "scatter"
        },
        {
            x: edgeHighlightX,
            y: edgeHighlightY,
            mode: "lines",
            line: { width: 2.5, color: "rgba(0,255,136,0.85)" },
            hoverinfo: "skip",
            type: "scatter"
        },
        {
            x: nodeX,
            y: nodeY,
            mode: "markers+text",
            type: "scatter",
            text: nodeText,
            textposition: "top center",
            textfont: { color: "#cbd5e1", size: 10 },
            marker: {
                size: nodeSize,
                color: nodeColor,
                line: { color: "rgba(255,255,255,0.2)", width: 1 }
            },
            hovertemplate: "%{text}<extra></extra>"
        }
    ];

    const layout = {
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        margin: { l: 10, r: 10, t: 10, b: 10 },
        xaxis: { visible: false },
        yaxis: { visible: false },
        showlegend: false
    };

    if (!graphNetworkDrawn) {
        Plotly.newPlot("graph-network-chart", traces, layout, { displayModeBar: false, responsive: true });
        graphNetworkDrawn = true;
    } else {
        Plotly.react("graph-network-chart", traces, layout, { displayModeBar: false, responsive: true });
    }
}

function renderGraphOutcomeChart(trends) {
    const rl = trends.rl_only || {};
    const hybrid = trends.hybrid || {};
    const rlSteps = rl.steps || [];
    const hySteps = hybrid.steps || [];

    const traces = [
        {
            x: rlSteps,
            y: rl.satisfaction_reward || [],
            type: "scatter",
            mode: "lines",
            name: "RL Only Reward",
            line: { color: "#ff6b6b", width: 2 }
        },
        {
            x: hySteps,
            y: hybrid.satisfaction_reward || [],
            type: "scatter",
            mode: "lines",
            name: "RL + Graph Reward",
            line: { color: "#00ff88", width: 2.5 }
        },
        {
            x: rlSteps,
            y: rl.bubble_risk || [],
            type: "scatter",
            mode: "lines",
            name: "RL Only Bubble Risk",
            line: { color: "#f59e0b", width: 1.5, dash: "dot" },
            yaxis: "y2"
        },
        {
            x: hySteps,
            y: hybrid.bubble_risk || [],
            type: "scatter",
            mode: "lines",
            name: "RL + Graph Bubble Risk",
            line: { color: "#60a5fa", width: 1.5, dash: "dot" },
            yaxis: "y2"
        }
    ];

    const layout = {
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        margin: { l: 45, r: 45, t: 10, b: 35 },
        font: { color: "#94a3b8", size: 10 },
        xaxis: { title: "Step", gridcolor: "rgba(255,255,255,0.06)" },
        yaxis: { title: "Reward", gridcolor: "rgba(255,255,255,0.06)" },
        yaxis2: {
            title: "Bubble Risk %",
            overlaying: "y",
            side: "right",
            rangemode: "tozero"
        },
        legend: { orientation: "h", y: 1.15, x: 0 }
    };

    if (!graphOutcomeDrawn) {
        Plotly.newPlot("graph-outcome-chart", traces, layout, { displayModeBar: false, responsive: true });
        graphOutcomeDrawn = true;
    } else {
        Plotly.react("graph-outcome-chart", traces, layout, { displayModeBar: false, responsive: true });
    }
}

function addGraphLog(tag, msg) {
    if (!graphEl.logContainer) return;
    const row = document.createElement("div");
    row.className = "log-entry";
    const ts = new Date().toTimeString().slice(0, 8);
    row.innerHTML = `<span class="log-ts">${ts}</span> <span class="log-tag">${tag}</span> ${msg}`;
    graphEl.logContainer.prepend(row);
    while (graphEl.logContainer.children.length > 120) {
        graphEl.logContainer.removeChild(graphEl.logContainer.lastChild);
    }
}

setupGraphControls();
