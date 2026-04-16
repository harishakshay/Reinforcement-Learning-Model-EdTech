"""Integration-ready backend for RL recommendations + graph storage.

This module is intentionally separate from the demo backend in
``rl_predictor/web/app.py`` so your teammates can merge a cleaner API layer
into their frontend without pulling in the full demo logic.

Run:
    python integrate/app.py
"""

from __future__ import annotations

import os
import uuid
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Deque, Dict, List, Optional, Tuple

import numpy as np
from flask import Flask, jsonify, request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

try:
    from .agent import TrendPredictorAgent
except ImportError:
    from agent import TrendPredictorAgent

ACTION_LABELS = {0: "Diversify Feed", 1: "Stay Balanced", 2: "Deepen Interest"}
ACTION_STYLE_CLASSES = {0: "down", 1: "neutral", 2: "up"}
FEATURE_NAMES = [
    "Novelty Score",
    "Repeat Exposure",
    "Interest Momentum",
    "Creator Diversity",
    "Session Fatigue",
    "Topic Drift",
    "Engagement Depth",
    "Serendipity Potential",
    "Bubble Risk",
    "Cognitive Load",
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_exploration_level(value) -> float:
    try:
        level = float(value)
    except (TypeError, ValueError):
        return 0.5
    if 1.0 < level <= 100.0:
        level = level / 100.0
    return float(np.clip(level, 0.0, 1.0))


def exploration_band(level: float) -> str:
    if level < 0.34:
        return "Focused"
    if level < 0.67:
        return "Balanced"
    return "Exploratory"


def apply_exploration_preference(
    state: np.ndarray, action: int, confidence: float, level: float
) -> Tuple[int, float]:
    bubble_risk = float(state[8]) if len(state) > 8 else 0.0
    engagement_depth = float(state[6]) if len(state) > 6 else 0.0
    novelty_score = float(state[0]) if len(state) > 0 else 0.0
    if level >= 0.67 and bubble_risk > -0.05:
        action, confidence = 0, max(confidence, 0.62)
    elif level <= 0.33 and (engagement_depth > -0.2 or novelty_score > -0.1):
        action, confidence = 2, max(confidence, 0.60)
    elif abs(bubble_risk) < 0.15:
        action, confidence = 1, max(confidence, 0.58)
    stability = 1.0 - abs(level - 0.5) * 2.0
    confidence = float(np.clip(confidence * (0.9 + 0.1 * max(stability, 0.0)), 0.05, 0.99))
    return action, confidence


def build_policy_explanation(
    state: np.ndarray, action: int, confidence: float, exploration_level: float
) -> Dict[str, str]:
    strongest_idx = int(np.argmax(np.abs(state))) if len(state) else 0
    strongest_feature = FEATURE_NAMES[strongest_idx]
    strongest_value = float(state[strongest_idx]) if len(state) else 0.0
    chosen = ACTION_LABELS[action]
    band = exploration_band(exploration_level)

    if strongest_value > 0.5:
        signal_text = f"Strongest signal: elevated {strongest_feature}."
    elif strongest_value < -0.5:
        signal_text = f"Strongest signal: suppressed {strongest_feature}."
    else:
        signal_text = f"Strongest signal: moderate {strongest_feature}."

    explanation = (
        f"Recommended {chosen} at {confidence:.1%} confidence for a {band.lower()} "
        f"discovery posture. {signal_text}"
    )
    return {
        "prediction": chosen,
        "prediction_class": ACTION_STYLE_CLASSES[action],
        "explanation": explanation,
        "strongest_signal": strongest_feature,
        "exploration_band": band,
    }


@dataclass
class Recommendation:
    action_id: int
    action_label: str
    action_style: str
    confidence: float
    explanation: str
    strongest_signal: str
    exploration_band: str


class RLPolicyService:
    """Adapter around the trained RL model.

    Your teammates can keep this service contract and replace the internal
    implementation with a more advanced policy server later.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.agent = TrendPredictorAgent()
        self.model_path = model_path or os.path.join(BASE_DIR, "models", "trend_agent.pth")
        if os.path.exists(self.model_path):
            self.agent.load(self.model_path)

    def recommend(self, state: List[float], exploration_level: float = 0.5) -> Recommendation:
        vector = np.array(state, dtype=np.float32)
        if vector.shape[0] != self.agent.n_features:
            raise ValueError(
                f"Expected state vector of length {self.agent.n_features}, "
                f"received {vector.shape[0]}"
            )
        action, confidence = self.agent.select_action(vector, training=False)
        action, confidence = apply_exploration_preference(
            vector, action, confidence, exploration_level
        )
        explanation = build_policy_explanation(vector, action, confidence, exploration_level)
        return Recommendation(
            action_id=action,
            action_label=ACTION_LABELS[action],
            action_style=ACTION_STYLE_CLASSES[action],
            confidence=confidence,
            explanation=explanation["explanation"],
            strongest_signal=explanation["strongest_signal"],
            exploration_band=explanation["exploration_band"],
        )


class InMemoryGraphStore:
    """Small graph adapter with a Neo4j-friendly data shape.

    This is intentionally simple. Your graph-storage teammate can replace this
    class with a Neo4j, Memgraph, or other graph-backed implementation while
    keeping the same methods.
    """

    def __init__(self):
        self.nodes: Dict[str, Dict] = {}
        self.adjacency: Dict[str, List[Dict]] = defaultdict(list)
        self.session_history: Dict[str, Deque[Dict]] = defaultdict(lambda: deque(maxlen=50))

    def upsert_node(self, node_id: str, label: str, properties: Optional[Dict] = None) -> Dict:
        payload = {"id": node_id, "label": label, "properties": properties or {}}
        self.nodes[node_id] = payload
        return payload

    def add_edge(
        self,
        source: str,
        target: str,
        relation: str,
        properties: Optional[Dict] = None,
    ) -> Dict:
        edge = {
            "source": source,
            "target": target,
            "relation": relation,
            "properties": properties or {},
        }
        self.adjacency[source].append(edge)
        return edge

    def record_interaction(self, payload: Dict) -> Dict:
        user_id = payload["user_id"]
        session_id = payload.get("session_id") or "default-session"
        content_id = payload["content"]["id"]
        topic_id = payload["topic"]["id"]
        creator_id = payload["creator"]["id"]

        self.upsert_node(user_id, "User", payload.get("user", {}))
        self.upsert_node(topic_id, "Topic", payload["topic"])
        self.upsert_node(creator_id, "Creator", payload["creator"])
        self.upsert_node(content_id, "Content", payload["content"])

        self.add_edge(user_id, topic_id, "INTERESTED_IN", {"session_id": session_id})
        self.add_edge(topic_id, creator_id, "HAS_CREATOR")
        self.add_edge(creator_id, content_id, "PUBLISHED")
        self.add_edge(
            user_id,
            content_id,
            "SAW",
            {
                "session_id": session_id,
                "action_label": payload.get("recommendation", {}).get("action_label"),
                "confidence": payload.get("recommendation", {}).get("confidence"),
                "timestamp": utc_now_iso(),
            },
        )

        self.session_history[user_id].append(
            {
                "session_id": session_id,
                "content_id": content_id,
                "topic_id": topic_id,
                "creator_id": creator_id,
                "action_label": payload.get("recommendation", {}).get("action_label"),
                "timestamp": utc_now_iso(),
            }
        )
        return {"status": "recorded", "user_id": user_id, "content_id": content_id}

    def explain_content(self, user_id: str, content_id: str) -> Dict:
        if user_id not in self.nodes:
            raise KeyError(f"Unknown user_id: {user_id}")
        if content_id not in self.nodes:
            raise KeyError(f"Unknown content_id: {content_id}")

        visited = {user_id}
        queue = deque([(user_id, [user_id])])

        while queue:
            current, path = queue.popleft()
            if current == content_id:
                labeled_path = [
                    {
                        "id": node_id,
                        "label": self.nodes.get(node_id, {}).get("label", "Unknown"),
                        "properties": self.nodes.get(node_id, {}).get("properties", {}),
                    }
                    for node_id in path
                ]
                return {
                    "path": labeled_path,
                    "path_text": " -> ".join(
                        f"{node['label']}:{node['properties'].get('name') or node['properties'].get('title') or node['id']}"
                        for node in labeled_path
                    ),
                }
            for edge in self.adjacency.get(current, []):
                nxt = edge["target"]
                if nxt in visited:
                    continue
                visited.add(nxt)
                queue.append((nxt, path + [nxt]))

        return {
            "path": [],
            "path_text": "No relationship path found from user to requested content.",
        }

    def session_snapshot(self, user_id: str) -> Dict:
        history = list(self.session_history.get(user_id, []))
        return {
            "user_id": user_id,
            "recent_interactions": history[-10:],
            "known_nodes": len(self.nodes),
            "known_edges": sum(len(edges) for edges in self.adjacency.values()),
        }


class IntegrationBackend:
    def __init__(
        self,
        rl_service: Optional[RLPolicyService] = None,
        graph_store: Optional[InMemoryGraphStore] = None,
    ):
        self.rl_service = rl_service or RLPolicyService()
        self.graph_store = graph_store or InMemoryGraphStore()

    def bootstrap(self, payload: Dict) -> Dict:
        user_id = payload.get("user_id") or f"user-{uuid.uuid4().hex[:8]}"
        session_id = payload.get("session_id") or f"session-{uuid.uuid4().hex[:8]}"
        return {
            "status": "ok",
            "user_id": user_id,
            "session_id": session_id,
            "n_features": self.rl_service.agent.n_features,
            "actions": [{"id": key, "label": value} for key, value in ACTION_LABELS.items()],
            "graph_schema": ["User", "Topic", "Creator", "Content"],
        }

    def recommend(self, payload: Dict) -> Dict:
        recommendation = self.rl_service.recommend(
            state=payload["state"],
            exploration_level=parse_exploration_level(payload.get("exploration_level", 0.5)),
        )
        graph_snapshot = (
            self.graph_store.session_snapshot(payload["user_id"])
            if payload.get("user_id") in self.graph_store.nodes
            else {"recent_interactions": [], "known_nodes": len(self.graph_store.nodes)}
        )
        return {
            "status": "ok",
            "recommendation": {
                "action_id": recommendation.action_id,
                "action_label": recommendation.action_label,
                "action_style": recommendation.action_style,
                "confidence": round(recommendation.confidence, 4),
                "explanation": recommendation.explanation,
                "strongest_signal": recommendation.strongest_signal,
                "exploration_band": recommendation.exploration_band,
            },
            "graph_snapshot": graph_snapshot,
        }

    def log_feedback(self, payload: Dict) -> Dict:
        interaction = self.graph_store.record_interaction(payload)
        return {
            "status": "ok",
            "interaction": interaction,
            "message": "Recommendation feedback stored and linked into the graph.",
        }

    def explain(self, payload: Dict) -> Dict:
        explanation = self.graph_store.explain_content(
            user_id=payload["user_id"], content_id=payload["content_id"]
        )
        return {"status": "ok", "explanation": explanation}

    def upsert_graph(self, payload: Dict) -> Dict:
        inserted_nodes = []
        inserted_edges = []
        for node in payload.get("nodes", []):
            inserted_nodes.append(
                self.graph_store.upsert_node(
                    node_id=node["id"],
                    label=node["label"],
                    properties=node.get("properties"),
                )
            )
        for edge in payload.get("edges", []):
            inserted_edges.append(
                self.graph_store.add_edge(
                    source=edge["source"],
                    target=edge["target"],
                    relation=edge["relation"],
                    properties=edge.get("properties"),
                )
            )
        return {
            "status": "ok",
            "upserted_nodes": len(inserted_nodes),
            "upserted_edges": len(inserted_edges),
        }


def create_app(backend: Optional[IntegrationBackend] = None) -> Flask:
    app = Flask(__name__)
    services = backend or IntegrationBackend()

    @app.get("/api/health")
    def health():
        return jsonify(
            {
                "status": "ok",
                "service": "integration-backend",
                "timestamp": utc_now_iso(),
            }
        )

    @app.post("/api/bootstrap")
    def bootstrap():
        payload = request.get_json(silent=True) or {}
        return jsonify(services.bootstrap(payload))

    @app.post("/api/discovery/recommend")
    def recommend():
        payload = request.get_json(silent=True) or {}
        try:
            if "state" not in payload:
                return jsonify({"status": "error", "message": "Missing 'state' field."}), 400
            if "user_id" not in payload:
                return jsonify({"status": "error", "message": "Missing 'user_id' field."}), 400
            return jsonify(services.recommend(payload))
        except ValueError as exc:
            return jsonify({"status": "error", "message": str(exc)}), 400

    @app.post("/api/discovery/feedback")
    def feedback():
        payload = request.get_json(silent=True) or {}
        required = ["user_id", "content", "topic", "creator", "recommendation"]
        missing = [field for field in required if field not in payload]
        if missing:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": f"Missing required fields: {', '.join(missing)}",
                    }
                ),
                400,
            )
        return jsonify(services.log_feedback(payload))

    @app.post("/api/graph/explain")
    def explain():
        payload = request.get_json(silent=True) or {}
        try:
            return jsonify(services.explain(payload))
        except KeyError as exc:
            return jsonify({"status": "error", "message": str(exc)}), 404

    @app.post("/api/graph/upsert")
    def upsert_graph():
        payload = request.get_json(silent=True) or {}
        return jsonify(services.upsert_graph(payload))

    return app


app = create_app()


if __name__ == "__main__":
    print("\nIntegration backend running at: http://localhost:5050\n")
    app.run(debug=True, port=5050, use_reloader=False)
