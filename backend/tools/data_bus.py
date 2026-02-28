"""
Data bus — lightweight event propagation from tools to the SSE stream.

Tools inside sub-agents call `emit()` to publish structured data.
The orchestrator stream calls `drain()` to collect and forward them.

Uses a simple module-level list. Safe for single-event-loop asyncio
(all coroutines share one thread). For multi-worker production deployments,
swap for an asyncio.Queue per session.
"""

_pending: list[dict] = []


def emit(event: dict) -> None:
    """Push a structured event (called by tools)."""
    _pending.append(event)


def drain() -> list[dict]:
    """Pop all pending events (called by the orchestrator stream)."""
    events = list(_pending)
    _pending.clear()
    return events
