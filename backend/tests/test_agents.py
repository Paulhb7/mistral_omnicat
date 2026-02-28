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
