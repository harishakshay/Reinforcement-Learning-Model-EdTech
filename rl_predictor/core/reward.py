"""
Reward function for content-discovery policy simulation.
Action mapping:
  0 -> Diversify Feed
  1 -> Stay Balanced
  2 -> Deepen Interest
"""

from typing import Dict, Tuple


def compute_reward(
    prediction: int,
    actual_trend: int,
    confidence: float,
    is_early: bool = False,
) -> Tuple[float, Dict]:
    """
    Returns (reward, breakdown).
    Scoring intent:
    - +1 for aligned recommendation.
    - +0.5 for early intervention value.
    - +0.5 for high-confidence alignment.
    - -1 for opposite-direction miss.
    - -0.2 for near-miss between balanced and directional actions.
    """
    reward = 0.0
    correct_direction = prediction == actual_trend
    opposite_miss = not correct_direction and (prediction != 1 and actual_trend != 1)

    if prediction == 1 and actual_trend == 1:
        reward = 0.5
    elif correct_direction:
        reward += 1.0
        if is_early:
            reward += 0.5
        if confidence > 0.8:
            reward += 0.5
    elif opposite_miss:
        reward -= 1.0
    else:
        reward = -0.2

    breakdown = {
        "decision_match": float(correct_direction),
        "early_diversity_bonus": float(is_early),
        "high_confidence_bonus": float(correct_direction and confidence > 0.8),
        "mismatch_penalty": float(opposite_miss),
        "total": round(float(reward), 4),
    }
    return reward, breakdown


def explain_reward(breakdown: Dict) -> str:
    """Human-readable reward explanation for debugging/demo output."""
    if breakdown["mismatch_penalty"]:
        return "Misaligned recommendation. Large penalty applied."

    notes = []
    if breakdown["decision_match"]:
        notes.append("Recommendation aligned with user need")
        if breakdown["early_diversity_bonus"]:
            notes.append("Early fatigue-prevention bonus")
        if breakdown["high_confidence_bonus"]:
            notes.append("High-confidence alignment bonus")
    else:
        notes.append("Near-miss between balanced and directional action")
    return " | ".join(notes)
