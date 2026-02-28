"""
Solar system intelligence tools.
Sources: NASA DONKI (solar flares) · NASA NeoWs (near-Earth objects).
"""
import httpx
from datetime import datetime, timedelta
from strands import tool


@tool
async def get_solar_flares(days: int = 7) -> dict:
    """Retrieve recent solar flares from NASA DONKI — class (A/B/C/M/X), timing, peak, source region.

    Args:
        days: Number of days to look back (default: 7, max: 30).

    Returns:
        Total number of flares and details of the most recent ones.
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
        return {"total": 0, "flares": [], "message": "No solar flares detected."}

    flares = [
        {
            "class": f.get("classType", "?"),
            "start": (f.get("beginTime") or "")[:16].replace("T", " "),
            "peak": (f.get("peakTime") or "")[:16].replace("T", " "),
            "source_region": f.get("sourceLocation", "Unknown solar region"),
        }
        for f in data[:8]
    ]
    return {"total": len(data), "flares": flares}


@tool
async def get_near_earth_objects(days: int = 7) -> dict:
    """Retrieve near-Earth asteroids and comets from NASA NeoWs — approach date, distance, speed, hazard.

    Args:
        days: Number of days to scan (default: 7, max: 7).

    Returns:
        Total number of objects and details of the closest ones.
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
            "name": neo.get("name", "?").replace("(", "").replace(")", "").strip(),
            "approach_date": approach.get("close_approach_date", ""),
            "lunar_distance": round(
                float(approach.get("miss_distance", {}).get("lunar", 0) or 0), 1
            ),
            "speed_kmh": round(
                float(approach.get("relative_velocity", {}).get("kilometers_per_hour", 0) or 0)
            ),
            "potentially_hazardous": neo.get("is_potentially_hazardous_asteroid", False),
        })

    return {"total": len(all_neos), "objects": neos}
