import os
from pathlib import Path

from strands import Agent
from strands.models.bedrock import BedrockModel

from tools.milky_way_tools import get_exoplanet_data, search_exoplanets, search_arxiv_papers

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


def _load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.md").read_text().strip()


def create_milky_way_agent() -> Agent:
    model = BedrockModel(
        model_id=os.getenv("AGENT_MODEL_ID", "mistral.ministral-3-14b-instruct"),
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
        streaming=False,
    )

    return Agent(
        model=model,
        tools=[get_exoplanet_data, search_exoplanets, search_arxiv_papers],
        system_prompt=_load_prompt("milky_way_agent"),
    )
