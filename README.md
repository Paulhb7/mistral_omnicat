# OSINT Intelligence Backend

Système d'analyse OSINT (Open Source Intelligence) pour la surveillance maritime, aérienne et l'évaluation des risques.

## Architecture

```
┌───────────────────────────────────────────────────────┐
│                   ORCHESTRATOR                        │
│  ┌─────────────┐    ┌─────────────┐    ┌───────────┐  │
│  │ Aviation    │    │ Maritime    │    │ Doomsday  │  │
│  │ Agent       │    │ Agent       │    │ Agent     │  │
│  └─────────────┘    └─────────────┘    └───────────┘  │
│       │                │                    │           │
└───────┼────────────────┼────────────────────┼───────────┘
        │                │                    │
┌───────▼────────────────▼────────────────────▼───────┐
│                   TOOLS LAYER                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ Geo Tools   │  │ Aviation    │  │ Maritime    │  │
│  │ (Nominatim) │  │ (OpenSky)    │  │ (AISStream) │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ Weather     │  │ Doomsday    │  │ Conflict    │  │
│  │ (Open-Meteo)│  │ (NASA/USGS) │  │ (ACLED)     │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└───────────────────────────────────────────────────────┘
```

## Fonctionnalités

### 1. Surveillance Maritime
- Suivi AIS temps réel via WebSocket
- Base de données SQLite locale pour l'historique
- Recherche par nom/MMSI
- Surveillance de zones géographiques

### 2. Surveillance Aérienne
- Recherche d'avions dans une zone
- Détails des aéronefs (ICAO, vol, type)
- Analyse des risques (sanctions)

### 3. Évaluation des Risques
- Événements climatiques (NASA EONET)
- Séismes récents (USGS)
- Conflits armés (ACLED)
- Niveau de menace global

## Installation

### Prérequis
- Python 3.10+
- Compte AWS avec accès Bedrock
- Clé API AISStream (gratuit via GitHub)

### Étapes

1. Cloner le dépôt:
```bash
git clone https://github.com/Paulhb7/mistral_wwh_aristocats.git
cd mistral_wwh_aristocats/backend
```

2. Installer les dépendances:
```bash
pip install -r requirements.txt
```

3. Configurer l'environnement:
```bash
cp ../.env.example .env
# Éditer .env avec vos clés API
```

4. Lancer l'application:
```bash
python main.py
```

## Utilisation

```
Orchestrateur OSINT prêt ! (tape 'quit' pour quitter)

Exemple : 'Analyse la zone de Marseille'

>>> Analyse la zone de Marseille
```

### Exemples de Requêtes
- `Analyse la zone de Marseille`
- `Quels navires sont près du détroit de Gibraltar ?`
- `Quels avions survolent Paris ?`
- `Quels sont les risques autour de Kiev ?`

## Configuration

### Variables d'Environnement

| Variable                  | Description                          | Exemple                     |
|---------------------------|--------------------------------------|-----------------------------|
| `AWS_BEARER_TOKEN_BEDROCK`| Clé API AWS Bedrock                  | `api_key`                   |
| `AWS_DEFAULT_REGION`      | Région AWS                           | `us-east-2`                 |
| `AISSTREAM_API_KEY`       | Clé API AISStream                    | `votre_cle_aisstream`       |

### Fichier .env
```
AWS_BEARER_TOKEN_BEDROCK=api_key
AWS_DEFAULT_REGION=us-east-2
AISSTREAM_API_KEY=votre_cle_aisstream
```

## Dépendances

- `strands-agents` : Framework principal pour les agents
- `boto3` : Client AWS pour Bedrock
- `websockets` : Connexion WebSocket pour AIS
- `httpx` : Requêtes HTTP asynchrones
- `python-dotenv` : Gestion des variables d'environnement

## Architecture Technique

### Agents

1. **Orchestrator** (`agents/orchestrator.py`)
   - Point d'entrée principal
   - Coordination des agents spécialisés
   - Formatage des résultats

2. **Aviation Agent** (`agents/aviation_agent.py`)
   - Recherche d'avions
   - Analyse des risques aériens

