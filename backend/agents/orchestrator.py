"""
Orchestrateur — Route les requêtes vers les agents spécialistes.

Pattern old_v2 : un LLM routeur léger décide quel(s) agent(s) appeler,
puis les spécialistes gèrent tout (geocodage, météo, etc.) via leurs propres tools.
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


_ROUTING_PROMPT = """Tu es un routeur de requêtes pour un système d'intelligence OSINT.

En fonction du message de l'utilisateur, réponds avec UN OU PLUSIEURS mots parmi :
- maritime   → bateaux, navires, ports, trafic maritime, MMSI, AIS
- aviation   → avions, vols, aéroports, trafic aérien, ICAO
- doomsday   → risques, menaces, séismes, climat, conflits, sécurité
- solar_system → soleil, éruptions solaires, astéroïdes, système solaire, espace, météo spatiale, NEO

Règles :
- Réponds UNIQUEMENT avec les mots séparés par des espaces. Pas d'explication.
- Si la requête concerne plusieurs domaines ou est générique (ex: "analyse la zone de Marseille"), réponds : maritime aviation doomsday
- Si tu ne sais pas, réponds : maritime aviation doomsday"""


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
    """Extrait les noms d'agents depuis la réponse du routeur."""
    valid = {"maritime", "aviation", "doomsday", "solar_system"}
    found = [w for w in re.findall(r"\b(maritime|aviation|doomsday|solar_system)\b", text.lower())]
    return list(dict.fromkeys(found)) if found else list(valid)


_SPECIALISTS = {
    "maritime": create_maritime_agent,
    "aviation": create_aviation_agent,
    "doomsday": create_doomsday_agent,
    "solar_system": create_solar_system_agent,
}


async def _run_agent(agent: Agent, query: str) -> str:
    """Lance un agent dans un thread séparé pour ne pas bloquer le event loop."""
    try:
        result = await asyncio.to_thread(agent, query)
        return str(result)
    except Exception as e:
        return f"[Erreur] {e}"


async def run_orchestrator(user_query: str) -> str:
    """
    Point d'entrée principal.

    1. Le routeur LLM décide quel(s) agent(s) appeler
    2. Les spécialistes sont lancés en parallèle
    3. Les résultats sont assemblés en briefing
    """
    # Étape 1 : Routing
    router = _get_router_agent()
    routing_result = await asyncio.to_thread(router, user_query)
    agents_to_call = _parse_routing(str(routing_result))

    print(f"[Orchestrateur] Agents sélectionnés : {', '.join(agents_to_call)}")

    # Étape 2 : Lancer les spécialistes en parallèle
    tasks = {}
    for name in agents_to_call:
        factory = _SPECIALISTS[name]
        agent = factory()
        tasks[name] = _run_agent(agent, user_query)

    results = await asyncio.gather(*tasks.values())
    agent_results = dict(zip(tasks.keys(), results))

    # Étape 3 : Formater le briefing
    return _format_briefing(user_query, agent_results)


def _format_briefing(query: str, results: dict[str, str]) -> str:
    """Formate le briefing final."""
    labels = {
        "maritime": "🚢 MARITIME",
        "aviation": "✈️  AVIATION",
        "doomsday": "💀 DOOMSDAY — RISQUES & MENACES",
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
