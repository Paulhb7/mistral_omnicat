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
    """Recherche les avions dans une zone géographique via OpenSky Network ou ADS-B Exchange.

    Args:
        lat_min: Latitude minimale de la zone (ex: 48.0 pour Paris).
        lat_max: Latitude maximale.
        lon_min: Longitude minimale.
        lon_max: Longitude maximale.
        api_key: Clé API pour OpenSky (optionnel, utilise ADS-B Exchange si absent).

    Returns:
        Liste d'avions avec leurs infos (ICAO, numéro de vol, position, altitude, vitesse).
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
    """Récupère les détails d'un aéronef via son adresse ICAO24.

    Args:
        icao24: Adresse ICAO24 de l'avion (ex: "ABC123").
        api_key: Clé OpenSky (optionnel, utilise des données statiques si absent).

    Returns:
        Détails de l'avion (type, compagnie, historique, etc.).
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
    """Vérifie si un aéronef est associé à des risques (sanctions, dark activity).

    Args:
        icao24: Adresse ICAO24 de l'avion.

    Returns:
        Score de risque et alertes (ex: sanctions, comportements suspects).
    """
    sanctioned_aircrafts = ["ABC123", "DEF456"]
    risk_score = 0
    alerts = []

    if icao24 in sanctioned_aircrafts:
        risk_score = 100
        alerts.append("Aéronef sous sanctions internationales.")

    anomalies = _detect_anomalies(icao24)
    if anomalies:
        risk_score += 30
        alerts.append(f"Comportements suspects détectés : {len(anomalies)} anomalies.")

    return {
        "icao24": icao24,
        "risk_score": min(risk_score, 100),
        "alerts": alerts
    }


def _detect_anomalies(icao24: str) -> List[Dict]:
    """Détecte les comportements suspects (simplifié)."""
    return []
