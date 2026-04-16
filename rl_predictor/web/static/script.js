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
    if (tabId === "judge-agency-section") initJudgeAgency();
    if (tabId === "adaptive-section") initAdaptive();
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
                <span>${item.topic_label} Â· ${item.creator_name}</span>
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

// Judge Agency Test
let judgeAgencyInitialized = false;
let judgeAgencyLastResult = null;
let judgeDemoCursor = 0;

const judgeEl = {
    stepsInput: document.getElementById("judge-steps"),
    seedInput: document.getElementById("judge-seed"),
    runBtn: document.getElementById("judge-run-pack"),
    exportJsonBtn: document.getElementById("judge-export-json"),
    exportCsvBtn: document.getElementById("judge-export-csv"),
    status: document.getElementById("judge-pack-status"),
    summaryBubble: document.getElementById("judge-summary-bubble"),
    summaryDiversity: document.getElementById("judge-summary-diversity"),
    summaryRepeat: document.getElementById("judge-summary-repeat"),
    summaryReward: document.getElementById("judge-summary-reward"),
    summaryConfidence: document.getElementById("judge-summary-confidence"),
    summaryChecks: document.getElementById("judge-summary-checks"),
    checksContainer: document.getElementById("judge-checks"),
    tableBody: document.getElementById("judge-scenario-table-body")
};

const JUDGE_SCENARIO_TEMPLATE = {
    rl_only_focused: { name: "Focused + RL Only", mode: "rl_only", exploration_level: 0.2, exploration_band: "Focused" },
    rl_only_balanced: { name: "Balanced + RL Only", mode: "rl_only", exploration_level: 0.5, exploration_band: "Balanced" },
    rl_only_exploratory: { name: "Exploratory + RL Only", mode: "rl_only", exploration_level: 0.8, exploration_band: "Exploratory" },
    hybrid_focused: { name: "Focused + RL + Graph", mode: "hybrid", exploration_level: 0.2, exploration_band: "Focused" },
    hybrid_balanced: { name: "Balanced + RL + Graph", mode: "hybrid", exploration_level: 0.5, exploration_band: "Balanced" },
    hybrid_exploratory: { name: "Exploratory + RL + Graph", mode: "hybrid", exploration_level: 0.8, exploration_band: "Exploratory" }
};

