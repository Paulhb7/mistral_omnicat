# Voice Pipeline

OmniCAT features a full voice interaction system inspired by Jarvis (Iron Man). The voice pipeline enables completely hands-free operation: speak a query, hear the intelligence briefing, and continue the conversation.

## Overview

```
┌─────────┐     PCM 16kHz      ┌──────────┐     Text      ┌──────────────┐
│   Mic   │ ──────────────────► │ Voxtral  │ ────────────► │ Orchestrator │
│ (WebAPI)│     WebSocket       │   STT    │               │  + Agents    │
└─────────┘                     └──────────┘               └──────┬───────┘
                                                                  │
                                                            Briefing text
                                                                  │
┌─────────┐    audio/mpeg       ┌──────────┐                      │
│ Speaker │ ◄────────────────── │ElevenLabs│ ◄────────────────────┘
│ + Orb   │     Streaming       │   TTS    │      POST /tts
└─────────┘                     └──────────┘
     │
     │ AnalyserNode
     ▼
┌─────────┐
│ OmniOrb │  3D particle sphere reacts to voice frequencies
└─────────┘
```

## Speech-to-Text (STT)

**Service**: Mistral Voxtral (`voxtral-mini-transcribe-realtime-2602`)
**Protocol**: WebSocket at `/ws/stt`
**Audio Format**: PCM signed 16-bit little-endian, 16kHz, mono

### How It Works

1. User clicks the mic button or the orb — the browser's `MediaRecorder` captures audio
2. Audio is sent as raw PCM frames over a WebSocket connection to the backend
3. The backend proxies frames to Mistral's Voxtral real-time transcription service
4. Partial transcripts are streamed back to the frontend in real-time
5. **Silence detection**: after 1.5 seconds of silence (no speech detected), the transcript is auto-submitted as a query

### Fallback: File Upload STT

An alternative `POST /stt` endpoint accepts audio file uploads. The backend sends the file to Voxtral's non-realtime endpoint (`voxtral-mini-2602`) and returns the full transcript. This is used as a fallback when WebSocket is unavailable.

## Text-to-Speech (TTS)

**Service**: ElevenLabs
**Model**: `eleven_turbo_v2_5` (optimized for lowest latency)
**Endpoint**: `POST /tts`

### Custom Voice: "Omni"

A custom ElevenLabs voice ("Omni") was created specifically for this project using ElevenLabs' voice design tools. The voice is inspired by Jarvis from Iron Man — authoritative, calm, with a slight British inflection perfectly suited for intelligence briefings.

**Voice ID**: `1aBfmKpXXPzK6xmSpeqn`
**Settings**:
- Stability: 0.5 (balanced expression — not robotic, not too expressive)
- Similarity Boost: 0.75 (close to the designed voice profile)

### Streaming Playback

The TTS endpoint returns streaming `audio/mpeg`. The frontend creates an `<audio>` element and plays the stream as it arrives, minimizing time-to-first-audio. The audio element is connected to a Web Audio `AnalyserNode` for the OmniOrb visualization.

## Barge-In

Barge-in allows the user to interrupt the agent mid-speech by simply talking. This creates a natural conversational feel.

### Detection Mechanism

1. During TTS playback, the microphone remains active
2. RMS (Root Mean Square) energy is computed from mic input
3. Echo cancellation prevents the speaker's own output from triggering barge-in
4. A **3-frame confirmation** is required: energy must exceed the threshold for 3 consecutive frames to confirm intentional speech
5. A **500ms cooldown** prevents rapid re-triggering after a barge-in

### What Happens on Barge-In

1. TTS audio is immediately paused and discarded
2. A `sfxBargeIn()` sound effect plays (quick chirp)
3. The system transitions back to listening mode
4. The new speech is captured and transcribed

## OmniOrb — 3D Voice Visualizer

**File**: `frontend/src/components/omni-orb.tsx`
**Technology**: Three.js

The OmniOrb is a 3D animated particle sphere that reacts to voice audio in real-time.

### Particle System

- **Inner sphere**: 2,800 particles distributed on a Fibonacci sphere
- **Outer halo**: 700 particles for glow effect
- **Total**: 3,500 animated particles

The Fibonacci sphere distribution ensures even coverage without clustering at poles (a common problem with latitude/longitude-based distribution).

### Audio Reactivity

The orb connects to the TTS audio output through the Web Audio API:

```
<audio> element → createMediaElementSource() → AnalyserNode → getByteFrequencyData()
```

The frequency data (256 bins) drives particle displacement:
- Low frequencies push particles outward globally
- Mid frequencies create surface ripples
- High frequencies add fine-grain noise

This means the orb visually represents what the AI voice is actually saying — deep tones make it expand, sibilants make it shimmer.

### States

| State | Animation |
|-------|-----------|
| Idle | Gentle breathing motion (slow sine wave) |
| Listening | Subtle pulse synced to mic input RMS |
| Processing | Faster rotation, expanded radius |
| Speaking | Full audio-reactive deformation |

## HUD Sound Effects

**File**: `frontend/src/utils/sfx.ts`
**Technology**: Web Audio API (pure synthesis, no audio files)

All sounds are synthesized in real-time using oscillators, filters, and envelopes. No audio files are loaded.

| Sound | Function | Description |
|-------|----------|-------------|
| Boot | `sfxActivate()` | Ascending tones + breath sound — played when voice mode activates |
| Shutdown | `sfxDeactivate()` | Descending tones — voice mode deactivates |
| Listening | `sfxListening()` | Digital chirp — mic starts capturing |
| Submit | `sfxSubmit()` | Confirmation tone — query sent to agents |
| Speak Start | `sfxSpeakStart()` | Ascending sweep — TTS begins |
| Complete | `sfxComplete()` | Triad chord — briefing finished |
| Incoming Call | `sfxIncomingCall()` | Ringing tone — easter egg popups |
| Barge-In | `sfxBargeIn()` | Quick chirp — user interrupts |

### Audio Design Techniques

- **Slapback delay**: Short delay (30-50ms) creates spatial depth, simulating a HUD environment
- **Stereo detuning**: Left and right oscillators slightly detuned for width
- **Filtered noise**: Bandpass and lowpass filtered noise for "digital breath" textures
- **Frequency sweeps**: Glissando effects for activation/deactivation transitions
- **Sub-bass pulses**: Low-frequency pulses felt more than heard, adding physical presence
- **Attack/hold/release envelopes**: Precise timing for crisp, responsive sound design

## Voice Loop

The complete voice interaction cycle:

1. **Activate**: User clicks mic/orb → `sfxActivate()` plays → WebSocket opens to `/ws/stt`
2. **Listen**: Microphone captures audio → PCM frames sent to Voxtral → partial transcripts displayed
3. **Silence detected** (1.5s): `sfxSubmit()` plays → transcript submitted as query
4. **Process**: Orchestrator routes to agents → SSE events stream → loader animates
5. **Speak**: Briefing text sent to `/tts` → `sfxSpeakStart()` → ElevenLabs audio streams → OmniOrb reacts
6. **Complete**: Audio ends → `sfxComplete()` plays → system returns to step 2 (listen)
7. **Barge-in** (optional): User speaks during step 5 → TTS stops → jump to step 2

The loop continues until the user clicks the mic/orb again to deactivate (`sfxDeactivate()`).
