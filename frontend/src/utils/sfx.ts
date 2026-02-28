/**
 * Iron Man Jarvis HUD sound effects — Web Audio API.
 *
 * Clean sine tones with slapback delay for spatial width,
 * gentle envelopes, subtle filtered noise layers.
 * Smooth, precise, digital — like the actual movie UI sounds.
 */

let _ctx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

// ── Core: clean tone with slapback delay for HUD spatial feel ────────────

function hudTone(
  freq: number,
  vol: number,
  attack: number,
  hold: number,
  release: number,
  wave: OscillatorType = 'sine',
  detune = 0,
) {
  const c = ctx();
  const t = c.currentTime;
  const dur = attack + hold + release;

  const osc = c.createOscillator();
  osc.type = wave;
  osc.frequency.value = freq;
  osc.detune.value = detune;

  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  // Slapback delay → gives that spatial HUD quality
  const delay = c.createDelay();
  delay.delayTime.value = 0.06;
  const dGain = c.createGain();
  dGain.gain.value = 0.25;

  osc.connect(g);
  g.connect(c.destination);
  g.connect(delay);
  delay.connect(dGain);
  dGain.connect(c.destination);

  osc.start(t);
  osc.stop(t + dur + 0.1);
}

// ── Stereo pair: two slightly detuned tones for width ────────────────────

function hudStereoTone(freq: number, vol: number, attack: number, hold: number, release: number) {
  hudTone(freq, vol * 0.7, attack, hold, release, 'sine', -6);
  hudTone(freq, vol * 0.7, attack, hold, release, 'sine', 6);
}

// ── Soft filtered noise puff (air / digital ambiance) ────────────────────

function hudBreath(freq: number, vol: number, dur: number) {
  const c = ctx();
  const t = c.currentTime;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buf;

  const lp = c.createBiquadFilter();
  lp.type = 'bandpass';
  lp.frequency.value = freq;
  lp.Q.value = 2;

  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(lp);
  lp.connect(g);
  g.connect(c.destination);
  src.start(t);
  src.stop(t + dur);
}

// ── Clean sweep (smooth freq glide, no resonant harshness) ───────────────

function hudSweep(f0: number, f1: number, dur: number, vol: number) {
  const c = ctx();
  const t = c.currentTime;

  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + dur);

  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  // Gentle low-pass to keep it smooth
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.max(f0, f1) * 1.5;
  lp.Q.value = 0.7;

  osc.connect(lp);
  lp.connect(g);
  g.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

// ── Sub pulse (felt more than heard — adds weight) ───────────────────────

function hudSub(freq: number, vol: number, dur: number) {
  const c = ctx();
  const t = c.currentTime;

  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;

  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(g);
  g.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur);
}

// ═══════════════════════════════════════════════════════════════════════════
// Public SFX — Jarvis HUD
// ═══════════════════════════════════════════════════════════════════════════

/** Voice mode ON — Jarvis boot: ascending clean tones + breath */
export function sfxActivate() {
  hudSub(80, 0.06, 0.3);
  hudSweep(400, 1400, 0.22, 0.03);
  hudBreath(3000, 0.015, 0.3);
  setTimeout(() => hudStereoTone(880, 0.045, 0.01, 0.05, 0.2), 120);
  setTimeout(() => hudStereoTone(1320, 0.04, 0.01, 0.04, 0.25), 220);
  setTimeout(() => hudTone(1760, 0.03, 0.005, 0.03, 0.3), 300);
}

/** Voice mode OFF — Jarvis shutdown: descending tones */
export function sfxDeactivate() {
  hudStereoTone(1100, 0.035, 0.01, 0.04, 0.2);
  hudSweep(1200, 300, 0.25, 0.025);
  setTimeout(() => hudTone(440, 0.03, 0.01, 0.05, 0.25), 100);
  setTimeout(() => hudSub(60, 0.04, 0.2), 150);
}

/** Listening ready — single clean HUD blip */
export function sfxListening() {
  hudTone(1400, 0.035, 0.005, 0.03, 0.12);
  hudBreath(5000, 0.008, 0.1);
}

/** Transcript submitted — quick double-blip confirmation */
export function sfxSubmit() {
  hudTone(1000, 0.03, 0.005, 0.02, 0.1);
  setTimeout(() => hudTone(1500, 0.03, 0.005, 0.02, 0.12), 70);
}

/** Agent starts speaking — soft breath + gentle tone */
export function sfxSpeakStart() {
  hudBreath(2000, 0.015, 0.2);
  hudSweep(600, 1000, 0.15, 0.02);
  hudTone(800, 0.02, 0.01, 0.04, 0.15);
}

/** Incoming call — urgent dual-tone ring (like a secure line) */
export function sfxIncomingCall() {
  // Two-tone alert: alternating frequencies, 3 pulses
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      hudTone(950, 0.06, 0.005, 0.08, 0.08, 'sine');
      hudTone(1400, 0.05, 0.005, 0.08, 0.08, 'sine');
    }, i * 220);
  }
  hudSub(60, 0.05, 0.7);
  hudSweep(300, 900, 0.3, 0.02);
  hudBreath(4000, 0.012, 0.5);
}

/** Briefing complete — ascending triad: clean C-E-G */
export function sfxComplete() {
  hudTone(523, 0.04, 0.005, 0.06, 0.3);          // C5
  setTimeout(() => hudTone(659, 0.035, 0.005, 0.05, 0.3), 90);    // E5
  setTimeout(() => hudTone(784, 0.03, 0.005, 0.05, 0.35), 180);   // G5
  setTimeout(() => hudBreath(6000, 0.008, 0.15), 220);
}
