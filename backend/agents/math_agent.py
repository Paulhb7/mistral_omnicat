import os
from pathlib import Path

from strands import Agent
from strands.models.bedrock import BedrockModel

from tools.calculator_tools import add_subtract, multiply

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


def _load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.md").read_text().strip()


def create_math_agent() -> Agent:
    model = BedrockModel(
        model_id="mistral.ministral-3-14b-instruct",
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
        streaming=False,
    )

    return Agent(
        model=model,
        tools=[add_subtract, multiply],
        system_prompt=_load_prompt("math_agent"),
    )
