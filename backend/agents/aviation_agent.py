from strands import Agent
from strands.models.bedrock import BedrockModel
from tools.aviation_tools import search_aircraft_in_area, get_aircraft_details, check_aircraft_risk
from tools.geo_tools import geocode_location, get_weather
import os

def create_aviation_agent() -> Agent:
    model = BedrockModel(
        model_id="mistral.ministral-3-14b-instruct",
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
        streaming=False,
    )

    return Agent(
        model=model,
        tools=[geocode_location, get_weather, search_aircraft_in_area, get_aircraft_details, check_aircraft_risk],
        system_prompt="""
        Tu es un assistant OSINT aérien. Tes tâches :
        1. Rechercher les avions dans une zone géographique donnée.
        2. Fournir des détails sur un aéronef spécifique (ICAO, numéro de vol, type, compagnie).
        3. Analyser les risques (sanctions, comportements suspects).
        4. Résumer les informations de manière claire et sourcée.

        Exemple de requête :
        - "Quels avions sont près de Paris (lat:48.8, lon:2.3, rayon 50km) ?"
        - "Analyse l'avion avec l'ICAO ABC123."
        """,
    )
