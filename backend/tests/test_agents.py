"""Unit tests for agent creation — verifies each factory creates the right agent with correct tools."""
import pytest
from unittest.mock import patch, MagicMock


@patch("agents.maritime_agent.BedrockModel")
@patch("agents.maritime_agent.Agent")
def test_create_maritime_agent(mock_agent_cls, mock_model_cls):
    from agents.maritime_agent import create_maritime_agent

    mock_agent_cls.return_value = MagicMock()

    agent = create_maritime_agent()

    mock_model_cls.assert_called_once()
    mock_agent_cls.assert_called_once()
    call_kwargs = mock_agent_cls.call_args[1]
    assert len(call_kwargs["tools"]) == 7  # 5 maritime + geocode + weather
    assert agent is mock_agent_cls.return_value


@patch("agents.aviation_agent.BedrockModel")
@patch("agents.aviation_agent.Agent")
def test_create_aviation_agent(mock_agent_cls, mock_model_cls):
    from agents.aviation_agent import create_aviation_agent

    mock_agent_cls.return_value = MagicMock()

    agent = create_aviation_agent()

    mock_model_cls.assert_called_once()
    mock_agent_cls.assert_called_once()
    call_kwargs = mock_agent_cls.call_args[1]
    assert len(call_kwargs["tools"]) == 5  # 3 aviation + geocode + weather
    assert agent is mock_agent_cls.return_value


@patch("agents.doomsday_agent.BedrockModel")
@patch("agents.doomsday_agent.Agent")
def test_create_doomsday_agent(mock_agent_cls, mock_model_cls):
    from agents.doomsday_agent import create_doomsday_agent

    mock_agent_cls.return_value = MagicMock()

    agent = create_doomsday_agent()

    mock_model_cls.assert_called_once()
    mock_agent_cls.assert_called_once()
    call_kwargs = mock_agent_cls.call_args[1]
    assert len(call_kwargs["tools"]) == 4  # climate + earthquakes + geocode + weather
    assert agent is mock_agent_cls.return_value


@patch("agents.conflict_agent.BedrockModel")
@patch("agents.conflict_agent.Agent")
def test_create_conflict_agent(mock_agent_cls, mock_model_cls):
    from agents.conflict_agent import create_conflict_agent

    mock_agent_cls.return_value = MagicMock()

    agent = create_conflict_agent()

    mock_model_cls.assert_called_once()
    mock_agent_cls.assert_called_once()
    call_kwargs = mock_agent_cls.call_args[1]
    assert len(call_kwargs["tools"]) == 2  # conflict + news
    assert agent is mock_agent_cls.return_value


@patch("agents.solar_system_agent.BedrockModel")
@patch("agents.solar_system_agent.Agent")
def test_create_solar_system_agent(mock_agent_cls, mock_model_cls):
    from agents.solar_system_agent import create_solar_system_agent

    mock_agent_cls.return_value = MagicMock()

    agent = create_solar_system_agent()

    mock_model_cls.assert_called_once()
    mock_agent_cls.assert_called_once()
    call_kwargs = mock_agent_cls.call_args[1]
    assert len(call_kwargs["tools"]) == 2  # flares + NEO
    assert agent is mock_agent_cls.return_value


# -- Agent-as-Tools wrappers ---------------------------------------------------

@patch("agents.agent_tools.create_maritime_agent")
def test_maritime_analyst_tool(mock_factory):
    from agents.agent_tools import maritime_analyst

    mock_agent = MagicMock()
    mock_agent.return_value = "2 vessels detected near Marseille"
    mock_factory.return_value = mock_agent

    result = maritime_analyst(query="Monitor Marseille port")

    mock_factory.assert_called_once()
    mock_agent.assert_called_once_with("Monitor Marseille port")
    assert "2 vessels" in result


@patch("agents.agent_tools.create_aviation_agent")
def test_aviation_analyst_tool(mock_factory):
    from agents.agent_tools import aviation_analyst

    mock_agent = MagicMock()
    mock_agent.return_value = "3 aircraft in the area"
    mock_factory.return_value = mock_agent

    result = aviation_analyst(query="Aircraft near Paris")

    mock_factory.assert_called_once()
    assert "3 aircraft" in result


@patch("agents.agent_tools.create_doomsday_agent")
def test_doomsday_analyst_tool(mock_factory):
    from agents.agent_tools import doomsday_analyst

    mock_agent = MagicMock()
    mock_agent.return_value = "Earthquake M4.2 detected"
    mock_factory.return_value = mock_agent

    result = doomsday_analyst(query="Natural hazards in Turkey")

    mock_factory.assert_called_once()
    assert "Earthquake" in result


@patch("agents.agent_tools.create_conflict_agent")
def test_conflict_analyst_tool(mock_factory):
    from agents.agent_tools import conflict_analyst

    mock_agent = MagicMock()
    mock_agent.return_value = "5 conflict events in Ukraine"
    mock_factory.return_value = mock_agent

    result = conflict_analyst(query="Conflicts in Ukraine")

    mock_factory.assert_called_once()
    assert "5 conflict events" in result


@patch("agents.agent_tools.create_solar_system_agent")
def test_solar_system_analyst_tool(mock_factory):
    from agents.agent_tools import solar_system_analyst

    mock_agent = MagicMock()
    mock_agent.return_value = "X-class solar flare detected"
    mock_factory.return_value = mock_agent

    result = solar_system_analyst(query="Solar flares this week")

    mock_factory.assert_called_once()
    assert "solar flare" in result
