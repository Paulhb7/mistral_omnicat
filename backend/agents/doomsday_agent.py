import os
from pathlib import Path

from strands import Agent
from strands.models.bedrock import BedrockModel

from tools.geo_tools import geocode_location, get_weather
from tools.doomsday_tools import get_climate_events, get_earthquakes, get_conflict_events, get_news

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


def _load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.md").read_text().strip()


def create_doomsday_agent() -> Agent:
    model = BedrockModel(
        model_id=os.getenv("AGENT_MODEL_ID", "mistral.ministral-3-14b-instruct"),
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
        streaming=False,
    )

    return Agent(
        model=model,
        tools=[
            geocode_location,
            get_weather,
            get_climate_events,
            get_earthquakes,
            get_conflict_events,
            get_news,
        ],
        system_prompt=_load_prompt("doomsday_agent"),
    )
