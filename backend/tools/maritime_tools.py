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
    0: "En route (moteur)",
    1: "Au mouillage",
    2: "Non commande",
    3: "Manoeuvrabilite restreinte",
    4: "Contraint par son tirant d'eau",
    5: "Amarre",
    6: "Echoue",
    7: "En peche",
    8: "En route (voile)",
    14: "AIS-SART actif",
    15: "Non defini",
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
        print(f"[AISStream] Erreur: {e}")


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
        lines.append(f"=== {static['ship_name'] or 'Navire inconnu'} ===")
        lines.append(f"  MMSI: {static['mmsi']}")
        if static['imo_number']:
            lines.append(f"  IMO: {static['imo_number']}")
        if static['call_sign']:
            lines.append(f"  Indicatif: {static['call_sign']}")
        if static['vessel_type']:
            lines.append(f"  Type: {static['vessel_type']}")
        if static['destination']:
            lines.append(f"  Destination: {static['destination']}")
        if static['eta_month']:
            lines.append(f"  ETA: {static['eta_day']:02d}/{static['eta_month']:02d} {static['eta_hour']:02d}:{static['eta_minute']:02d}")
        a, b = static['dimension_a'], static['dimension_b']
        if a and b:
            lines.append(f"  Longueur: {a + b}m")
    if pos:
        if not static:
            lines.append(f"=== Navire MMSI {pos['mmsi']} ({pos['ship_name'] or '?'}) ===")
        nav = NAV_STATUS.get(pos['nav_status'], "Inconnu")
        lines.append(f"  Position: {pos['latitude']:.5f}, {pos['longitude']:.5f}")
        lines.append(f"  Vitesse: {pos['sog']} noeuds")
        lines.append(f"  Cap: {pos['cog']} deg")
        lines.append(f"  Statut: {nav}")
        lines.append(f"  Mise a jour: {pos['timestamp_utc']}")
    return "\n".join(lines)


# ---- Tools ----

