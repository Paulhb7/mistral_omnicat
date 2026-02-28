"""
Orchestrateur — Route les requêtes vers les agents spécialistes.

Fonctionnement :
1. L'utilisateur pose une question (ex: "Analyse la zone de Marseille")
2. L'orchestrateur utilise geocode_location pour résoudre le lieu
3. Il lance les agents spécialistes en parallèle sur la zone
4. Il synthétise les résultats en un briefing unifié
"""
import asyncio
import os

from strands import Agent
from strands.models.bedrock import BedrockModel

from tools.geo_tools import geocode_location, get_weather
from agents.maritime_agent import create_maritime_agent
from agents.aviation_agent import create_aviation_agent
from agents.doomsday_agent import create_doomsday_agent


async def _run_agent(agent: Agent, query: str) -> str:
    """Lance un agent dans un thread séparé pour ne pas bloquer le event loop."""
    try:
        result = await asyncio.to_thread(agent, query)
        return str(result)
    except Exception as e:
        return f"[Erreur] {e}"


async def run_orchestrator(user_query: str) -> str:
    """
    Point d'entrée principal de l'orchestrateur.

    1. Géocode le lieu mentionné dans la requête
    2. Récupère la météo en parallèle
    3. Lance les agents maritime et aviation en parallèle sur la zone
    4. Synthétise tous les résultats
    """
    # Étape 1 : Géocoder le lieu
    geo = await geocode_location.tool_func(location=user_query)
    if "error" in geo:
        # Essayer d'extraire un nom de lieu de la requête
        # Fallback : passer la requête telle quelle aux agents
        print(f"[Orchestrateur] Géocodage échoué, dispatch direct aux agents")
        maritime_agent = create_maritime_agent()
        aviation_agent = create_aviation_agent()
        doomsday_agent = create_doomsday_agent()

        maritime_result, aviation_result, doomsday_result = await asyncio.gather(
            _run_agent(maritime_agent, user_query),
            _run_agent(aviation_agent, user_query),
            _run_agent(doomsday_agent, user_query),
        )

        return _format_briefing(
            query=user_query,
            geo=None,
            weather=None,
            maritime=maritime_result,
            aviation=aviation_result,
            doomsday=doomsday_result,
        )

    lat, lng = geo["lat"], geo["lng"]
    location_name = geo["location"]

    # Étape 2 : Météo + agents spécialistes en parallèle
    # Construire les requêtes spécialisées avec les coordonnées
    bbox_offset = 0.2  # ~20km autour du point
    maritime_query = (
        f"Surveille la zone autour de {location_name} "
        f"(bbox [{lat - bbox_offset}, {lng - bbox_offset}] à [{lat + bbox_offset}, {lng + bbox_offset}]). "
        f"Liste les navires présents."
    )
    aviation_query = (
        f"Recherche les avions dans la zone de {location_name} "
        f"(lat_min={lat - bbox_offset}, lat_max={lat + bbox_offset}, "
        f"lon_min={lng - bbox_offset}, lon_max={lng + bbox_offset})."
    )

    doomsday_query = (
        f"Analyse les risques naturels et securitaires autour de {location_name} "
        f"(lat={lat}, lng={lng}, pays={geo.get('country', '')})."
    )

    maritime_agent = create_maritime_agent()
    aviation_agent = create_aviation_agent()
    doomsday_agent = create_doomsday_agent()

    weather_result, maritime_result, aviation_result, doomsday_result = await asyncio.gather(
        get_weather.tool_func(lat=lat, lng=lng),
        _run_agent(maritime_agent, maritime_query),
        _run_agent(aviation_agent, aviation_query),
        _run_agent(doomsday_agent, doomsday_query),
    )

    return _format_briefing(
        query=user_query,
        geo=geo,
        weather=weather_result,
        maritime=maritime_result,
        aviation=aviation_result,
        doomsday=doomsday_result,
    )


def _format_briefing(query, geo, weather, maritime, aviation, doomsday=None) -> str:
    """Formate le briefing final."""
    lines = []
    lines.append("=" * 60)
    lines.append("BRIEFING OSINT")
    lines.append("=" * 60)

    if geo:
        lines.append(f"\n📍 Zone : {geo['location']}, {geo.get('country', '')}")
        lines.append(f"   Coordonnées : {geo['lat']:.4f}, {geo['lng']:.4f}")

    if weather:
        lines.append(f"\n🌤️  Météo : {weather.get('condition', '?')} | "
                      f"{weather.get('temperature_c', '?')}°C | "
                      f"Vent {weather.get('wind_kmh', '?')} km/h | "
                      f"Humidité {weather.get('humidity_pct', '?')}%")

    lines.append(f"\n{'─' * 60}")
    lines.append("🚢 MARITIME")
    lines.append(f"{'─' * 60}")
    lines.append(maritime)

    lines.append(f"\n{'─' * 60}")
    lines.append("✈️  AVIATION")
    lines.append(f"{'─' * 60}")
    lines.append(aviation)

    if doomsday:
        lines.append(f"\n{'─' * 60}")
        lines.append("💀 DOOMSDAY — RISQUES & MENACES")
        lines.append(f"{'─' * 60}")
        lines.append(doomsday)

    lines.append(f"\n{'=' * 60}")
    return "\n".join(lines)
