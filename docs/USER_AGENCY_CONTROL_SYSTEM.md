# User Agency Control System

## 1. Why User Agency Exists Here

This application is designed to avoid pure algorithmic lock-in. User agency controls let humans tune exploration pressure, run simulations manually, and inspect policy rationale in real time.

Agency objective:

- Keep the user in control of recommendation behavior
- Make policy intent transparent
- Prevent "autopilot" recommendation drift

---

## 2. Agency Controls by Module

## A) Discovery Terminal

Controls:

- `exploration-level` slider (0 to 100)
- `Apply Next Recommendation` (single-step control)
- `Auto Run` (continuous stepping)
- `Reset` (session state reset)

Displayed immediately after each step:

- predicted action + confidence
- actual need + verdict (aligned/miss)
- reward and reward breakdown
- running stats (accuracy, total reward, streak)

---

## B) Feed Journey

Controls:

- `journey-exploration-level` slider
- `Next Feed Step`
- `Auto Run`
- `Reset Journey`

Agency effect:

- user controls how strongly RL lane explores adjacent topics
- baseline lane is kept as fixed comparator
- judge can see divergence under same user persona

Key user-visible deltas:

- bubble risk gap
- diversity gap
- repeat gap
- satisfaction gap

---

## C) Graph Discovery Lab

Controls:

- `graph-mode-select`: `hybrid` vs `rl_only`
- `graph-exploration-level` slider
- `Run Graph Step`
- `Auto Run`
- `Reset Graph Session`

Agency effect:

- users can explicitly switch off graph context and compare behavior
- direct visibility into recommendation path and metric shifts

---

## 3. Exploration-Level Semantics

Shared mapping in frontend/backend:

- `< 0.34` -> Focused
- `< 0.67` -> Balanced
- `>= 0.67` -> Exploratory

Normalization behavior:

- values in `[0,1]` accepted directly
- values in `(1,100]` scaled to 0-1 range

This makes API usage robust across UI sliders and external callers.

---

## 4. What the User Can Inspect (Transparency Layer)

Exposed decision details:

- action label/class
- confidence
- strongest input signal
- natural-language explanation
- reward decomposition terms

Exposed performance details:

- cumulative reward
- rolling accuracy
- baseline comparison metrics
- graph-mode deltas

Exposed path details (graph mode):

- selected topic/creator/content
- traversal path list
- path explanation sentence

---

## 5. Agency vs Automation Balance

This system intentionally supports both:

- Manual mode for explainability and demos
- Auto mode for trajectory-level behavior

Guardrails already present:

- reset controls in all major tabs
- explicit mode switch (`rl_only` vs `hybrid`)
- live visualization of when policy misses

---

## 6. Judge Narrative (Recommended)

Use this flow during demo:

1. Start with manual stepping to show direct control and explanation quality
2. Change exploration slider and show action shift
3. Run auto for a short horizon to reveal trend behavior
4. Switch graph mode and compare deltas

This demonstrates that the application is not just accurate; it is inspectable and user-steerable.

---

## 7. Next Agency Upgrades (Roadmap)

High-value additions:

- Preference lock toggles (pin topics/creators)
- Explainability depth slider (short vs technical reasoning)
- Hard safety bounds on repeat-rate and bubble-risk
- Session-level "why changed" diffs after each control update
- Persisted user-control history for reproducibility
