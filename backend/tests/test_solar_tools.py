"""Unit tests for solar system tools — solar flares and near-Earth objects."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from tools.solar_tools import get_solar_flares, get_near_earth_objects


# -- get_solar_flares ----------------------------------------------------------

@pytest.mark.asyncio
async def test_get_solar_flares_success():
    mock_response = MagicMock()
    mock_response.json.return_value = [
        {
            "classType": "M5.2",
            "beginTime": "2025-01-10T08:00Z",
            "peakTime": "2025-01-10T08:15Z",
            "sourceLocation": "N20W10",
        },
        {
            "classType": "C3.1",
            "beginTime": "2025-01-11T12:00Z",
            "peakTime": "2025-01-11T12:30Z",
            "sourceLocation": "S15E05",
        },
    ]

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_solar_flares(days=7)

        assert result["total"] == 2
        assert result["flares"][0]["class"] == "M5.2"
        assert result["flares"][0]["source_region"] == "N20W10"
        assert result["flares"][1]["class"] == "C3.1"


@pytest.mark.asyncio
async def test_get_solar_flares_non_list_response():
    mock_response = MagicMock()
    mock_response.json.return_value = {"error": "no data available"}

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_solar_flares()

        assert result["total"] == 0
        assert result["flares"] == []


@pytest.mark.asyncio
async def test_get_solar_flares_empty_list():
    mock_response = MagicMock()
    mock_response.json.return_value = []

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_solar_flares(days=3)

        assert result["total"] == 0
        assert result["flares"] == []


@pytest.mark.asyncio
async def test_get_solar_flares_missing_fields():
    mock_response = MagicMock()
    mock_response.json.return_value = [
        {
            "classType": "X1.0",
        }
    ]

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_solar_flares()

        assert result["total"] == 1
        assert result["flares"][0]["class"] == "X1.0"
        assert result["flares"][0]["source_region"] == "Unknown solar region"


# -- get_near_earth_objects ----------------------------------------------------

@pytest.mark.asyncio
async def test_get_near_earth_objects_success():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "near_earth_objects": {
            "2025-01-15": [
                {
                    "name": "(2025 AA1)",
                    "is_potentially_hazardous_asteroid": False,
                    "close_approach_data": [
                        {
                            "close_approach_date": "2025-01-15",
                            "miss_distance": {"lunar": "10.5"},
                            "relative_velocity": {"kilometers_per_hour": "45000"},
                        }
                    ],
                }
            ]
        }
    }

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_near_earth_objects(days=7)

        assert result["total"] == 1
        assert result["objects"][0]["name"] == "2025 AA1"
        assert result["objects"][0]["lunar_distance"] == 10.5
        assert result["objects"][0]["potentially_hazardous"] is False


@pytest.mark.asyncio
async def test_get_near_earth_objects_empty():
    mock_response = MagicMock()
    mock_response.json.return_value = {"near_earth_objects": {}}

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_near_earth_objects()

        assert result["total"] == 0
        assert result["objects"] == []


@pytest.mark.asyncio
async def test_get_near_earth_objects_hazardous():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "near_earth_objects": {
            "2025-01-16": [
                {
                    "name": "(99942 Apophis)",
                    "is_potentially_hazardous_asteroid": True,
                    "close_approach_data": [
                        {
                            "close_approach_date": "2025-01-16",
                            "miss_distance": {"lunar": "0.1"},
                            "relative_velocity": {"kilometers_per_hour": "120000"},
                        }
                    ],
                }
            ]
        }
    }

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_near_earth_objects()

        assert result["total"] == 1
        assert result["objects"][0]["potentially_hazardous"] is True
        assert result["objects"][0]["lunar_distance"] == 0.1
        assert result["objects"][0]["speed_kmh"] == 120000


@pytest.mark.asyncio
async def test_get_near_earth_objects_sorted_by_distance():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "near_earth_objects": {
            "2025-01-15": [
                {
                    "name": "(Far One)",
                    "is_potentially_hazardous_asteroid": False,
                    "close_approach_data": [
                        {
                            "close_approach_date": "2025-01-15",
                            "miss_distance": {"lunar": "50.0"},
                            "relative_velocity": {"kilometers_per_hour": "30000"},
                        }
                    ],
                },
                {
                    "name": "(Close One)",
                    "is_potentially_hazardous_asteroid": False,
                    "close_approach_data": [
                        {
                            "close_approach_date": "2025-01-15",
                            "miss_distance": {"lunar": "2.5"},
                            "relative_velocity": {"kilometers_per_hour": "60000"},
                        }
                    ],
                },
            ]
        }
    }

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_near_earth_objects()

        assert result["total"] == 2
        assert result["objects"][0]["name"] == "Close One"
        assert result["objects"][1]["name"] == "Far One"
