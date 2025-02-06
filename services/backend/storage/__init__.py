"""
TikToken storage module.
Handles data persistence via Supabase.
"""

from typing import Optional
import os

SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY: Optional[str] = os.getenv("SUPABASE_ANON_KEY") 