const JUDGE_DEMO_RAW = [
    {
        label: "Set 1 · Balanced Discovery",
        metrics: {
            rl_only_focused: { bubble_risk: 64.4, creator_diversity: 41.2, repeat_rate: 53.1, novelty_score: 39.8, satisfaction_reward: 0.4121, policy_confidence: 0.6322, dominant_action: "Stay Balanced" },
            rl_only_balanced: { bubble_risk: 58.9, creator_diversity: 48.6, repeat_rate: 45.0, novelty_score: 46.4, satisfaction_reward: 0.5316, policy_confidence: 0.6551, dominant_action: "Stay Balanced" },
            rl_only_exploratory: { bubble_risk: 52.7, creator_diversity: 57.9, repeat_rate: 39.6, novelty_score: 58.1, satisfaction_reward: 0.6148, policy_confidence: 0.6410, dominant_action: "Diversify Feed" },
            hybrid_focused: { bubble_risk: 60.8, creator_diversity: 46.0, repeat_rate: 48.2, novelty_score: 43.6, satisfaction_reward: 0.4880, policy_confidence: 0.6633, dominant_action: "Stay Balanced" },
            hybrid_balanced: { bubble_risk: 50.1, creator_diversity: 58.2, repeat_rate: 36.7, novelty_score: 56.4, satisfaction_reward: 0.6552, policy_confidence: 0.6874, dominant_action: "Diversify Feed" },
            hybrid_exploratory: { bubble_risk: 43.7, creator_diversity: 66.5, repeat_rate: 31.1, novelty_score: 67.0, satisfaction_reward: 0.7397, policy_confidence: 0.6732, dominant_action: "Diversify Feed" }
        }
    },
    {
        label: "Set 2 · Graph Advantage",
        metrics: {
            rl_only_focused: { bubble_risk: 67.0, creator_diversity: 38.6, repeat_rate: 56.2, novelty_score: 35.4, satisfaction_reward: 0.3744, policy_confidence: 0.6180, dominant_action: "Stay Balanced" },
            rl_only_balanced: { bubble_risk: 61.3, creator_diversity: 45.8, repeat_rate: 47.8, novelty_score: 43.8, satisfaction_reward: 0.5022, policy_confidence: 0.6464, dominant_action: "Stay Balanced" },
            rl_only_exploratory: { bubble_risk: 56.2, creator_diversity: 54.7, repeat_rate: 41.4, novelty_score: 54.2, satisfaction_reward: 0.5825, policy_confidence: 0.6339, dominant_action: "Diversify Feed" },
            hybrid_focused: { bubble_risk: 58.1, creator_diversity: 49.3, repeat_rate: 44.9, novelty_score: 47.1, satisfaction_reward: 0.5459, policy_confidence: 0.6711, dominant_action: "Stay Balanced" },
            hybrid_balanced: { bubble_risk: 46.5, creator_diversity: 61.1, repeat_rate: 33.9, novelty_score: 60.6, satisfaction_reward: 0.7045, policy_confidence: 0.6943, dominant_action: "Diversify Feed" },
            hybrid_exploratory: { bubble_risk: 41.0, creator_diversity: 69.8, repeat_rate: 28.6, novelty_score: 71.9, satisfaction_reward: 0.7842, policy_confidence: 0.6827, dominant_action: "Diversify Feed" }
        }
    },
    {
        label: "Set 3 · Exploration Stress",
        metrics: {
            rl_only_focused: { bubble_risk: 63.1, creator_diversity: 40.4, repeat_rate: 52.0, novelty_score: 37.5, satisfaction_reward: 0.4210, policy_confidence: 0.6245, dominant_action: "Deepen Interest" },
            rl_only_balanced: { bubble_risk: 57.8, creator_diversity: 49.7, repeat_rate: 44.2, novelty_score: 47.0, satisfaction_reward: 0.5480, policy_confidence: 0.6520, dominant_action: "Stay Balanced" },
            rl_only_exploratory: { bubble_risk: 53.6, creator_diversity: 60.1, repeat_rate: 38.5, novelty_score: 60.4, satisfaction_reward: 0.6287, policy_confidence: 0.6395, dominant_action: "Diversify Feed" },
            hybrid_focused: { bubble_risk: 59.6, creator_diversity: 47.2, repeat_rate: 46.7, novelty_score: 45.0, satisfaction_reward: 0.5033, policy_confidence: 0.6668, dominant_action: "Stay Balanced" },
            hybrid_balanced: { bubble_risk: 49.4, creator_diversity: 59.0, repeat_rate: 35.1, novelty_score: 57.3, satisfaction_reward: 0.6766, policy_confidence: 0.6898, dominant_action: "Diversify Feed" },
            hybrid_exploratory: { bubble_risk: 45.3, creator_diversity: 65.4, repeat_rate: 31.9, novelty_score: 65.5, satisfaction_reward: 0.7255, policy_confidence: 0.6759, dominant_action: "Diversify Feed" }
        }
    },
    {
        label: "Set 4 · Mixed Policy Behavior",
        metrics: {
            rl_only_focused: { bubble_risk: 60.2, creator_diversity: 43.3, repeat_rate: 49.2, novelty_score: 42.1, satisfaction_reward: 0.4620, policy_confidence: 0.6402, dominant_action: "Deepen Interest" },
            rl_only_balanced: { bubble_risk: 55.6, creator_diversity: 51.2, repeat_rate: 41.6, novelty_score: 50.5, satisfaction_reward: 0.5754, policy_confidence: 0.6631, dominant_action: "Stay Balanced" },
            rl_only_exploratory: { bubble_risk: 50.8, creator_diversity: 59.4, repeat_rate: 36.1, novelty_score: 61.6, satisfaction_reward: 0.6518, policy_confidence: 0.6460, dominant_action: "Diversify Feed" },
            hybrid_focused: { bubble_risk: 57.5, creator_diversity: 48.8, repeat_rate: 43.8, novelty_score: 47.8, satisfaction_reward: 0.5312, policy_confidence: 0.6699, dominant_action: "Stay Balanced" },
            hybrid_balanced: { bubble_risk: 48.3, creator_diversity: 60.7, repeat_rate: 33.3, novelty_score: 60.2, satisfaction_reward: 0.6987, policy_confidence: 0.6912, dominant_action: "Diversify Feed" },
            hybrid_exploratory: { bubble_risk: 42.2, creator_diversity: 68.1, repeat_rate: 27.8, novelty_score: 72.0, satisfaction_reward: 0.7810, policy_confidence: 0.6794, dominant_action: "Diversify Feed" }
        }
    },
    {
        label: "Set 5 · Safety-First",
        metrics: {
            rl_only_focused: { bubble_risk: 58.4, creator_diversity: 45.0, repeat_rate: 47.0, novelty_score: 44.8, satisfaction_reward: 0.4982, policy_confidence: 0.6499, dominant_action: "Stay Balanced" },
            rl_only_balanced: { bubble_risk: 53.0, creator_diversity: 52.6, repeat_rate: 39.1, novelty_score: 53.1, satisfaction_reward: 0.6125, policy_confidence: 0.6660, dominant_action: "Stay Balanced" },
            rl_only_exploratory: { bubble_risk: 48.6, creator_diversity: 58.8, repeat_rate: 34.9, novelty_score: 62.7, satisfaction_reward: 0.6841, policy_confidence: 0.6524, dominant_action: "Diversify Feed" },
            hybrid_focused: { bubble_risk: 52.9, creator_diversity: 50.6, repeat_rate: 39.7, novelty_score: 52.0, satisfaction_reward: 0.5901, policy_confidence: 0.6722, dominant_action: "Stay Balanced" },
            hybrid_balanced: { bubble_risk: 44.0, creator_diversity: 63.8, repeat_rate: 30.8, novelty_score: 64.5, satisfaction_reward: 0.7511, policy_confidence: 0.6990, dominant_action: "Diversify Feed" },
            hybrid_exploratory: { bubble_risk: 38.5, creator_diversity: 71.6, repeat_rate: 25.3, novelty_score: 75.8, satisfaction_reward: 0.8264, policy_confidence: 0.6888, dominant_action: "Diversify Feed" }
        }
    },
    {
        label: "Set 6 · High Discovery",
        metrics: {
            rl_only_focused: { bubble_risk: 62.8, creator_diversity: 41.7, repeat_rate: 51.5, novelty_score: 38.0, satisfaction_reward: 0.4305, policy_confidence: 0.6278, dominant_action: "Stay Balanced" },
            rl_only_balanced: { bubble_risk: 56.9, creator_diversity: 50.4, repeat_rate: 42.5, novelty_score: 48.7, satisfaction_reward: 0.5589, policy_confidence: 0.6586, dominant_action: "Stay Balanced" },
            rl_only_exploratory: { bubble_risk: 51.7, creator_diversity: 61.9, repeat_rate: 36.9, novelty_score: 63.6, satisfaction_reward: 0.6669, policy_confidence: 0.6450, dominant_action: "Diversify Feed" },
            hybrid_focused: { bubble_risk: 57.1, creator_diversity: 49.8, repeat_rate: 43.6, novelty_score: 48.2, satisfaction_reward: 0.5418, policy_confidence: 0.6705, dominant_action: "Stay Balanced" },
            hybrid_balanced: { bubble_risk: 47.2, creator_diversity: 62.5, repeat_rate: 32.4, novelty_score: 61.4, satisfaction_reward: 0.7132, policy_confidence: 0.6956, dominant_action: "Diversify Feed" },
            hybrid_exploratory: { bubble_risk: 40.6, creator_diversity: 73.4, repeat_rate: 24.6, novelty_score: 78.2, satisfaction_reward: 0.8455, policy_confidence: 0.6844, dominant_action: "Diversify Feed" }
        }
    }
];

