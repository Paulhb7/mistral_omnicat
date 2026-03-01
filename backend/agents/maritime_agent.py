import os
from pathlib import Path

from strands import Agent
from strands.models.bedrock import BedrockModel

from tools.maritime_tools import (
    search_vessel,
    track_vessel_position,
    get_vessel_history,
    monitor_area,
    list_monitored_vessels,
)
from tools.geo_tools import geocode_location

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


def _load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.md").read_text().strip()


def create_maritime_agent() -> Agent:
    model = BedrockModel(
        model_id=os.getenv("AGENT_MODEL_ID", "mistral.ministral-3-14b-instruct"),
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
        streaming=False,
    )

    return Agent(
        model=model,
        tools=[
            geocode_location,
            search_vessel,
            track_vessel_position,
            get_vessel_history,
            monitor_area,
            list_monitored_vessels,
        ],
        system_prompt=_load_prompt("maritime_agent"),
    )
