"""
Doomsday tools — Natural hazards: climate events and earthquakes.
APIs: NASA EONET · USGS
"""
from datetime import datetime, timedelta, timezone

import httpx
from strands import tool


@tool
async def get_climate_events(lat: float, lng: float, radius_km: int = 800) -> dict:
    """Retrieve active climate events (wildfires, storms, floods, volcanoes) near a position via NASA EONET.

    Args:
        lat: Latitude of the search center.
        lng: Longitude of the search center.
        radius_km: Search radius in km (default: 800).

    Returns:
        Active climate events with category, location and date.
    """
    deg = radius_km / 111.0
    bbox = f"{lng - deg},{lat - deg},{lng + deg},{lat + deg}"

    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://eonet.gsfc.nasa.gov/api/v3/events",
            params={"status": "open", "bbox": bbox, "limit": 60},
            timeout=15,
        )
        data = r.json()

    events = data.get("events", [])
    simplified = []
    for e in events[:20]:
        geom = e["geometry"][-1] if e.get("geometry") else {}
        coords = geom.get("coordinates") or []
        if geom.get("type") == "Point" and len(coords) == 2:
            ev_lng, ev_lat = float(coords[0]), float(coords[1])
        elif geom.get("type") == "Polygon" and coords:
            ring = coords[0]
            ev_lng = sum(p[0] for p in ring) / len(ring)
            ev_lat = sum(p[1] for p in ring) / len(ring)
        else:
            ev_lng, ev_lat = None, None
        simplified.append({
            "id": e["id"],
            "title": e["title"],
            "category": e["categories"][0]["title"] if e.get("categories") else "Unknown",
            "date": geom.get("date", "")[:10] if geom.get("date") else None,
            "lat": ev_lat,
            "lng": ev_lng,
        })

    by_category: dict = {}
    for ev in simplified:
        by_category.setdefault(ev["category"], []).append(ev["title"])

    return {"total": len(events), "events": simplified, "by_category": by_category}


@tool
async def get_earthquakes(lat: float, lng: float, radius_km: int = 800, min_magnitude: float = 2.0) -> dict:
    """Retrieve recent earthquakes (last 30 days) near a position via USGS.

    Args:
        lat: Latitude of the search center.
        lng: Longitude of the search center.
        radius_km: Search radius in km (default: 800).
        min_magnitude: Minimum magnitude (default: 2.0).

    Returns:
        List of earthquakes with magnitude, location, depth and date.
    """
    start = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%S")

    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://earthquake.usgs.gov/fdsnws/event/1/query",
                params={
                    "format": "geojson",
                    "latitude": lat,
                    "longitude": lng,
                    "maxradiuskm": radius_km,
                    "minmagnitude": min_magnitude,
                    "starttime": start,
                    "orderby": "magnitude",
                    "limit": 15,
                },
                timeout=30,
            )
            data = r.json()
    except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.TimeoutException):
        return {"total": 0, "earthquakes": [], "max_magnitude": 0, "error": "USGS API timeout"}

    features = data.get("features", [])
    quakes = [
        {
            "magnitude": f["properties"]["mag"],
            "place": f["properties"]["place"],
            "depth_km": round(f["geometry"]["coordinates"][2], 1),
            "lat": f["geometry"]["coordinates"][1],
            "lng": f["geometry"]["coordinates"][0],
            "date": datetime.fromtimestamp(
                f["properties"]["time"] / 1000, tz=timezone.utc
            ).strftime("%Y-%m-%d"),
        }
        for f in features[:15]
    ]
    max_mag = max((q["magnitude"] or 0 for q in quakes), default=0)

    return {"total": len(features), "earthquakes": quakes, "max_magnitude": max_mag}
