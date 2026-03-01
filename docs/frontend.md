# Frontend

The OmniCAT frontend is a Next.js 15 application with React 19, TypeScript, and Tailwind CSS 4. It provides a Jarvis-inspired HUD interface for intelligence briefings.

## Pages

### Landing Page (`src/app/page.tsx`)

The home page features:
- Hero section with the OmniCAT title and tagline
- Animated orange globe (wireframe sphere)
- Agent grid showing all 6 specialist agents with icons
- Navigation to the chat interface and the introduction/about page
- Data sources footer strip

### Chat Page (`src/app/chat/page.tsx`)

The main intelligence interface. This is where all the action happens:
- **Search bar**: Text input + microphone toggle for voice mode
- **Map views**: 4 switchable views (Earth, Solar System, Exoplanets, Asteroids)
- **OmniOrb**: 3D voice visualizer (center of the interface in voice mode)
- **Briefing panel**: Collapsible right-side panel with markdown-rendered intelligence briefings
- **Intel panels**: Structured data displays (weather, earthquakes, conflicts, flights, vessels)
- **Jarvis loader**: HUD-style loading animation during agent processing
- **Easter egg popups**: NASA call and Vader call overlays

### About Page (`src/app/about/page.tsx`)

An overview page showing:
- Interactive OmniOrb with voice demo capabilities
- 5-step data flow diagram (Query -> Route -> Tools -> Brief -> Voice)
- Agent grid with descriptions
- Data sources tags
- Tech stack summary

## Components

### OmniOrb (`src/components/omni-orb.tsx`)

3D particle sphere built with Three.js. 2,800 inner particles + 700 halo particles on a Fibonacci sphere distribution. Reacts to audio frequencies in real-time via Web Audio AnalyserNode. See [voice-pipeline.md](./voice-pipeline.md) for full details.

### Earth Map (`src/components/earth-map.tsx`)

Interactive Leaflet map with:
- Dark tile layer (CartoDB dark matter)
- Event overlays for earthquakes, climate events, conflicts
- Vessel and aircraft markers
- Auto-centering on queried locations
- Custom marker icons per event type

### Briefing Panel (`src/components/briefing-panel.tsx`)

Collapsible right-side panel that renders intelligence briefings in markdown. Features:
- Slide-in animation from the right
- Markdown rendering with syntax highlighting
- Auto-scrolls as new content streams in
- Collapse/expand toggle

### Intel Panels (`src/components/intel-panels.tsx`)

Structured data display panels for:
- Weather conditions
- Earthquake data (sortable by magnitude/date)
- Climate events (NASA EONET)
- Conflict events (ACLED)
- Each panel includes mini-map visualization

### Search Bar (`src/components/search-bar.tsx`)

Query input with:
- Text input field with Jarvis-styled theming
- Microphone toggle button for voice mode
- Submit button
- Keyboard shortcut (Enter to submit)

### Jarvis Loader (`src/components/jarvis-loader.tsx`)

HUD-style loading animation:
- Concentric SVG rings with tick marks
- Scanning arc animation
- Pulsing center core
- Two modes: slow idle rotation and fast spin during agent processing

### Easter Egg Popups

- **NASA Call Popup** (`src/components/nasa-call-popup.tsx`): Asteroid mission briefing — triggered by `Cmd+Shift+N`
- **Vader Call Popup** (`src/components/vader-call-popup.tsx`): Dark side exoplanet intelligence — triggered by `Cmd+Shift+V`

Both popups feature:
- Incoming call ringing animation
- `sfxIncomingCall()` sound effect
- Accept with Enter key
- Dismiss with Escape key

## Theme System

**File**: `src/context/theme-context.tsx`

Two themes available, toggled with `Ctrl+Shift+X` (or `Cmd+Shift+X` on macOS):

### OmniCAT Theme (default)

- **Background**: Dark (#0a0a0a)
- **Accent**: Orange (#fa500f)
- **Aesthetic**: Clean monospace HUD, military intelligence briefing style

### Cyberpunk Theme

- **Accent**: Neon cyan (#00f0ff) + Magenta (#ff00aa)
- **Effects**:
  - Scanline overlay (horizontal lines at 0.015 opacity)
  - Neon flicker animation on accent text
  - Glow effects on buttons and interactive elements
  - Text shadow glow
- **Auto-revert**: Automatically switches back to OmniCAT after 10 seconds (designed as a fun visual toggle for demos)

Theme preference persists in `localStorage`.

## Easter Eggs

Two hidden keyboard shortcuts add entertainment during live demos:

### NASA Incoming Call (`Cmd+Shift+N`)

Triggers a full-screen popup simulating an incoming call from NASA. The popup presents an asteroid mission briefing scenario. Press Enter to accept (navigates to asteroid view) or Escape to dismiss.

### Vader Incoming Call (`Cmd+Shift+V`)

Triggers a full-screen popup simulating an incoming call from Darth Vader. The popup presents a dark side exoplanet intelligence scenario. Press Enter to accept (navigates to exoplanet view) or Escape to dismiss.

Both easter eggs were designed specifically for the hackathon demo to add fun and create smooth transitions between different phases of the presentation (e.g., from Earth intelligence to space exploration).

## Auto-Navigation

The chat page includes intelligent auto-navigation that switches map views based on query content:

- **Celestial body detection**: Queries mentioning any of 50+ celestial bodies (planets, moons, spacecraft) automatically switch to NASA Eyes on the Solar System and navigate to that object
- **Asteroid detection**: Keywords like "asteroid", "near-earth object", "NEO" trigger the NASA Eyes on Asteroids view
- **Exoplanet detection**: Queries about exoplanet systems trigger NASA Eyes on Exoplanets

## SSE Streaming Hook

**File**: `src/hooks/use-chat.ts`

Custom React hook that manages the SSE connection to the backend:
- Opens an `EventSource` to `GET /stream?query=...&session_id=...`
- Parses typed events and dispatches them to appropriate state handlers
- Manages loading states, error handling, and connection lifecycle
- Provides the streaming response text and structured data to components

## Styling

- **Tailwind CSS 4** for utility classes
- **CSS custom properties** for theme colors (defined in `globals.css`)
- **CSS animations** defined in `globals.css`:
  - `pulse-radar`: Radar sweep animation
  - `blink`: Cursor/indicator blinking
  - `scanline`: Cyberpunk horizontal line sweep
  - `neon-flicker`: Text glow flicker for Cyberpunk theme
