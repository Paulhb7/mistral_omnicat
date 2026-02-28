from strands import tool
import requests
from typing import List, Dict, Optional

@tool
def search_vessels_in_area(
    lat_min: float,
    lat_max: float,
    lon_min: float,
    lon_max: float,
    api_key: Optional[str] = None
) -> List[Dict]:
    """Recherche les bateaux dans une zone géographique via AIS Hub ou MarineTraffic.

    Args:
        lat_min: Latitude minimale de la zone (ex: 43.0 pour Marseille).
        lat_max: Latitude maximale.
        lon_min: Longitude minimale.
        lon_max: Longitude maximale.
        api_key: Clé API pour MarineTraffic (optionnel, utilise AIS Hub si absent).

    Returns:
        Liste de navires avec leurs infos (IMO, nom, position, cap, vitesse).
    """
    if api_key:
        # Utiliser MarineTraffic (plus précis mais nécessite une clé)
        url = "https://services.marinetraffic.com/api/exportvessels/v:5"
        params = {
            "latmin": lat_min,
            "latmax": lat_max,
            "lonmin": lon_min,
            "lonmax": lon_max,
            "protocol": "json",
            "o": api_key
        }
    else:
        # Utiliser AIS Hub (gratuit mais données brutes)
        url = "https://data.aishub.net/ws.php"
        params = {
            "latmin": lat_min,
            "latmax": lat_max,
            "lonmin": lon_min,
            "lonmax": lon_max,
            "user": "guest"  # Compte invité limité
        }

    response = requests.get(url, params=params)
    data = response.json()

    if api_key:
        # Parser le format MarineTraffic
        vessels = []
        for vessel in data.get("vessels", []):
            vessels.append({
                "imo": vessel.get("IMO"),
                "name": vessel.get("SHIPNAME"),
                "lat": vessel.get("LAT"),
                "lon": vessel.get("LON"),
                "speed": vessel.get("SPEED"),
                "course": vessel.get("COURSE"),
                "flag": vessel.get("FLAG"),
                "type": vessel.get("SHIPTYPE")
            })
        return vessels
    else:
        # Parser le format AIS Hub
        return data.get("positions", [])

@tool
def get_vessel_details(imo: int, api_key: Optional[str] = None) -> Dict:
    """Récupère les détails d'un navire via son IMO.

    Args:
        imo: Numéro IMO du navire (ex: 9876543).
        api_key: Clé MarineTraffic (optionnel, utilise des données statiques si absent).

    Returns:
        Détails du navire (tonnage, propriétaire, historique, etc.).
    """
    if api_key:
        # MarineTraffic
        url = f"https://services.marinetraffic.com/api/exportvessel/v:5/{imo}/protocol:json/o:{api_key}"
        response = requests.get(url).json()
        return response.get("vessel", {})
    else:
        # Données statiques (ex: OurAirports ou base locale)
        return {"error": "API key required for detailed data"}

@tool
def check_vessel_risk(imo: int) -> Dict:
    """Vérifie si un navire est associé à des risques (sanctions, dark activity).

    Args:
        imo: Numéro IMO du navire.

    Returns:
        Score de risque et alertes (ex: sanctions OFAC, gaps AIS).
    """
    # Exemple : Vérifier contre une liste de sanctions (à étendre)
    sanctioned_vessels = [9876543, 1234567]  # Liste fictive
    risk_score = 0
    alerts = []

    if imo in sanctioned_vessels:
        risk_score = 100
        alerts.append("Navire sous sanctions internationales (OFAC).")

    # Vérifier les gaps AIS (simplifié)
    # En réalité, utiliser un historique via MarineTraffic ou une base locale
    gaps = detect_ais_gaps(imo)  # Fonction à implémenter (voir plus bas)
    if gaps:
        risk_score += 30
        alerts.append(f"Gaps AIS détectés : {len(gaps)} périodes sans signal.")

    return {
        "imo": imo,
        "risk_score": min(risk_score, 100),  # Score de 0 à 100
        "alerts": alerts
    }

def detect_ais_gaps(imo: int) -> List[Dict]:
    """Détecte les périodes sans signal AIS (simplifié)."""
    # En production, utiliser un historique via MarineTraffic ou une base locale
    return []  # À implémenter avec des données réelles