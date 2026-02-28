"""
FastAPI server — exposes the orchestrator via SSE streaming.
"""
import json
import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agents.orchestrator import stream_orchestrator

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
    session_id: str


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.get("/")
async def health():
    return {"status": "ok", "service": "omnicat"}


@app.post("/stream")
async def stream_endpoint(request: ChatRequest):
    """
    SSE streaming endpoint with cross-enriched intelligence briefings.

    The orchestrator agent handles everything: it decides whether to geocode,
    which specialists to call, and how to respond (conversationally or with a briefing).

    Events:
    - content              : response text (accumulated)
    - error                : error
    - [DONE]               : end of stream
    """

    async def generate():
        try:
            async for chunk in stream_orchestrator(request.message, request.session_id):
                yield _sse({"type": "content", "data": chunk})
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield _sse({"type": "error", "message": str(e)})
            yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
