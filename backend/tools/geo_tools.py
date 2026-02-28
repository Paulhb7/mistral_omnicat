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
    0: "Ciel dégagé", 1: "Plutôt dégagé", 2: "Partiellement nuageux", 3: "Couvert",
    45: "Brouillard", 48: "Brouillard givrant",
    51: "Bruine légère", 53: "Bruine", 55: "Bruine forte",
    61: "Pluie légère", 63: "Pluie", 65: "Pluie forte",
    71: "Neige légère", 73: "Neige", 75: "Neige forte",
    80: "Averses", 81: "Averses modérées", 82: "Averses violentes",
    95: "Orage", 96: "Orage avec grêle", 99: "Orage violent avec grêle",
}


async def _geocode_location(location: str) -> dict:
    """Logique brute de geocodage, appelable directement depuis l'orchestrateur."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": location, "format": "json", "limit": 1, "addressdetails": 1},
            headers={"User-Agent": "WWH-Intelligence/1.0"},
            timeout=10,
        )
        data = r.json()

    if not data:
        return {"error": f"Lieu '{location}' introuvable."}

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
    """Logique brute de meteo, appelable directement depuis l'orchestrateur."""
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
        "condition": _WMO_CODES.get(current.get("weather_code", -1), "Inconnu"),
        "wind_kmh": current.get("wind_speed_10m"),
        "humidity_pct": current.get("relative_humidity_2m"),
    }


@tool
async def geocode_location(location: str) -> dict:
    """Convertit un nom de lieu (ville, pays, region, port, aeroport) en coordonnees latitude/longitude.

    Args:
        location: Nom du lieu a geocoder (ex: "Marseille", "Strait of Gibraltar", "Aeroport CDG").

    Returns:
        Coordonnees et informations du lieu (lat, lng, pays, codes ISO).
    """
    return await _geocode_location(location)


@tool
async def get_weather(lat: float, lng: float) -> dict:
    """Recupere les conditions meteo actuelles pour une position geographique.

    Args:
        lat: Latitude du lieu (ex: 43.296).
        lng: Longitude du lieu (ex: 5.369).

    Returns:
        Conditions meteo actuelles (temperature, vent, humidite, description).
    """
    return await _get_weather(lat, lng)
