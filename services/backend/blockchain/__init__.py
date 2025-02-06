"""
TikToken blockchain integration module.
Handles Ethereum interactions via Alchemy.
"""

from typing import Optional
import os

ALCHEMY_API_KEY: Optional[str] = os.getenv("ALCHEMY_API_KEY")
ALCHEMY_NETWORK: str = os.getenv("ALCHEMY_NETWORK", "sepolia") 