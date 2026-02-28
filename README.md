# OmniCAT — Multi-Agent OSINT Intelligence

OSINT (Open Source Intelligence) analysis system for maritime, aerial, geopolitical and space weather surveillance.

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                       ORCHESTRATOR                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐ │
│  │ Maritime │ │ Aviation │ │ Doomsday │ │ Conflict │ │Solar│ │
│  │ Agent    │ │ Agent    │ │ Agent    │ │ Agent    │ │Agent│ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └─────┘ │
│       │            │            │            │           │     │
└───────┼────────────┼────────────┼────────────┼───────────┼─────┘
        │            │            │            │           │
┌───────▼────────────▼────────────▼────────────▼───────────▼─────┐
│                        TOOLS LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Geo Tools   │  │ Aviation    │  │ Maritime    │            │
│  │ (Nominatim) │  │ (OpenSky)   │  │ (AISStream) │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Weather     │  │ Doomsday    │  │ Conflict    │            │
│  │ (Open-Meteo)│  │ (NASA/USGS) │  │ (ACLED/GDELT│            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│  ┌─────────────┐                                               │
│  │ Solar       │                                               │
│  │ (NASA DONKI)│                                               │
│  └─────────────┘                                               │
└────────────────────────────────────────────────────────────────┘
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

## Installation

### Prerequisites
- Python 3.10+
- AWS account with Bedrock access
- AISStream API key (free via GitHub)

### Steps

1. Clone the repository:
```bash
git clone https://github.com/Paulhb7/mistral_wwh_aristocats.git
cd mistral_wwh_aristocats/backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure the environment:
```bash
cp ../.env.example .env
# Edit .env with your API keys
```

4. Start the backend:
```bash
python server.py
```

5. Start the frontend:
```bash
cd ../frontend
npm install && npm run dev
```

## Usage

Open `http://localhost:3000` in your browser and enter a location or query.

### Example Queries
- `Analyze the Marseille area`
- `What vessels are near the Strait of Gibraltar?`
- `What aircraft are flying over Paris?`
- `What are the risks around Kyiv?`
- `Solar system briefing`

## Configuration

### Environment Variables

| Variable                  | Description              | Example                 |
|---------------------------|--------------------------|-------------------------|
| `AWS_BEARER_TOKEN_BEDROCK`| AWS Bedrock API key      | `api_key`               |
| `AWS_DEFAULT_REGION`      | AWS region               | `us-east-2`             |
| `AISSTREAM_API_KEY`       | AISStream API key        | `your_aisstream_key`    |
| `ORCHESTRATOR_MODEL_ID`   | LLM model for routing    | `mistral.mistral-small-2402-v1:0` |
| `AGENT_MODEL_ID`          | LLM model for agents     | `mistral.ministral-3-14b-instruct` |
| `ACLED_API_KEY`           | ACLED API key (optional) | `your_acled_key`        |
| `ACLED_EMAIL`             | ACLED email (optional)   | `your@email.com`        |

### .env file
```
AWS_BEARER_TOKEN_BEDROCK=api_key
AWS_DEFAULT_REGION=us-east-2
AISSTREAM_API_KEY=your_aisstream_key
```

## Dependencies

- `strands-agents` : Main agent framework
- `boto3` : AWS client for Bedrock
- `websockets` : WebSocket connection for AIS
- `httpx` : Async HTTP requests
- `python-dotenv` : Environment variable management
- `fastapi` : Backend API server
- `next` : Frontend framework

## Technical Architecture

### Agents

1. **Orchestrator** (`agents/orchestrator.py`)
   - Main entry point
   - LLM-based query routing
   - Parallel agent execution
   - Briefing assembly

2. **Aviation Agent** (`agents/aviation_agent.py`)
   - Aircraft search
   - Aerial risk analysis

3. **Maritime Agent** (`agents/maritime_agent.py`)
   - AIS surveillance
   - Vessel tracking

4. **Doomsday Agent** (`agents/doomsday_agent.py`)
   - Natural hazard assessment
   - Climate events & earthquakes

5. **Conflict Agent** (`agents/conflict_agent.py`)
   - Armed conflicts & political violence
   - News monitoring

6. **Solar System Agent** (`agents/solar_system_agent.py`)
   - Solar flares & space weather
   - Near-Earth object tracking

### Tools

- **Geo Tools** : Geocoding and weather
- **Aviation Tools** : OpenSky Network, ADS-B Exchange
- **Maritime Tools** : AISStream, SQLite database
- **Doomsday Tools** : NASA EONET, USGS
- **Conflict Tools** : ACLED, GDELT
- **Solar Tools** : NASA DONKI, NASA NeoWs

## Database

The system uses a SQLite database (`maritime_data.db`) to store:
- Historical vessel positions
- Monitored areas
- Vessel metadata

## External APIs

| Service          | Usage                       | URL                          |
|------------------|-----------------------------|------------------------------|
| OpenStreetMap    | Geocoding                   | nominatim.openstreetmap.org  |
| Open-Meteo       | Weather conditions          | api.open-meteo.com           |
| OpenSky Network  | Aviation data               | opensky-network.org          |
| ADS-B Exchange   | Aviation data (fallback)    | adsbexchange.com             |
| AISStream        | Real-time AIS data          | aisstream.io                 |
| NASA EONET       | Climate events              | eonet.sci.gsfc.nasa.gov      |
| USGS             | Seismic data                | earthquake.usgs.gov          |
| ACLED            | Conflict data (optional)    | acleddata.com                |
| GDELT            | News monitoring             | gdeltproject.org             |
| NASA DONKI       | Solar flares                | api.nasa.gov/DONKI           |
| NASA NeoWs       | Near-Earth objects          | api.nasa.gov/neo             |

## AI Model

- **Model** : Mistral (Small / Ministral)
- **Provider** : AWS Bedrock
- **Region** : us-east-2 (recommended)

## Example Output

```
============================================================
BRIEFING OSINT
============================================================

📍 Area: Marseille, France
   Coordinates: 43.2965, 5.3698

🌤️  Weather: Clear sky | 18°C | Wind 12 km/h | Humidity 65%

────────────────────────────────────────────────────────────
🚢 MARITIME
────────────────────────────────────────────────────────────
3 vessels detected in area:
- CMA CGM MARSEILLE (MMSI: 228123456) - Under way at 12 knots
- COSTA PACIFICA (MMSI: 247123456) - At anchor
- LE BORÉAL (MMSI: 226123456) - Under way at 8 knots

────────────────────────────────────────────────────────────
✈️  AVIATION
────────────────────────────────────────────────────────────
2 aircraft detected:
- AFR1234 (ICAO: 39A123) - Airbus A320, Altitude: 10000m
- EJY5678 (ICAO: 401ABC) - Embraer E190, Altitude: 8000m

────────────────────────────────────────────────────────────
💀 DOOMSDAY — RISKS & THREATS
────────────────────────────────────────────────────────────
- NATURAL HAZARDS: No active events
- SECURITY RISKS: No conflicts reported
- THREAT LEVEL: NONE
- ANALYST NOTE: Secure area, normal traffic

============================================================
```

## Development

### File Structure
```
backend/
├── agents/          # Specialized agents
├── tools/           # Tools and API integrations
├── prompts/         # Agent prompts
├── server.py        # FastAPI server
└── requirements.txt # Dependencies

frontend/
├── src/app/         # Next.js pages
├── src/hooks/       # React hooks
└── package.json     # Frontend dependencies
```

### Adding a New Agent

1. Create a file in `agents/`
2. Define the required tools in `tools/`
3. Add a prompt in `prompts/`
4. Integrate into the orchestrator

### Tests

Tests can be run with:
```bash
# Unit tests (to be implemented)
python -m pytest tests/

# Import verification
python -c "from agents.orchestrator import run_orchestrator; print('OK')"
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
