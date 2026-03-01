# Deployment

## Docker

Docker configuration files are located in `docker/`.

### Files

| File | Description |
|------|-------------|
| `docker/Dockerfile.backend` | Python 3.11 image for the FastAPI backend |
| `docker/Dockerfile.frontend` | Node 20 multi-stage build for the Next.js frontend |
| `docker/docker-compose.yml` | Orchestrates both services |

### Quick Start with Docker Compose

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 2. Build and run
docker compose -f docker/docker-compose.yml up --build
```

This starts:
- **Backend** at `http://localhost:8000`
- **Frontend** at `http://localhost:3000`

### Backend Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

- Based on `python:3.11-slim` for minimal image size
- Installs `gcc` for any compiled Python dependencies
- Exposes port 8000

### Frontend Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

- Multi-stage build: build stage compiles Next.js, production stage runs the standalone server
- Based on `node:20-alpine` for minimal image size
- Uses Next.js standalone output for optimized production deployment

### Docker Compose

The compose file:
- Loads environment variables from `.env`
- Creates a persistent volume for session storage (`backend-sessions`)
- Sets `NEXT_PUBLIC_API_URL` to point the frontend at the backend container
- Uses `unless-stopped` restart policy

## Local Development

### Prerequisites

- Python 3.10+
- Node.js 18+
- AWS account with Bedrock access (Mistral models enabled)

### Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py
# Server runs at http://localhost:8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App runs at http://localhost:3000
```

## Environment Variables

Create a `.env` file at the project root (see `.env.example`):

### Required

| Variable | Description |
|----------|-------------|
| `AWS_BEARER_TOKEN_BEDROCK` | AWS Bedrock API key for Mistral models |
| `AWS_DEFAULT_REGION` | AWS region — `us-east-1` recommended (Mistral model availability) |
| `AISSTREAM_API_KEY` | AISStream API key for maritime tracking (free at [aisstream.io](https://aisstream.io)) |

### Required for Voice Mode

| Variable | Description |
|----------|-------------|
| `MISTRAL_API_KEY` | Mistral API key for Voxtral STT |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for TTS |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice ID (default: `1aBfmKpXXPzK6xmSpeqn` — custom "Omni" voice) |

### Optional

| Variable | Description |
|----------|-------------|
| `ORCHESTRATOR_MODEL_ID` | Override orchestrator model (default: `mistral.mistral-large-3-675b-instruct`) |
| `AGENT_MODEL_ID` | Override specialist model (default: `mistral.ministral-3-14b-instruct`) |
| `ACLED_API_KEY` | ACLED API key for conflict data |
| `ACLED_EMAIL` | ACLED account email |
| `PERPLEXITY_API_KEY` | Perplexity API key for live search |

## Running Tests

```bash
cd backend
python -m pytest tests/
```
