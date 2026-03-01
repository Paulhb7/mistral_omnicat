# Data Sources & APIs

OmniCAT integrates with 14+ external data sources and APIs. This document details each integration.

## Geolocation & Weather

### Nominatim (OpenStreetMap)
- **Purpose**: Geocoding — converting place names to coordinates
- **Tool file**: `backend/tools/geo_tools.py`
- **API**: `https://nominatim.openstreetmap.org/search`
- **Auth**: None (free, rate-limited)
- **Usage**: Every location-based query starts with geocoding to get lat/lon coordinates

### Open-Meteo
- **Purpose**: Weather data for any location
- **Tool file**: `backend/tools/geo_tools.py`
- **API**: `https://api.open-meteo.com/v1/forecast`
- **Auth**: None (free)
- **Data**: Temperature, humidity, wind speed/direction, weather code, precipitation

## Maritime

### AISStream
- **Purpose**: Real-time vessel tracking via AIS
- **Tool file**: `backend/tools/maritime_tools.py`
- **API**: WebSocket at `wss://stream.aisstream.io/v0/stream`
- **Auth**: API key (free via [aisstream.io](https://aisstream.io))
- **Data**: Vessel name, MMSI, position, speed, heading, ship type, destination
- **Env var**: `AISSTREAM_API_KEY`

### SQLite (Local)
- **Purpose**: Historical vessel position storage
- **Tool file**: `backend/tools/maritime_tools.py`
- **Database**: `vessels.db` (created automatically)
- **Usage**: AIS positions are stored locally for historical queries and trend analysis

## Aviation

### OpenSky Network
- **Purpose**: Real-time aircraft tracking
- **Tool file**: `backend/tools/aviation_tools.py`
- **API**: `https://opensky-network.org/api/states/all`
- **Auth**: None for basic access (free)
- **Data**: ICAO24, callsign, origin country, position, altitude, velocity, heading

### ADS-B Exchange
- **Purpose**: Fallback aircraft tracking
- **Tool file**: `backend/tools/aviation_tools.py`
- **Usage**: Used when OpenSky Network is unavailable or rate-limited

## Natural Hazards

### NASA EONET (Earth Observatory Natural Event Tracker)
- **Purpose**: Active natural events worldwide
- **Tool file**: `backend/tools/doomsday_tools.py`
- **API**: `https://eonet.gsfc.nasa.gov/api/v3/events`
- **Auth**: None (free)
- **Data**: Wildfires, storms, volcanic activity, floods, sea/lake ice events
- **Categories**: Each event has a category, title, geometry (coordinates), and date

### USGS Earthquake API
- **Purpose**: Recent earthquake data
- **Tool file**: `backend/tools/doomsday_tools.py`
- **API**: `https://earthquake.usgs.gov/fdsnws/event/1/query`
- **Auth**: None (free)
- **Data**: Magnitude, depth, location, time, felt reports, tsunami flag

## Conflict & Geopolitics

### ACLED (Armed Conflict Location & Event Data)
- **Purpose**: Armed conflicts, political violence, protests
- **Tool file**: `backend/tools/conflict_tools.py`
- **API**: `https://api.acleddata.com/acled/read`
- **Auth**: API key + email (free registration)
- **Data**: Event type, actors, fatalities, location, date, notes
- **Env vars**: `ACLED_API_KEY`, `ACLED_EMAIL`

### GDELT (Global Database of Events, Language, and Tone)
- **Purpose**: Global news and crisis event monitoring
- **Tool file**: `backend/tools/conflict_tools.py`
- **API**: GDELT DOC API
- **Auth**: None (free)
- **Data**: News articles, event summaries, tone analysis, geographic distribution

## Space

### NASA DONKI (Space Weather Database)
- **Purpose**: Solar flares, coronal mass ejections, geomagnetic storms
- **Tool file**: `backend/tools/solar_tools.py`
- **API**: `https://api.nasa.gov/DONKI`
- **Auth**: NASA API key (free, default `DEMO_KEY` available)
- **Data**: Flare class, start/peak/end times, CME speed, geomagnetic storm intensity

### NASA NeoWs (Near Earth Object Web Service)
- **Purpose**: Asteroid and NEO close approach data
- **Tool file**: `backend/tools/solar_tools.py`
- **API**: `https://api.nasa.gov/neo/rest/v1/feed`
- **Auth**: NASA API key (free)
- **Data**: Asteroid name, diameter, velocity, miss distance, hazardous flag

### NASA Exoplanet Archive
- **Purpose**: Confirmed exoplanet data
- **Tool file**: `backend/tools/milky_way_tools.py`
- **API**: TAP (Table Access Protocol) at `https://exoplanetarchive.ipac.caltech.edu/TAP/sync`
- **Auth**: None (free)
- **Data**: Planet name, host star, orbital period, radius, mass, equilibrium temperature, discovery method

### arXiv
- **Purpose**: Scientific papers on exoplanets and space research
- **Tool file**: `backend/tools/milky_way_tools.py`
- **API**: `http://export.arxiv.org/api/query`
- **Auth**: None (free)
- **Data**: Paper title, authors, abstract, publication date, arXiv ID

## Voice

### Mistral Voxtral (STT)
- **Purpose**: Real-time speech-to-text transcription
- **Endpoint**: WebSocket (realtime) + REST (file upload)
- **Models**: `voxtral-mini-transcribe-realtime-2602` (WebSocket), `voxtral-mini-2602` (upload)
- **Audio format**: PCM s16le, 16kHz, mono
- **Env var**: `MISTRAL_API_KEY`

### ElevenLabs (TTS)
- **Purpose**: Text-to-speech with custom voice
- **Model**: `eleven_turbo_v2_5` (lowest latency)
- **Voice**: Custom "Omni" voice (ID: `1aBfmKpXXPzK6xmSpeqn`) — designed to sound like Jarvis
- **Output**: Streaming `audio/mpeg`
- **Env vars**: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`

## Optional

### Perplexity
- **Purpose**: Live intelligence search for real-time context
- **Env var**: `PERPLEXITY_API_KEY`
- **Usage**: Supplements agent responses with up-to-date information when available

## API Key Summary

| Service | Env Variable | Required | Cost |
|---------|-------------|----------|------|
| AWS Bedrock | `AWS_BEARER_TOKEN_BEDROCK` | Yes | Pay-per-use |
| AISStream | `AISSTREAM_API_KEY` | Yes | Free |
| Mistral | `MISTRAL_API_KEY` | For voice | Pay-per-use |
| ElevenLabs | `ELEVENLABS_API_KEY` | For voice | Free tier available |
| ACLED | `ACLED_API_KEY` + `ACLED_EMAIL` | No | Free registration |
| Perplexity | `PERPLEXITY_API_KEY` | No | Pay-per-use |
| NASA | — | No | Free (DEMO_KEY) |
| OpenSky | — | No | Free |
| Nominatim | — | No | Free |
| Open-Meteo | — | No | Free |
| GDELT | — | No | Free |
| USGS | — | No | Free |
| arXiv | — | No | Free |
