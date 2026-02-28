"""Unit tests for doomsday tools — climate events and earthquakes."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from tools.doomsday_tools import get_climate_events, get_earthquakes


# -- get_climate_events --------------------------------------------------------

@pytest.mark.asyncio
async def test_get_climate_events_success():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "events": [
            {
                "id": "EONET_6455",
                "title": "Thomas Fire",
                "categories": [{"title": "Wildfires", "id": "wildfires"}],
                "geometry": [
                    {"date": "2025-01-15T00:00:00Z", "type": "Point", "coordinates": [-119.0, 34.4]}
                ],
            }
        ]
    }

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_climate_events(34.05, -118.24)

        assert result["total"] == 1
        assert result["events"][0]["category"] == "Wildfires"
        assert result["events"][0]["title"] == "Thomas Fire"
        assert result["events"][0]["lat"] == 34.4
        assert result["events"][0]["lng"] == -119.0
        assert "Wildfires" in result["by_category"]


@pytest.mark.asyncio
async def test_get_climate_events_empty():
    mock_response = MagicMock()
    mock_response.json.return_value = {"events": []}

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_climate_events(0.0, 0.0)

        assert result["total"] == 0
        assert result["events"] == []
        assert result["by_category"] == {}


@pytest.mark.asyncio
async def test_get_climate_events_polygon_geometry():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "events": [
            {
                "id": "EONET_9999",
                "title": "Flood Zone",
                "categories": [{"title": "Floods"}],
                "geometry": [
                    {
                        "date": "2025-02-01T00:00:00Z",
                        "type": "Polygon",
                        "coordinates": [[[1.0, 2.0], [3.0, 2.0], [3.0, 4.0], [1.0, 4.0]]],
                    }
                ],
            }
        ]
    }

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_climate_events(3.0, 2.0)

        assert result["total"] == 1
        assert result["events"][0]["lat"] == 3.0  # Average of 2,2,4,4
        assert result["events"][0]["lng"] == 2.0  # Average of 1,3,3,1


@pytest.mark.asyncio
async def test_get_climate_events_no_category():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "events": [
            {
                "id": "EONET_0001",
                "title": "Unknown Event",
                "categories": [],
                "geometry": [{"date": "2025-01-20T00:00:00Z", "type": "Point", "coordinates": [10.0, 20.0]}],
            }
        ]
    }

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_climate_events(20.0, 10.0)

        assert result["events"][0]["category"] == "Unknown"


# -- get_earthquakes -----------------------------------------------------------

@pytest.mark.asyncio
async def test_get_earthquakes_success():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "features": [
            {
                "properties": {"mag": 5.2, "place": "20km NW of Tokyo", "time": 1700000000000},
                "geometry": {"coordinates": [139.69, 35.68, 10.5]},
            }
        ]
    }

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_earthquakes(35.68, 139.69)

        assert result["total"] == 1
        assert result["earthquakes"][0]["magnitude"] == 5.2
        assert result["earthquakes"][0]["place"] == "20km NW of Tokyo"
        assert result["earthquakes"][0]["depth_km"] == 10.5
        assert result["max_magnitude"] == 5.2


@pytest.mark.asyncio
async def test_get_earthquakes_empty():
    mock_response = MagicMock()
    mock_response.json.return_value = {"features": []}

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_earthquakes(0.0, 0.0)

        assert result["total"] == 0
        assert result["earthquakes"] == []
        assert result["max_magnitude"] == 0


@pytest.mark.asyncio
async def test_get_earthquakes_timeout():
    import httpx

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(
            side_effect=httpx.ReadTimeout("timeout")
        )

        result = await get_earthquakes(35.0, 139.0)

        assert result["total"] == 0
        assert "error" in result
        assert "timeout" in result["error"].lower()


@pytest.mark.asyncio
async def test_get_earthquakes_multiple():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "features": [
            {
                "properties": {"mag": 6.1, "place": "Near coast", "time": 1700000000000},
                "geometry": {"coordinates": [5.0, 43.0, 8.0]},
            },
            {
                "properties": {"mag": 3.5, "place": "Inland", "time": 1700001000000},
                "geometry": {"coordinates": [5.1, 43.1, 15.0]},
            },
        ]
    }

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_earthquakes(43.0, 5.0)

        assert result["total"] == 2
        assert result["max_magnitude"] == 6.1
        assert len(result["earthquakes"]) == 2
