"""Unit tests for geocoding tools."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from tools.geo_tools import geocode_location, _geocode_location


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
