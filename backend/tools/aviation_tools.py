import httpx
from strands import tool
from typing import List, Dict, Optional


@tool
async def search_aircraft_in_area(
    lat_min: float,
    lat_max: float,
    lon_min: float,
    lon_max: float,
    api_key: Optional[str] = None
) -> List[Dict]:
    """Search for aircraft in a geographic area via OpenSky Network or ADS-B Exchange.

    Args:
        lat_min: Minimum latitude of the area (e.g. 48.0 for Paris).
        lat_max: Maximum latitude.
        lon_min: Minimum longitude.
        lon_max: Maximum longitude.
        api_key: OpenSky API key (optional, uses ADS-B Exchange if absent).

    Returns:
        List of aircraft with their info (ICAO, flight number, position, altitude, speed).
    """
    if api_key:
        url = "https://opensky-network.org/api/states/all"
        params = {
            "lamin": lat_min,
            "lamax": lat_max,
            "lomin": lon_min,
            "lomax": lon_max
        }
        headers = {"Authorization": f"Basic {api_key}"}
    else:
        url = "https://adsbexchange.com/api/aircraft/json"
        params = {
            "lat": (lat_min + lat_max) / 2,
            "lon": (lon_min + lon_max) / 2,
            "radius": max((lat_max - lat_min) * 50, (lon_max - lon_min) * 50)
        }
        headers = None

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers=headers, timeout=15)
        data = response.json()

    if api_key:
        aircrafts = []
        for state in data.get("states", []):
            aircrafts.append({
                "icao24": state[0],
                "callsign": state[1],
                "lat": state[6],
                "lon": state[5],
                "altitude": state[7],
                "speed": state[9],
                "track": state[10],
                "type": "N/A"
            })
        return aircrafts
    else:
        return data.get("aircraft", [])


@tool
async def get_aircraft_details(icao24: str, api_key: Optional[str] = None) -> Dict:
    """Retrieve aircraft details via its ICAO24 address.

    Args:
        icao24: ICAO24 address of the aircraft (e.g. "ABC123").
        api_key: OpenSky key (optional, uses static data if absent).

    Returns:
        Aircraft details (type, airline, history, etc.).
    """
    if api_key:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://opensky-network.org/api/aircraft/{icao24}",
                headers={"Authorization": f"Basic {api_key}"},
                timeout=15,
            )
            data = response.json()
        return data.get("aircraft", [])
    else:
        return {"error": "API key required for detailed data"}


@tool
async def check_aircraft_risk(icao24: str) -> Dict:
    """Check if an aircraft is associated with risks (sanctions, dark activity).

    Args:
        icao24: ICAO24 address of the aircraft.

    Returns:
        Risk score and alerts (e.g. sanctions, suspicious behavior).
    """
    sanctioned_aircrafts = ["ABC123", "DEF456"]
    risk_score = 0
    alerts = []

    if icao24 in sanctioned_aircrafts:
        risk_score = 100
        alerts.append("Aircraft under international sanctions.")

    anomalies = _detect_anomalies(icao24)
    if anomalies:
        risk_score += 30
        alerts.append(f"Suspicious behavior detected: {len(anomalies)} anomalies.")

    return {
        "icao24": icao24,
        "risk_score": min(risk_score, 100),
        "alerts": alerts
    }


def _detect_anomalies(icao24: str) -> List[Dict]:
    """Detect suspicious behavior (simplified)."""
    return []
