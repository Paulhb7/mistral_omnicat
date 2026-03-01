"""
Geopolitical intelligence tools — armed conflicts and news.
Sources: ACLED (conflicts, OAuth) · GDELT (news) · Perplexity (live search).
"""
import os
import urllib.parse
from datetime import datetime, timedelta, timezone

import httpx
from strands import tool

from tools.data_bus import emit as _emit


# ---------------------------------------------------------------------------
# ACLED helpers (OAuth Bearer token)
# ---------------------------------------------------------------------------

async def _acled_get_token() -> str | None:
    """Obtain an OAuth access token from ACLED using username/password."""
    username = os.getenv("ACLED_USERNAME")
    password = os.getenv("ACLED_PASSWORD")
    if not username or not password:
        return None

    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "https://acleddata.com/oauth/token",
                data={
                    "username": username,
                    "password": password,
                    "grant_type": "password",
                    "client_id": "acled",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=15,
            )
            if r.status_code == 200:
                return r.json().get("access_token")
    except Exception:
        pass
    return None


@tool
async def get_conflict_events(country: str, days: int = 30) -> dict:
    """Retrieve political violence events, armed conflicts, protests and riots via ACLED.

    Args:
        country: Country name in English (e.g. "France", "Ukraine", "Syria").
        days: Number of days to look back (default: 30).

    Returns:
        Conflict events with type, location, actors and casualty count.
    """
    token = await _acled_get_token()
    if not token:
        return {"available": False, "error": "ACLED credentials not configured (ACLED_USERNAME / ACLED_PASSWORD)."}

    start = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://acleddata.com/api/acled/read",
                params={
                    "_format": "json",
                    "country": country,
                    "event_date": start,
                    "event_date_where": ">",
                    "limit": 50,
                    "fields": "event_date|event_type|sub_event_type|fatalities|location|actor1|actor2|latitude|longitude",
                },
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                timeout=20,
            )
            if r.status_code != 200:
                return {"available": False, "error": f"ACLED API error {r.status_code}"}
            data = r.json()
    except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.TimeoutException):
        return {"available": False, "error": "ACLED API timeout"}

    if data.get("message") == "Access denied":
        return {"available": False, "error": "ACLED access denied — account may lack API permissions."}

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

    result = {
        "available": True,
        "country": country,
        "period_days": days,
        "total_events": len(events),
        "total_fatalities": total_fatalities,
        "by_type": by_type,
        "recent_events": recent,
    }
    _emit({"type": "data_get_conflict_events", "data": result})
    return result


@tool
async def get_news(location_name: str) -> dict:
    """Retrieve recent news related to crises, conflicts and disasters for a location via GDELT.

    Args:
        location_name: Location name (city, country, region) for the news search.

    Returns:
        Recent articles with title, source, URL and date.
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
                return {"total": 0, "articles": [], "error": f"GDELT API error {r.status_code}"}
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

    result = {"total": len(processed), "articles": processed}
    _emit({"type": "data_get_news", "data": result})
    return result


# ---------------------------------------------------------------------------
# Perplexity Sonar — live conflict intelligence search
# ---------------------------------------------------------------------------

@tool
async def search_conflict_intelligence(query: str) -> dict:
    """Search for live geopolitical intelligence, armed conflicts, security alerts and crisis news using Perplexity AI.

    Use this tool as a fallback when ACLED or GDELT are unavailable, or to get
    real-time context about a conflict zone, political crisis, or security event.

    Args:
        query: Search query about conflicts, crises or security (e.g. "Ukraine frontline situation", "Sudan civil war latest").

    Returns:
        AI-synthesised intelligence brief with sources.
    """
    api_key = os.getenv("PERPLEXITY_API_KEY")
    if not api_key:
        return {"available": False, "error": "PERPLEXITY_API_KEY not configured."}

    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "https://api.perplexity.ai/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "sonar",
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a geopolitical intelligence analyst. "
                                "Provide a concise, factual briefing on the query. "
                                "Include key events, actors, casualty figures, and dates. "
                                "Cite your sources. Keep it short and spoken-friendly."
                            ),
                        },
                        {"role": "user", "content": query},
                    ],
                    "max_tokens": 800,
                    "temperature": 0.1,
                },
                timeout=30,
            )
            if r.status_code != 200:
                return {"available": False, "error": f"Perplexity API error {r.status_code}"}
            data = r.json()
    except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.TimeoutException):
        return {"available": False, "error": "Perplexity API timeout"}

    content = ""
    if "choices" in data and data["choices"]:
        content = data["choices"][0]["message"]["content"]

    result = {"available": True, "query": query, "briefing": content}
    _emit({"type": "data_search_conflict_intelligence", "data": result})
    return result