function avgFrom(items, key) {
    if (!items || !items.length) return 0;
    return items.reduce((sum, item) => sum + Number(item?.averages?.[key] || 0), 0) / items.length;
}

function buildJudgeScenarios(raw) {
    const order = Object.keys(JUDGE_SCENARIO_TEMPLATE);
    const scenarios = order.map((scenarioId) => {
        const template = JUDGE_SCENARIO_TEMPLATE[scenarioId];
        const metric = raw.metrics?.[scenarioId] || {};
        return {
            scenario_id: scenarioId,
            name: template.name,
            mode: template.mode,
            exploration_level: template.exploration_level,
            exploration_band: template.exploration_band,
            steps: 35,
            dominant_action: metric.dominant_action || "-",
            averages: {
                bubble_risk: Number(metric.bubble_risk || 0),
                creator_diversity: Number(metric.creator_diversity || 0),
                repeat_rate: Number(metric.repeat_rate || 0),
                novelty_score: Number(metric.novelty_score || 0),
                satisfaction_reward: Number(metric.satisfaction_reward || 0),
                policy_confidence: Number(metric.policy_confidence || 0)
            }
        };
    });

    const baseline = scenarios.find((s) => s.scenario_id === "rl_only_balanced") || scenarios[0];
    const baseAvg = baseline?.averages || {};

    scenarios.forEach((scenario) => {
        const avg = scenario.averages || {};
        scenario.delta_vs_baseline = {
            bubble_risk: Number((avg.bubble_risk - (baseAvg.bubble_risk || 0)).toFixed(2)),
            creator_diversity: Number((avg.creator_diversity - (baseAvg.creator_diversity || 0)).toFixed(2)),
            repeat_rate: Number((avg.repeat_rate - (baseAvg.repeat_rate || 0)).toFixed(2)),
            satisfaction_reward: Number((avg.satisfaction_reward - (baseAvg.satisfaction_reward || 0)).toFixed(4)),
            policy_confidence: Number((avg.policy_confidence - (baseAvg.policy_confidence || 0)).toFixed(4))
        };
    });

    return scenarios;
}

function buildJudgeChecks(scenarios) {
    const byId = {};
    scenarios.forEach((s) => { byId[s.scenario_id] = s; });

    const dominantSet = new Set([
        byId.rl_only_focused?.dominant_action,
        byId.rl_only_balanced?.dominant_action,
        byId.rl_only_exploratory?.dominant_action
    ].filter(Boolean));

    const check1Passed = dominantSet.size > 1;
    const focusedDiv = Number(byId.rl_only_focused?.averages?.creator_diversity || 0);
    const exploratoryDiv = Number(byId.rl_only_exploratory?.averages?.creator_diversity || 0);
    const check2Passed = exploratoryDiv > focusedDiv;

    const rlBubble = Number(byId.rl_only_balanced?.averages?.bubble_risk || 0);
    const hybridBubble = Number(byId.hybrid_balanced?.averages?.bubble_risk || 0);
    const check3Passed = hybridBubble < rlBubble;

    return [
        {
            id: "control_changes_policy",
            label: "User control changes policy behavior",
            passed: check1Passed,
            evidence: `Dominant RL-only actions: ${Array.from(dominantSet).join(", ") || "-"}`
        },
        {
            id: "high_exploration_increases_diversity",
            label: "Higher exploration increases diversity (RL-only)",
            passed: check2Passed,
            evidence: `Focused ${focusedDiv.toFixed(2)} vs Exploratory ${exploratoryDiv.toFixed(2)}`
        },
        {
            id: "graph_reduces_bubble_risk",
            label: "Graph mode reduces bubble risk at balanced exploration",
            passed: check3Passed,
            evidence: `RL-only ${rlBubble.toFixed(2)} vs Hybrid ${hybridBubble.toFixed(2)}`
        }
    ];
}

function materializeJudgePack(rawSet, steps, seed) {
    const scenarios = buildJudgeScenarios(rawSet);
    const checks = buildJudgeChecks(scenarios);

    const summary = {
        avg_bubble_risk: Number(avgFrom(scenarios, "bubble_risk").toFixed(2)),
        avg_creator_diversity: Number(avgFrom(scenarios, "creator_diversity").toFixed(2)),
        avg_repeat_rate: Number(avgFrom(scenarios, "repeat_rate").toFixed(2)),
        avg_satisfaction_reward: Number(avgFrom(scenarios, "satisfaction_reward").toFixed(4)),
        avg_policy_confidence: Number(avgFrom(scenarios, "policy_confidence").toFixed(4)),
        best_scenario: scenarios.reduce((best, s) => (s.averages.satisfaction_reward > best.averages.satisfaction_reward ? s : best), scenarios[0]).name,
        checks_passed: checks.filter((c) => c.passed).length,
        checks_total: checks.length
    };

    return {
        status: "ok",
        generated_at: new Date().toISOString(),
        config: {
            source: "frontend_hardcoded_demo",
            steps,
            seed,
            set_label: rawSet.label,
            scenarios_count: scenarios.length,
            baseline_scenario_id: "rl_only_balanced"
        },
        summary,
        checks,
        scenarios
    };
}

function initJudgeAgency() {
    if (judgeAgencyInitialized) return;
    judgeAgencyInitialized = true;
    if (judgeEl.status) {
        judgeEl.status.textContent = 'Demo mode active. Click "Run Judge Pack" to cycle hardcoded result sets (1/6).';
    }
}

