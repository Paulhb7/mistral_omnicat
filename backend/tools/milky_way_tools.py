"""
Exoplanet intelligence tools.
Sources: NASA Exoplanet Archive (TAP API) · arXiv (scientific papers).
"""
import httpx
import xml.etree.ElementTree as ET
from strands import tool

NASA_EXOPLANET_API = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"
ARXIV_API = "https://export.arxiv.org/api/query"


@tool
async def get_exoplanet_data(planet_name: str) -> dict:
    """Retrieve official NASA data for a specific exoplanet by name — orbital period, radius, mass, host star properties.

    Args:
        planet_name: Name of the exoplanet (e.g. 'Kepler-442 b', 'TRAPPIST-1 e', 'Proxima Cen b').

    Returns:
        Exoplanet properties from the NASA Exoplanet Archive.
    """
    query = (
        "select pl_name, ra, dec, discoverymethod, disc_year, "
        "pl_orbper, pl_rade, pl_masse, st_teff, st_rad, st_mass, "
        "pl_eqt, pl_insol, pl_dens, rowupdate "
        "from ps "
        f"where pl_name like '%{planet_name}%' "
        "order by pl_name asc"
    )
    async with httpx.AsyncClient() as client:
        r = await client.get(
            NASA_EXOPLANET_API,
            params={"query": query, "format": "json"},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()

    if not data:
        return {"error": f"Exoplanet '{planet_name}' not found in NASA archive."}
    return data[-1]


@tool
async def search_exoplanets(query: str) -> list:
    """Search the NASA Exoplanet Archive for planets matching a query (e.g. 'TRAPPIST', 'Kepler-442').

    Args:
        query: Search term — system name, star name, or planet name fragment.

    Returns:
        List of matching exoplanets with key properties (up to 10 results).
    """
    search_query = (
        "select pl_name, discoverymethod, disc_year, pl_orbper, pl_rade "
        "from ps "
        f"where pl_name like '%{query}%' "
        "order by pl_name asc "
        "top 10"
    )
    async with httpx.AsyncClient() as client:
        r = await client.get(
            NASA_EXOPLANET_API,
            params={"query": search_query, "format": "json"},
            timeout=15,
        )
        r.raise_for_status()
        return r.json()


@tool
async def search_arxiv_papers(query: str, max_results: int = 5) -> list:
    """Search arXiv for recent scientific research papers about exoplanets.

    Args:
        query: Search term (e.g. 'TRAPPIST-1 habitability', 'exoplanet atmosphere').
        max_results: Maximum number of papers to return (default: 5).

    Returns:
        List of papers with title, authors, date, summary, and URL.
    """
    async with httpx.AsyncClient() as client:
        r = await client.get(
            ARXIV_API,
            params={
                "search_query": f"all:{query}",
                "start": 0,
                "max_results": min(max_results, 10),
                "sortBy": "relevance",
            },
            timeout=15,
        )
        r.raise_for_status()
        root = ET.fromstring(r.text)

    ns = "{http://www.w3.org/2005/Atom}"
    papers = []
    for entry in root.findall(f"{ns}entry"):
        title_el = entry.find(f"{ns}title")
        published_el = entry.find(f"{ns}published")
        summary_el = entry.find(f"{ns}summary")
        url_el = entry.find(f"{ns}id")
        authors = [
            a.find(f"{ns}name").text
            for a in entry.findall(f"{ns}author")
            if a.find(f"{ns}name") is not None
        ]
        papers.append({
            "title": title_el.text.strip() if title_el is not None else "No title",
            "authors": ", ".join(authors),
            "published": published_el.text if published_el is not None else "Unknown",
            "summary": summary_el.text.strip()[:500] if summary_el is not None else "",
            "url": url_el.text if url_el is not None else "#",
        })

    return papers
