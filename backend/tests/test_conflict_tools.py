"""Unit tests for conflict intelligence tools — ACLED and GDELT."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from tools.conflict_tools import get_conflict_events, get_news


# -- get_conflict_events -------------------------------------------------------

@pytest.mark.asyncio
async def test_get_conflict_events_success():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "data": [
            {
                "event_date": "2025-01-10",
                "event_type": "Battles",
                "sub_event_type": "Armed clash",
                "fatalities": "5",
                "location": "Donetsk",
                "actor1": "Military Forces of Russia",
                "actor2": "Military Forces of Ukraine",
                "latitude": "48.0",
                "longitude": "37.8",
            },
            {
                "event_date": "2025-01-08",
                "event_type": "Explosions/Remote violence",
                "sub_event_type": "Shelling",
                "fatalities": "2",
                "location": "Kharkiv",
                "actor1": "Military Forces of Russia",
                "actor2": "",
                "latitude": "49.99",
                "longitude": "36.23",
            },
        ]
    }

    with patch.dict("os.environ", {"ACLED_API_KEY": "test_key", "ACLED_EMAIL": "test@test.com"}):
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

            result = await get_conflict_events("Ukraine")

            assert result["available"] is True
            assert result["country"] == "Ukraine"
            assert result["total_events"] == 2
            assert result["total_fatalities"] == 7
            assert "Battles" in result["by_type"]
            assert len(result["recent_events"]) == 2
            assert result["recent_events"][0]["actor1"] == "Military Forces of Russia"


@pytest.mark.asyncio
async def test_get_conflict_events_no_api_key():
    with patch.dict("os.environ", {}, clear=True):
        result = await get_conflict_events("France")

        assert result["available"] is False
        assert "not configured" in result["error"].lower()


@pytest.mark.asyncio
async def test_get_conflict_events_access_denied():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"message": "Access denied"}

    with patch.dict("os.environ", {"ACLED_API_KEY": "bad_key", "ACLED_EMAIL": "bad@test.com"}):
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

            result = await get_conflict_events("Syria")

            assert result["available"] is False
            assert "access denied" in result["error"].lower()


@pytest.mark.asyncio
async def test_get_conflict_events_timeout():
    import httpx

    with patch.dict("os.environ", {"ACLED_API_KEY": "key", "ACLED_EMAIL": "e@e.com"}):
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=httpx.ReadTimeout("timeout")
            )

            result = await get_conflict_events("Mali")

            assert result["available"] is False
            assert "timeout" in result["error"].lower()


@pytest.mark.asyncio
async def test_get_conflict_events_http_error():
    mock_response = MagicMock()
    mock_response.status_code = 500

    with patch.dict("os.environ", {"ACLED_API_KEY": "key", "ACLED_EMAIL": "e@e.com"}):
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

            result = await get_conflict_events("Libya")

            assert result["available"] is False
            assert "500" in result["error"]


# -- get_news ------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_news_success():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "articles": [
            {
                "title": "Massive flood hits Tokyo",
                "url": "https://www.bbc.com/news/tokyo-flood",
                "seendate": "20250115120000",
            },
            {
                "title": "Earthquake aftermath in Osaka",
                "url": "https://reuters.com/world/osaka-quake",
                "seendate": "20250114080000",
            },
        ]
    }

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_news("Tokyo")

        assert result["total"] == 2
        assert result["articles"][0]["title"] == "Massive flood hits Tokyo"
        assert result["articles"][0]["date"] == "2025-01-15"
        assert result["articles"][0]["source"] == "bbc.com"
        assert result["articles"][1]["source"] == "reuters.com"


@pytest.mark.asyncio
async def test_get_news_empty():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"articles": []}

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_news("Nowhere")

        assert result["total"] == 0
        assert result["articles"] == []


@pytest.mark.asyncio
async def test_get_news_timeout():
    import httpx

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(
            side_effect=httpx.ReadTimeout("timeout")
        )

        result = await get_news("Paris")

        assert result["total"] == 0
        assert "timeout" in result["error"].lower()


@pytest.mark.asyncio
async def test_get_news_http_error():
    mock_response = MagicMock()
    mock_response.status_code = 503

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

        result = await get_news("Berlin")

        assert result["total"] == 0
        assert "503" in result["error"]
