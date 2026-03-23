"""
environment.py
──────────────
The RL Environment for Trend Prediction.
Ties together the Data Simulator, RL Agent, and Reward Function.

Follows the standard gym-style interface:
    env.reset()  →  initial state (10-feature vector)
    env.step(action)  →  (next_state, reward, done, info)
"""

import numpy as np
from typing import Tuple, Dict, List
from data_simulator import TrendDataSimulator
from reward import compute_reward

# Number of features in our state vector
N_FEATURES = 10 

class TrendEnvironment:
    """
    Environment where the RL agent makes predictions on meme coin trends.
    """
    def __init__(self, n_steps=1000, seed=42):
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
        # Determine if this was an 'early' prediction
        # (Simplified: if we predict Up and the next 2 steps are also Up)
        is_early = False
        if action == 2 and self.current_label == 2:
            # Look ahead in simulator labels
            _, next_label = self.simulator.get_step(self.current_t + 1)
            if next_label == 2:
                is_early = True

        # Compute reward
        reward, breakdown = compute_reward(
            prediction=action,
            actual_trend=self.current_label,
            confidence=confidence,
            is_early=is_early
        )

        # Move to next timestep
        self.current_t += 1
        done = (self.current_t >= self.max_steps - 1)
        
        next_state, next_label = self.simulator.get_step(self.current_t)
        self.current_label = next_label

        info = {
            "step": self.current_t,
            "reward_breakdown": breakdown,
            "actual_trend": self.current_label,
            "is_early": is_early
        }

        return next_state.astype(np.float32), reward, done, info

if __name__ == "__main__":
    env = TrendEnvironment(n_steps=100)
    obs = env.reset()
    print(f"Initial Obs: {obs}")
    
    # Take a dummy step (Predict Up)
    next_obs, reward, done, info = env.step(2, confidence=0.9)
    print(f"Reward: {reward}")
    print(f"Info: {info}")
