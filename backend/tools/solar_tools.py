"""
Outils d'intelligence du systeme solaire.
Sources : NASA DONKI (eruptions solaires) · NASA NeoWs (asteroides proches).
"""
import httpx
from datetime import datetime, timedelta
from strands import tool


@tool
async def get_solar_flares(days: int = 7) -> dict:
    """Recupere les eruptions solaires recentes depuis NASA DONKI — classe (A/B/C/M/X), timing, pic, region source.

    Args:
        days: Nombre de jours a remonter (defaut: 7, max: 30).

    Returns:
        Nombre total d'eruptions et details des plus recentes.
    """
    start = (datetime.utcnow() - timedelta(days=min(days, 30))).strftime("%Y-%m-%d")
    today = datetime.utcnow().strftime("%Y-%m-%d")

    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.nasa.gov/DONKI/FLR",
            params={"startDate": start, "endDate": today, "api_key": "DEMO_KEY"},
            timeout=15,
        )
        data = r.json()

    if not isinstance(data, list):
        return {"total": 0, "flares": [], "message": "Aucune eruption solaire detectee."}

    flares = [
        {
            "class": f.get("classType", "?"),
            "debut": (f.get("beginTime") or "")[:16].replace("T", " "),
            "pic": (f.get("peakTime") or "")[:16].replace("T", " "),
            "region_source": f.get("sourceLocation", "Region solaire inconnue"),
        }
        for f in data[:8]
    ]
    return {"total": len(data), "flares": flares}


@tool
async def get_near_earth_objects(days: int = 7) -> dict:
    """Recupere les asteroides et cometes proches de la Terre depuis NASA NeoWs — date d'approche, distance, vitesse, danger.

    Args:
        days: Nombre de jours a scanner (defaut: 7, max: 7).

    Returns:
        Nombre total d'objets et details des plus proches.
    """
    today = datetime.utcnow().strftime("%Y-%m-%d")
    end = (datetime.utcnow() + timedelta(days=min(days, 7))).strftime("%Y-%m-%d")

    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.nasa.gov/neo/rest/v1/feed",
            params={"start_date": today, "end_date": end, "api_key": "DEMO_KEY"},
            timeout=15,
        )
        data = r.json()

    all_neos = sorted(
        [neo for day in data.get("near_earth_objects", {}).values() for neo in day],
        key=lambda n: float(
            (n.get("close_approach_data") or [{}])[0]
            .get("miss_distance", {})
            .get("lunar", "9999") or "9999"
        ),
    )

    neos = []
    for neo in all_neos[:8]:
        approach = (neo.get("close_approach_data") or [{}])[0]
        neos.append({
            "nom": neo.get("name", "?").replace("(", "").replace(")", "").strip(),
            "date_approche": approach.get("close_approach_date", ""),
            "distance_lunaire": round(
                float(approach.get("miss_distance", {}).get("lunar", 0) or 0), 1
            ),
            "vitesse_kmh": round(
                float(approach.get("relative_velocity", {}).get("kilometers_per_hour", 0) or 0)
            ),
            "potentiellement_dangereux": neo.get("is_potentially_hazardous_asteroid", False),
        })

    return {"total": len(all_neos), "objets": neos}
