"""
Orchestrator — Routes queries to specialist agents.

A lightweight LLM router decides which agent(s) to call,
then the specialists handle everything (geocoding, weather, etc.) via their own tools.
"""
import asyncio
import os
import re

from strands import Agent
from strands.models.bedrock import BedrockModel

from agents.maritime_agent import create_maritime_agent
from agents.aviation_agent import create_aviation_agent
from agents.doomsday_agent import create_doomsday_agent
from agents.solar_system_agent import create_solar_system_agent
from agents.conflict_agent import create_conflict_agent


_ROUTING_PROMPT = """You are a query router for an OSINT intelligence system.

Based on the user's message, respond with ONE OR MORE words from:
- maritime   → boats, ships, ports, maritime traffic, MMSI, AIS
- aviation   → aircraft, flights, airports, air traffic, ICAO
- doomsday   → natural hazards, earthquakes, climate, weather, volcanoes, floods, wildfires
- conflict   → armed conflicts, wars, news, geopolitics, protests, current events
- solar_system → sun, solar flares, asteroids, solar system, space, space weather, NEO

Rules:
- Respond ONLY with words separated by spaces. No explanation.
- If the query spans multiple domains or is generic (e.g. "analyze the Marseille area"), respond: maritime aviation doomsday conflict
- If unsure, respond: maritime aviation doomsday conflict"""


def _get_router_agent() -> Agent:
    model = BedrockModel(
        model_id=os.getenv("ORCHESTRATOR_MODEL_ID", "mistral.mistral-small-2402-v1:0"),
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
        streaming=False,
    )
    return Agent(
        model=model,
        system_prompt=_ROUTING_PROMPT,
        callback_handler=None,
    )


def _parse_routing(text: str) -> list[str]:
    """Extract agent names from the router's response."""
    valid = {"maritime", "aviation", "doomsday", "conflict", "solar_system"}
    found = [w for w in re.findall(r"\b(maritime|aviation|doomsday|conflict|solar_system)\b", text.lower())]
    return list(dict.fromkeys(found)) if found else list(valid)


_SPECIALISTS = {
    "maritime": create_maritime_agent,
    "aviation": create_aviation_agent,
    "doomsday": create_doomsday_agent,
    "solar_system": create_solar_system_agent,
    "conflict": create_conflict_agent,
}


async def _run_agent(agent: Agent, query: str) -> str:
    """Run an agent in a separate thread to avoid blocking the event loop."""
    try:
        result = await asyncio.to_thread(agent, query)
        return str(result)
    except Exception as e:
        return f"[Error] {e}"


async def run_orchestrator(user_query: str) -> str:
    """
    Main entry point.

    1. The LLM router decides which agent(s) to call
    2. Specialists are launched in parallel
    3. Results are assembled into a briefing
    """
    # Step 1: Routing
    router = _get_router_agent()
    routing_result = await asyncio.to_thread(router, user_query)
    agents_to_call = _parse_routing(str(routing_result))

    print(f"[Orchestrator] Selected agents: {', '.join(agents_to_call)}")

    # Step 2: Launch specialists in parallel
    tasks = {}
    for name in agents_to_call:
        factory = _SPECIALISTS[name]
        agent = factory()
        tasks[name] = _run_agent(agent, user_query)

    results = await asyncio.gather(*tasks.values())
    agent_results = dict(zip(tasks.keys(), results))

    # Step 3: Format the briefing
    return _format_briefing(user_query, agent_results)


def _format_briefing(query: str, results: dict[str, str]) -> str:
    """Format the final briefing."""
    labels = {
        "maritime": "🚢 MARITIME",
        "aviation": "✈️  AVIATION",
        "doomsday": "💀 DOOMSDAY — NATURAL HAZARDS",
        "conflict": "⚔️  CONFLICT — GEOPOLITICS & NEWS",
        "solar_system": "☀️  SOLAR SYSTEM",
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