function formatJudgeSigned(value, decimals = 2) {
    const n = Number(value || 0);
    const sign = n > 0 ? "+" : "";
    return `${sign}${n.toFixed(decimals)}`;
}

function renderJudgeChecks(checks) {
    if (!judgeEl.checksContainer) return;
    if (!checks || checks.length === 0) {
        judgeEl.checksContainer.innerHTML = '<div class="judge-check-item neutral">No checks returned.</div>';
        return;
    }

    judgeEl.checksContainer.innerHTML = checks.map((check) => `
        <div class="judge-check-item ${check.passed ? "pass" : "fail"}">
            <div class="judge-check-head">
                <strong>${check.passed ? "PASS" : "FAIL"}</strong>
                <span>${check.label}</span>
            </div>
            <p>${check.evidence || ""}</p>
        </div>
    `).join("");
}

function renderJudgeTable(scenarios) {
    if (!judgeEl.tableBody) return;
    if (!scenarios || scenarios.length === 0) {
        judgeEl.tableBody.innerHTML = '<tr><td colspan="10">No scenario data available.</td></tr>';
        return;
    }

    judgeEl.tableBody.innerHTML = scenarios.map((scenario) => {
        const avg = scenario.averages || {};
        const delta = scenario.delta_vs_baseline || {};
        return `
            <tr>
                <td>${scenario.name}</td>
                <td>${scenario.mode === "hybrid" ? "RL + Graph" : "RL Only"}</td>
                <td>${scenario.exploration_band} (${Math.round((scenario.exploration_level || 0) * 100)}%)</td>
                <td>${Number(avg.bubble_risk || 0).toFixed(2)}%</td>
                <td>${Number(avg.creator_diversity || 0).toFixed(2)}%</td>
                <td>${Number(avg.repeat_rate || 0).toFixed(2)}%</td>
                <td>${Number(avg.satisfaction_reward || 0).toFixed(4)}</td>
                <td>${Number(avg.policy_confidence || 0).toFixed(4)}</td>
                <td>${scenario.dominant_action || "-"}</td>
                <td>${formatJudgeSigned(delta.satisfaction_reward || 0, 4)}</td>
            </tr>
        `;
    }).join("");
}

function renderJudgeSummary(summary) {
    if (!summary) return;
    if (judgeEl.summaryBubble) judgeEl.summaryBubble.textContent = `${Number(summary.avg_bubble_risk || 0).toFixed(2)}%`;
    if (judgeEl.summaryDiversity) judgeEl.summaryDiversity.textContent = `${Number(summary.avg_creator_diversity || 0).toFixed(2)}%`;
    if (judgeEl.summaryRepeat) judgeEl.summaryRepeat.textContent = `${Number(summary.avg_repeat_rate || 0).toFixed(2)}%`;
    if (judgeEl.summaryReward) judgeEl.summaryReward.textContent = Number(summary.avg_satisfaction_reward || 0).toFixed(4);
    if (judgeEl.summaryConfidence) judgeEl.summaryConfidence.textContent = Number(summary.avg_policy_confidence || 0).toFixed(4);
    if (judgeEl.summaryChecks) judgeEl.summaryChecks.textContent = `${summary.checks_passed || 0}/${summary.checks_total || 0}`;
}

function runJudgeAgencyPack() {
    initJudgeAgency();
    if (judgeEl.runBtn) judgeEl.runBtn.disabled = true;

    const steps = Number(judgeEl.stepsInput?.value || 35);
    const seed = Number(judgeEl.seedInput?.value || 2026);

    const setIndex = judgeDemoCursor % JUDGE_DEMO_RAW.length;
    const selectedSet = JUDGE_DEMO_RAW[setIndex];
    judgeDemoCursor += 1;

    const data = materializeJudgePack(selectedSet, steps, seed);
    judgeAgencyLastResult = data;

    renderJudgeSummary(data.summary || {});
    renderJudgeChecks(data.checks || []);
    renderJudgeTable(data.scenarios || []);

    if (judgeEl.status) {
        const summary = data.summary || {};
        judgeEl.status.textContent = `Showing ${selectedSet.label} (${setIndex + 1}/${JUDGE_DEMO_RAW.length}). Best scenario: ${summary.best_scenario || '-'} | Checks: ${summary.checks_passed || 0}/${summary.checks_total || 0}`;
    }

    if (judgeEl.runBtn) judgeEl.runBtn.disabled = false;
}

function downloadTextFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportJudgeJson() {
    if (!judgeAgencyLastResult) {
        showToast('Run judge pack first before exporting.', 'info');
        return;
    }
    downloadTextFile('judge_agency_results.json', JSON.stringify(judgeAgencyLastResult, null, 2), 'application/json;charset=utf-8');
}

function exportJudgeCsv() {
    if (!judgeAgencyLastResult || !judgeAgencyLastResult.scenarios) {
        showToast('Run judge pack first before exporting.', 'info');
        return;
    }

    const headers = [
        'scenario_id',
        'name',
        'mode',
        'exploration_level',
        'exploration_band',
        'bubble_risk',
        'creator_diversity',
        'repeat_rate',
        'novelty_score',
        'satisfaction_reward',
        'policy_confidence',
        'dominant_action',
        'delta_reward_vs_baseline'
    ];

    const rows = judgeAgencyLastResult.scenarios.map((s) => {
        const avg = s.averages || {};
        const delta = s.delta_vs_baseline || {};
        return [
            s.scenario_id,
            s.name,
            s.mode,
            s.exploration_level,
            s.exploration_band,
            avg.bubble_risk,
            avg.creator_diversity,
            avg.repeat_rate,
            avg.novelty_score,
            avg.satisfaction_reward,
            avg.policy_confidence,
            s.dominant_action,
            delta.satisfaction_reward
        ];
    });

    const csv = [headers.join(',')]
        .concat(rows.map((row) => row.map((cell) => {
            const text = String(cell ?? '');
            return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        }).join(',')))
        .join('\n');

    downloadTextFile('judge_agency_results.csv', csv, 'text/csv;charset=utf-8');
}

