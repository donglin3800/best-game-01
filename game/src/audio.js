// audio.js — every sound in Emberward is synthesized with WebAudio.
// No audio files are shipped; oscillators and filtered noise make the shots,
// impacts, pickups and the night music. Nothing here touches the network.

const NOTE_FREQUENCIES = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
};

// A slow, minor-key lantern theme: bass roots with a sparse bell arpeggio.
const MUSIC_BASS = ['C3', 'A3', 'F3', 'G3'];
const MUSIC_ARP = ['C5', 'E5', 'G5', 'E5', 'A5', 'G5', 'E5', 'D5', 'F4', 'A4', 'C5', 'A4', 'G4', 'B4', 'D5', 'G5'];

export class SoundEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.musicBus = null;
    this.muted = false;
    this.musicOn = false;
    this.musicStep = 0;
    this.musicTimer = 0;
    this.noiseBuffer = null;
  }

  /** Create the AudioContext on first user gesture (browsers require it). */
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.context = new Ctor();
    this.master = this.context.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.context.destination);
    this.musicBus = this.context.createGain();
    this.musicBus.gain.value = 0.16;
    this.musicBus.connect(this.master);
    const length = this.context.sampleRate;
    this.noiseBuffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  /** A short oscillator blip with a pitch slide and an exponential fade. */
  blip({ type = 'sine', from = 440, to = 220, duration = 0.12, volume = 0.3, when = 0, bus = null }) {
    if (!this.context || this.muted) return;
    const t0 = this.context.currentTime + when;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(bus || this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  /** A burst of filtered noise (impacts, explosions, footsteps of the dark). */
  noise({ duration = 0.2, volume = 0.3, frequency = 1200, type = 'lowpass', when = 0 }) {
    if (!this.context || this.muted) return;
    const t0 = this.context.currentTime + when;
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const filter = this.context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(t0);
    source.stop(t0 + duration + 0.02);
  }

  /** A two-note chime, used for pickups and upgrade choices. */
  chime(notes, volume = 0.25) {
    notes.forEach((note, i) => {
      this.blip({ type: 'sine', from: NOTE_FREQUENCIES[note], to: NOTE_FREQUENCIES[note], duration: 0.35, volume, when: i * 0.07 });
    });
  }

  shoot() {
    this.blip({ type: 'square', from: 880, to: 320, duration: 0.08, volume: 0.12 });
  }

  enemyHit() {
    this.noise({ duration: 0.07, volume: 0.16, frequency: 2400, type: 'highpass' });
  }

  enemyDie() {
    this.blip({ type: 'sawtooth', from: 320, to: 60, duration: 0.22, volume: 0.2 });
    this.noise({ duration: 0.18, volume: 0.2, frequency: 900 });
  }

  playerHurt() {
    this.blip({ type: 'sawtooth', from: 180, to: 70, duration: 0.25, volume: 0.3 });
    this.noise({ duration: 0.15, volume: 0.22, frequency: 500 });
  }

  lanternHurt() {
    this.blip({ type: 'triangle', from: 240, to: 90, duration: 0.3, volume: 0.28 });
  }

  emberPickup() {
    this.blip({ type: 'sine', from: 1320, to: 1760, duration: 0.09, volume: 0.14 });
  }

  dash() {
    this.noise({ duration: 0.16, volume: 0.18, frequency: 3000, type: 'bandpass' });
  }

  waveHorn() {
    this.blip({ type: 'sawtooth', from: 98, to: 98, duration: 0.5, volume: 0.22 });
    this.blip({ type: 'sawtooth', from: 147, to: 147, duration: 0.5, volume: 0.16, when: 0.05 });
  }

  upgradePick() {
    this.chime(['C5', 'E5', 'G5'], 0.22);
  }

  bossRoar() {
    this.blip({ type: 'sawtooth', from: 70, to: 38, duration: 0.9, volume: 0.35 });
    this.noise({ duration: 0.7, volume: 0.25, frequency: 300 });
  }

  victory() {
    this.chime(['C5', 'E5', 'G5', 'C5', 'E5', 'G5'], 0.24);
  }

  defeat() {
    this.blip({ type: 'triangle', from: 220, to: 55, duration: 1.1, volume: 0.3 });
    this.blip({ type: 'triangle', from: 165, to: 41, duration: 1.2, volume: 0.22, when: 0.15 });
  }

  startMusic() {
    this.musicOn = true;
    this.musicStep = 0;
    this.musicTimer = 0;
  }

  stopMusic() {
    this.musicOn = false;
  }

  /** Called every frame; steps the music sequencer on its own clock. */
  update(dt) {
    if (!this.context || !this.musicOn || this.muted) return;
    this.musicTimer -= dt;
    while (this.musicTimer <= 0) {
      this.musicTimer += 0.42;
      const step = this.musicStep % 16;
      const bar = Math.floor(this.musicStep / 16) % MUSIC_BASS.length;
      if (step === 0) {
        this.blip({ type: 'triangle', from: NOTE_FREQUENCIES[MUSIC_BASS[bar]], to: NOTE_FREQUENCIES[MUSIC_BASS[bar]], duration: 1.4, volume: 0.5, bus: this.musicBus });
      }
      if (step % 2 === 0) {
        const note = MUSIC_ARP[(this.musicStep / 2) % MUSIC_ARP.length];
        this.blip({ type: 'sine', from: NOTE_FREQUENCIES[note], to: NOTE_FREQUENCIES[note], duration: 0.5, volume: 0.35, bus: this.musicBus });
      }
      this.musicStep++;
    }
  }
}
