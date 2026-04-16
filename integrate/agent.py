"""
DQN agent for the content-discovery fatigue simulation.
Action space:
  0 -> Diversify Feed
  1 -> Stay Balanced
  2 -> Deepen Interest
"""

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import random
from collections import deque
from typing import Dict, Tuple

# Hyperparameters
GAMMA = 0.95
LEARNING_RATE = 0.001
MEMORY_SIZE = 10000
BATCH_SIZE = 64
EPSILON_START = 1.0
EPSILON_END = 0.05
EPSILON_DECAY = 0.995
TARGET_UPDATE = 10


class QNetwork(nn.Module):
    def __init__(self, n_features, n_actions):
        super().__init__()
        self.fc = nn.Sequential(
            nn.Linear(n_features, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, n_actions),
        )

    def forward(self, x):
        return self.fc(x)


class TrendPredictorAgent:
    def __init__(self, n_features=10, n_actions=3):
        self.n_features = n_features
        self.n_actions = n_actions

        self.policy_net = QNetwork(n_features, n_actions)
        self.target_net = QNetwork(n_features, n_actions)
        self.target_net.load_state_dict(self.policy_net.state_dict())
        self.target_net.eval()

        self.optimizer = optim.Adam(self.policy_net.parameters(), lr=LEARNING_RATE)
        self.memory = deque(maxlen=MEMORY_SIZE)

        self.epsilon = EPSILON_START
        self.steps_done = 0

    def select_action(self, state: np.ndarray, training: bool = True) -> Tuple[int, float]:
        """Returns (action, confidence)."""
        if training and random.random() < self.epsilon:
            action = random.randint(0, self.n_actions - 1)
            return action, 0.0

        with torch.no_grad():
            state_t = torch.FloatTensor(state).unsqueeze(0)
            q_values = self.policy_net(state_t)
            probs = torch.softmax(q_values, dim=1)
            action = torch.argmax(q_values).item()
            confidence = probs[0, action].item()
            return action, confidence

    def store_transition(self, state, action, reward, next_state, done):
        self.memory.append((state, action, reward, next_state, done))

    def update(self):
        if len(self.memory) < BATCH_SIZE:
            return

        batch = random.sample(self.memory, BATCH_SIZE)
        state_batch, action_batch, reward_batch, next_state_batch, done_batch = zip(*batch)

        state_batch = torch.FloatTensor(np.array(state_batch))
        action_batch = torch.LongTensor(action_batch).unsqueeze(1)
        reward_batch = torch.FloatTensor(reward_batch)
        next_state_batch = torch.FloatTensor(np.array(next_state_batch))
        done_batch = torch.FloatTensor(done_batch)

        current_q = self.policy_net(state_batch).gather(1, action_batch)
        with torch.no_grad():
            max_next_q = self.target_net(next_state_batch).max(1)[0]
            target_q = reward_batch + (1 - done_batch) * GAMMA * max_next_q

        loss = nn.MSELoss()(current_q.squeeze(), target_q)

        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()

        self.steps_done += 1
        if self.steps_done % TARGET_UPDATE == 0:
            self.target_net.load_state_dict(self.policy_net.state_dict())

        if self.epsilon > EPSILON_END:
            self.epsilon *= EPSILON_DECAY

    def explain_action(
        self, state: np.ndarray, action: int, confidence: float, exploration_level: float = 0.5
    ) -> Dict:
        """Generate a user-facing explanation aligned with discovery-fatigue framing."""
        action_labels = ["Diversify Feed", "Stay Balanced", "Deepen Interest"]
        action_classes = ["down", "neutral", "up"]
        chosen = action_labels[action]

        feature_names = [
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

        if exploration_level < 0.34:
            preference_text = "focused personalization"
        elif exploration_level < 0.67:
            preference_text = "balanced discovery"
        else:
            preference_text = "broader exploration"

        strongest_idx = int(np.argmax(np.abs(state)))
        strongest_feat = feature_names[strongest_idx]
        strongest_val = float(state[strongest_idx])

        explanation = (
            f"Recommended {chosen} with {confidence:.1%} confidence, tuned for {preference_text}. "
        )
        if strongest_val > 0.5:
            explanation += f"Primary driver: strong {strongest_feat}."
        elif strongest_val < -0.5:
            explanation += f"Primary driver: suppressed {strongest_feat}."
        else:
            explanation += f"Primary driver: moderate signal in {strongest_feat}."

        return {
            "prediction": chosen,
            "prediction_class": action_classes[action],
            "confidence": confidence,
            "explanation": explanation,
            "strongest_signal": strongest_feat,
        }

    def save(self, path="trend_agent.pth"):
        torch.save(self.policy_net.state_dict(), path)

    def load(self, path="trend_agent.pth"):
        self.policy_net.load_state_dict(torch.load(path))
        self.target_net.load_state_dict(self.policy_net.state_dict())
        self.epsilon = EPSILON_END