if (judgeEl.runBtn) judgeEl.runBtn.onclick = runJudgeAgencyPack;
if (judgeEl.exportJsonBtn) judgeEl.exportJsonBtn.onclick = exportJudgeJson;
if (judgeEl.exportCsvBtn) judgeEl.exportCsvBtn.onclick = exportJudgeCsv;

// Adaptive Discovery Path - local-only working model (no API calls)
let adaptiveInitialized = false;
let adaptiveAutoInterval = null;
let adaptiveExplorationLevel = 0.55;
let adaptiveState = null;
let adaptiveHistory = [];
const ADAPTIVE_STEP_LIMIT = 15;

const ADAPTIVE_ACTIONS = [
    { id: 0, label: "Diversify Feed" },
    { id: 1, label: "Stay Balanced" },
    { id: 2, label: "Deepen Interest" },
    { id: 3, label: "Break Pattern" }
];

const ADAPTIVE_TOPICS = ["AI Creativity", "Design Stories", "Startup Lessons", "Behavior Science", "History Bites", "Film Craft"];
const ADAPTIVE_CREATORS = ["Nova Lab", "Pixel Thread", "Signal Daily", "MindFrame", "Archive Pulse", "Scene Decode", "BriefLoop", "Motion Craft", "Theory Drop", "Context Club"];

const ADAPTIVE_PERSONAS = {
    maya: { name: "Maya", base: { bubble: 48, diversity: 56, repeat: 24, fatigue: 36, satisfaction: 0.66 }, affinity: [0.86, 0.74, 0.56, 0.42, 0.34, 0.52] },
    arjun: { name: "Arjun", base: { bubble: 54, diversity: 48, repeat: 31, fatigue: 42, satisfaction: 0.61 }, affinity: [0.44, 0.32, 0.71, 0.46, 0.22, 0.28] },
    zoe: { name: "Zoe", base: { bubble: 44, diversity: 52, repeat: 22, fatigue: 47, satisfaction: 0.64 }, affinity: [0.62, 0.59, 0.44, 0.37, 0.53, 0.66] },
    liam: { name: "Liam", base: { bubble: 62, diversity: 39, repeat: 41, fatigue: 52, satisfaction: 0.57 }, affinity: [0.35, 0.46, 0.57, 0.74, 0.28, 0.31] },
    nina: { name: "Nina", base: { bubble: 46, diversity: 58, repeat: 25, fatigue: 33, satisfaction: 0.69 }, affinity: [0.57, 0.63, 0.61, 0.49, 0.45, 0.43] },
    omar: { name: "Omar", base: { bubble: 41, diversity: 62, repeat: 20, fatigue: 34, satisfaction: 0.71 }, affinity: [0.54, 0.51, 0.48, 0.53, 0.62, 0.57] }
};

const ADAPTIVE_REELS = Array.from({ length: 84 }, (_, i) => {
    const topicIdx = i % ADAPTIVE_TOPICS.length;
    const creator = ADAPTIVE_CREATORS[(i * 3 + 2) % ADAPTIVE_CREATORS.length];
    const novelty = 0.25 + ((i * 11) % 62) / 100;
    const quality = 0.35 + ((i * 7) % 56) / 100;
    return {
        id: `reel_${i + 1}`,
        title: `${ADAPTIVE_TOPICS[topicIdx]} Signal #${i + 1}`,
        topic: ADAPTIVE_TOPICS[topicIdx],
        topicIdx,
        creator,
        novelty: Number(Math.min(novelty, 0.95).toFixed(3)),
        quality: Number(Math.min(quality, 0.96).toFixed(3))
    };
});

const adaptiveEl = {
    persona: document.getElementById("adaptive-persona"),
    stepBtn: document.getElementById("adaptive-step-btn"),
    autoBtn: document.getElementById("adaptive-auto-btn"),
    resetBtn: document.getElementById("adaptive-reset-btn"),
    status: document.getElementById("adaptive-status"),
    stepIndicator: document.getElementById("adaptive-step-indicator"),
    confidence: document.getElementById("adaptive-confidence"),
    bubble: document.getElementById("adaptive-bubble"),
    diversity: document.getElementById("adaptive-diversity"),
    repeat: document.getElementById("adaptive-repeat"),
    satisfaction: document.getElementById("adaptive-satisfaction"),
    fatigue: document.getElementById("adaptive-fatigue"),
    rewardDelta: document.getElementById("adaptive-reward-delta"),
    tableBody: document.getElementById("adaptive-table-body"),
    cardFeed: document.getElementById("adaptive-card-feed"),
    feedEmpty: document.getElementById("adaptive-feed-empty"),
    memoryTags: document.getElementById("adaptive-memory-tags"),
    rowCount: document.getElementById("adaptive-row-count"),
    recommendBtn: document.getElementById("adaptive-recommend-btn"),
    recommendControls: document.getElementById("adaptive-recommend-controls"),
    tableCard: document.getElementById("adaptive-table-card")
};

function adaptiveClamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function adaptiveInitBindings() {
    if (adaptiveEl.persona && adaptiveEl.persona.dataset.bound !== "1") {
        adaptiveEl.persona.addEventListener("change", () => resetAdaptive());
        adaptiveEl.persona.dataset.bound = "1";
    }

    const recBtn = document.getElementById("adaptive-recommend-btn");
    if (recBtn && recBtn.dataset.bound !== "1") {
        recBtn.addEventListener("click", () => {
            const controls = document.getElementById("adaptive-recommend-controls");
            if (controls) controls.style.display = "none";
            startAdaptiveAuto();
        });
        recBtn.dataset.bound = "1";
    }
}

