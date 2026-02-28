# AGENTS.md — OmniCAT

## Overview

OmniCAT is a multi-agent OSINT (Open Source Intelligence) platform for real-time geospatial intelligence. It combines maritime, aerial, natural hazard, geopolitical, and space weather data through AI-powered agent orchestration.

## Architecture

Monorepo with a Python/FastAPI backend and a Next.js/TypeScript frontend. Agents are built with the **strands** framework and powered by **Mistral models via AWS Bedrock**.

```
User Query → Orchestrator → [Specialist Agents] → Tools (APIs) → Streaming Briefing
```

## Codebase Structure

```
backend/
├── server.py              # FastAPI server, SSE /stream endpoint
├── agents/
│   ├── orchestrator.py    # Routes queries to specialist agents
│   ├── agent_tools.py     # Agents exposed as @tool decorators
│   ├── maritime_agent.py  # AIS vessel tracking
│   ├── aviation_agent.py  # Aircraft tracking
│   ├── doomsday_agent.py  # Natural hazard assessment
│   ├── conflict_agent.py  # Armed conflicts & geopolitics
│   └── solar_system_agent.py  # Space weather
├── tools/
│   ├── geo_tools.py       # Geocoding (Nominatim), weather (Open-Meteo)
│   ├── aviation_tools.py  # OpenSky Network, ADS-B Exchange
│   ├── maritime_tools.py  # AISStream WebSocket, SQLite
│   ├── doomsday_tools.py  # NASA EONET, USGS
│   ├── conflict_tools.py  # ACLED, GDELT
│   ├── solar_tools.py     # NASA DONKI, NASA NeoWs
│   └── data_bus.py        # Event propagation between agents
├── prompts/               # System prompts for each agent (Markdown)
├── tests/                 # pytest unit & integration tests
└── requirements.txt

frontend/
├── src/app/               # Next.js App Router pages
│   ├── page.tsx           # Landing page with radar animation
│   └── chat/page.tsx      # Main intelligence briefing interface
├── src/components/        # React components (map, briefing panel, etc.)
├── src/hooks/use-chat.ts  # SSE streaming hook
└── package.json
```

## Agents

### Orchestrator (`agents/orchestrator.py`)
- Entry point for all queries
- LLM-based routing: analyzes the query and delegates to one or more specialist agents
- Assembles final briefing from specialist outputs
- Uses `mistral.mistral-large-3-675b-instruct` model

### Maritime Agent (`agents/maritime_agent.py`)
- Real-time vessel tracking via AISStream WebSocket
- Search by name, MMSI, or geographic area
- Local SQLite database for position history

### Aviation Agent (`agents/aviation_agent.py`)
- Aircraft search in geographic areas via OpenSky Network
- Fallback to ADS-B Exchange
- Risk analysis (sanctions, anomalies)

### Doomsday Agent (`agents/doomsday_agent.py`)
- Climate events from NASA EONET
- Earthquake data from USGS
- Threat level assessment

### Conflict Agent (`agents/conflict_agent.py`)
- Armed conflicts and political violence via ACLED
- Global news and crisis monitoring via GDELT

### Solar System Agent (`agents/solar_system_agent.py`)
- Solar flares and space weather via NASA DONKI
- Near-Earth objects and asteroid tracking via NASA NeoWs

Specialist agents use `mistral.ministral-3-14b-instruct` model.

## Key Patterns

### Agent-as-Tools
Specialist agents are wrapped with `@tool` decorators in `agent_tools.py`, allowing the orchestrator to invoke them as callable tools.

### Streaming (SSE)
The `/stream` endpoint uses Server-Sent Events. The `stream_orchestrator()` async generator yields typed events:
- `content` — LLM response text
- `tool_start` / `tool_end` — Tool invocation lifecycle
- `agent_selected` — Which specialist was engaged
- `location` — Geocoded coordinates for map display
- `data_*` — Structured data from tool results

### Data Bus
`tools/data_bus.py` provides a module-level event queue. Sub-agents emit structured data; the orchestrator drains and forwards it via SSE to the frontend.

### Session Persistence
`FileSessionManager` stores conversation history per session in `backend/sessions/`. Session IDs are generated client-side with `crypto.randomUUID()`.

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| LLM      | Mistral (via AWS Bedrock)              |
| Agents   | strands-agents framework               |
| Backend  | Python, FastAPI, uvicorn               |
| Frontend | Next.js 15, React 19, TypeScript       |
| Maps     | Leaflet                                |
| Styling  | Tailwind CSS 4                         |
| Database | SQLite (maritime vessel history)       |
| HTTP     | httpx (async)                          |
| Tests    | pytest, pytest-asyncio                 |

## Development

### Running Locally
```bash
# Backend
cd backend
pip install -r requirements.txt
python server.py  # http://localhost:8000

# Frontend
cd frontend
npm install
npm run dev  # http://localhost:3000
```

### Adding a New Agent
1. Create `agents/<name>_agent.py` with a strands `Agent`
2. Add tools in `tools/<name>_tools.py`
3. Write a system prompt in `prompts/<name>_agent.md`
4. Wrap the agent as a `@tool` in `agent_tools.py`
5. Register it in the orchestrator's tool list
6. Add tests in `tests/`

### Running Tests
```bash
python -m pytest backend/tests/
```

## Environment Variables

Required in `.env` (see `.env.example`):
- `AWS_BEARER_TOKEN_BEDROCK` — AWS Bedrock API key
- `AWS_DEFAULT_REGION` — AWS region (e.g. `us-east-2`)
- `AISSTREAM_API_KEY` — AISStream API key

Optional:
- `ORCHESTRATOR_MODEL_ID` — Override orchestrator model
- `AGENT_MODEL_ID` — Override specialist agent model
- `ACLED_API_KEY` / `ACLED_EMAIL` — ACLED conflict data access
