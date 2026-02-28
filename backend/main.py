import os

from dotenv import load_dotenv
from strands import Agent
from strands.models.bedrock import BedrockModel

from tools.calculator_tools import add_subtract, multiply

load_dotenv()

model = BedrockModel(
    model_id="mistral.ministral-3-14b-instruct",
    region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
    streaming=False,
)

agent = Agent(
    model=model,
    tools=[add_subtract, multiply],
    system_prompt="Tu es un assistant mathématique. Utilise les outils à ta disposition pour effectuer des calculs. Réponds toujours en français.",
)

if __name__ == "__main__":
    print("Agent mathématique prêt ! (tape 'quit' pour quitter)\n")
    while True:
        user_input = input(">>> ")
        if user_input.strip().lower() in ("quit", "exit", "q"):
            break
        response = agent(user_input)
        print(f"\n{response}\n")
