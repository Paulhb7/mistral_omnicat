# OmniCAT — Multi-Agent OSINT Intelligence

OSINT (Open Source Intelligence) analysis system for maritime, aerial, geopolitical and space weather surveillance, powered by Mistral AI agents.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS FRONTEND                            │
│          (Leaflet Map / Briefing Panel / SSE Client)            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ SSE /stream
┌──────────────────────────▼──────────────────────────────────────┐
│                     FASTAPI SERVER                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                       ORCHESTRATOR                               │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌───────┐ ┌───────┐│
│  │Maritime│ │Aviation│ │Doomsday│ │Conflict│ │ Solar │ │Milky  ││
│  │ Agent  │ │ Agent  │ │ Agent  │ │ Agent  │ │ Agent │ │  Way  ││
│  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬───┘ └───┬───┘│
└──────┼──────────┼──────────┼──────────┼──────────┼─────────┼────┘
       │          │          │          │          │         │
┌──────▼──────────▼──────────▼──────────▼──────────▼─────────▼────┐
│                        TOOLS LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Geo Tools   │  │ Aviation    │  │ Maritime    │              │
│  │ (Nominatim) │  │ (OpenSky)   │  │ (AISStream) │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Weather     │  │ Doomsday    │  │ Conflict    │              │
│  │ (Open-Meteo)│  │ (NASA/USGS) │  │ (ACLED/GDELT│              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐                                │
│  │ Solar       │  │ Milky Way   │                                │
│  │ (NASA DONKI)│  │(NASA/arXiv) │                                │
│  └─────────────┘  └─────────────┘                                │
└──────────────────────────────────────────────────────────────────┘
```

## Features

### 1. Maritime Surveillance
- Real-time AIS tracking via WebSocket
- Local SQLite database for position history
- Search by name/MMSI
- Geographic area monitoring

### 2. Aerial Surveillance
- Aircraft search in a geographic area
- Aircraft details (ICAO, flight number, type)
- Risk analysis (sanctions)

### 3. Natural Hazard Assessment
- Climate events (NASA EONET)
- Recent earthquakes (USGS)
- Threat level assessment

### 4. Conflict & Geopolitical Intelligence
- Armed conflicts and political violence (ACLED)
- Crisis and disaster news monitoring (GDELT)

### 5. Solar System Intelligence
- Solar flares (NASA DONKI)
- Near-Earth objects / asteroids (NASA NeoWs)
- Space weather briefings

### 6. Milky Way — Exoplanet Research
- Exoplanet data from NASA Exoplanet Archive
- Scientific papers from arXiv
- Habitability assessments

## Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- AWS account with Bedrock access
- AISStream API key (free via [aisstream.io](https://aisstream.io))

### Steps

1. Clone the repository:
```bash
git clone https://github.com/Paulhb7/mistral_wwh_aristocats.git
cd mistral_wwh_aristocats
```

2. Configure the environment:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Install and start the backend:
```bash
cd backend
pip install -r requirements.txt
python server.py  # http://localhost:8000
```

4. Install and start the frontend (in a separate terminal):
```bash
cd frontend
npm install
npm run dev  # http://localhost:3000
```

## Usage

Open `http://localhost:3000` in your browser and enter a location or query.

### Example Queries
- `Analyze the Marseille area`
- `What vessels are near the Strait of Gibraltar?`
- `What aircraft are flying over Paris?`
- `What are the risks around Kyiv?`
- `Solar system briefing`
- `Tell me about TRAPPIST-1 e`

## Configuration

### Environment Variables

| Variable                  | Description              | Default                                    |
|---------------------------|--------------------------|--------------------------------------------|
| `AWS_BEARER_TOKEN_BEDROCK`| AWS Bedrock API key      | *(required)*                               |
| `AWS_DEFAULT_REGION`      | AWS region               | `us-east-2`                                |
| `AISSTREAM_API_KEY`       | AISStream API key        | *(required)*                               |
| `ORCHESTRATOR_MODEL_ID`   | LLM model for routing    | `mistral.mistral-large-3-675b-instruct`    |
| `AGENT_MODEL_ID`          | LLM model for agents     | `mistral.ministral-3-14b-instruct`         |
| `ACLED_API_KEY`           | ACLED API key (optional) |                                            |
| `ACLED_EMAIL`             | ACLED email (optional)   |                                            |

## Tech Stack

### Backend
- **strands-agents** — Agent framework
- **FastAPI** + **uvicorn** — API server
- **boto3** — AWS Bedrock client (Mistral models)
- **httpx** — Async HTTP client
- **websockets** — AISStream WebSocket
- **SQLite** — Maritime vessel history

### Frontend
- **Next.js 15** + **React 19** — UI framework
- **TypeScript** — Language
- **Leaflet** — Interactive maps
- **Tailwind CSS 4** — Styling
- **react-markdown** — Briefing rendering

## Technical Architecture

### Agents

| Agent | File | Role |
|-------|------|------|
| Orchestrator | `agents/orchestrator.py` | Query routing, briefing assembly |
| Maritime | `agents/maritime_agent.py` | AIS surveillance, vessel tracking |
| Aviation | `agents/aviation_agent.py` | Aircraft search, aerial risk analysis |
| Doomsday | `agents/doomsday_agent.py` | Natural hazards, climate events, earthquakes |
| Conflict | `agents/conflict_agent.py` | Armed conflicts, news monitoring |
| Solar System | `agents/solar_system_agent.py` | Solar flares, space weather, NEOs |
| Milky Way | `agents/milky_way_agent.py` | Exoplanet research, NASA data, arXiv papers |

Specialist agents are wrapped as `@tool` decorators in `agents/agent_tools.py`, allowing the orchestrator to invoke them as callable tools.

### Streaming

The `/stream` endpoint uses Server-Sent Events (SSE). The orchestrator yields typed events (`content`, `tool_start`, `tool_end`, `agent_selected`, `location`, `data_*`) that the frontend consumes in real time.

### Tools

| Tool Module | APIs | Purpose |
|-------------|------|---------|
| `tools/geo_tools.py` | Nominatim, Open-Meteo | Geocoding, weather |
| `tools/aviation_tools.py` | OpenSky Network, ADS-B Exchange | Aviation data |
| `tools/maritime_tools.py` | AISStream, SQLite | Vessel tracking |
| `tools/doomsday_tools.py` | NASA EONET, USGS | Climate events, earthquakes |
| `tools/conflict_tools.py` | ACLED, GDELT | Conflicts, news |
| `tools/solar_tools.py` | NASA DONKI, NASA NeoWs | Solar activity, asteroids |
| `tools/milky_way_tools.py` | NASA Exoplanet Archive, arXiv | Exoplanet data, scientific papers |

## Development

### File Structure
```
backend/
├── agents/          # Specialist agents + orchestrator
├── tools/           # API integrations + data bus
├── prompts/         # System prompts for each agent
├── tests/           # pytest unit & integration tests
├── sessions/        # Persistent session storage
├── server.py        # FastAPI server
└── requirements.txt

frontend/
├── src/app/         # Next.js App Router pages
├── src/components/  # React components (map, briefing panel, etc.)
├── src/hooks/       # Custom hooks (SSE streaming)
└── package.json
```

### Adding a New Agent

1. Create `agents/<name>_agent.py` with a strands `Agent`
2. Define tools in `tools/<name>_tools.py`
3. Write a system prompt in `prompts/<name>_agent.md`
4. Wrap the agent as a `@tool` in `agents/agent_tools.py`
5. Register it in the orchestrator's tool list

### Tests

```bash
cd backend
python -m pytest tests/
```

## AI Model

- **Model** : Mistral Large (orchestrator) / Ministral (specialist agents)
- **Provider** : AWS Bedrock
- **Region** : us-east-2 (recommended)

## Example Output

```
============================================================
BRIEFING OSINT
============================================================

Area: Marseille, France
   Coordinates: 43.2965, 5.3698

Weather: Clear sky | 18C | Wind 12 km/h | Humidity 65%

------------------------------------------------------------
MARITIME
------------------------------------------------------------
3 vessels detected in area:
- CMA CGM MARSEILLE (MMSI: 228123456) - Under way at 12 knots
- COSTA PACIFICA (MMSI: 247123456) - At anchor
- LE BOREAL (MMSI: 226123456) - Under way at 8 knots

------------------------------------------------------------
AVIATION
------------------------------------------------------------
2 aircraft detected:
- AFR1234 (ICAO: 39A123) - Airbus A320, Altitude: 10000m
- EJY5678 (ICAO: 401ABC) - Embraer E190, Altitude: 8000m

------------------------------------------------------------
DOOMSDAY — RISKS & THREATS
------------------------------------------------------------
- NATURAL HAZARDS: No active events
- SECURITY RISKS: No conflicts reported
- THREAT LEVEL: NONE
- ANALYST NOTE: Secure area, normal traffic

============================================================
```

## License

MIT

## Author

Paulhb7

## Acknowledgments

- Mistral AI for the language model
- Open OSINT data providers
- The open-source community

---

*This project is under active development. Contributions are welcome!*
