# Integration Backend

This folder is now self-contained, so you can zip and share just `integrate/`
with your teammates without also sending the rest of the demo codebase.

## What It Gives You

- A reusable RL recommendation API
- A graph-storage adapter with a Neo4j-friendly node/edge model
- Clear endpoints for recommendation, feedback logging, graph upsert, and path explanation
- A separate Flask app that can run independently on port `5050`

## Included Files

- `app.py`
  Main integration backend
- `agent.py`
  Local copy of the RL agent used by this backend
- `models/trend_agent.pth`
  Trained RL model weights
- `requirements.txt`
  Python dependencies needed to run this backend
- `__init__.py`
  Package marker

## Run It

```powershell
cd integrate
python app.py
```

Backend URL:

```text
http://localhost:5050
```

## API Summary

### `GET /api/health`

Health check.

### `POST /api/bootstrap`

Returns:

- `user_id`
- `session_id`
- action catalog
- RL feature count

Example request:

```json
{
  "user_id": "maya-01"
}
```

### `POST /api/discovery/recommend`

Use this from the frontend when you already have a 10-feature RL state vector.

Example request:

```json
{
  "user_id": "maya-01",
  "state": [0.22, -0.31, 0.18, 0.44, 0.11, -0.09, 0.37, 0.29, 0.53, -0.12],
  "exploration_level": 0.55
}
```

Example response:

```json
{
  "status": "ok",
  "recommendation": {
    "action_id": 0,
    "action_label": "Diversify Feed",
    "action_style": "down",
    "confidence": 0.9412,
    "explanation": "Recommended Diversify Feed at 94.1% confidence for a balanced discovery posture. Strongest signal: elevated Bubble Risk.",
    "strongest_signal": "Bubble Risk",
    "exploration_band": "Balanced"
  },
  "graph_snapshot": {
    "recent_interactions": [],
    "known_nodes": 0
  }
}
```

### `POST /api/discovery/feedback`

Stores what the user saw and links it into the graph.

Example request:

```json
{
  "user_id": "maya-01",
  "session_id": "session-001",
  "user": {
    "name": "Maya",
    "role": "Creative technologist"
  },
  "topic": {
    "id": "design-systems",
    "name": "Design Systems"
  },
  "creator": {
    "id": "studio-relay",
    "name": "Studio Relay"
  },
  "content": {
    "id": "content-101",
    "title": "Fresh Find: Design Systems that scale cleanly"
  },
  "recommendation": {
    "action_label": "Diversify Feed",
    "confidence": 0.94
  }
}
```

### `POST /api/graph/upsert`

Bulk upsert nodes and edges from another service or frontend action.

### `POST /api/graph/explain`

Returns a path from user to content if one exists.

Example request:

```json
{
  "user_id": "maya-01",
  "content_id": "content-101"
}
```

## Swap-In Points For Your Teammates

### RL teammate

Replace `RLPolicyService` internals if needed, but keep:

- `recommend(state, exploration_level)`

### Graph-storage teammate

Replace `InMemoryGraphStore` with a real graph DB adapter, but keep:

- `upsert_node(...)`
- `add_edge(...)`
- `record_interaction(...)`
- `explain_content(...)`
- `session_snapshot(...)`

## Merge Strategy

If your frontend teammates already have their own UI, the simplest merge path is:

1. Run this backend separately on `5050`
2. Point frontend API calls to these endpoints
3. Replace the in-memory graph class with the real graph store
4. Replace or extend the RL service only if their model interface differs

## Notes

- This backend already loads the trained model from `integrate/models/trend_agent.pth`
- It is intentionally simple and integration-friendly, not demo-heavy
- It does not depend on the existing demo tabs
