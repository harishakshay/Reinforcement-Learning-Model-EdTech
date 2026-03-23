"""
environment.py
──────────────
The RL Environment for Trend Prediction.
Ties together the Data Simulator (or Twitter Loader), RL Agent, and Reward Function.

Follows the standard gym-style interface:
    env.reset()  →  initial state (10-feature vector)
    env.step(action)  →  (next_state, reward, done, info)
"""

import numpy as np
from typing import Tuple, Dict
from reward import compute_reward

N_FEATURES = 10


class TrendEnvironment:
    """
    Environment where the RL agent makes predictions on meme coin trends.
    Supports both the synthetic TrendDataSimulator and the real TwitterDataLoader.
    """

    def __init__(self, n_steps=1000, seed=42, use_twitter=False, twitter_path=None):
        if use_twitter:
            from twitter_loader import TwitterDataLoader
            self.simulator = TwitterDataLoader(json_path=twitter_path)
            self.max_steps = self.simulator.n_steps
        else:
            from data_simulator import TrendDataSimulator
            self.simulator = TrendDataSimulator(n_steps=n_steps, seed=seed)
            self.max_steps = n_steps

        self.current_t = 0
        self.history = []
        self.current_label = 1
        self.reset()

    def reset(self) -> np.ndarray:
        """Reset the environment to the beginning of the data."""
        self.current_t = 0
        self.history = []
        state, self.current_label = self.simulator.get_step(self.current_t)
        return state.astype(np.float32)

    def step(self, action: int, confidence: float = 0.5) -> Tuple[np.ndarray, float, bool, dict]:
        """
        Take a prediction step.
        action: 0=Down, 1=Neutral, 2=Up
        """
        is_early = False
        if action == 2 and self.current_label == 2:
            _, next_label = self.simulator.get_step(self.current_t + 1)
            if next_label is not None and next_label == 2:
                is_early = True

        reward, breakdown = compute_reward(
            prediction=action,
            actual_trend=self.current_label,
            confidence=confidence,
            is_early=is_early
        )

        self.current_t += 1
        done = (self.current_t >= self.max_steps - 1)

        next_state, next_label = self.simulator.get_step(self.current_t)
        if next_state is None:
            next_state = np.zeros(N_FEATURES, dtype=np.float32)
            next_label = 1
        self.current_label = next_label

        info = {
            "step": self.current_t,
            "reward_breakdown": breakdown,
            "actual_trend": self.current_label,
            "is_early": is_early
        }

        return next_state.astype(np.float32), reward, done, info


if __name__ == "__main__":
    # Test with Twitter data
    env = TrendEnvironment(use_twitter=True)
    obs = env.reset()
    print(f"Initial Obs (Twitter): {obs}")
    next_obs, reward, done, info = env.step(2, confidence=0.9)
    print(f"Reward: {reward}")
    print(f"Info: {info}")
