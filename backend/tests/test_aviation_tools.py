"""Unit tests for aviation tools — aircraft search, details, and risk assessment."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from tools.aviation_tools import search_aircraft_in_area, get_aircraft_details, check_aircraft_risk


# -- search_aircraft_in_area ---------------------------------------------------

@pytest.mark.asyncio
async def test_search_aircraft_opensky():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "states": [
            ["abc123", "AFR123 ", None, None, None, 2.35, 48.85, 10000, False, 250, 180, None, None, None, False, 0],
        ]
    }

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await search_aircraft_in_area(48.0, 49.0, 2.0, 3.0, api_key="test_key")

        assert len(result) == 1
        assert result[0]["icao24"] == "abc123"
        assert result[0]["callsign"] == "AFR123 "
        assert result[0]["lat"] == 48.85
        assert result[0]["lon"] == 2.35
        assert result[0]["altitude"] == 10000


@pytest.mark.asyncio
async def test_search_aircraft_opensky_empty():
    mock_response = MagicMock()
    mock_response.json.return_value = {"states": []}

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await search_aircraft_in_area(48.0, 49.0, 2.0, 3.0, api_key="test_key")

        assert result == []


@pytest.mark.asyncio
async def test_search_aircraft_adsb_fallback():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "aircraft": [{"icao": "def456", "flight": "BAW789"}]
    }

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await search_aircraft_in_area(48.0, 49.0, 2.0, 3.0)

        assert len(result) == 1
        assert result[0]["icao"] == "def456"


# -- get_aircraft_details ------------------------------------------------------

@pytest.mark.asyncio
async def test_get_aircraft_details_with_key():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "aircraft": [{"icao24": "abc123", "registration": "F-HPJA", "typecode": "A320"}]
    }

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_aircraft_details("abc123", api_key="test_key")

        assert result[0]["icao24"] == "abc123"


@pytest.mark.asyncio
async def test_get_aircraft_details_no_key():
    result = await get_aircraft_details("abc123")

    assert "error" in result


# -- check_aircraft_risk -------------------------------------------------------

@pytest.mark.asyncio
async def test_check_aircraft_risk_clean():
    result = await check_aircraft_risk("CLEAN01")

    assert result["icao24"] == "CLEAN01"
    assert result["risk_score"] == 0
    assert result["alerts"] == []


@pytest.mark.asyncio
async def test_check_aircraft_risk_sanctioned():
    result = await check_aircraft_risk("ABC123")

    assert result["risk_score"] == 100
    assert len(result["alerts"]) >= 1
    assert any("sanctions" in a.lower() for a in result["alerts"])