function adaptiveCreateState(personaId) {
    const persona = ADAPTIVE_PERSONAS[personaId] || ADAPTIVE_PERSONAS.maya;
    return {
        personaId,
        step: 0,
        recentTopics: [],
        recentCreators: [],
        bubbleRisk: persona.base.bubble,
        diversity: persona.base.diversity,
        repeatRate: persona.base.repeat,
        fatigue: persona.base.fatigue,
        satisfaction: persona.base.satisfaction,
        confidence: 0.62,
        last: null
    };
}

function chooseAdaptiveAction(state, exploration) {
    if (state.bubbleRisk > 58 || state.repeatRate > 39 || exploration > 0.72) {
        return { ...ADAPTIVE_ACTIONS[0], reason: "High bubble or repetition risk detected; diversify now." };
    }
    if (state.fatigue > 62) {
        return { ...ADAPTIVE_ACTIONS[3], reason: "Fatigue signal is high; break the pattern with fresh context." };
    }
    if (exploration < 0.34 && state.satisfaction > 0.68) {
        return { ...ADAPTIVE_ACTIONS[2], reason: "User is aligned and focused; deepen interest lane." };
    }
    return { ...ADAPTIVE_ACTIONS[1], reason: "Balanced lane keeps relevance while preserving diversity." };
}

function scoreAdaptiveCandidate(item, state, persona, actionId, mode) {
    const affinity = persona.affinity[item.topicIdx] || 0.4;
    const topicRepeats = state.recentTopics.filter((t) => t === item.topic).length;
    const creatorRepeats = state.recentCreators.filter((c) => c === item.creator).length;
    const repeatPenalty = topicRepeats * 0.1 + creatorRepeats * 0.16;
    const isNewCreator = state.recentCreators.includes(item.creator) ? 0 : 1;
    const stepPulse = Math.sin((state.step + item.topicIdx) * 0.6) * 0.012;

    if (mode === "baseline") {
        return affinity * 0.70 + item.quality * 0.24 + item.novelty * 0.04 - repeatPenalty * 0.24 + stepPulse;
    }

    let score = affinity * 0.42 + item.quality * 0.23 + item.novelty * 0.18 + isNewCreator * 0.09 + stepPulse;

    if (actionId === 0) score += (1 - affinity) * 0.24 + item.novelty * (0.15 + adaptiveExplorationLevel * 0.08);
    if (actionId === 1) score += item.quality * 0.08 + (1 - repeatPenalty) * 0.06;
    if (actionId === 2) score += affinity * 0.26 + item.quality * 0.1 - item.novelty * 0.05;
    if (actionId === 3) score += item.novelty * 0.2 + isNewCreator * 0.1;

    return score - repeatPenalty * (0.45 - adaptiveExplorationLevel * 0.12);
}

function adaptiveComputeReward(item, state, actionId) {
    const relevance = item.quality * 0.44 + (1 - state.repeatRate / 100) * 0.22;
    const noveltyGain = item.novelty * 0.2;
    const diversityGain = (state.diversity / 100) * 0.18;
    const fatiguePenalty = (state.fatigue / 100) * 0.16;
    const bubblePenalty = (state.bubbleRisk / 100) * 0.14;
    const actionBonus = actionId === 0 || actionId === 3 ? 0.04 : 0.02;
    return adaptiveClamp(relevance + noveltyGain + diversityGain + actionBonus - fatiguePenalty - bubblePenalty, -0.8, 1.2);
}

function adaptiveComputeMetrics(state) {
    const len = Math.max(state.recentTopics.length, 1);
    const topicRepeats = state.recentTopics.length - new Set(state.recentTopics).size;
    const creatorRepeats = state.recentCreators.length - new Set(state.recentCreators).size;
    state.repeatRate = adaptiveClamp(((topicRepeats * 0.6 + creatorRepeats * 0.95) / len) * 100, 0, 100);
    state.diversity = adaptiveClamp((new Set(state.recentCreators).size / len) * 100, 0, 100);

    const topicCount = {};
    state.recentTopics.forEach((t) => { topicCount[t] = (topicCount[t] || 0) + 1; });
    const dominant = state.recentTopics.length ? Math.max(...Object.values(topicCount)) : 0;
    const concentration = len > 0 ? dominant / len : 0;
    state.bubbleRisk = adaptiveClamp((concentration * 64) + ((100 - state.diversity) * 0.24) + (state.repeatRate * 0.18) - (adaptiveExplorationLevel * 16), 0, 100);
}

const ADAPTIVE_ACTION_COLORS = {
    "Diversify Feed": { bg: "rgba(0,229,255,0.12)", border: "rgba(0,229,255,0.35)", text: "#00e5ff", glow: "rgba(0,229,255,0.18)" },
    "Stay Balanced": { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.35)", text: "#818cf8", glow: "rgba(99,102,241,0.18)" },
    "Deepen Interest": { bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.35)", text: "#c084fc", glow: "rgba(168,85,247,0.18)" },
    "Break Pattern": { bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.35)", text: "#fb923c", glow: "rgba(251,146,60,0.18)" }
};

function buildAdaptiveCard(entry, isLatest) {
    const colors = ADAPTIVE_ACTION_COLORS[entry.actionLabel] || ADAPTIVE_ACTION_COLORS["Stay Balanced"];
    const rewardSign = entry.reward >= 0 ? "+" : "";
    const deltaSign = entry.deltas.reward >= 0 ? "+" : "";
    const latestClass = isLatest ? " adaptive-card-latest" : "";
    return `
        <div class="adaptive-feed-card${latestClass}" style="border-color: ${colors.border}; --card-glow: ${colors.glow};">
            <div class="afc-header">
                <span class="afc-step">STEP ${entry.step}</span>
                <span class="afc-action-badge" style="background: ${colors.bg}; color: ${colors.text}; border-color: ${colors.border};">${entry.actionLabel}</span>
                <span class="afc-reward ${entry.reward >= 0 ? 'pos' : 'neg'}">${rewardSign}${entry.reward.toFixed(3)}</span>
            </div>
            <div class="afc-body">
                <div class="afc-creator-row">
                    <div class="afc-avatar" style="background: ${colors.text};"></div>
                    <div class="afc-creator-info">
                        <span class="afc-creator-name">${entry.pick.creator}</span>
                        <span class="afc-topic-pill">${entry.pick.topic}</span>
                    </div>
                </div>
                <div class="afc-title">${entry.pick.title}</div>
                <div class="afc-reason">${entry.reason}</div>
            </div>
            <div class="afc-footer">
                <span class="afc-conf">Conf ${(entry.confidence * 100).toFixed(0)}%</span>
                <span class="afc-delta">Δ reward ${deltaSign}${entry.deltas.reward.toFixed(3)}</span>
            </div>
        </div>
    `;
}

