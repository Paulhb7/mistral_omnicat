"""
FastAPI server — expose l'orchestrateur via SSE streaming.
"""
import asyncio
import json
import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agents.orchestrator import (
    run_orchestrator,
    create_maritime_agent,
    create_aviation_agent,
    create_doomsday_agent,
    _run_agent,
)
from tools.geo_tools import _geocode_location, _get_weather

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="OmniCAT API",
    description="Multi-agent OSINT intelligence platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.get("/")
async def health():
    return {"status": "ok", "service": "omnicat"}


@app.post("/stream")
async def stream_endpoint(request: ChatRequest):
    """
    SSE streaming endpoint.

    Events:
    - tool_start / tool_end : lifecycle des tools
    - agent_selected       : quel agent tourne
    - location             : coordonnées géocodées
    - content              : texte du briefing (accumulé)
    - error                : erreur
    - [DONE]               : fin du stream
    """

    async def generate():
        try:
            # Step 1: Geocode
            yield _sse({"type": "tool_start", "tool": "geocode_location"})
            geo = await _geocode_location(location=request.message)
            yield _sse({"type": "tool_end", "tool": "geocode_location"})

            if "error" in geo:
                yield _sse({"type": "content", "data": f"Lieu introuvable. Dispatch direct...\n\n"})
                maritime_agent = create_maritime_agent()
                aviation_agent = create_aviation_agent()
                doomsday_agent = create_doomsday_agent()

                for agent_name in ["maritime", "aviation", "doomsday"]:
                    yield _sse({"type": "agent_selected", "agent": agent_name})

                maritime_result, aviation_result, doomsday_result = await asyncio.gather(
                    _run_agent(maritime_agent, request.message),
                    _run_agent(aviation_agent, request.message),
                    _run_agent(doomsday_agent, request.message),
                )

                yield _sse({"type": "content", "data": f"## Maritime\n\n{maritime_result}\n\n"})
                yield _sse({"type": "content", "data": f"## Aviation\n\n{aviation_result}\n\n"})
                yield _sse({"type": "content", "data": f"## Doomsday\n\n{doomsday_result}\n\n"})
                yield "data: [DONE]\n\n"
                return

            lat, lng = geo["lat"], geo["lng"]
            location_name = geo["location"]
            country = geo.get("country", "")

            yield _sse({
                "type": "location",
                "name": location_name,
                "lat": lat,
                "lng": lng,
            })

            # Step 2: Weather + agents in parallel
            yield _sse({"type": "tool_start", "tool": "get_weather"})

            bbox_offset = 0.2
            maritime_query = (
                f"Surveille la zone autour de {location_name} "
                f"(bbox [{lat - bbox_offset}, {lng - bbox_offset}] à "
                f"[{lat + bbox_offset}, {lng + bbox_offset}]). "
                f"Liste les navires présents."
            )
            aviation_query = (
                f"Recherche les avions dans la zone de {location_name} "
                f"(lat_min={lat - bbox_offset}, lat_max={lat + bbox_offset}, "
                f"lon_min={lng - bbox_offset}, lon_max={lng + bbox_offset})."
            )
            doomsday_query = (
                f"Analyse les risques naturels et securitaires autour de "
                f"{location_name} (lat={lat}, lng={lng}, pays={country})."
            )

            maritime_agent = create_maritime_agent()
            aviation_agent = create_aviation_agent()
            doomsday_agent = create_doomsday_agent()

            for agent_name in ["maritime", "aviation", "doomsday"]:
                yield _sse({"type": "agent_selected", "agent": agent_name})
                yield _sse({"type": "tool_start", "tool": f"agent_{agent_name}"})

            weather_result, maritime_result, aviation_result, doomsday_result = (
                await asyncio.gather(
                    _get_weather(lat=lat, lng=lng),
                    _run_agent(maritime_agent, maritime_query),
                    _run_agent(aviation_agent, aviation_query),
                    _run_agent(doomsday_agent, doomsday_query),
                )
            )

            yield _sse({"type": "tool_end", "tool": "get_weather"})
            for agent_name in ["maritime", "aviation", "doomsday"]:
                yield _sse({"type": "tool_end", "tool": f"agent_{agent_name}"})

            # Step 3: Build and stream the briefing
            briefing = f"# Briefing OSINT — {location_name}, {country}\n\n"
            briefing += f"**Coordonnées** : {lat:.4f}, {lng:.4f}\n\n"

            if weather_result:
                briefing += (
                    f"**Météo** : {weather_result.get('condition', '?')} | "
                    f"{weather_result.get('temperature_c', '?')}°C | "
                    f"Vent {weather_result.get('wind_kmh', '?')} km/h | "
                    f"Humidité {weather_result.get('humidity_pct', '?')}%\n\n"
                )

            yield _sse({"type": "content", "data": briefing})

            yield _sse({"type": "content", "data": f"---\n\n## Maritime\n\n{maritime_result}\n\n"})
            yield _sse({"type": "content", "data": f"---\n\n## Aviation\n\n{aviation_result}\n\n"})
            yield _sse({"type": "content", "data": f"---\n\n## Doomsday — Risques & Menaces\n\n{doomsday_result}\n\n"})

            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield _sse({"type": "error", "message": str(e)})
            yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
