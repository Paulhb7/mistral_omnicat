import json
import os
import sqlite3
import time
from datetime import datetime, timezone
from typing import Optional

import websockets
from strands import tool

# ---- Constants ----
AISSTREAM_WS_URL = "wss://stream.aisstream.io/v0/stream"
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "maritime_data.db")

NAV_STATUS = {
    0: "Under way (engine)",
    1: "At anchor",
    2: "Not under command",
    3: "Restricted maneuverability",
    4: "Constrained by draught",
    5: "Moored",
    6: "Aground",
    7: "Fishing",
    8: "Under way (sail)",
    14: "AIS-SART active",
    15: "Undefined",
}


# ---- Database ----

def _init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS vessel_positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mmsi TEXT NOT NULL,
            ship_name TEXT,
            latitude REAL,
            longitude REAL,
            sog REAL,
            cog REAL,
            true_heading INTEGER,
            nav_status INTEGER,
            timestamp_utc TEXT,
            received_at TEXT DEFAULT (datetime('now'))
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS vessel_static (
            mmsi TEXT PRIMARY KEY,
            ship_name TEXT,
            imo_number INTEGER,
            call_sign TEXT,
            vessel_type INTEGER,
            dimension_a INTEGER,
            dimension_b INTEGER,
            dimension_c INTEGER,
            dimension_d INTEGER,
            destination TEXT,
            eta_month INTEGER,
            eta_day INTEGER,
            eta_hour INTEGER,
            eta_minute INTEGER,
            draught REAL,
            last_updated TEXT DEFAULT (datetime('now'))
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS monitored_entities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_type TEXT NOT NULL,
            label TEXT,
            lat_min REAL, lon_min REAL,
            lat_max REAL, lon_max REAL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    c.execute("CREATE INDEX IF NOT EXISTS idx_pos_mmsi ON vessel_positions(mmsi)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_pos_time ON vessel_positions(received_at)")
    conn.commit()
    conn.close()


# ---- WebSocket listener ----

async def _ws_listener(
    api_key: str,
    bounding_boxes: list,
    mmsi_filters: list = None,
    duration_seconds: int = 30,
):
    """Connect to AISStream, collect messages for duration_seconds, store in SQLite."""
    subscribe_msg = {
        "APIKey": api_key,
        "BoundingBoxes": bounding_boxes,
        "FilterMessageTypes": ["PositionReport", "ShipStaticData"],
    }
    if mmsi_filters:
        subscribe_msg["FiltersShipMMSI"] = mmsi_filters

    start = time.time()
    try:
        async with websockets.connect(AISSTREAM_WS_URL) as ws:
            await ws.send(json.dumps(subscribe_msg))
            async for raw_msg in ws:
                if (time.time() - start) > duration_seconds:
                    break
                try:
                    msg = json.loads(raw_msg)
                    _store_message(msg)
                except json.JSONDecodeError:
                    continue
    except Exception as e:
        print(f"[AISStream] Error: {e}")


def _store_message(msg: dict):
    msg_type = msg.get("MessageType")
    meta = msg.get("MetaData", {})
    message = msg.get("Message", {})

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    if msg_type == "PositionReport":
        pr = message.get("PositionReport", {})
        c.execute("""
            INSERT INTO vessel_positions
            (mmsi, ship_name, latitude, longitude, sog, cog, true_heading, nav_status, timestamp_utc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(meta.get("MMSI", pr.get("UserID", ""))),
            meta.get("ShipName", ""),
            pr.get("Latitude"),
            pr.get("Longitude"),
            pr.get("Sog"),
            pr.get("Cog"),
            pr.get("TrueHeading"),
            pr.get("NavigationalStatus"),
            meta.get("time_utc", datetime.now(timezone.utc).isoformat()),
        ))
    elif msg_type == "ShipStaticData":
        sd = message.get("ShipStaticData", {})
        dim = sd.get("Dimension", {})
        eta = sd.get("Eta", {})
        c.execute("""
            INSERT OR REPLACE INTO vessel_static
            (mmsi, ship_name, imo_number, call_sign, vessel_type,
             dimension_a, dimension_b, dimension_c, dimension_d,
             destination, eta_month, eta_day, eta_hour, eta_minute,
             draught, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """, (
            str(sd.get("UserID", meta.get("MMSI", ""))),
            sd.get("Name", meta.get("ShipName", "")),
            sd.get("ImoNumber"),
            sd.get("CallSign"),
            sd.get("Type"),
            dim.get("A"), dim.get("B"), dim.get("C"), dim.get("D"),
            sd.get("Destination"),
            eta.get("Month"), eta.get("Day"), eta.get("Hour"), eta.get("Minute"),
            sd.get("MaximumStaticDraught"),
        ))

    conn.commit()
    conn.close()


# ---- Formatting helpers ----

def _format_vessel_info(pos=None, static=None) -> str:
    lines = []
    if static:
        lines.append(f"=== {static['ship_name'] or 'Unknown vessel'} ===")
        lines.append(f"  MMSI: {static['mmsi']}")
        if static['imo_number']:
            lines.append(f"  IMO: {static['imo_number']}")
        if static['call_sign']:
            lines.append(f"  Call sign: {static['call_sign']}")
        if static['vessel_type']:
            lines.append(f"  Type: {static['vessel_type']}")
        if static['destination']:
            lines.append(f"  Destination: {static['destination']}")
        if static['eta_month']:
            lines.append(f"  ETA: {static['eta_day']:02d}/{static['eta_month']:02d} {static['eta_hour']:02d}:{static['eta_minute']:02d}")
        a, b = static['dimension_a'], static['dimension_b']
        if a and b:
            lines.append(f"  Length: {a + b}m")
    if pos:
        if not static:
            lines.append(f"=== Vessel MMSI {pos['mmsi']} ({pos['ship_name'] or '?'}) ===")
        nav = NAV_STATUS.get(pos['nav_status'], "Unknown")
        lines.append(f"  Position: {pos['latitude']:.5f}, {pos['longitude']:.5f}")
        lines.append(f"  Speed: {pos['sog']} knots")
        lines.append(f"  Course: {pos['cog']} deg")
        lines.append(f"  Status: {nav}")
        lines.append(f"  Updated: {pos['timestamp_utc']}")
    return "\n".join(lines)


# ---- Tools ----

@tool
async def search_vessel(name_or_mmsi: str) -> str:
    """Search for a vessel by name or MMSI. Queries the local database then listens to the live AIS stream if needed.

    Args:
        name_or_mmsi: The vessel name (partial) or its MMSI number (9 digits).

    Returns:
        Information about the vessel found (position, identity, status).
    """
    _init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    is_mmsi = name_or_mmsi.strip().isdigit() and len(name_or_mmsi.strip()) == 9
    mmsi = name_or_mmsi.strip()

    if is_mmsi:
        c.execute("SELECT * FROM vessel_positions WHERE mmsi=? ORDER BY received_at DESC LIMIT 1", (mmsi,))
        pos = c.fetchone()
        c.execute("SELECT * FROM vessel_static WHERE mmsi=?", (mmsi,))
        static = c.fetchone()
        if pos or static:
            conn.close()
            return _format_vessel_info(pos, static)

        conn.close()
        api_key = os.getenv("AISSTREAM_API_KEY", "")
        if not api_key:
            return "Error: AISStream API key missing (AISSTREAM_API_KEY)."

        await _ws_listener(
            api_key=api_key,
            bounding_boxes=[[[-90, -180], [90, 180]]],
            mmsi_filters=[mmsi],
            duration_seconds=30,
        )

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM vessel_positions WHERE mmsi=? ORDER BY received_at DESC LIMIT 1", (mmsi,))
        pos = c.fetchone()
        c.execute("SELECT * FROM vessel_static WHERE mmsi=?", (mmsi,))
        static = c.fetchone()
        conn.close()
        if pos or static:
            return _format_vessel_info(pos, static)
        return f"No AIS signal received for MMSI {mmsi} in the last 30 seconds. The vessel may be out of AIS coverage."
    else:
        name_query = name_or_mmsi.strip().upper()
        c.execute("SELECT * FROM vessel_static WHERE ship_name LIKE ?", (f"%{name_query}%",))
        results = c.fetchall()
        if results:
            lines = [f"{len(results)} vessel(s) found for '{name_or_mmsi}':"]
            for r in results:
                c.execute("SELECT * FROM vessel_positions WHERE mmsi=? ORDER BY received_at DESC LIMIT 1", (r['mmsi'],))
                pos = c.fetchone()
                lines.append("")
                lines.append(_format_vessel_info(pos, r))
            conn.close()
            return "\n".join(lines)
        conn.close()
        return f"No vessel named '{name_or_mmsi}' found in local database. Try using the MMSI (9 digits) for a live search."


@tool
async def track_vessel_position(mmsi: str, duration_seconds: int = 30) -> str:
    """Retrieve a vessel's real-time position via its MMSI by listening to the AIS stream.

    Args:
        mmsi: The vessel's MMSI number (9 digits).
        duration_seconds: Listening duration in seconds (default: 30, max: 120).

    Returns:
        Current vessel position with speed, course and status.
    """
    _init_db()
    api_key = os.getenv("AISSTREAM_API_KEY", "")
    if not api_key:
        return "Error: AISSTREAM_API_KEY environment variable not configured."

    duration = min(int(duration_seconds), 120)

    await _ws_listener(
        api_key=api_key,
        bounding_boxes=[[[-90, -180], [90, 180]]],
        mmsi_filters=[mmsi.strip()],
        duration_seconds=duration,
    )

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM vessel_positions WHERE mmsi=? ORDER BY received_at DESC LIMIT 1", (mmsi.strip(),))
    pos = c.fetchone()
    c.execute("SELECT * FROM vessel_static WHERE mmsi=?", (mmsi.strip(),))
    static = c.fetchone()
    conn.close()

    if pos:
        return _format_vessel_info(pos, static)
    return f"No AIS signal received for MMSI {mmsi} during {duration}s. The vessel may be out of AIS coverage."


@tool
async def get_vessel_history(mmsi: str, limit: int = 20) -> str:
    """Retrieve a vessel's locally stored position history.

    Args:
        mmsi: The vessel's MMSI number (9 digits).
        limit: Maximum number of positions to return (default: 20).

    Returns:
        Position history with timestamps, coordinates, speed and course.
    """
    _init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT * FROM vessel_positions
        WHERE mmsi = ?
        ORDER BY received_at DESC
        LIMIT ?
    """, (mmsi.strip(), min(int(limit), 100)))
    rows = c.fetchall()
    conn.close()

    if not rows:
        return f"No history for MMSI {mmsi}. Use track_vessel_position to start collecting data."

    lines = [f"Vessel MMSI {mmsi} history ({rows[0]['ship_name'] or 'Unknown'}) - {len(rows)} positions:"]
    lines.append("-" * 80)
    for r in rows:
        nav = NAV_STATUS.get(r["nav_status"], "?")
        lines.append(
            f"  {r['timestamp_utc']} | "
            f"Lat: {r['latitude']:.5f}, Lon: {r['longitude']:.5f} | "
            f"Speed: {r['sog']} kn | Course: {r['cog']} deg | "
            f"Status: {nav}"
        )
    return "\n".join(lines)


@tool
async def monitor_area(
    lat_min: float,
    lon_min: float,
    lat_max: float,
    lon_max: float,
    label: str = "",
    duration_seconds: int = 60,
) -> str:
    """Monitor a geographic area and collect AIS data from all vessels present.

    Args:
        lat_min: Minimum latitude of the area (e.g. 43.0).
        lon_min: Minimum longitude of the area (e.g. 5.0).
        lat_max: Maximum latitude of the area (e.g. 44.0).
        lon_max: Maximum longitude of the area (e.g. 6.0).
        label: Area name for reference (e.g. Port of Marseille).
        duration_seconds: Monitoring duration in seconds (default: 60, max: 300).

    Returns:
        List of vessels detected in the area with their positions.
    """
    _init_db()
    api_key = os.getenv("AISSTREAM_API_KEY", "")
    if not api_key:
        return "Error: AISSTREAM_API_KEY environment variable not configured."

    duration = min(int(duration_seconds), 300)
    bbox = [[[lat_min, lon_min], [lat_max, lon_max]]]
    zone_label = label or f"Zone [{lat_min},{lon_min}]-[{lat_max},{lon_max}]"

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO monitored_entities (entity_type, label, lat_min, lon_min, lat_max, lon_max)
        VALUES ('area', ?, ?, ?, ?, ?)
    """, (zone_label, lat_min, lon_min, lat_max, lon_max))
    conn.commit()
    conn.close()

    await _ws_listener(
        api_key=api_key,
        bounding_boxes=bbox,
        duration_seconds=duration,
    )

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT mmsi, ship_name, latitude, longitude, sog, cog, nav_status, timestamp_utc
        FROM vessel_positions
        WHERE latitude BETWEEN ? AND ?
        AND longitude BETWEEN ? AND ?
        AND received_at >= datetime('now', ?)
        ORDER BY mmsi, received_at DESC
    """, (lat_min, lat_max, lon_min, lon_max, f"-{duration + 10} seconds"))
    rows = c.fetchall()
    conn.close()

    if not rows:
        return f"No vessel detected in area '{zone_label}' during {duration}s."

    seen = {}
    for r in rows:
        if r["mmsi"] not in seen:
            seen[r["mmsi"]] = r

    lines = [f"Area '{zone_label}' - {len(seen)} vessel(s) detected in {duration}s:"]
    lines.append("-" * 80)
    for mmsi, r in seen.items():
        nav = NAV_STATUS.get(r["nav_status"], "?")
        lines.append(
            f"  MMSI: {r['mmsi']} | Nom: {r['ship_name'] or '?'} | "
            f"Pos: {r['latitude']:.4f}, {r['longitude']:.4f} | "
            f"Speed: {r['sog']} kn | Status: {nav}"
        )
    return "\n".join(lines)


@tool
async def list_monitored_vessels() -> str:
    """List all known vessels in the local database and monitored areas.

    Returns:
        Summary of tracked vessels and monitored areas.
    """
    _init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute("""
        SELECT vp.mmsi, vp.ship_name, vp.latitude, vp.longitude, vp.sog,
               vp.received_at, vs.imo_number, vs.call_sign, vs.destination
        FROM vessel_positions vp
        LEFT JOIN vessel_static vs ON vp.mmsi = vs.mmsi
        WHERE vp.id IN (
            SELECT MAX(id) FROM vessel_positions GROUP BY mmsi
        )
        ORDER BY vp.received_at DESC
        LIMIT 50
    """)
    vessels = c.fetchall()

    c.execute("SELECT * FROM monitored_entities ORDER BY created_at DESC LIMIT 20")
    areas = c.fetchall()
    conn.close()

    lines = []
    lines.append(f"=== Known vessels ({len(vessels)}) ===")
    if vessels:
        for v in vessels:
            lines.append(
                f"  MMSI: {v['mmsi']} | {v['ship_name'] or '?'} | "
                f"Pos: {v['latitude']:.4f}, {v['longitude']:.4f} | "
                f"Dest: {v['destination'] or '?'} | Seen: {v['received_at']}"
            )
    else:
        lines.append("  No vessels in database.")

    lines.append(f"\n=== Monitored areas ({len(areas)}) ===")
    if areas:
        for a in areas:
            lines.append(
                f"  {a['label']} | [{a['lat_min']},{a['lon_min']}]-[{a['lat_max']},{a['lon_max']}] | "
                f"Created: {a['created_at']}"
            )
    else:
        lines.append("  No monitored areas.")

    return "\n".join(lines)