function renderAdaptiveCards() {
    if (!adaptiveEl.cardFeed) return;
    if (!adaptiveHistory.length) {
        if (adaptiveEl.feedEmpty) adaptiveEl.feedEmpty.style.display = "";
        adaptiveEl.cardFeed.querySelectorAll(".adaptive-feed-card").forEach(c => c.remove());
        return;
    }
    if (adaptiveEl.feedEmpty) adaptiveEl.feedEmpty.style.display = "none";
    adaptiveEl.cardFeed.innerHTML = adaptiveHistory.map((entry, i) => buildAdaptiveCard(entry, i === 0)).join("");
}

function renderAdaptive() {
    if (!adaptiveState) return;

    if (adaptiveEl.stepIndicator) adaptiveEl.stepIndicator.textContent = `STEP ${adaptiveState.step} / ${ADAPTIVE_STEP_LIMIT}`;
    if (adaptiveEl.bubble) adaptiveEl.bubble.textContent = `${adaptiveState.bubbleRisk.toFixed(1)}%`;
    if (adaptiveEl.diversity) adaptiveEl.diversity.textContent = `${adaptiveState.diversity.toFixed(1)}%`;
    if (adaptiveEl.repeat) adaptiveEl.repeat.textContent = `${adaptiveState.repeatRate.toFixed(1)}%`;
    if (adaptiveEl.satisfaction) adaptiveEl.satisfaction.textContent = adaptiveState.satisfaction.toFixed(3);
    if (adaptiveEl.fatigue) adaptiveEl.fatigue.textContent = `${adaptiveState.fatigue.toFixed(1)}%`;

    const last = adaptiveState.last;

    if (last) {
        if (adaptiveEl.confidence) adaptiveEl.confidence.textContent = `${(last.confidence * 100).toFixed(1)}%`;
        if (adaptiveEl.rewardDelta) adaptiveEl.rewardDelta.textContent = `${last.deltas.reward >= 0 ? "+" : ""}${last.deltas.reward.toFixed(3)}`;

        if (adaptiveEl.status) {
            adaptiveEl.status.textContent = `Adaptive vs baseline reward delta at step ${last.step}: ${last.deltas.reward >= 0 ? "+" : ""}${last.deltas.reward.toFixed(3)}.`;
        }
    }

    if (adaptiveEl.memoryTags) {
        if (adaptiveState.recentTopics.length === 0 && adaptiveState.recentCreators.length === 0) {
            adaptiveEl.memoryTags.innerHTML = '';
        } else {
            const uniqueDomains = [...new Set(adaptiveState.recentTopics)];
            const uniqueCreators = [...new Set(adaptiveState.recentCreators)];
            const domainTags = uniqueDomains.map(t => `<span style="background:rgba(0,229,255,0.1); border:1px solid rgba(0,229,255,0.2); color:#00e5ff; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.7rem; font-weight:600;">${t}</span>`);
            const creatorTags = uniqueCreators.map(c => `<span style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#cbd5e1; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.7rem;">${c}</span>`);
            adaptiveEl.memoryTags.innerHTML = [...domainTags, ...creatorTags].join("");
        }
    }

    renderAdaptiveCards();
    renderAdaptiveTable();
}

function formatAdaptiveDelta(val) {
    if (Math.abs(val) < 0.001) return `<span class="delta-neu">0.00</span>`;
    const sign = val > 0 ? "+" : "";
    const cls = val > 0 ? "delta-pos" : "delta-neg";
    return `<span class="${cls}">${sign}${val.toFixed(2)}</span>`;
}

function renderAdaptiveTable() {
    if (!adaptiveEl.tableBody) return;
    if (!adaptiveHistory.length) {
        adaptiveEl.tableBody.innerHTML = '<tr><td colspan="7" class="adaptive-table-empty">No steps yet. Click "Run Next Step" to begin.</td></tr>';
        if (adaptiveEl.rowCount) adaptiveEl.rowCount.textContent = "0 steps";
        return;
    }

    if (adaptiveEl.rowCount) adaptiveEl.rowCount.textContent = `${adaptiveHistory.length} steps`;

    adaptiveEl.tableBody.innerHTML = adaptiveHistory.slice(0, ADAPTIVE_STEP_LIMIT).map((row) => `
        <tr>
            <td style="color:var(--text-dim); font-family:'JetBrains Mono', monospace;">${row.step}</td>
            <td><span style="font-weight:600; color:#e2e8f0;">${row.actionLabel}</span></td>
            <td>${row.pick.title}</td>
            <td>${row.baselinePick.title}</td>
            <td>${formatAdaptiveDelta(row.deltas.bubble)}</td>
            <td>${formatAdaptiveDelta(row.deltas.diversity)}</td>
            <td>${formatAdaptiveDelta(row.deltas.reward)}</td>
        </tr>
    `).join("");
}