3. **Maritime Agent** (`agents/maritime_agent.py`)
   - Surveillance AIS
   - Suivi des navires

4. **Doomsday Agent** (`agents/doomsday_agent.py`)
   - Évaluation des risques
   - Analyse des conflits

### Outils

- **Geo Tools** : Géocodage et météo
- **Aviation Tools** : OpenSky Network, ADS-B Exchange
- **Maritime Tools** : AISStream, base SQLite
- **Doomsday Tools** : NASA EONET, USGS, ACLED

## Base de Données

Le système utilise une base SQLite (`maritime_data.db`) pour stocker:
- Positions historiques des navires
- Zones surveillées
- Métadonnées des navires

## API Externes

| Service          | Utilisation                     | URL                          |
|-------------------|---------------------------------|------------------------------|
| OpenStreetMap     | Géocodage                       | nominatim.openstreetmap.org  |
| Open-Meteo        | Conditions météo                | api.open-meteo.com           |
| OpenSky Network   | Données aviation                | opensky-network.org          |
| ADS-B Exchange    | Données aviation (fallback)     | adsbexchange.com             |
| AISStream         | Données AIS temps réel          | aisstream.io                 |
| NASA EONET        | Événements climatiques          | eonet.sci.gsfc.nasa.gov      |
| USGS              | Données sismiques               | earthquake.usgs.gov         |
| ACLED             | Données conflits (optionnel)    | acleddata.com                |

## Modèle IA

- **Modèle** : Mistral 7B Instruct
- **Fournisseur** : AWS Bedrock
- **Région** : us-east-2 (recommandé)

## Exemple de Sortie

```
============================================================
BRIEFING OSINT
============================================================

📍 Zone : Marseille, France
   Coordonnées : 43.2965, 5.3698

🌤️  Météo : Ciel dégagé | 18°C | Vent 12 km/h | Humidité 65%

────────────────────────────────────────────────────────────
🚢 MARITIME
────────────────────────────────────────────────────────────
3 navires détectés dans la zone :
- CMA CGM MARSEILLE (MMSI: 228123456) - En route à 12 nœuds
- COSTA PACIFICA (MMSI: 247123456) - Au mouillage
- LE BORÉAL (MMSI: 226123456) - En route à 8 nœuds

────────────────────────────────────────────────────────────
✈️  AVIATION
────────────────────────────────────────────────────────────
2 avions détectés :
- AFR1234 (ICAO: 39A123) - Airbus A320, Altitude: 10000m
- EJY5678 (ICAO: 401ABC) - Embraer E190, Altitude: 8000m

────────────────────────────────────────────────────────────
💀 DOOMSDAY — RISQUES & MENACES
────────────────────────────────────────────────────────────
- RISQUES NATURELS : Aucun événement actif
- RISQUES SECURITAIRES : Aucun conflit rapporté
- NIVEAU DE MENACE : AUCUN
- NOTE ANALYSTE : Zone sécurisée, trafic normal

============================================================
```

## Développement

### Structure des Fichiers
```
backend/
├── agents/          # Agents spécialisés
├── tools/           # Outils et intégrations API
├── prompts/         # Prompts pour les agents
├── main.py          # Point d'entrée CLI
└── requirements.txt # Dépendances
```

### Ajouter un Nouvel Agent

1. Créer un fichier dans `agents/`
2. Définir les outils nécessaires dans `tools/`
3. Ajouter un prompt dans `prompts/`
4. Intégrer dans l'orchestrateur

### Tests

Les tests peuvent être exécutés avec:
```bash
# Tests unitaires (à implémenter)
python -m pytest tests/

# Vérification des imports
python -c "from agents.orchestrator import run_orchestrator; print('OK')"
```

## Licence

MIT

## Auteur

Paulhb7

## Remerciements

- Mistral AI pour le modèle de langage
- Les fournisseurs de données OSINT ouverts
- La communauté open-source

---

*Ce projet est en développement actif. Les contributions sont les bienvenues !*
