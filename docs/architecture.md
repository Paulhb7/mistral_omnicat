# Architecture

## High-Level Overview

OmniCAT is a monorepo containing two services:

```
User (browser)
    │
    │  HTTP / SSE / WebSocket
    ▼
┌──────────────────────────────────────────────────────────┐
│                   FASTAPI BACKEND                         │
│                                                           │
│   ┌─────────────────────────────────────────────────┐     │
│   │               ORCHESTRATOR                       │     │
│   │        (Mistral Large 675B via Bedrock)          │     │
│   │                                                  │     │
│   │   ┌──────────┐ ┌──────────┐ ┌──────────┐        │     │
│   │   │ Maritime │ │ Aviation │ │ Doomsday │        │     │
│   │   │  Agent   │ │  Agent   │ │  Agent   │        │     │
│   │   └────┬─────┘ └────┬─────┘ └────┬─────┘        │     │
│   │   ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐        │     │
│   │   │ Conflict │ │  Solar   │ │Milky Way │        │     │
│   │   │  Agent   │ │  Agent   │ │  Agent   │        │     │
│   │   └──────────┘ └──────────┘ └──────────┘        │     │
│   └─────────────────────────────────────────────────┘     │
│                                                           │
│   ┌─────────────────────────────────────────────────┐     │
│   │                 TOOLS LAYER                      │     │
│   │  Nominatim · Open-Meteo · OpenSky · AISStream   │     │
│   │  NASA EONET · USGS · ACLED · GDELT              │     │
│   │  NASA DONKI · NASA NeoWs · Exoplanet Archive    │     │
│   │  arXiv · ElevenLabs · Voxtral                   │     │
│   └─────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
    │
    │  SSE events / audio streams
    ▼
┌──────────────────────────────────────────────────────────┐
│                  NEXT.JS 15 FRONTEND                      │
│                                                           │
│   Leaflet Map · NASA Eyes (Solar/Exoplanets/Asteroids)   │
│   OmniOrb (Three.js) · Briefing Panel · Intel Panels    │
│   Voice Loop · HUD Sound Effects · Theme System          │
└──────────────────────────────────────────────────────────┘
```

## Design Decisions

### Agent-as-Tool Pattern

Each specialist agent is a full strands `Agent` instance with its own system prompt, model, and tool set. These agents are then wrapped with `@tool` decorators in `agent_tools.py`, turning them into callable tools that the orchestrator can invoke. This allows the orchestrator to use standard LLM tool-calling to route queries to the right specialist.

**Why this pattern?**
- The orchestrator decides which agents to call using its own intelligence — no hardcoded routing rules
- Multiple agents can be invoked for a single query (e.g., "Analyze the Marseille area" triggers maritime + aviation + doomsday)
- Adding a new agent requires zero changes to the routing logic — just register it as a tool

### Two-Tier Model Strategy

- **Orchestrator**: `mistral-large-3-675b-instruct` — Needs strong reasoning to route complex queries and assemble coherent briefings from multiple agent outputs
- **Specialist agents**: `ministral-3-14b-instruct` — Smaller, faster model that is sufficient for focused domain tasks (querying APIs, formatting data)

This keeps costs low while maintaining quality where it matters.

### Streaming Architecture (SSE)

The `/stream` endpoint uses Server-Sent Events rather than WebSocket for the main intelligence pipeline. Each event is typed:

| Event Type | Purpose |
|------------|---------|
| `content` | LLM response text (streamed token by token) |
| `tool_start` | Agent or tool invocation began |
| `tool_end` | Agent or tool invocation completed |
| `agent_selected` | Which specialist agent was engaged |
| `location` | Geocoded coordinates for map centering |
| `data_weather` | Structured weather data |
| `data_quakes` | Earthquake data array |
| `data_events` | NASA EONET climate events |
| `data_conflicts` | ACLED conflict data |
| `data_flights` | Aviation tracking data |
| `data_vessels` | Maritime AIS data |

**Why SSE over WebSocket for this?**
- Unidirectional: the server pushes data, the client consumes it
- Automatic reconnection built into the EventSource API
- Simpler than managing WebSocket lifecycle
- WebSocket is reserved for real-time voice (STT), where bidirectional streaming is actually needed

### Data Bus

`tools/data_bus.py` provides a module-level event queue. When a specialist agent's tools produce structured data (vessel positions, earthquake records, etc.), they emit it onto the data bus. The orchestrator's streaming loop drains the bus after each agent call and forwards the structured data to the frontend via SSE.

This decouples tool output from the LLM's text response — the frontend gets both the narrative briefing AND machine-readable data for map overlays and intel panels.

### Session Persistence

`FileSessionManager` stores conversation history as JSON files in `backend/sessions/`. Session IDs are generated client-side with `crypto.randomUUID()` and passed as query parameters. This allows conversational context across multiple queries without a database.

## Directory Structure

```
mistral_wwh_aristocats/
├── .github/
│   └── workflows/
│       └── ci.yml             # CI pipeline (tests, build, Docker)
├── docker/                    # Docker configuration
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── backend/
│   ├── agents/                # Agent definitions
│   │   ├── orchestrator.py    # Query router + briefing assembly
│   │   ├── agent_tools.py     # @tool wrappers for all agents
│   │   ├── maritime_agent.py
│   │   ├── aviation_agent.py
│   │   ├── doomsday_agent.py
│   │   ├── conflict_agent.py
│   │   ├── solar_system_agent.py
│   │   └── milky_way_agent.py
│   ├── tools/                 # API integrations
│   │   ├── geo_tools.py       # Nominatim + Open-Meteo
│   │   ├── aviation_tools.py  # OpenSky + ADS-B
│   │   ├── maritime_tools.py  # AISStream + SQLite
│   │   ├── doomsday_tools.py  # NASA EONET + USGS
│   │   ├── conflict_tools.py  # ACLED + GDELT
│   │   ├── solar_tools.py     # NASA DONKI + NeoWs
│   │   ├── milky_way_tools.py # NASA Exoplanet Archive + arXiv
│   │   └── data_bus.py        # Inter-agent event queue
│   ├── prompts/               # System prompts (Markdown)
│   ├── tests/                 # pytest suite
│   ├── sessions/              # Persistent conversation history
│   ├── server.py              # FastAPI + SSE + WebSocket endpoints
│   ├── main.py                # CLI entry point
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   │   ├── page.tsx       # Landing page
│   │   │   ├── chat/page.tsx  # Main intelligence interface
│   │   │   ├── about/page.tsx # About / voice demo page
│   │   │   └── globals.css    # Animations + theme variables
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom hooks (SSE streaming)
│   │   ├── context/           # Theme context
│   │   ├── utils/             # Sound effects
│   │   └── types/             # TypeScript types
│   ├── public/                # Static assets
│   └── package.json
├── docs/                      # This documentation
├── .env.example               # Environment template
├── README.md
└── AGENTS.md
```
