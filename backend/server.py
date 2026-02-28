"""
FastAPI server — exposes the orchestrator via SSE streaming.
"""
import asyncio
import json
import logging
import os

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from mistralai import Mistral
from mistralai.models import AudioFormat, TranscriptionStreamTextDelta, TranscriptionStreamDone, RealtimeTranscriptionError, RealtimeTranscriptionSessionCreated

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    session_id: str


class TTSRequest(BaseModel):
    text: str


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
            async for event in stream_orchestrator(request.message, request.session_id):
                yield _sse(event)
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield _sse({"type": "error", "message": str(e)})
            yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/tts")
async def tts_endpoint(request: TTSRequest):
    """Text-to-speech via ElevenLabs streaming API."""
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        from fastapi.responses import JSONResponse
        return JSONResponse({"error": "ELEVENLABS_API_KEY not configured"}, status_code=500)

    voice_id = os.getenv("ELEVENLABS_VOICE_ID", "1aBfmKpXXPzK6xmSpeqn")

    async def stream_audio():
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream(
                "POST",
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream",
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "text": request.text,
                    "model_id": "eleven_turbo_v2_5",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                    },
                },
            ) as response:
                if response.status_code != 200:
                    error_body = await response.aread()
                    logger.error(f"ElevenLabs TTS error {response.status_code}: {error_body}")
                    return
                async for chunk in response.aiter_bytes(1024):
                    yield chunk

    return StreamingResponse(stream_audio(), media_type="audio/mpeg")


@app.post("/stt")
async def stt_endpoint(file: UploadFile = File(...)):
    """
    Speech-to-text via Voxtral (Mistral Audio API).
    Accepts an audio file upload, returns the transcript.
    """
    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        return {"error": "MISTRAL_API_KEY not configured"}

    audio_bytes = await file.read()

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.mistral.ai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {api_key}"},
            files={"file": (file.filename or "audio.webm", audio_bytes, file.content_type or "audio/webm")},
            data={"model": "voxtral-mini-2602"},
        )

    if resp.status_code != 200:
        logger.error(f"Voxtral STT error {resp.status_code}: {resp.text}")
        return {"error": f"STT failed: {resp.status_code}"}

    result = resp.json()
    return {"text": result.get("text", "")}


@app.websocket("/ws/stt")
async def ws_stt(ws: WebSocket):
    """
    Realtime STT via Voxtral WebSocket.
    Frontend streams raw PCM s16le 16kHz mono audio frames.
    Backend forwards to Mistral realtime API, sends back text deltas.
    """
    await ws.accept()

    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        await ws.send_json({"type": "error", "text": "MISTRAL_API_KEY not configured"})
        await ws.close()
        return

    audio_queue: asyncio.Queue[bytes | None] = asyncio.Queue(maxsize=100)

    async def audio_stream():
        while True:
            chunk = await audio_queue.get()
            if chunk is None:
                return
            yield chunk

    async def receive_audio():
        try:
            while True:
                data = await ws.receive_bytes()
                await audio_queue.put(data)
        except WebSocketDisconnect:
            await audio_queue.put(None)
        except Exception:
            await audio_queue.put(None)

    recv_task = asyncio.create_task(receive_audio())

    try:
        client = Mistral(api_key=api_key)
        audio_format = AudioFormat(encoding="pcm_s16le", sample_rate=16000)

        async for event in client.audio.realtime.transcribe_stream(
            audio_stream=audio_stream(),
            model="voxtral-mini-transcribe-realtime-2602",
            audio_format=audio_format,
            target_streaming_delay_ms=480,
        ):
            if isinstance(event, RealtimeTranscriptionSessionCreated):
                await ws.send_json({"type": "session_created"})
            elif isinstance(event, TranscriptionStreamTextDelta):
                await ws.send_json({"type": "text_delta", "text": event.text})
            elif isinstance(event, TranscriptionStreamDone):
                await ws.send_json({"type": "done"})
                break
            elif isinstance(event, RealtimeTranscriptionError):
                await ws.send_json({"type": "error", "text": str(event)})
                break
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WS STT error: {e}")
        try:
            await ws.send_json({"type": "error", "text": str(e)})
        except Exception:
            pass
    finally:
        recv_task.cancel()
        try:
            await ws.close()
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
