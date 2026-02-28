from strands import Agent
from strands.models.bedrock import BedrockModel
from tools.maritime_tools import search_vessels_in_area, get_vessel_details, check_vessel_risk
import os

def create_maritime_agent() -> Agent:
    model = BedrockModel(
        model_id="mistral.ministral-3-14b-instruct",
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
        streaming=False,
    )

    return Agent(
        model=model,
        tools=[search_vessels_in_area, get_vessel_details, check_vessel_risk],
        system_prompt="""
        Tu es un assistant OSINT maritime. Tes tâches :
        1. Rechercher les bateaux dans une zone géographique donnée.
        2. Fournir des détails sur un navire spécifique (IMO, nom, type, pavillon).
        3. Analyser les risques (sanctions, comportements suspects).
        4. Résumer les informations de manière claire et sourcée.

        Exemple de requête :
        - "Quels bateaux sont près de Marseille (lat:43.3, lon:5.4, rayon 20km) ?"
        - "Analyse le navire avec l'IMO 1234567."
        """,
    )