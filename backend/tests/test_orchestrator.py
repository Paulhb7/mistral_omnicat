"""Unit tests for the orchestrator — routing logic and briefing formatting."""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from agents.orchestrator import _parse_routing, _format_briefing


# -- _parse_routing ------------------------------------------------------------

def test_parse_routing_single_agent():
    assert _parse_routing("maritime") == ["maritime"]


def test_parse_routing_multiple_agents():
    result = _parse_routing("maritime aviation doomsday")
    assert "maritime" in result
    assert "aviation" in result
    assert "doomsday" in result


def test_parse_routing_all_agents():
    result = _parse_routing("maritime aviation doomsday conflict solar_system")
    assert len(result) == 5


def test_parse_routing_case_insensitive():
    result = _parse_routing("MARITIME Aviation Doomsday")
    assert "maritime" in result
    assert "aviation" in result
    assert "doomsday" in result


def test_parse_routing_with_noise():
    result = _parse_routing("I think maritime and aviation would be best here.")
    assert "maritime" in result
    assert "aviation" in result
    assert len(result) == 2


def test_parse_routing_fallback_on_empty():
    result = _parse_routing("")
    assert len(result) == 5  # All agents


def test_parse_routing_fallback_on_garbage():
    result = _parse_routing("hello world bonjour")
    assert len(result) == 5  # All agents


def test_parse_routing_deduplication():
    result = _parse_routing("maritime maritime maritime")
    assert result == ["maritime"]


def test_parse_routing_conflict_agent():
    result = _parse_routing("conflict")
    assert result == ["conflict"]


def test_parse_routing_solar_system():
    result = _parse_routing("solar_system")
    assert result == ["solar_system"]


# -- _format_briefing ----------------------------------------------------------

def test_format_briefing_single_agent():
    result = _format_briefing("test query", {"maritime": "Ship detected"})

    assert "BRIEFING OSINT" in result
    assert "MARITIME" in result
    assert "Ship detected" in result


def test_format_briefing_multiple_agents():
    results = {
        "maritime": "2 vessels found",
        "aviation": "No aircraft detected",
        "doomsday": "1 earthquake M3.5",
    }
    result = _format_briefing("Marseille analysis", results)

    assert "MARITIME" in result
    assert "AVIATION" in result
    assert "DOOMSDAY" in result
    assert "2 vessels found" in result
    assert "No aircraft detected" in result
    assert "1 earthquake M3.5" in result


def test_format_briefing_all_agents():
    results = {
        "maritime": "OK",
        "aviation": "OK",
        "doomsday": "OK",
        "conflict": "OK",
        "solar_system": "OK",
    }
    result = _format_briefing("full scan", results)

    assert "MARITIME" in result
    assert "AVIATION" in result
    assert "DOOMSDAY" in result
    assert "CONFLICT" in result
    assert "SOLAR SYSTEM" in result


def test_format_briefing_unknown_agent_label():
    result = _format_briefing("test", {"unknown_agent": "data"})

    assert "UNKNOWN_AGENT" in result


# -- run_orchestrator (integration) --------------------------------------------

@pytest.mark.asyncio
async def test_run_orchestrator_routes_and_runs():
    from agents.orchestrator import run_orchestrator

    mock_routing_agent = MagicMock()
    mock_routing_agent.return_value = "maritime"

    mock_specialist = MagicMock()
    mock_specialist.return_value = MagicMock()

    with patch("agents.orchestrator._get_router_agent", return_value=mock_routing_agent), \
         patch("agents.orchestrator.asyncio.to_thread", new_callable=AsyncMock) as mock_to_thread, \
         patch("agents.orchestrator._SPECIALISTS", {"maritime": lambda: mock_specialist}):

        mock_to_thread.side_effect = [
            "maritime",  # Router response
            "3 vessels detected in the area",  # Maritime agent response
        ]

        result = await run_orchestrator("Show me ships near Marseille")

        assert "BRIEFING OSINT" in result
        assert "MARITIME" in result
