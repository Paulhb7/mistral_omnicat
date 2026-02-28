"""
Doomsday tools — Catastrophes climatiques, séismes, conflits armés et actualités.
APIs : NASA EONET · USGS · ACLED · GDELT
"""
import os
import urllib.parse
from datetime import datetime, timedelta, timezone

import httpx
from strands import tool


@tool
async def get_climate_events(lat: float, lng: float, radius_km: int = 800) -> dict:
    """Recupere les evenements climatiques actifs (feux, tempetes, inondations, volcans) pres d'une position via NASA EONET.

    Args:
        lat: Latitude du centre de recherche.
        lng: Longitude du centre de recherche.
        radius_km: Rayon de recherche en km (defaut: 800).

    Returns:
        Evenements climatiques actifs avec categorie, localisation et date.
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
    """Recupere les seismes recents (30 derniers jours) pres d'une position via USGS.

    Args:
        lat: Latitude du centre de recherche.
        lng: Longitude du centre de recherche.
        radius_km: Rayon de recherche en km (defaut: 800).
        min_magnitude: Magnitude minimale (defaut: 2.0).

    Returns:
        Liste des seismes avec magnitude, lieu, profondeur et date.
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


@tool
async def get_conflict_events(country: str, days: int = 30) -> dict:
    """Recupere les evenements de violence politique, conflits armes, manifestations et emeutes via ACLED.

    Args:
        country: Nom du pays en anglais (ex: "France", "Ukraine", "Syria").
        days: Nombre de jours a remonter (defaut: 30).

    Returns:
        Evenements de conflit avec type, localisation, acteurs et nombre de victimes.
    """
    acled_key = os.getenv("ACLED_API_KEY")
    acled_email = os.getenv("ACLED_EMAIL")
    if not acled_key or not acled_email:
        return {"available": False, "error": "ACLED_API_KEY et ACLED_EMAIL non configures."}

    start = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://api.acleddata.com/acled/read",
                params={
                    "_format": "json",
                    "country": country,
                    "event_date": start,
                    "event_date_where": ">",
                    "limit": 50,
                    "fields": "event_date|event_type|sub_event_type|fatalities|location|actor1|actor2|latitude|longitude",
                    "key": acled_key,
                    "email": acled_email,
                },
                timeout=20,
            )
            if r.status_code != 200:
                return {"available": False, "error": f"ACLED API erreur {r.status_code}"}
            data = r.json()
    except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.TimeoutException):
        return {"available": False, "error": "ACLED API timeout"}

    if data.get("message") == "Access denied":
        return {"available": False, "error": "ACLED acces refuse — verifier la cle API."}

    events = data.get("data", [])
    total_fatalities = sum(int(e.get("fatalities") or 0) for e in events)

    by_type: dict = {}
    for e in events:
        by_type[e["event_type"]] = by_type.get(e["event_type"], 0) + 1

    recent = [
        {
            "date": e.get("event_date", ""),
            "type": e.get("event_type", ""),
            "sub_type": e.get("sub_event_type", ""),
            "location": e.get("location", ""),
            "actor1": e.get("actor1", ""),
            "fatalities": int(e.get("fatalities") or 0),
            "lat": float(e["latitude"]) if e.get("latitude") else None,
            "lng": float(e["longitude"]) if e.get("longitude") else None,
        }
        for e in events[:10]
    ]

    return {
        "available": True,
        "country": country,
        "period_days": days,
        "total_events": len(events),
        "total_fatalities": total_fatalities,
        "by_type": by_type,
        "recent_events": recent,
    }


@tool
async def get_news(location_name: str) -> dict:
    """Recupere les actualites recentes liees aux catastrophes et crises pour un lieu via GDELT.

    Args:
        location_name: Nom du lieu (ville, pays, region) pour la recherche d'actualites.

    Returns:
        Articles recents avec titre, source, URL et date.
    """
    query = (
        f'"{location_name}" '
        f"(disaster OR wildfire OR flood OR earthquake OR storm OR hurricane "
        f"OR drought OR alert OR emergency OR conflict OR war OR attack)"
    )

    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://api.gdeltproject.org/api/v2/doc/doc",
                params={
                    "query": query,
                    "mode": "artlist",
                    "maxrecords": 8,
                    "format": "json",
                    "timespan": "1week",
                },
                timeout=30,
            )
            if r.status_code != 200:
                return {"total": 0, "articles": [], "error": f"GDELT API erreur {r.status_code}"}
            data = r.json()
    except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.TimeoutException):
        return {"total": 0, "articles": [], "error": "GDELT API timeout"}

    articles = data.get("articles", [])
    processed = []
    for a in articles:
        domain = urllib.parse.urlparse(a.get("url", "")).hostname or ""
        domain = domain.replace("www.", "")
        raw_date = a.get("seendate", "")
        date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:8]}" if len(raw_date) >= 8 else ""
        processed.append({
            "title": a.get("title", ""),
            "url": a.get("url", ""),
            "source": domain,
            "date": date,
        })

    return {"total": len(processed), "articles": processed}
