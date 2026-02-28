"""Unit tests for the orchestrator — Agent-as-Tools pattern."""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from agents.orchestrator import _format_briefing


# -- _format_briefing (legacy, still used) -------------------------------------

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


# -- _get_orchestrator_agent ---------------------------------------------------

@patch("agents.orchestrator.BedrockModel")
@patch("agents.orchestrator.Agent")
def test_get_orchestrator_agent_has_all_tools(mock_agent_cls, mock_model_cls):
    from agents.orchestrator import _get_orchestrator_agent

    mock_agent_cls.return_value = MagicMock()

    agent = _get_orchestrator_agent()

    mock_model_cls.assert_called_once()
    mock_agent_cls.assert_called_once()
    call_kwargs = mock_agent_cls.call_args[1]
    # 5 specialist agent-tools + geocode_location + get_weather = 7
    assert len(call_kwargs["tools"]) == 7
    assert "orchestrator" in call_kwargs["system_prompt"].lower() or "osint" in call_kwargs["system_prompt"].lower()


# -- run_orchestrator (integration) --------------------------------------------

@pytest.mark.asyncio
async def test_run_orchestrator_calls_orchestrator_agent():
    from agents.orchestrator import run_orchestrator

    mock_orchestrator = MagicMock()
    mock_orchestrator.return_value = "Cross-enriched briefing with maritime and conflict data"

    with patch("agents.orchestrator._get_orchestrator_agent", return_value=mock_orchestrator), \
         patch("agents.orchestrator.asyncio.to_thread", new_callable=AsyncMock) as mock_to_thread:

        mock_to_thread.return_value = "Cross-enriched briefing with maritime and conflict data"

        result = await run_orchestrator("Analyze the Marseille area")

        mock_to_thread.assert_called_once_with(mock_orchestrator, "Analyze the Marseille area")
        assert "Cross-enriched" in result


@pytest.mark.asyncio
async def test_run_orchestrator_handles_errors():
    from agents.orchestrator import run_orchestrator

    mock_orchestrator = MagicMock()

    with patch("agents.orchestrator._get_orchestrator_agent", return_value=mock_orchestrator), \
         patch("agents.orchestrator.asyncio.to_thread", new_callable=AsyncMock) as mock_to_thread:

        mock_to_thread.side_effect = Exception("Model error")

        result = await run_orchestrator("test query")

        assert "[Error]" in result


# -- _run_agent ----------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_agent_success():
    from agents.orchestrator import _run_agent

    mock_agent = MagicMock()

    with patch("agents.orchestrator.asyncio.to_thread", new_callable=AsyncMock) as mock_to_thread:
        mock_to_thread.return_value = "Agent result"

        result = await _run_agent(mock_agent, "test query")

        assert result == "Agent result"


@pytest.mark.asyncio
async def test_run_agent_error():
    from agents.orchestrator import _run_agent

    mock_agent = MagicMock()

    with patch("agents.orchestrator.asyncio.to_thread", new_callable=AsyncMock) as mock_to_thread:
        mock_to_thread.side_effect = Exception("Connection failed")

        result = await _run_agent(mock_agent, "test query")

        assert "[Error]" in result
        assert "Connection failed" in result
