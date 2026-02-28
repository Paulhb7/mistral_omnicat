from strands import Agent
from strands.models.bedrock import BedrockModel
from tools.aviation_tools import search_aircraft_in_area, get_aircraft_details, check_aircraft_risk
from tools.geo_tools import geocode_location, get_weather
import os

def create_aviation_agent() -> Agent:
    model = BedrockModel(
        model_id=os.getenv("AGENT_MODEL_ID", "mistral.ministral-3-14b-instruct"),
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
        streaming=False,
    )

    return Agent(
        model=model,
        tools=[geocode_location, get_weather, search_aircraft_in_area, get_aircraft_details, check_aircraft_risk],
        system_prompt="""
        You are an aerial OSINT assistant. Your tasks:
        1. Search for aircraft in a given geographic area.
        2. Provide details on a specific aircraft (ICAO, flight number, type, airline).
        3. Analyze risks (sanctions, suspicious behavior).
        4. Summarize information clearly with sources.

        Example queries:
        - "What aircraft are near Paris (lat:48.8, lon:2.3, radius 50km)?"
        - "Analyze the aircraft with ICAO ABC123."
        """,
    )
