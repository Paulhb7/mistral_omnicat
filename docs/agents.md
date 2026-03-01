# Agents

OmniCAT uses a multi-agent architecture where a single orchestrator routes queries to six specialist agents. Each agent is a full strands `Agent` with its own system prompt, LLM model, and tool set.

## Orchestrator

**File**: `backend/agents/orchestrator.py`
**Model**: `mistral-large-3-675b-instruct` (AWS Bedrock)

The orchestrator is the entry point for all user queries. It:

1. **Analyzes** the query to determine which intelligence domains are relevant
2. **Routes** to one or more specialist agents by calling them as tools
3. **Assembles** the final briefing from all specialist outputs
4. **Streams** the response via SSE with typed events

The orchestrator uses the `agent-as-tool` pattern: specialist agents are exposed as `@tool` decorated functions in `agent_tools.py`. This means the orchestrator uses standard LLM tool-calling to decide which agents to invoke — no hardcoded routing rules.

For a query like "Analyze the Marseille area", the orchestrator will typically call:
- Maritime Agent (vessel traffic)
- Aviation Agent (aircraft in the area)
- Doomsday Agent (natural hazards, weather)
- Conflict Agent (geopolitical situation)

## Specialist Agents

All specialist agents use `ministral-3-14b-instruct` (AWS Bedrock) — a smaller, faster model sufficient for focused domain tasks.

### Maritime Agent

**File**: `backend/agents/maritime_agent.py`
**Tools**: `backend/tools/maritime_tools.py`
**Data Sources**: AISStream (WebSocket), local SQLite database

Capabilities:
- Real-time vessel tracking via AIS (Automatic Identification System)
- Search by vessel name, MMSI (Maritime Mobile Service Identity), or geographic bounding box
- Local SQLite database stores historical vessel positions for trend analysis
- AISStream WebSocket connection for real-time position updates

The maritime tools maintain a persistent SQLite database (`vessels.db`) that accumulates vessel position data over time, enabling historical queries.

### Aviation Agent

**File**: `backend/agents/aviation_agent.py`
**Tools**: `backend/tools/aviation_tools.py`
**Data Sources**: OpenSky Network, ADS-B Exchange

Capabilities:
- Aircraft search in geographic areas (bounding box queries)
- Aircraft details: ICAO code, flight number, aircraft type, altitude, speed, heading
- Fallback from OpenSky to ADS-B Exchange if primary source is unavailable
- Risk analysis: sanctions screening, anomaly detection

### Doomsday Agent

**File**: `backend/agents/doomsday_agent.py`
**Tools**: `backend/tools/doomsday_tools.py`
**Data Sources**: NASA EONET, USGS Earthquake API

Capabilities:
- Active climate events from NASA Earth Observatory Natural Event Tracker (wildfires, storms, volcanic activity, sea/lake ice)
- Recent earthquakes from USGS with magnitude, depth, location
- Threat level assessment based on proximity and severity
- Weather data integration via Open-Meteo

### Conflict Agent

**File**: `backend/agents/conflict_agent.py`
**Tools**: `backend/tools/conflict_tools.py`
**Data Sources**: ACLED, GDELT

Capabilities:
- Armed conflicts and political violence events from ACLED (Armed Conflict Location & Event Data)
- Global news and crisis monitoring from GDELT (Global Database of Events, Language, and Tone)
- Filtering by country, date range, event type
- Trend analysis and hotspot identification

### Solar System Agent

**File**: `backend/agents/solar_system_agent.py`
**Tools**: `backend/tools/solar_tools.py`
**Data Sources**: NASA DONKI, NASA NeoWs

Capabilities:
- Solar flares and coronal mass ejections from NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information)
- Near-Earth objects and asteroid close approaches from NASA NeoWs (Near Earth Object Web Service)
- Space weather briefings with risk assessment
- Auto-navigation: queries mentioning 50+ celestial bodies (planets, moons, spacecraft) trigger automatic navigation in the NASA Eyes on the Solar System embedded viewer

Recognized celestial bodies include:
- **Planets**: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Sun
- **Major Moons**: Moon, Titan, Europa, Ganymede, Callisto, Io, Enceladus, Triton, Phobos, Deimos, Charon
- **Spacecraft**: JWST, Juno, Voyager 1, Voyager 2, New Horizons, Parker Solar Probe, Europa Clipper, Cassini, Lucy, OSIRIS-REx, ISS, Hubble

### Milky Way Agent

**File**: `backend/agents/milky_way_agent.py`
**Tools**: `backend/tools/milky_way_tools.py`
**Data Sources**: NASA Exoplanet Archive (TAP API), arXiv

Capabilities:
- Exoplanet data from the NASA Exoplanet Archive using TAP (Table Access Protocol) SQL queries
- Scientific papers from arXiv related to specific exoplanets or topics
- Habitability assessments based on stellar parameters, orbital distance, and planet mass
- Interactive 3D exploration via NASA Eyes on Exoplanets (TRAPPIST-1, Proxima Centauri, Kepler systems)

## Agent-as-Tool Pattern

The key architectural pattern is in `backend/agents/agent_tools.py`. Each specialist agent is instantiated as a strands `Agent` and then wrapped with a `@tool` decorator:

```python
@tool
def maritime_intelligence(query: str) -> str:
    """Run the maritime surveillance agent..."""
    result = maritime_agent(query)
    return result
```

This allows the orchestrator to invoke agents using standard LLM tool-calling. The orchestrator sees these as tools with descriptions and decides which to call based on the query content.

Benefits:
- Zero routing logic to maintain — the LLM decides
- Multiple agents can run per query
- New agents are added by registering a new tool
- The orchestrator's system prompt guides routing decisions
