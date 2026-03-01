# OmniCAT — Multi-Agent OSINT Intelligence

OSINT (Open Source Intelligence) analysis system for maritime, aerial, geopolitical and space weather surveillance, powered by Mistral AI agents.

## ElevenLabs — Voice & Video

### Custom Voice: "Omni"

We used **ElevenLabs** to create a brand-new custom voice for OmniCAT, designed to closely resemble **Jarvis** from Iron Man. The voice — named "Omni" — is authoritative, calm, with a slight British inflection, perfectly suited for delivering intelligence briefings. It was built using ElevenLabs' voice design tools and runs on the `eleven_turbo_v2_5` model for minimum latency during live interactions.

### Demo Video

The project demo video was also produced using **ElevenLabs**, leveraging their text-to-speech capabilities for the voiceover narration, ensuring a consistent Jarvis-like experience throughout the presentation.

### Demo Easter Eggs

For the live demo, we added **two easter eggs** triggered by keyboard shortcuts to bring more fun and ensure smooth transitions between the different phases of the presentation:

- **`Cmd+Shift+N`** — **NASA Incoming Call**: A full-screen popup simulating an incoming call from NASA with an asteroid mission briefing. Press Enter to accept and transition seamlessly to the asteroid tracking view.
- **`Cmd+Shift+V`** — **Vader Incoming Call**: A full-screen popup simulating an incoming call from Darth Vader with a dark side exoplanet intelligence scenario. Press Enter to accept and jump to the exoplanet exploration view.

These shortcuts allowed us to create theatrical, engaging transitions during the hackathon demo — instead of manually clicking through menus, a single keyboard shortcut triggers an immersive "incoming call" animation with sound effects, making each phase transition feel like a cinematic moment.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS FRONTEND                            │
│  (Leaflet Map / NASA Eyes / Briefing Panel / SSE Client)        │
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
- Auto-navigation to 50+ celestial bodies (planets, moons, spacecraft like JWST, Voyager, Parker Solar Probe) via NASA Eyes on the Solar System

### 6. Milky Way — Exoplanet Research
- Exoplanet data from NASA Exoplanet Archive
- Scientific papers from arXiv
- Habitability assessments
- Interactive 3D exploration via NASA Eyes on Exoplanets (TRAPPIST-1, Proxima Centauri, Kepler systems, and more)

### 7. Asteroid & NEO Tracking
- Near-Earth object detection keywords auto-switch to NASA Eyes on Asteroids
- Dedicated asteroid visualization view

### 8. Voice Interface — Jarvis Mode
- **STT (Speech-to-Text)**: Real-time transcription via Mistral Voxtral (`voxtral-mini-transcribe-realtime-2602`) over WebSocket, with silence detection for auto-submit
- **TTS (Text-to-Speech)**: ElevenLabs streaming API with a custom-built voice ("Omni"), inspired by Jarvis — designed for authoritative, calm intelligence briefings
- **Barge-in**: Interrupt the agent mid-speech by talking — RMS energy detection with echo cancellation, 3-frame confirmation, 500ms cooldown
- **OmniOrb**: 3D animated voice orb (Three.js, 2800 particles + 700 halo, Fibonacci sphere distribution) that reacts in real-time to voice frequency data via WebAudio AnalyserNode
- **HUD Sound Effects**: Jarvis-inspired synthesized sounds (Web Audio API) — boot sequence, blips, confirmation tones, incoming call ring, barge-in chirp, briefing complete triad
- Full voice loop: Listen → Transcribe → Query agents → Speak briefing → Listen again

### 9. Visualizations
- **4 Map Views**: Earth (Leaflet), NASA Eyes Solar System, NASA Eyes Exoplanets, NASA Eyes Asteroids — auto-switching based on query context
- **Jarvis HUD Loader**: Concentric rotating SVG rings with tick marks, scanning arcs, and pulsing core — slow idle animation, fast spin during agent work
- **Briefing Panel**: Collapsible right-side panel with structured markdown intelligence briefings
- **Intel Panels**: Climate events, earthquakes, conflicts displayed with sorting and mini-map

