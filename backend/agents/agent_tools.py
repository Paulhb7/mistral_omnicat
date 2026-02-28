"""
Agent-as-Tools — Each specialist agent wrapped as a @tool for the orchestrator.

The orchestrator LLM uses these tool descriptions to decide which specialist(s)
to invoke and can chain calls based on intermediate results.
"""
from strands import tool

from agents.maritime_agent import create_maritime_agent
from agents.aviation_agent import create_aviation_agent
from agents.doomsday_agent import create_doomsday_agent
from agents.conflict_agent import create_conflict_agent
from agents.solar_system_agent import create_solar_system_agent
from agents.milky_way_agent import create_milky_way_agent


@tool
def maritime_analyst(query: str) -> str:
    """Analyze maritime traffic and vessel activity using real-time AIS data.

    Use this tool for anything related to: ships, vessels, boats, ports, maritime traffic,
    MMSI tracking, naval activity, sea routes, AIS data, vessel surveillance, maritime zones.

    Args:
        query: The maritime intelligence question to analyze.

    Returns:
        Maritime intelligence report with vessel data, positions, and activity analysis.
    """
    agent = create_maritime_agent()
    result = agent(query)
    return str(result)


@tool
def aviation_analyst(query: str) -> str:
    """Analyze aerial activity and aircraft tracking data.

    Use this tool for anything related to: aircraft, flights, airports, air traffic,
    ICAO codes, aviation risks, no-fly zones, aerial surveillance, flight paths, sanctions checks.

    Args:
        query: The aviation intelligence question to analyze.

    Returns:
        Aviation intelligence report with aircraft data, positions, and risk analysis.
    """
    agent = create_aviation_agent()
    result = agent(query)
    return str(result)


@tool
def doomsday_analyst(query: str) -> str:
    """Assess natural hazards and environmental threats for a geographic area.

    Use this tool for anything related to: earthquakes, climate events, wildfires, storms,
    floods, volcanoes, natural disasters, environmental risks, weather hazards, seismic activity.

    Args:
        query: The natural hazard question to analyze (include location if possible).

    Returns:
        Natural hazard report with threat level assessment and event details.
    """
    agent = create_doomsday_agent()
    result = agent(query)
    return str(result)


@tool
def conflict_analyst(query: str) -> str:
    """Analyze armed conflicts, political violence, and security news.

    Use this tool for anything related to: armed conflicts, wars, protests, political violence,
    geopolitics, security news, crises, terrorism, civil unrest, sanctions, military operations.

    Args:
        query: The geopolitical intelligence question to analyze (include country/region if possible).

    Returns:
        Conflict intelligence report with event data, casualty figures, and news sources.
    """
    agent = create_conflict_agent()
    result = agent(query)
    return str(result)


@tool
def solar_system_analyst(query: str) -> str:
    """Monitor space weather, solar flares, and near-Earth objects.

    Use this tool for anything related to: solar flares, sun activity, geomagnetic storms,
    asteroids, near-Earth objects, space weather, GPS/communication disruption risks, NEO tracking.

    Args:
        query: The space weather or near-Earth object question to analyze.

    Returns:
        Space weather report with solar activity and NEO tracking data.
    """
    agent = create_solar_system_agent()
    result = agent(query)
    return str(result)


@tool
def milky_way_analyst(query: str) -> str:
    """Research exoplanets using NASA Exoplanet Archive data and arXiv scientific papers.

    Use this tool for anything related to: exoplanets, extrasolar planets, habitable zones,
    planetary systems, Kepler, TRAPPIST, TESS discoveries, exoplanet atmospheres, biosignatures.

    Args:
        query: The exoplanet research question to analyze.

    Returns:
        Exoplanet research briefing with NASA data and latest scientific findings.
    """
    agent = create_milky_way_agent()
    result = agent(query)
    return str(result)