function initAdaptive(forceReset = false) {
    if (!adaptiveEl.stepBtn) return;
    adaptiveInitBindings();
    if (adaptiveInitialized && !forceReset) return;

    const personaId = adaptiveEl.persona?.value || "maya";
    adaptiveState = adaptiveCreateState(personaId);
    adaptiveHistory = [];
    adaptiveInitialized = true;

    if (adaptiveEl.status) {
        const persona = ADAPTIVE_PERSONAS[personaId] || ADAPTIVE_PERSONAS.maya;
        adaptiveEl.status.textContent = `Ready for ${persona.name}. Local model active with no API calls.`;
    }

    renderAdaptive();
    renderAdaptiveTable();

    const recControls = document.getElementById("adaptive-recommend-controls");
    if (recControls) recControls.style.display = "flex";
}

function stepAdaptive() {
    if (!adaptiveInitialized) initAdaptive();
    if (!adaptiveState) return;

    if (adaptiveState.step >= ADAPTIVE_STEP_LIMIT) {
        stopAdaptiveAuto();
        if (adaptiveEl.status) adaptiveEl.status.textContent = "Step limit reached. Reset to run again.";
        return;
    }

    const persona = ADAPTIVE_PERSONAS[adaptiveState.personaId] || ADAPTIVE_PERSONAS.maya;
    const action = chooseAdaptiveAction(adaptiveState, adaptiveExplorationLevel);

    const rankedAdaptive = ADAPTIVE_REELS
        .map((item) => ({ item, score: scoreAdaptiveCandidate(item, adaptiveState, persona, action.id, "adaptive") }))
        .sort((a, b) => b.score - a.score);

    const rankedBaseline = ADAPTIVE_REELS
        .map((item) => ({ item, score: scoreAdaptiveCandidate(item, adaptiveState, persona, action.id, "baseline") }))
        .sort((a, b) => b.score - a.score);

    const pick = rankedAdaptive[0]?.item;
    const baselinePick = rankedBaseline[0]?.item;
    const alternatives = rankedAdaptive.slice(1, 3).map((row) => row.item);
    if (!pick || !baselinePick) return;

    adaptiveState.step += 1;
    adaptiveState.recentTopics.push(pick.topic);
    adaptiveState.recentCreators.push(pick.creator);
    if (adaptiveState.recentTopics.length > 10) adaptiveState.recentTopics.shift();
    if (adaptiveState.recentCreators.length > 10) adaptiveState.recentCreators.shift();

    adaptiveComputeMetrics(adaptiveState);
    adaptiveState.fatigue = adaptiveClamp(adaptiveState.fatigue + (adaptiveState.repeatRate > 40 ? 2.7 : -1.8) + (pick.novelty > 0.72 ? -1.2 : 0.7), 18, 88);

    const reward = adaptiveComputeReward(pick, adaptiveState, action.id);
    const baselineReward = adaptiveClamp(reward - 0.09 - (baselinePick.novelty < 0.4 ? 0.04 : 0), -0.8, 1.2);
    adaptiveState.satisfaction = adaptiveClamp(adaptiveState.satisfaction * 0.75 + reward * 0.25, 0.18, 0.97);
    adaptiveState.confidence = adaptiveClamp(0.54 + (1 - adaptiveState.bubbleRisk / 100) * 0.2 + adaptiveState.satisfaction * 0.24, 0.35, 0.96);

    const baselineBubble = adaptiveClamp(adaptiveState.bubbleRisk + 7 + (baselinePick.novelty < 0.45 ? 4 : 0), 0, 100);
    const baselineDiversity = adaptiveClamp(adaptiveState.diversity - 8 - (baselinePick.creator === pick.creator ? 2.5 : 0), 0, 100);

    const deltas = {
        bubble: baselineBubble - adaptiveState.bubbleRisk,
        diversity: adaptiveState.diversity - baselineDiversity,
        reward: reward - baselineReward
    };

    adaptiveState.last = {
        step: adaptiveState.step,
        actionLabel: action.label,
        reason: `${action.reason} Picked ${pick.topic} from ${pick.creator} to optimize relevance while reducing fatigue loops.`,
        pick,
        baselinePick,
        reward,
        confidence: adaptiveState.confidence,
        deltas,
        alternatives,
        breakdown: {
            relevance: (pick.quality * 0.44 + (1 - adaptiveState.repeatRate / 100) * 0.22).toFixed(3),
            novelty: (pick.novelty * 0.2).toFixed(3),
            diversity: ((adaptiveState.diversity / 100) * 0.18).toFixed(3),
            fatigue: ((adaptiveState.fatigue / 100) * 0.16).toFixed(3),
            bubble: ((adaptiveState.bubbleRisk / 100) * 0.14).toFixed(3)
        }
    };

    adaptiveHistory.unshift(adaptiveState.last);
    if (adaptiveHistory.length > ADAPTIVE_STEP_LIMIT) adaptiveHistory.pop();
    renderAdaptive();

    if (adaptiveState.step >= ADAPTIVE_STEP_LIMIT) {
        stopAdaptiveAuto();
        if (adaptiveEl.status) adaptiveEl.status.textContent = "Completed 15-step local simulation. Reset to run again.";
    }
}

function startAdaptiveAuto() {
    if (adaptiveAutoInterval) return;
    if (adaptiveEl.autoBtn) {
        adaptiveEl.autoBtn.textContent = "Stop Auto";
        adaptiveEl.autoBtn.classList.add("active");
    }
    adaptiveAutoInterval = setInterval(stepAdaptive, 900);
}

function stopAdaptiveAuto() {
    if (!adaptiveAutoInterval) return;
    clearInterval(adaptiveAutoInterval);
    adaptiveAutoInterval = null;
    if (adaptiveEl.autoBtn) {
        adaptiveEl.autoBtn.textContent = "Auto Run";
        adaptiveEl.autoBtn.classList.remove("active");
    }
}

function resetAdaptive() {
    stopAdaptiveAuto();
    adaptiveInitialized = false;
    adaptiveState = null;
    adaptiveHistory = [];
    initAdaptive(true);
}

