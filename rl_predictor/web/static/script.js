// HypeSense AI — Rebuilt Frontend Logic

// ── Tab Management (Global Delegation) ─────────────────────────────────────────
document.addEventListener('click', (e) => {
    const link = e.target.closest('.tab-link');
    if (!link) return;
    
    e.preventDefault();
    const tabId = link.getAttribute('data-tab');
    
    // Updates UI State
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll(`.tab-link[data-tab="${tabId}"]`).forEach(l => l.classList.add('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    
    const activePane = document.getElementById(tabId);
    if (activePane) activePane.classList.add('active');
    
    // Toggle "Full Dashboard" mode for ML Insights
    const navbar = document.getElementById('navbar');
    const footer = document.querySelector('footer');
    
    if (tabId === 'ml-insights-section') {
        if (navbar) navbar.style.display = 'none';
        if (footer) footer.style.display = 'none';
        document.body.classList.add('full-dashboard');
        loadMLRankings();
    } else {
        if (navbar) navbar.style.display = 'block';
        if (footer) footer.style.display = 'block';
        document.body.classList.remove('full-dashboard');
    }

    if (tabId === 'demo-section') initTerminal();
});

// ── Feature Names ──────────────────────────────────────────────────────────────
const FEATURE_NAMES = [
    "Sentiment", "Mention Growth", "Engage Score", "Spike Detected",
    "Metric X", "Metric Y", "Momentum", "Influence", "Hype Index", "Volatility"
];

// ── State ──────────────────────────────────────────────────────────────────────
let sessionInitialized = false;
let trendHistory = [];
let totalReward = 0;
let correctCount = 0;
let stepCount = 0;
let currentStreak = 0;
let autoRunInterval = null;
let chartInitialized = false;

// ── DOM References ─────────────────────────────────────────────────────────────
const el = {
    signalBars: document.getElementById('signal-bars'),
    stateVector: document.getElementById('state-vector'),
    predDisplay: document.getElementById('prediction-display'),
    predText: document.getElementById('prediction-text'),
    confBadge: document.getElementById('confidence-badge'),
    explText: document.getElementById('explanation-text'),
    rewardPulse: document.getElementById('reward-pulse'),
    rewardBars: document.getElementById('reward-bars'),
    logContainer: document.getElementById('log-container'),
    stepBtn: document.getElementById('step-btn'),
    autoBtn: document.getElementById('auto-btn'),
    resetBtn: document.getElementById('reset-btn'),
    stepCount: document.getElementById('step-count'),
    liveIndicator: document.getElementById('live-indicator'),
    actualLabel: document.getElementById('actual-label'),
    predictedLabel: document.getElementById('predicted-label'),
    verdictBadge: document.getElementById('verdict-badge'),
    statStep: document.getElementById('stat-step'),
    statAcc: document.getElementById('stat-acc'),
    statReward: document.getElementById('stat-reward'),
    statCorrect: document.getElementById('stat-correct'),
    statStreak: document.getElementById('stat-streak'),
};

// ── Init Terminal ──────────────────────────────────────────────────────────────
async function initTerminal() {
    if (sessionInitialized) return;
    el.liveIndicator.textContent = 'CONNECTING...';
    el.liveIndicator.className = 'live-dot connecting';
    try {
        const res = await fetch('/api/init', { method: 'POST' });
        const data = await res.json();
        sessionInitialized = true;
        renderSignalBars(data.initial_state);
        el.stateVector.textContent = formatVector(data.initial_state);
        el.liveIndicator.textContent = 'LIVE';
        el.liveIndicator.className = 'live-dot live';
        addLog('System', 'Neural core connected. Ready to analyze.');
    } catch (e) {
        el.liveIndicator.textContent = 'ERROR';
        el.liveIndicator.className = 'live-dot error';
        addLog('Error', 'Failed to connect to backend.');
    }
}

// ── Signal Bars ────────────────────────────────────────────────────────────────
function renderSignalBars(state) {
    el.signalBars.innerHTML = '';
    state.forEach((val, i) => {
        const pct = Math.min(Math.max((val + 1) / 2, 0), 1); 
        const color = pct > 0.65 ? '#00ff88' : pct > 0.35 ? '#00e5ff' : '#ff3e3e';
        const bar = document.createElement('div');
        bar.className = 'signal-row';
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
    return '[' + state.map(v => v.toFixed(2)).join(', ') + ']';
}

// ── Step Logic ─────────────────────────────────────────────────────────────────
async function takeStep() {
    if (!sessionInitialized) await initTerminal();
    el.stepBtn.disabled = true;
    el.liveIndicator.textContent = 'ANALYZING';
    el.liveIndicator.className = 'live-dot connecting';

    try {
        const res = await fetch('/api/step', { method: 'POST' });
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
        updatePrediction(data.prediction_label, data.confidence);

        const actualLbl = getTrendLabel(data.actual_trend);
        el.actualLabel.textContent = 'Actual: ' + actualLbl;
        el.predictedLabel.textContent = 'Pred: ' + data.prediction_label;
        el.verdictBadge.textContent = isCorrect ? 'CORRECT' : 'WRONG';
        el.verdictBadge.className = 'result-verdict ' + (isCorrect ? 'correct' : 'wrong');

        el.explText.textContent = data.explanation;
        el.stepCount.textContent = 'STEP ' + data.next_step;

        const rew = data.reward;
        el.rewardPulse.textContent = (rew >= 0 ? '+' : '') + rew.toFixed(2);
        el.rewardPulse.className = 'reward-num ' + (rew > 0 ? 'pos' : rew < 0 ? 'neg' : '');
        renderRewardBars(data.reward_detail);

        el.statStep.textContent = stepCount;
        el.statAcc.textContent = ((correctCount / stepCount) * 100).toFixed(1) + '%';
        el.statReward.textContent = totalReward >= 0 ? '+' + totalReward.toFixed(2) : totalReward.toFixed(2);
        el.statCorrect.textContent = correctCount;
        el.statStreak.textContent = currentStreak;

        addLog(isCorrect ? '[OK]' : '[--]', `Pred: ${data.prediction_label} | Actual: ${actualLbl} | Conf: ${(data.confidence*100).toFixed(0)}% | Rew: ${rew.toFixed(2)}`);
        updateTrendChart(data.next_step, data.actual_trend, data.prediction);

        if (data.done) {
            stopAutoRun();
            addLog('[END]', 'Simulation complete.');
        }

        el.liveIndicator.textContent = 'LIVE';
        el.liveIndicator.className = 'live-dot live';
    } catch (e) {
        addLog('[ERR]', 'Data stream interrupted: ' + e.message);
        el.liveIndicator.textContent = 'ERROR';
        el.liveIndicator.className = 'live-dot error';
        stopAutoRun();
    }
    el.stepBtn.disabled = false;
}

// ── Prediction UI ──────────────────────────────────────────────────────────────
function updatePrediction(label, conf) {
    el.predText.textContent = label.toUpperCase();
    el.predDisplay.className = 'prediction-display ' + label.toLowerCase();
    el.confBadge.textContent = (conf * 100).toFixed(1) + '% CONF';
    el.confBadge.className = 'conf-badge ' + (conf > 0.7 ? 'high' : conf > 0.5 ? 'mid' : 'low');
}

// ── Reward Bars ────────────────────────────────────────────────────────────────
function renderRewardBars(detail) {
    el.rewardBars.innerHTML = '';
    const entries = Object.entries(detail).filter(([, v]) => v !== 0);
    if (entries.length === 0) {
        el.rewardBars.innerHTML = '<span class="no-reward">No reward components this step.</span>';
        return;
    }
    entries.forEach(([k, v]) => {
        const row = document.createElement('div');
        row.className = 'rbar-row';
        const isPos = v > 0;
        row.innerHTML = `
            <span class="rbar-label">${k.replace(/_/g, ' ')}</span>
            <div class="rbar-track">
                <div class="rbar-fill ${isPos ? 'pos' : 'neg'}" style="width:${Math.min(Math.abs(v),2)/2*100}%"></div>
            </div>
            <span class="rbar-val ${isPos ? 'pos' : 'neg'}">${isPos ? '+' : ''}${v.toFixed(2)}</span>
        `;
        el.rewardBars.appendChild(row);
    });
}

// ── Log ────────────────────────────────────────────────────────────────────────
function addLog(tag, msg) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const now = new Date();
    const ts = now.toTimeString().slice(0, 8);
    entry.innerHTML = `<span class="log-ts">${ts}</span> <span class="log-tag">${tag}</span> ${msg}`;
    el.logContainer.prepend(entry);
    while (el.logContainer.children.length > 100) el.logContainer.removeChild(el.logContainer.lastChild);
}

// ── Trend Chart ────────────────────────────────────────────────────────────────
function updateTrendChart(step, actual, pred) {
    trendHistory.push({ step, actual, pred });
    if (trendHistory.length > 50) trendHistory.shift();
    const x = trendHistory.map(d => d.step);
    const yActual = trendHistory.map(d => d.actual - 1);
    const yPred = trendHistory.map(d => d.pred - 1);

    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { t: 5, b: 30, l: 40, r: 10 },
        font: { color: '#94a3b8', size: 10, family: 'JetBrains Mono' },
        xaxis: { gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
        yaxis: { gridcolor: 'rgba(255,255,255,0.04)', tickvals: [-1, 0, 1], ticktext: ['DOWN', 'NEUTRAL', 'UP'], zeroline: false },
        showlegend: false, hovermode: 'x unified'
    };
    const traces = [
        { x, y: yActual, mode: 'lines', name: 'Market', line: { color: 'rgba(255,255,255,0.5)', width: 2 } },
        { x, y: yPred, mode: 'markers', name: 'DQN', marker: { color: trendHistory.map((d) => d.pred === d.actual ? '#00ff88' : '#ff3e3e'), size: 8 } }
    ];
    if (!chartInitialized) {
        Plotly.newPlot('trend-chart', traces, layout, { displayModeBar: false, responsive: true });
        chartInitialized = true;
    } else Plotly.react('trend-chart', traces, layout);
}

function getTrendLabel(val) { return val === 2 ? 'UP' : (val === 0 ? 'DOWN' : 'NEUTRAL'); }

// ── Auto Run ───────────────────────────────────────────────────────────────────
function startAutoRun() {
    if (autoRunInterval) return;
    el.autoBtn.textContent = 'Stop Auto';
    el.autoBtn.classList.add('active');
    autoRunInterval = setInterval(async () => { await takeStep(); }, 700);
}
function stopAutoRun() {
    if (autoRunInterval) { clearInterval(autoRunInterval); autoRunInterval = null; }
    el.autoBtn.textContent = 'Auto Run';
    el.autoBtn.classList.remove('active');
}
async function resetSession() {
    stopAutoRun(); resetState(); await initTerminal();
}
function resetState() {
    sessionInitialized = false; trendHistory = []; totalReward = 0; correctCount = 0; stepCount = 0; currentStreak = 0; chartInitialized = false;
    el.logContainer.innerHTML = ''; el.statStep.textContent = '0'; el.statAcc.textContent = '—';
    Plotly.purge('trend-chart');
}

// ── Button Bindings ────────────────────────────────────────────────────────────
if (el.stepBtn) el.stepBtn.onclick = takeStep;
if (el.autoBtn) el.autoBtn.onclick = () => autoRunInterval ? stopAutoRun() : startAutoRun();
if (el.resetBtn) el.resetBtn.onclick = resetSession;

// ── Comparison Benchmark ───────────────────────────────────────────────────────
const runCompareBtn = document.getElementById('run-compare-btn');
if (runCompareBtn) {
    runCompareBtn.onclick = async () => {
        runCompareBtn.disabled = true;
        runCompareBtn.textContent = 'Running Benchmark...';
        document.getElementById('compare-loading').classList.remove('hidden');
        document.getElementById('compare-results').classList.add('hidden');
        try {
            const res = await fetch('/api/compare', { method: 'POST' });
            const data = await res.json();
            document.getElementById('compare-loading').classList.add('hidden');
            document.getElementById('compare-results').classList.remove('hidden');
            document.getElementById('ml-acc-num').textContent = data.traditional_ml.accuracy + '%';
            document.getElementById('dqn-acc-num').textContent = data.dqn.accuracy + '%';
            document.getElementById('edge-gain-num').textContent = '+' + data.edge + '%';
            const x = Array.from({ length: 50 }, (_, i) => i);
            Plotly.newPlot('compare-chart', [
                { x, y: data.traditional_ml.rolling_accuracy, type: 'scatter', name: 'ML', line: { color: '#ff3e3e' } },
                { x, y: data.dqn.rolling_accuracy, type: 'scatter', name: 'DQN', line: { color: '#00ff88' } }
            ], { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#94a3b8' } });
        } catch (e) { alert('Benchmark failed: ' + e.message); }
        runCompareBtn.disabled = false;
        runCompareBtn.textContent = 'Run Live Benchmark (500 Steps)';
    };
}

// ── ML Insights High-Impact Hub ───────────────────────────────────────────────
// ── ML Insights High-Impact Hub ───────────────────────────────────────────────
async function loadMLRankings() {
    const matrixDiv = document.getElementById('hype-matrix');
    const tbody = document.getElementById('ml-ranking-body');
    if (!matrixDiv) return;
    try {
        const res = await fetch('/api/ml-rankings');
        const data = await res.json();
        const coins = Object.entries(data.coins);
        
        // 1. Calculate Aggregates
        let totalSent = 0; let hotCoin = { name: '', score: -1, viral: 0 };
        coins.forEach(([name, info]) => {
            totalSent += (info.sentiment_score || 0);
            if (info.meme_viral_score > hotCoin.score) hotCoin = { name, score: info.meme_viral_score, viral: info.meme_viral_score };
        });
        const avgSent = totalSent / coins.length;
        const marketBias = avgSent > 0.1 ? 'BULLISH' : (avgSent < -0.1 ? 'BEARISH' : 'NEUTRAL');
        
        // 2. Update KPI Cards
        document.getElementById('kpi-hot-coin').textContent = hotCoin.name;
        document.getElementById('kpi-hot-viral').textContent = `${hotCoin.viral.toFixed(1)} Viral Score`;
        document.getElementById('kpi-market-sent').textContent = marketBias;
        document.getElementById('kpi-market-score').textContent = `${avgSent.toFixed(2)} Avg Sentiment`;
        
        // 3. Render High-Impact Visuals
        renderHypeMatrix(coins); updateSignalFeed(data.individual_posts);
        renderFeatureImportance(); updateKeywordCloud(hotCoin.name, data.coins[hotCoin.name]); renderModelRadar();
        
        // 4. Populate Ranking Table
        if (tbody) {
            tbody.innerHTML = '';
            coins.sort((a, b) => (b[1].meme_viral_score || 0) - (a[1].meme_viral_score || 0));
            coins.forEach(([name, info]) => {
                const tr = document.createElement('tr');
                const trendClass = (info.trend_label || 'neutral').toLowerCase();
                const confPct = ((info.confidence || 0) * 100).toFixed(1);
                const sentiment = info.sentiment_score !== undefined ? info.sentiment_score : 0;
                const sentClass = sentiment > 0 ? 'pos' : (sentiment < 0 ? 'neg' : '');

                tr.innerHTML = `
                    <td><span class="coin-name">${name}</span></td>
                    <td><span class="trend-badge ${trendClass}">${(info.trend_label || 'neutral').toUpperCase()}</span></td>
                    <td>
                        <div class="conf-bar-container">
                            <div class="conf-bar" style="width: ${confPct}%"></div>
                            <span class="conf-text">${confPct}%</span>
                        </div>
                    </td>
                    <td><span class="viral-num">${(info.meme_viral_score || 0).toFixed(1)}</span></td>
                    <td><span class="sent-num ${sentClass}">${(sentiment > 0 ? '+' : '')}${sentiment.toFixed(2)}</span></td>
                    <td class="driver-text">${info.primary_driver || 'Neural Analysis'}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        addLog('System', `Intelligence Hub Synced: ${coins.length} tokens.`);
    } catch (e) { console.error("ML Load Error:", e); addLog('Error', 'Intelligence Hub fetch failed.'); }
}

function renderHypeMatrix(coins) {
    const data = [{
        x: coins.map(c => c[1].sentiment_score || 0), y: coins.map(c => c[1].meme_viral_score || 0),
        mode: 'markers+text', text: coins.map(c => c[0]), textposition: 'top center', marker: { size: 12, color: '#00e5ff' }, type: 'scatter'
    }];
    Plotly.newPlot('hype-matrix', data, { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#8892b0', size: 10 }, margin: { l: 40, r: 20, t: 20, b: 40 } }, { displayModeBar: false });
}

function updateSignalFeed(posts) {
    const feed = document.getElementById('ml-social-feed'); if (!feed) return;
    feed.innerHTML = '';
    posts.slice(0, 20).forEach(post => {
        const sentiment = post.sentiment_score || 0;
        const sentClass = sentiment > 0.1 ? 'pos' : (sentiment < -0.1 ? 'neg' : '');
        const item = document.createElement('div'); item.className = 'feed-item';
        item.innerHTML = `<span class="feed-text">${post.text}</span><div class="feed-meta"><span>@${post.platform.toUpperCase()}</span><span class="${sentClass}">${sentiment > 0.1 ? 'BULLISH' : sentiment < -0.1 ? 'BEARISH' : 'NEUTRAL'}</span></div>`;
        feed.appendChild(item);
    });
}

function renderFeatureImportance() {
    const data = [{ type: 'bar', x: [0.38, 0.25, 0.18, 0.12, 0.07], y: ['Sentiment', 'Volume', 'Engagement', 'Spikes', 'Topic'], orientation: 'h', marker: { color: '#00e5ff' } }];
    Plotly.newPlot('rf-feature-chart', data, { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#8892b0', size: 10 }, margin: { l: 80, r: 20, t: 10, b: 30 } }, { displayModeBar: false });
}

function updateKeywordCloud(coinName, info) {
    const cloud = document.getElementById('keyword-cloud'); if (!cloud || !info) return;
    document.getElementById('keyword-title').textContent = `Trending: $${coinName}`;
    cloud.innerHTML = '';
    (info.top_keywords || ['hype', 'moon', 'community']).forEach(word => {
        const span = document.createElement('span'); span.className = 'word-pill';
        if (word.toLowerCase().includes('moon')) span.classList.add('high-hype');
        span.textContent = word; cloud.appendChild(span);
    });
}

function renderModelRadar() {
    const data = [{ type: 'scatterpolar', r: [92, 88, 90, 85, 89], theta: ['Acc', 'Prec', 'Rec', 'F1', 'Stab'], fill: 'toself', fillcolor: 'rgba(168, 85, 247, 0.3)', line: { color: '#a855f7' } }];
    Plotly.newPlot('model-health-radar', data, { polar: { bgcolor: 'rgba(0,0,0,0)', radialaxis: { visible: true, range: [0, 100], gridcolor: 'rgba(255,255,255,0.1)' } }, paper_bgcolor: 'rgba(0,0,0,0)', font: { color: '#8892b0', size: 9 }, margin: { l: 40, r: 40, t: 20, b: 20 } }, { displayModeBar: false });
}
