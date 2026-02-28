import httpx
from strands import tool

# ISO 3166-1 alpha-2 → alpha-3 mapping
_ISO2_TO_ISO3 = {
    "af": "AFG", "al": "ALB", "dz": "DZA", "ao": "AGO", "ar": "ARG", "am": "ARM",
    "au": "AUS", "at": "AUT", "az": "AZE", "bd": "BGD", "be": "BEL", "bj": "BEN",
    "bo": "BOL", "ba": "BIH", "br": "BRA", "bg": "BGR", "bf": "BFA", "bi": "BDI",
    "kh": "KHM", "cm": "CMR", "ca": "CAN", "cf": "CAF", "td": "TCD", "cl": "CHL",
    "cn": "CHN", "co": "COL", "cd": "COD", "cg": "COG", "cr": "CRI", "ci": "CIV",
    "hr": "HRV", "cu": "CUB", "cz": "CZE", "dk": "DNK", "dj": "DJI", "do": "DOM",
    "ec": "ECU", "eg": "EGY", "sv": "SLV", "er": "ERI", "et": "ETH", "fi": "FIN",
    "fr": "FRA", "ga": "GAB", "gm": "GMB", "ge": "GEO", "de": "DEU", "gh": "GHA",
    "gr": "GRC", "gt": "GTM", "gn": "GIN", "gw": "GNB", "gy": "GUY", "ht": "HTI",
    "hn": "HND", "hu": "HUN", "in": "IND", "id": "IDN", "ir": "IRN", "iq": "IRQ",
    "ie": "IRL", "il": "ISR", "it": "ITA", "jm": "JAM", "jp": "JPN", "jo": "JOR",
    "kz": "KAZ", "ke": "KEN", "kp": "PRK", "kr": "KOR", "kw": "KWT", "kg": "KGZ",
    "la": "LAO", "lb": "LBN", "lr": "LBR", "ly": "LBY", "mg": "MDG", "mw": "MWI",
    "my": "MYS", "ml": "MLI", "mr": "MRT", "mx": "MEX", "md": "MDA", "mn": "MNG",
    "me": "MNE", "ma": "MAR", "mz": "MOZ", "mm": "MMR", "na": "NAM", "np": "NPL",
    "nl": "NLD", "nz": "NZL", "ni": "NIC", "ne": "NER", "ng": "NGA", "mk": "MKD",
    "no": "NOR", "om": "OMN", "pk": "PAK", "pa": "PAN", "pg": "PNG", "py": "PRY",
    "pe": "PER", "ph": "PHL", "pl": "POL", "pt": "PRT", "qa": "QAT", "ro": "ROU",
    "ru": "RUS", "rw": "RWA", "sa": "SAU", "sn": "SEN", "rs": "SRB", "sl": "SLE",
    "so": "SOM", "za": "ZAF", "ss": "SSD", "es": "ESP", "lk": "LKA", "sd": "SDN",
    "sr": "SUR", "se": "SWE", "ch": "CHE", "sy": "SYR", "tw": "TWN", "tj": "TJK",
    "tz": "TZA", "th": "THA", "tl": "TLS", "tg": "TGO", "tt": "TTO", "tn": "TUN",
    "tr": "TUR", "tm": "TKM", "ug": "UGA", "ua": "UKR", "ae": "ARE", "gb": "GBR",
    "us": "USA", "uy": "URY", "uz": "UZB", "ve": "VEN", "vn": "VNM", "ye": "YEM",
    "zm": "ZMB", "zw": "ZWE",
}

_WMO_CODES = {
    0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Freezing fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow",
    80: "Showers", 81: "Moderate showers", 82: "Violent showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm with hail",
}


async def _geocode_location(location: str) -> dict:
    """Core geocoding logic, callable directly from the orchestrator."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": location, "format": "json", "limit": 1, "addressdetails": 1},
            headers={"User-Agent": "WWH-Intelligence/1.0"},
            timeout=10,
        )
        data = r.json()

    if not data:
        return {"error": f"Location '{location}' not found."}

    item = data[0]
    address = item.get("address", {})
    iso2 = address.get("country_code", "").lower()
    iso3 = _ISO2_TO_ISO3.get(iso2, "")

    return {
        "location": item["display_name"].split(",")[0].strip(),
        "lat": float(item["lat"]),
        "lng": float(item["lon"]),
        "country": address.get("country", ""),
        "country_iso2": iso2,
        "country_iso3": iso3,
    }


async def _get_weather(lat: float, lng: float) -> dict:
    """Core weather logic, callable directly from the orchestrator."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lng,
                "current": "temperature_2m,wind_speed_10m,weather_code,relative_humidity_2m",
                "wind_speed_unit": "kmh",
                "timezone": "auto",
            },
            timeout=10,
        )
        data = r.json()

    current = data.get("current", {})

    return {
        "temperature_c": current.get("temperature_2m"),
        "condition": _WMO_CODES.get(current.get("weather_code", -1), "Unknown"),
        "wind_kmh": current.get("wind_speed_10m"),
        "humidity_pct": current.get("relative_humidity_2m"),
    }


@tool
async def geocode_location(location: str) -> dict:
    """Convert a place name (city, country, region, port, airport) to latitude/longitude coordinates.

    Args:
        location: Place name to geocode (e.g. "Marseille", "Strait of Gibraltar", "CDG Airport").

    Returns:
        Coordinates and location info (lat, lng, country, ISO codes).
    """
    return await _geocode_location(location)


@tool
async def get_weather(lat: float, lng: float) -> dict:
    """Retrieve current weather conditions for a geographic position.

    Args:
        lat: Latitude of the location (e.g. 43.296).
        lng: Longitude of the location (e.g. 5.369).

    Returns:
        Current weather conditions (temperature, wind, humidity, description).
    """
    return await _get_weather(lat, lng)
