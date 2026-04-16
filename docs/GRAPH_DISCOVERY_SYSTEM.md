# Graph Discovery System

## 1. Purpose

The graph layer adds relationship memory and path-level explainability on top of RL. Instead of only returning an action, the system can justify recommendation flow through user-topic-creator-content connections.

Primary goal:

- Preserve relevance while preventing bubble collapse
- Make recommendation lineage inspectable for judges

---

## 2. Two Graph Surfaces in This Project

### A) Graph Discovery Lab (demo simulation)

File: `rl_predictor/web/app.py` (`GraphDiscoverySimulator`)

What it does:

- Simulates `rl_only` and `hybrid` modes in parallel
- Chooses content with graph-aware scoring in hybrid mode
- Emits path explanation in `User -> Topic -> Creator -> Content` form
- Produces trend metrics for side-by-side outcome plots

### B) Integration Graph API (app-integration layer)

File: `integrate/app.py` (`InMemoryGraphStore`)

What it does:

- Stores node/edge interactions
- Supports upsert, interaction logging, path explanation, session snapshots
- Exposes integration-friendly endpoints for other frontends/services

---

## 3. Graph Schema (Integration Backend)

Node labels:

- `User`
- `Topic`
- `Creator`
- `Content`

Edge types (current usage):

- `INTERESTED_IN` (User -> Topic)
- `HAS_CREATOR` (Topic -> Creator)
- `PUBLISHED` (Creator -> Content)
- `INTERACTED_WITH` (User -> Content, with recommendation context)

This schema is Neo4j-ready and can be swapped to persistent graph storage later.

---

## 4. Hybrid Recommendation Logic

In Graph Discovery Lab:

1. RL action/confidence is generated
2. Same RL action is applied to both modes (`rl_only`, `hybrid`) for fair comparison
3. Candidate scoring differs by mode

Hybrid mode adds graph-style context terms to scoring:

- weak-tie preference
- freshness via creator/topic exposure
- quality and novelty blend

Safety-style override currently implemented:

- If mode is `hybrid` and bubble risk is high (> 62) and RL action is deepen (`2`), final action is switched to diversify (`0`)

---

## 5. Metrics Produced by Graph Simulator

Per mode metrics include:

- `novelty_score`
- `bubble_risk`
- `creator_diversity`
- `repeat_rate`
- `satisfaction_reward`

Comparison deltas include:

- `bubble_delta`
- `diversity_delta`
- `reward_delta`

These are visualized in the Graph Discovery tab and used for judge storytelling.

---

## 6. Explainability Outputs

Graph tab returns:

- Recommendation topic/creator/content
- Policy action labels (RL action and final action)
- Confidence
- Path list (ordered traversal)
- `path_explanation` narrative string

Integration API returns:

- Path results for user-content explanation (`/api/graph/explain`)
- Session graph snapshots

---

## 7. Graph-Related API Endpoints

### Demo backend (`rl_predictor/web/app.py`)

- `POST /api/graph/init`
- `POST /api/graph/state`
- `POST /api/graph/step`

### Integration backend (`integrate/app.py`)

- `POST /api/discovery/recommend`
- `POST /api/discovery/feedback`
- `POST /api/graph/explain`
- `POST /api/graph/upsert`

---

## 8. Judge-Facing Value

Why graph matters beyond RL-only:

- Increases traceability: why this content now?
- Improves controllability: can penalize narrow loops via topology-aware features
- Provides architecture credibility: easy migration path to production graph DB

---

## 9. Production Upgrade Path

1. Replace in-memory store with Neo4j/JanusGraph adapter
2. Keep existing method contracts (`upsert_node`, `add_edge`, `record_interaction`, `explain_content`, `session_snapshot`)
3. Add persistence, indexing, and retention policies
4. Add causal path scoring for stronger explanation ranking
