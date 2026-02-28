from dotenv import load_dotenv

from agents.math_agent import create_math_agent

load_dotenv()

agent = create_math_agent()

if __name__ == "__main__":
    print("Agent mathématique prêt ! (tape 'quit' pour quitter)\n")
    while True:
        user_input = input(">>> ")
        if user_input.strip().lower() in ("quit", "exit", "q"):
            break
        response = agent(user_input)
        print(f"\n{response}\n")
