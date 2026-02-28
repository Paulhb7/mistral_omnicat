"""
FastAPI server — exposes the orchestrator via SSE streaming.
"""
import asyncio
import json
import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agents.orchestrator import run_orchestrator
from tools.geo_tools import _geocode_location, _get_weather

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="OmniCAT API",
    description="Multi-agent OSINT intelligence platform",
    version="2.0.0",
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
    SSE streaming endpoint with cross-enriched intelligence briefings.

    The orchestrator agent decides which specialists to call,
    chains calls as needed, and produces a cross-enriched briefing.

    Events:
    - tool_start / tool_end : tool lifecycle
    - location             : geocoded coordinates
    - content              : briefing text (accumulated)
    - error                : error
    - [DONE]               : end of stream
    """

    async def generate():
        try:
            # Step 1: Geocode for map display
            yield _sse({"type": "tool_start", "tool": "geocode_location"})
            geo = await _geocode_location(location=request.message)
            yield _sse({"type": "tool_end", "tool": "geocode_location"})

            enriched_query = request.message

            if "error" not in geo:
                lat, lng = geo["lat"], geo["lng"]
                location_name = geo["location"]
                country = geo.get("country", "")

                yield _sse({
                    "type": "location",
                    "name": location_name,
                    "lat": lat,
                    "lng": lng,
                })

                # Step 2: Weather for briefing header
                yield _sse({"type": "tool_start", "tool": "get_weather"})
                weather_result = await _get_weather(lat=lat, lng=lng)
                yield _sse({"type": "tool_end", "tool": "get_weather"})

                # Build briefing header
                briefing_header = f"# Briefing OSINT — {location_name}, {country}\n\n"
                briefing_header += f"**Coordinates**: {lat:.4f}, {lng:.4f}\n\n"

                if weather_result:
                    briefing_header += (
                        f"**Weather**: {weather_result.get('condition', '?')} | "
                        f"{weather_result.get('temperature_c', '?')}°C | "
                        f"Wind {weather_result.get('wind_kmh', '?')} km/h | "
                        f"Humidity {weather_result.get('humidity_pct', '?')}%\n\n"
                    )

                yield _sse({"type": "content", "data": briefing_header})

                # Enrich query with location context for the orchestrator
                bbox_offset = 0.2
                enriched_query = (
                    f"Analyze the area around {location_name}, {country} "
                    f"(lat={lat}, lng={lng}, "
                    f"bbox [{lat - bbox_offset}, {lng - bbox_offset}] to "
                    f"[{lat + bbox_offset}, {lng + bbox_offset}])."
                )
            else:
                yield _sse({"type": "content", "data": "Location not found. Running direct analysis...\n\n"})

            # Step 3: Run the orchestrator (agent-as-tools, cross-enriched)
            yield _sse({"type": "tool_start", "tool": "orchestrator"})
            result = await run_orchestrator(enriched_query)
            yield _sse({"type": "tool_end", "tool": "orchestrator"})

            yield _sse({"type": "content", "data": result})
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield _sse({"type": "error", "message": str(e)})
            yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
