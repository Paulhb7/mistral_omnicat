"""Shared pytest fixtures for all backend tests."""
import sys
from pathlib import Path

# Ensure the backend package is importable from tests
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
