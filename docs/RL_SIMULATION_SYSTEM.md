# RL Simulation System

## 1. Purpose

This RL system powers a live recommendation simulator designed to reduce algorithm fatigue while preserving relevance. The policy chooses one of three recommendation strategies at each step and is evaluated with reward shaping tuned for discovery quality.

Core objective:

- Reduce repetitive feed loops (filter bubbles)
- Keep recommendations relevant to user intent
- Expose explainable model behavior for judges and stakeholders

---

## 2. Runtime Components

Primary backend: `rl_predictor/web/app.py`

Key components:

- `TrendPredictorAgent` (trained RL policy)
- `TrendEnvironment` (state transition + reward feedback)
- Baseline model (`BaselineModel`) for comparison
- Endpoint layer for live stepping and benchmark runs

Auxiliary reward logic:

- `rl_predictor/core/reward.py`

---

## 3. State Space (10-D Input Vector)

The policy consumes a 10-feature vector each step:

1. `state[0]` = Novelty Score
2. `state[1]` = Repeat Exposure
3. `state[2]` = Interest Momentum
4. `state[3]` = Creator Diversity
5. `state[4]` = Session Fatigue
6. `state[5]` = Topic Drift
7. `state[6]` = Engagement Depth
8. `state[7]` = Serendipity Potential
9. `state[8]` = Bubble Risk
10. `state[9]` = Cognitive Load

These features are rendered in the frontend signal panel and are also used in policy explanation text.

---

## 4. Action Space

`ACTION_LABELS` mapping:

- `0` -> Diversify Feed
- `1` -> Stay Balanced
- `2` -> Deepen Interest

The policy emits:

- discrete action id
- confidence score
- explanation payload (label/class/strongest signal)

---

## 5. Exploration Control (User-Driven)

The user sets `exploration_level` via slider (0 to 1, or 0 to 100 normalized).

Band mapping:

- `< 0.34` -> Focused
- `< 0.67` -> Balanced
- otherwise -> Exploratory

Policy post-processing (`apply_exploration_preference`) uses key state signals:

- `state[8]` (bubble risk)
- `state[6]` (engagement depth)
- `state[0]` (novelty)

Control effects:

- High exploration can force/boost diversify action when bubble risk rises
- Low exploration can favor deepening when engagement is high
- Near-neutral bubble risk can bias toward balanced action
- Confidence is stabilized by distance from the neutral exploration center (`0.5`)

---

## 6. Reward Function (Exact Rules)

Defined in `rl_predictor/core/reward.py`.

Given `prediction`, `actual_trend`, `confidence`, `is_early`:

- If `prediction == 1` and `actual_trend == 1`: reward = `+0.5`
- Else if prediction direction matches actual: `+1.0`
- Add `+0.5` if `is_early == True`
- Add `+0.5` if `confidence > 0.8` on a correct-direction prediction
- Opposite-direction miss: `-1.0`
- Near miss between balanced and directional: `-0.2`

Exposed reward breakdown:

- `decision_match`
- `early_diversity_bonus`
- `high_confidence_bonus`
- `mismatch_penalty`
- `total`

---

## 7. Baseline Comparator

A lightweight baseline is run for judge comparison:

`score = 0.4 * state[1] + 0.4 * state[2] + 0.2 * state[0]`

Decision rule:

- score > 0.05 -> action 2
- score < -0.05 -> action 0
- otherwise -> action 1

Used for:

- `/api/step` per-step baseline payload
- `/api/compare` 500-step benchmark statistics

---

## 8. API Endpoints (RL Core)

- `POST /api/init`
  - initializes session/environment
- `POST /api/step`
  - one policy step with optional exploration level
  - returns prediction, confidence, reward, explanation, baseline payload
- `POST /api/compare`
  - RL vs baseline long-run comparison (accuracy/reward/rolling curves)

---

## 9. Observable Judge Metrics

The UI surfaces:

- Step count
- Discovery match/accuracy
- Total reward
- Correct predictions and streak
- Reward decomposition bars
- Actual vs policy action trend chart

This gives judges black-box performance and white-box behavior simultaneously.

---

## 10. Current Strengths and Gaps

Strengths:

- Transparent policy behavior
- User-tunable exploration
- Reward shaping tied to fatigue and relevance goals
- Baseline comparison for defensible evaluation

Gaps for future work:

- Offline policy evaluation with logged datasets
- Uncertainty calibration reporting
- Counterfactual action audits
- Real-time drift alerts on state distribution
