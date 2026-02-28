"""Integration tests for FastAPI endpoints."""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient


def test_health_check():
    from server import app
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "omnicat"


def test_stream_endpoint_exists():
    from server import app
    with TestClient(app) as client:
        response = client.post("/stream", json={"message": "test"})
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
