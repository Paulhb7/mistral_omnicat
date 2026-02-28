"""Unit tests for geocoding and weather tools."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from tools.geo_tools import geocode_location, get_weather, _geocode_location, _get_weather


# -- geocode_location ---------------------------------------------------------

@pytest.mark.asyncio
async def test_geocode_location_success():
    mock_response = MagicMock()
    mock_response.json.return_value = [
        {
            "display_name": "Paris, Ile-de-France, France",
            "lat": "48.8566",
            "lon": "2.3522",
            "address": {"country": "France", "country_code": "fr"},
        }
    ]

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await _geocode_location("Paris")

        assert result["location"] == "Paris"
        assert result["lat"] == 48.8566
        assert result["lng"] == 2.3522
        assert result["country"] == "France"
        assert result["country_iso2"] == "fr"
        assert result["country_iso3"] == "FRA"


@pytest.mark.asyncio
async def test_geocode_location_not_found():
    mock_response = MagicMock()
    mock_response.json.return_value = []

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await _geocode_location("Atlantis")

        assert "error" in result


@pytest.mark.asyncio
async def test_geocode_location_unknown_country_code():
    mock_response = MagicMock()
    mock_response.json.return_value = [
        {
            "display_name": "Somewhere, XX",
            "lat": "10.0",
            "lon": "20.0",
            "address": {"country": "Unknown Land", "country_code": "xx"},
        }
    ]

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await _geocode_location("Somewhere")

        assert result["country_iso2"] == "xx"
        assert result["country_iso3"] == ""  # Not in mapping


# -- get_weather ---------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_weather_success():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "current": {
            "temperature_2m": 22.5,
            "wind_speed_10m": 15.0,
            "weather_code": 1,
            "relative_humidity_2m": 60,
        }
    }

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await _get_weather(48.8566, 2.3522)

        assert result["temperature_c"] == 22.5
        assert result["condition"] == "Mostly clear"
        assert result["wind_kmh"] == 15.0
        assert result["humidity_pct"] == 60


@pytest.mark.asyncio
async def test_get_weather_unknown_code():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "current": {
            "temperature_2m": 10.0,
            "wind_speed_10m": 5.0,
            "weather_code": 999,
            "relative_humidity_2m": 80,
        }
    }

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await _get_weather(0.0, 0.0)

        assert result["condition"] == "Unknown"


@pytest.mark.asyncio
async def test_get_weather_thunderstorm():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "current": {
            "temperature_2m": 18.0,
            "wind_speed_10m": 40.0,
            "weather_code": 95,
            "relative_humidity_2m": 90,
        }
    }

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await _get_weather(43.3, 5.4)

        assert result["condition"] == "Thunderstorm"
