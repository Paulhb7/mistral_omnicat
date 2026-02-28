import asyncio
from dotenv import load_dotenv
from agents.orchestrator import run_orchestrator

load_dotenv()


async def main():
    print("Orchestrateur OSINT prêt ! (tape 'quit' pour quitter)\n")
    print("Exemple : 'Analyse la zone de Marseille'\n")
    while True:
        user_input = input(">>> ")
        if user_input.strip().lower() in ("quit", "exit", "q"):
            break
        result = await run_orchestrator(user_input)
        print(f"\n{result}\n")


if __name__ == "__main__":
    asyncio.run(main())
