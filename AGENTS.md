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
│   ├── solar_system_agent.py  # Space weather
│   └── milky_way_agent.py    # Exoplanet research
├── tools/
│   ├── geo_tools.py       # Geocoding (Nominatim), weather (Open-Meteo)
│   ├── aviation_tools.py  # OpenSky Network, ADS-B Exchange
│   ├── maritime_tools.py  # AISStream WebSocket, SQLite
│   ├── doomsday_tools.py  # NASA EONET, USGS
│   ├── conflict_tools.py  # ACLED, GDELT
│   ├── solar_tools.py     # NASA DONKI, NASA NeoWs
│   ├── milky_way_tools.py # NASA Exoplanet Archive, arXiv
│   └── data_bus.py        # Event propagation between agents
├── prompts/               # System prompts for each agent (Markdown)
├── tests/                 # pytest unit & integration tests
└── requirements.txt

frontend/
├── src/app/               # Next.js App Router pages
│   ├── page.tsx           # Landing page with radar animation
│   ├── chat/page.tsx      # Main intelligence interface (voice loop, TTS/STT)
│   └── about/page.tsx     # About / introduction page (voice demo, agent overview)
├── src/components/
│   ├── omni-orb.tsx       # 3D voice-reactive particle orb (Three.js)
│   ├── voice-orb-status.tsx # Orb + status display wrapper
│   ├── search-bar.tsx     # Query input + mic toggle
│   ├── briefing-panel.tsx # Markdown briefing display
│   ├── earth-map.tsx      # Leaflet map with event overlays
│   └── intel-panels.tsx   # Data panels (weather, quakes, etc.)
├── src/hooks/use-chat.ts  # SSE streaming hook
├── src/context/theme-context.tsx  # OmniCAT + Cyberpunk themes
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

### Milky Way Agent (`agents/milky_way_agent.py`)
- Exoplanet data from NASA Exoplanet Archive (TAP API)
- Scientific papers from arXiv
- Habitability assessment and research briefings

Specialist agents use `mistral.ministral-3-14b-instruct` model.

## Voice Interface — "Omni"

OmniCAT features a full voice interaction system inspired by Jarvis (Iron Man). A custom ElevenLabs voice ("Omni") was created specifically for this project — authoritative, calm, with a slight British inflection suited for intelligence briefings.

### Voice Pipeline

```
User speaks → [Mic PCM 16kHz] → /ws/stt (Voxtral) → Transcript
    → Orchestrator → Specialist Agents → Briefing
    → /tts (ElevenLabs "Omni") → [Audio MP3] → Speaker + AnalyserNode → OmniOrb
    → Loop back to listening
```

### Components

| Component | File | Role |
|-----------|------|------|
| STT (Realtime) | `backend/server.py` `/ws/stt` | WebSocket streaming via Mistral Voxtral (`voxtral-mini-transcribe-realtime-2602`). Receives PCM s16le 16kHz mono frames. |
| STT (Upload) | `backend/server.py` `/stt` | File upload transcription via Voxtral (`voxtral-mini-2602`). |
| TTS | `backend/server.py` `/tts` | ElevenLabs streaming API (`eleven_turbo_v2_5`). Custom voice ID: `1aBfmKpXXPzK6xmSpeqn`. Returns streaming `audio/mpeg`. |
| Voice Loop | `frontend/chat/page.tsx` | Manages the full cycle: listen → transcribe → query → speak → listen again. Includes silence detection (1.5s timeout) for auto-submit. |
| OmniOrb | `frontend/components/omni-orb.tsx` | 3D particle sphere (2800 inner + 700 halo particles, Fibonacci distribution). Connected to TTS audio via `createMediaElementSource` → `AnalyserNode` for real-time frequency-based deformation. |

### Voice Settings

| Parameter | Value | Purpose |
|-----------|-------|---------|
| ElevenLabs Model | `eleven_turbo_v2_5` | Lowest latency for live demo |
| Stability | 0.5 | Balanced expression |
| Similarity Boost | 0.75 | Close to original Omni voice |
| Silence Timeout | 1500ms | Auto-submit after user stops speaking |
| Audio Format (STT) | PCM s16le, 16kHz, mono | Voxtral realtime requirement |

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
| 3D       | Three.js (OmniOrb voice visualizer)    |
| Maps     | Leaflet                                |
| Styling  | Tailwind CSS 4                         |
| STT      | Mistral Voxtral (realtime WebSocket)   |
| TTS      | ElevenLabs (custom "Omni" voice)       |
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

Required for voice mode:
- `MISTRAL_API_KEY` — Mistral API key (Voxtral STT)
- `ELEVENLABS_API_KEY` — ElevenLabs API key (TTS)

Optional:
- `ELEVENLABS_VOICE_ID` — Custom voice ID (default: `1aBfmKpXXPzK6xmSpeqn`, the "Omni" Jarvis-inspired voice)
- `ORCHESTRATOR_MODEL_ID` — Override orchestrator model
- `AGENT_MODEL_ID` — Override specialist agent model
- `ACLED_USERNAME` / `ACLED_PASSWORD` — ACLED conflict data access