### 10. Themes
- **OmniCAT** (default): Dark theme, orange accent (#fa500f), monospace HUD aesthetic
- **Cyberpunk**: Neon cyan (#00f0ff) + magenta (#ff00aa), scanline overlay, glow effects, flicker animations — toggle with `Ctrl+Shift+X`

### 11. Easter Eggs
- **NASA Incoming Call**: Asteroid mission briefing popup (`Cmd+Shift+N`)
- **Vader Incoming Call**: Dark side exoplanet intelligence popup (`Cmd+Shift+V`)

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- AWS account with Bedrock access (Mistral models)

### 1. Install & configure

```bash
git clone https://github.com/Paulhb7/mistral_wwh_aristocats.git
cd mistral_wwh_aristocats
make install
```

This will create a `.env` file from the template and install all dependencies (backend + frontend).

### 2. Set up your API keys

> **Important:** You must configure your API keys in `.env` before starting the app.

Edit the `.env` file and fill in your credentials:

| Variable | Where to get it | Required |
|----------|----------------|----------|
| `AWS_BEARER_TOKEN_BEDROCK` | [AWS Bedrock Console](https://console.aws.amazon.com/bedrock) | Yes |
| `AWS_DEFAULT_REGION` | AWS region with Mistral models (`us-east-1` recommended) | Yes |
| `MISTRAL_API_KEY` | [Mistral AI Console](https://console.mistral.ai/) | Yes (voice mode) |
| `ELEVENLABS_API_KEY` | [ElevenLabs Dashboard](https://elevenlabs.io/) | Yes (voice mode) |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice library | Optional (defaults to custom "Omni" voice) |
| `AISSTREAM_API_KEY` | [aisstream.io](https://aisstream.io) (free, GitHub login) | Yes (maritime) |
| `ACLED_USERNAME` / `ACLED_PASSWORD` | [ACLED Access](https://acleddata.com/register/) | Optional (conflict data) |
| `PERPLEXITY_API_KEY` | [Perplexity AI](https://perplexity.ai/) | Optional (live search fallback) |

### 3. Start

```bash
make start
```

- Backend → http://localhost:8000
- Frontend → http://localhost:3000

### All Makefile commands

```
make install          # Install everything (backend + frontend + .env)
make start            # Start backend & frontend
make start-backend    # Start FastAPI server only
make start-frontend   # Start Next.js dev server only
make test             # Run backend tests
make clean            # Remove generated files
make help             # Show all commands
```

## Usage

Open `http://localhost:3000` in your browser and enter a location or query.

### Example Queries
- `Analyze the Marseille area` — maritime, aviation, weather, threats
- `What vessels are near the Strait of Gibraltar?` — maritime surveillance
- `What aircraft are flying over Paris?` — aerial tracking
- `What are the risks around Kyiv?` — conflict & geopolitical intel
- `Solar system briefing` — space weather, solar flares
- `Tell me about TRAPPIST-1 e` — exoplanet research + NASA Eyes
- `Are there any asteroids near Earth?` — NEO tracking + asteroid view
- `Mars` — auto-navigates to Mars in NASA Eyes Solar System
- `Proxima Centauri` — exoplanet system exploration

## Configuration

### Environment Variables

| Variable                  | Description              | Default                                    |
|---------------------------|--------------------------|--------------------------------------------|
| `AWS_BEARER_TOKEN_BEDROCK`| AWS Bedrock API key      | *(required)*                               |
| `AWS_DEFAULT_REGION`      | AWS region               | `us-east-2`                                |
| `AISSTREAM_API_KEY`       | AISStream API key        | *(required)*                               |
| `ORCHESTRATOR_MODEL_ID`   | LLM model for routing    | `mistral.mistral-large-3-675b-instruct`    |
| `AGENT_MODEL_ID`          | LLM model for agents     | `mistral.ministral-3-14b-instruct`         |
| `MISTRAL_API_KEY`         | Mistral API key (Voxtral STT) | *(required for voice mode)*          |
| `ELEVENLABS_API_KEY`      | ElevenLabs API key (TTS) | *(required for voice mode)*                |
| `ELEVENLABS_VOICE_ID`     | ElevenLabs voice ID      | `1aBfmKpXXPzK6xmSpeqn` (custom Omni voice)|
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
- **Three.js** — 3D OmniOrb voice visualizer
- **Leaflet** — Interactive Earth map with event overlays
- **NASA Eyes** — Embedded 3D viewers for Solar System, Exoplanets, and Asteroids
- **Tailwind CSS 4** — Styling
- **react-markdown** — Briefing rendering
- **WebAudio API** — Voice frequency analysis, barge-in detection, synthesized HUD SFX

### Voice Stack
- **Mistral Voxtral** — Real-time speech-to-text (WebSocket streaming, PCM s16le 16kHz)
- **ElevenLabs** — Text-to-speech with custom Jarvis-inspired voice ("Omni"), streaming via `eleven_turbo_v2_5` for low-latency playback

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

### Voice Pipeline

| Endpoint | Protocol | Service | Purpose |
|----------|----------|---------|---------|
| `/ws/stt` | WebSocket | Mistral Voxtral | Real-time speech-to-text (PCM s16le 16kHz mono) |
| `/stt` | POST | Mistral Voxtral | File upload transcription |
| `/tts` | POST | ElevenLabs | Text-to-speech streaming (returns audio/mpeg) |

The voice loop operates as a continuous cycle: **Listen** (Voxtral STT via WebSocket with silence detection) → **Process** (Orchestrator + specialist agents) → **Speak** (ElevenLabs TTS with orb audio reactivity) → **Listen again**.

The OmniOrb connects to the TTS audio output via `createMediaElementSource` → `AnalyserNode`, so the 3D particle sphere deforms in real-time based on the actual voice frequencies — not just a simple on/off animation.

A custom ElevenLabs voice ("Omni") was created specifically for this project, inspired by Jarvis (Iron Man) — authoritative, calm, with a slight British inflection suited for intelligence briefings.

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
├── src/components/  # React components
│   ├── earth-map.tsx        # Leaflet map with event overlays
│   ├── omni-orb.tsx         # Three.js 3D voice orb
│   ├── voice-orb-status.tsx # Voice state indicator
│   ├── mic-waveform.tsx     # Mic input waveform
│   ├── jarvis-loader.tsx    # HUD loading animation
│   ├── briefing-panel.tsx   # Intelligence briefing display
│   ├── intel-panels.tsx     # Climate/earthquake/conflict panels
│   ├── search-bar.tsx       # Search input + mic toggle
│   ├── nasa-call-popup.tsx  # NASA incoming call easter egg
│   └── vader-call-popup.tsx # Vader incoming call easter egg
├── src/hooks/       # Custom hooks (SSE streaming)
├── src/utils/sfx.ts # Jarvis-inspired HUD sound effects
├── src/context/     # Theme context (OmniCAT / Cyberpunk)
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
