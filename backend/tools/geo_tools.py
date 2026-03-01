import httpx
from strands import tool

from tools.data_bus import emit as _emit

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


@tool
async def geocode_location(location: str) -> dict:
    """Convert a place name (city, country, region, port, airport) to latitude/longitude coordinates.

    Args:
        location: Place name to geocode (e.g. "Marseille", "Strait of Gibraltar", "CDG Airport").

    Returns:
        Coordinates and location info (lat, lng, country, ISO codes).
    """
    result = await _geocode_location(location)
    if "lat" in result and "lng" in result:
        _emit({"type": "location", "name": result.get("location", "Unknown"), "lat": result["lat"], "lng": result["lng"]})
        _emit({"type": "data_geocode_location", "data": result})
    return result