@tool
async def search_vessel(name_or_mmsi: str) -> str:
    """Recherche un navire par nom ou MMSI. Interroge la base locale puis ecoute le flux AIS en direct si necessaire.

    Args:
        name_or_mmsi: Le nom du navire (partiel) ou son numero MMSI (9 chiffres).

    Returns:
        Informations sur le navire trouve (position, identite, statut).
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
            return "Erreur : cle API AISStream manquante (AISSTREAM_API_KEY)."

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
        return f"Aucun signal AIS recu pour le MMSI {mmsi} dans les 30 dernieres secondes. Le navire est peut-etre hors couverture."
    else:
        name_query = name_or_mmsi.strip().upper()
        c.execute("SELECT * FROM vessel_static WHERE ship_name LIKE ?", (f"%{name_query}%",))
        results = c.fetchall()
        if results:
            lines = [f"{len(results)} navire(s) trouve(s) pour '{name_or_mmsi}' :"]
            for r in results:
                c.execute("SELECT * FROM vessel_positions WHERE mmsi=? ORDER BY received_at DESC LIMIT 1", (r['mmsi'],))
                pos = c.fetchone()
                lines.append("")
                lines.append(_format_vessel_info(pos, r))
            conn.close()
            return "\n".join(lines)
        conn.close()
        return f"Aucun navire nomme '{name_or_mmsi}' en base locale. Essayez avec le MMSI (9 chiffres) pour une recherche en direct."


@tool
async def track_vessel_position(mmsi: str, duration_seconds: int = 30) -> str:
    """Recupere la position en temps reel d'un navire via son MMSI en ecoutant le flux AIS.

    Args:
        mmsi: Le numero MMSI du navire (9 chiffres).
        duration_seconds: Duree d'ecoute en secondes (defaut: 30, max: 120).

    Returns:
        Position actuelle du navire avec vitesse, cap et statut.
    """
    _init_db()
    api_key = os.getenv("AISSTREAM_API_KEY", "")
    if not api_key:
        return "Erreur : variable AISSTREAM_API_KEY non configuree."

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
    return f"Aucun signal AIS recu pour le MMSI {mmsi} pendant {duration}s. Le navire est peut-etre hors couverture AIS."


@tool
async def get_vessel_history(mmsi: str, limit: int = 20) -> str:
    """Recupere l'historique des positions d'un navire stocke localement.

    Args:
        mmsi: Le numero MMSI du navire (9 chiffres).
        limit: Nombre maximum de positions a retourner (defaut: 20).

    Returns:
        Historique des positions avec horodatage, coordonnees, vitesse et cap.
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
        return f"Aucun historique pour le MMSI {mmsi}. Utilisez track_vessel_position pour commencer a collecter des donnees."

    lines = [f"Historique du navire MMSI {mmsi} ({rows[0]['ship_name'] or 'Inconnu'}) - {len(rows)} positions :"]
    lines.append("-" * 80)
    for r in rows:
        nav = NAV_STATUS.get(r["nav_status"], "?")
        lines.append(
            f"  {r['timestamp_utc']} | "
            f"Lat: {r['latitude']:.5f}, Lon: {r['longitude']:.5f} | "
            f"Vitesse: {r['sog']} kn | Cap: {r['cog']} deg | "
            f"Statut: {nav}"
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
    """Surveille une zone geographique et collecte les donnees AIS de tous les navires presents.

    Args:
        lat_min: Latitude minimale de la zone (ex: 43.0).
        lon_min: Longitude minimale de la zone (ex: 5.0).
        lat_max: Latitude maximale de la zone (ex: 44.0).
        lon_max: Longitude maximale de la zone (ex: 6.0).
        label: Nom de la zone pour reference (ex: Port de Marseille).
        duration_seconds: Duree de surveillance en secondes (defaut: 60, max: 300).

    Returns:
        Liste des navires detectes dans la zone avec leurs positions.
    """
    _init_db()
    api_key = os.getenv("AISSTREAM_API_KEY", "")
    if not api_key:
        return "Erreur : variable AISSTREAM_API_KEY non configuree."

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
        return f"Aucun navire detecte dans la zone '{zone_label}' pendant {duration}s."

    seen = {}
    for r in rows:
        if r["mmsi"] not in seen:
            seen[r["mmsi"]] = r

    lines = [f"Zone '{zone_label}' - {len(seen)} navire(s) detecte(s) en {duration}s :"]
    lines.append("-" * 80)
    for mmsi, r in seen.items():
        nav = NAV_STATUS.get(r["nav_status"], "?")
        lines.append(
            f"  MMSI: {r['mmsi']} | Nom: {r['ship_name'] or '?'} | "
            f"Pos: {r['latitude']:.4f}, {r['longitude']:.4f} | "
            f"Vitesse: {r['sog']} kn | Statut: {nav}"
        )
    return "\n".join(lines)


@tool
async def list_monitored_vessels() -> str:
    """Liste tous les navires connus en base locale et les zones surveillees.

    Returns:
        Resume des navires trackes et zones surveillees.
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
    lines.append(f"=== Navires connus ({len(vessels)}) ===")
    if vessels:
        for v in vessels:
            lines.append(
                f"  MMSI: {v['mmsi']} | {v['ship_name'] or '?'} | "
                f"Pos: {v['latitude']:.4f}, {v['longitude']:.4f} | "
                f"Dest: {v['destination'] or '?'} | Vu: {v['received_at']}"
            )
    else:
        lines.append("  Aucun navire en base.")

    lines.append(f"\n=== Zones surveillees ({len(areas)}) ===")
    if areas:
        for a in areas:
            lines.append(
                f"  {a['label']} | [{a['lat_min']},{a['lon_min']}]-[{a['lat_max']},{a['lon_max']}] | "
                f"Creee: {a['created_at']}"
            )
    else:
        lines.append("  Aucune zone surveillee.")

    return "\n".join(lines)
