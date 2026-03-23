// HypeSense AI - Integrated Frontend Logic

// ── Tab Management ─────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = link.getAttribute('data-tab');
        
        // Update Nav
        document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
        document.querySelectorAll(`.tab-link[data-tab="${tabId}"]`).forEach(l => l.classList.add('active'));
        
        // Update Panes
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        
        if (tabId === 'demo-section' ) initTerminal();
    });
});

// ── State ──────────────────────────────────────────────────────────────────────
let sessionInitialized = false;
let trendHistory = [];

const FEATURE_NAMES = [
    "Sentiment", "Mention Growth", "Engage Score", "Spike Detected",
    "Metric X", "Metric Y", "Momentum", "Influence", "Hype", "Volatility"
];

// ── Terminal / Demo Logic ─────────────────────────────────────────────────────
const elements = {
    metricsGrid: document.getElementById('metrics-grid'),
    stateVector: document.getElementById('state-vector'),
    predictionDisplay: document.getElementById('prediction-display'),
    predictionText: document.getElementById('prediction-text'),
    confidenceBadge: document.getElementById('confidence-badge'),
    explanationText: document.getElementById('explanation-text'),
    rewardPulse: document.getElementById('reward-pulse'),
    rewardList: document.getElementById('reward-list'),
    logContainer: document.getElementById('log-container'),
    stepBtn: document.getElementById('step-btn'),
    stepCount: document.getElementById('step-count')
};

async function initTerminal() {
    if (sessionInitialized) return;
    addLog("Connecting to HypeSense Neural Core...");
    const res = await fetch('/api/init', { method: 'POST' });
    const data = await res.json();
    sessionInitialized = true;
    updateMetrics(data.initial_state);
}

function updateMetrics(state) {
    elements.metricsGrid.innerHTML = '';
    state.forEach((val, i) => {
        const div = document.createElement('div');
        div.className = 'metric-item';
        div.innerHTML = `
            <span class="metric-label">${FEATURE_NAMES[i] || 'Signal '+i}</span>
            <span class="metric-val">${val.toFixed(3)}</span>
        `;
        elements.metricsGrid.appendChild(div);
    });
    elements.stateVector.textContent = `[ ${state.map(v => v.toFixed(2)).join(', ')} ]`;
}

async function takeStep() {
    elements.stepBtn.classList.add('loading');
    try {
        const res = await fetch('/api/step', { method: 'POST' });
        const data = await res.json();

        // Update UI
        updatePredictionUI(data.prediction_label, data.confidence);
        updateMetrics(data.state);
        elements.explanationText.textContent = data.explanation;
        elements.stepCount.textContent = `STEP ${data.next_step}`;
        
        // Reward
        const rew = data.reward;
        elements.rewardPulse.textContent = (rew >= 0 ? '+' : '') + rew.toFixed(2);
        elements.rewardPulse.style.color = rew > 0 ? '#00ff88' : (rew < 0 ? '#ff3e3e' : '#fff');
        
        updateRewardBreakdown(data.reward_detail);
        
        // Logs
        addLog(`Predicted ${data.prediction_label} | Actual: ${getTrendLabel(data.actual_trend)} | Reward: ${rew.toFixed(2)}`);
        
        // Chart
        updateTrendChart(data.next_step, data.actual_trend, data.prediction);
        
    } catch (e) {
        addLog("Critical: Data stream interrupted.");
    }
    elements.stepBtn.classList.remove('loading');
}

function updatePredictionUI(label, conf) {
    elements.predictionText.textContent = label.toUpperCase();
    elements.predictionDisplay.className = 'prediction-display ' + label.toLowerCase();
    elements.confidenceBadge.textContent = `${(conf * 100).toFixed(1)}% CONF`;
}

function updateRewardBreakdown(detail) {
    elements.rewardList.innerHTML = '';
    Object.entries(detail).forEach(([k, v]) => {
        if (v === 0) return;
        const li = document.createElement('li');
        li.style.color = v > 0 ? '#00ff88' : '#ff3e3e';
        li.textContent = `${k}: ${v > 0 ? '+' : ''}${v.toFixed(2)}`;
        elements.rewardList.appendChild(li);
    });
}

