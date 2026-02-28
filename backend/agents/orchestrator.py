"""
Orchestrator — Agent-as-Tools pattern for cross-enriched OSINT briefings.

A single orchestrator agent (Mistral Small) receives all specialist agents as tools.
It decides which to call, can chain calls based on intermediate results,
and produces a cross-enriched intelligence briefing.
"""
import asyncio
import os
from pathlib import Path

from strands import Agent
from strands.models.bedrock import BedrockModel
from strands.session.file_session_manager import FileSessionManager

from agents.agent_tools import (
    maritime_analyst,
    aviation_analyst,
    doomsday_analyst,
    conflict_analyst,
    solar_system_analyst,
)
from tools.geo_tools import geocode_location, get_weather

# Re-export agent factories for backward compatibility (server.py, tests)
from agents.maritime_agent import create_maritime_agent  # noqa: F401
from agents.aviation_agent import create_aviation_agent  # noqa: F401
from agents.doomsday_agent import create_doomsday_agent  # noqa: F401
from agents.solar_system_agent import create_solar_system_agent  # noqa: F401
from agents.conflict_agent import create_conflict_agent  # noqa: F401

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


def _load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.md").read_text().strip()


SESSIONS_DIR = Path(__file__).resolve().parent.parent / "sessions"


def _get_orchestrator_agent(session_id: str) -> Agent:
    """Create the orchestrator agent with all specialist tools and session persistence."""
    model = BedrockModel(
        model_id=os.getenv("ORCHESTRATOR_MODEL_ID", "mistral.mistral-large-3-675b-instruct"),
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
        streaming=True,
    )
    session_manager = FileSessionManager(
        session_id=session_id,
        storage_dir=str(SESSIONS_DIR),
    )
    return Agent(
        model=model,
        tools=[
            maritime_analyst,
            aviation_analyst,
            doomsday_analyst,
            conflict_analyst,
            solar_system_analyst,
            geocode_location,
            get_weather,
        ],
        system_prompt=_load_prompt("orchestrator_agent"),
        session_manager=session_manager,
        callback_handler=None,
    )


async def stream_orchestrator(user_query: str, session_id: str):
    """
    Main entry point — async generator that yields text chunks as they arrive.
    """
    orchestrator = _get_orchestrator_agent(session_id)
    async for event in orchestrator.stream_async(user_query):
        if "data" in event:
            yield event["data"]


def _format_briefing(query: str, results: dict[str, str]) -> str:
    """Format a briefing from individual agent results (legacy compatibility)."""
    labels = {
        "maritime": "MARITIME",
        "aviation": "AVIATION",
        "doomsday": "DOOMSDAY — NATURAL HAZARDS",
        "conflict": "CONFLICT — GEOPOLITICS & NEWS",
        "solar_system": "SOLAR SYSTEM",
    }

    lines = []
    lines.append("=" * 60)
    lines.append("BRIEFING OSINT")
    lines.append("=" * 60)

    for name, content in results.items():
        lines.append(f"\n{'─' * 60}")
        lines.append(labels.get(name, name.upper()))
        lines.append(f"{'─' * 60}")
        lines.append(content)

    lines.append(f"\n{'=' * 60}")
    return "\n".join(lines)
