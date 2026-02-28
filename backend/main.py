from dotenv import load_dotenv

from agents.math_agent import create_math_agent
from agents.maritime_agent import create_maritime_agent

load_dotenv()

# Choix de l'agent (par défaut : maritime)
agent = create_maritime_agent()

if __name__ == "__main__":
    print("Agent maritime prêt ! (tape 'quit' pour quitter)\n")
    print("Exemple de requête : 'Quels bateaux sont près de Marseille ?'\n")
    while True:
        user_input = input(">>> ")
        if user_input.strip().lower() in ("quit", "exit", "q"):
            break
        response = agent(user_input)
        print(f"\n{response}\n")