function addLog(msg) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `> ${msg}`;
    elements.logContainer.prepend(entry);
}

function getTrendLabel(val) {
    return val === 2 ? 'UP' : (val === 0 ? 'DOWN' : 'NEUTRAL');
}

// ── Trend Chart (Demo Section) ───────────────────────────────────────────────
function updateTrendChart(step, actual, pred) {
    trendHistory.push({step, actual, pred});
    if (trendHistory.length > 30) trendHistory.shift();
    
    const trace1 = {
        x: trendHistory.map(d => d.step),
        y: trendHistory.map(d => d.actual - 1),
        mode: 'lines', name: 'Market', line: {color: '#fff', width: 1}
    };
    const trace2 = {
        x: trendHistory.map(d => d.step),
        y: trendHistory.map(d => d.pred - 1),
        mode: 'markers', name: 'DQN', marker: {color: '#00ff88', size: 10}
    };

    Plotly.newPlot('trend-chart', [trace1, trace2], {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: {t:0, b:30, l:40, r:10},
        font: {color: '#94a3b8', size: 10},
        xaxis: {gridcolor: 'rgba(255,255,255,0.05)'},
        yaxis: {gridcolor: 'rgba(255,255,255,0.05)', tickvals: [-1,0,1], ticktext: ['DN','NT','UP']}
    });
}

elements.stepBtn.onclick = takeStep;

// ── Comparison Benchmark ──────────────────────────────────────────────────────
document.getElementById('run-compare-btn').onclick = async () => {
    const btn = document.getElementById('run-compare-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Running Benchmark...';
    
    document.getElementById('compare-loading').classList.remove('hidden');
    document.getElementById('compare-results').classList.add('hidden');
    
    try {
        const res = await fetch('/api/compare', { method: 'POST' });
        const data = await res.json();
        
        document.getElementById('compare-loading').classList.add('hidden');
        document.getElementById('compare-results').classList.remove('hidden');
        
        // Animate numbers
        document.getElementById('ml-acc-num').textContent = data.traditional_ml.accuracy + '%';
        document.getElementById('dqn-acc-num').textContent = data.dqn.accuracy + '%';
        document.getElementById('edge-gain-num').textContent = '+' + data.edge + '%';
        document.getElementById('reward-edge-num').textContent = '+' + data.reward_edge;
        
        // Detail rows
        document.getElementById('ml-correct').textContent = data.traditional_ml.correct + '/' + data.traditional_ml.steps;
        document.getElementById('ml-reward').textContent = data.traditional_ml.total_reward;
        document.getElementById('ml-steps').textContent = data.traditional_ml.steps;
        document.getElementById('dqn-correct').textContent = data.dqn.correct + '/' + data.dqn.steps;
        document.getElementById('dqn-reward').textContent = data.dqn.total_reward;
        document.getElementById('dqn-steps').textContent = data.dqn.steps;
        
        // Rolling accuracy chart
        const x = Array.from({length: data.dqn.rolling_accuracy.length}, (_, i) => i);
        
        Plotly.newPlot('compare-chart', [
            {
                x, y: data.traditional_ml.rolling_accuracy,
                type: 'scatter', mode: 'lines',
                name: 'Traditional ML', line: {color: '#ff3e3e', width: 2}
            },
            {
                x, y: data.dqn.rolling_accuracy,
                type: 'scatter', mode: 'lines',
                name: 'DQN', line: {color: '#00ff88', width: 2}
            }
        ], {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            showlegend: true,
            legend: {font: {color: '#94a3b8'}},
            margin: {t: 10, b: 40, l: 50, r: 10},
            font: {color: '#94a3b8', size: 11},
            xaxis: {title: 'Step', gridcolor: 'rgba(255,255,255,0.05)'},
            yaxis: {title: 'Accuracy %', gridcolor: 'rgba(255,255,255,0.05)', range: [0, 100]}
        });
        
    } catch (e) {
        alert('Benchmark failed: ' + e.message);
    }
    
    btn.disabled = false;
    btn.textContent = '⚡ Run Live Benchmark (500 Steps)';
};
