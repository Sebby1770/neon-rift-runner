/**
 * Lightweight Web Audio synthesizer for SFX + optional ambient music bed.
 */

const SOUNDS = {
  launch: [130, 220, 420],
  gate: [500, 760],
  pickup: [660, 980],
  rift: [440, 660, 990],
  overdrive: [180, 360, 720, 1080],
  shield: [320, 620, 880],
  miss: [250, 140],
  hit: [120, 90],
  crash: [180, 90, 45],
  tap: [340],
  nearmiss: [880, 1200],
  milestone: [520, 780, 1040],
  achievement: [392, 523, 659, 784],
};

export function createAudio({ getMuted, getSfxVolume, getMusicEnabled, getMusicVolume } = {}) {
  let context;
  let musicGain = null;
  let musicNodes = [];
  let musicStarted = false;
  let arpeggioTimer = null;

  const isMuted = () => (typeof getMuted === 'function' ? getMuted() : false);
  const sfxVol = () => {
    const v = typeof getSfxVolume === 'function' ? getSfxVolume() : 0.8;
    return Math.max(0, Math.min(1, v));
  };
  const musicOn = () => (typeof getMusicEnabled === 'function' ? getMusicEnabled() : true);
  const musicVol = () => {
    const v = typeof getMusicVolume === 'function' ? getMusicVolume() : 0.55;
    return Math.max(0, Math.min(1, v));
  };

  function ensureContext() {
    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
      return null;
    }
    const Ctx = AudioContext || webkitAudioContext;
    if (!context) context = new Ctx();
    return context;
  }

  function stopMusicInternal() {
    if (arpeggioTimer) {
      clearInterval(arpeggioTimer);
      arpeggioTimer = null;
    }
    for (const node of musicNodes) {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch {
        // already stopped
      }
    }
    musicNodes = [];
    if (musicGain) {
      try {
        musicGain.disconnect();
      } catch {
        // ignore
      }
      musicGain = null;
    }
    musicStarted = false;
  }

  function applyMusicGain() {
    if (!musicGain || !context) return;
    const level = isMuted() || !musicOn() ? 0 : 0.045 * musicVol();
    musicGain.gain.setTargetAtTime(level, context.currentTime, 0.08);
  }

  /**
   * Soft low pad + sparse triangle arpeggio. Starts once, loops while enabled.
   */
  function startMusicInternal() {
    const ctx = ensureContext();
    if (!ctx) return;
    if (musicStarted) {
      applyMusicGain();
      return;
    }
    if (isMuted() || !musicOn() || musicVol() <= 0) return;

    if (ctx.state === 'suspended') ctx.resume();

    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(ctx.destination);

    // Low drone pad (two detuned sines)
    const padFreqs = [55, 82.5, 110];
    padFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.value = 0.22 - i * 0.04;
      // Slow LFO on amplitude for movement
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.07 + i * 0.03;
      lfoGain.gain.value = 0.08;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      osc.connect(g);
      g.connect(musicGain);
      osc.start();
      lfo.start();
      musicNodes.push(osc, lfo, g, lfoGain);
    });

    // Soft filter for warmth
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.6;
    // Re-route: pad already into musicGain — add arpeggio through filter
    filter.connect(musicGain);
    musicNodes.push(filter);

    // Sparse arpeggio notes (cyber-ish minor)
    const notes = [220, 261.63, 329.63, 392, 329.63, 261.63];
    let step = 0;
    arpeggioTimer = setInterval(() => {
      if (!context || isMuted() || !musicOn() || !musicGain) return;
      const now = context.currentTime;
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = 'triangle';
      const f = notes[step % notes.length];
      osc.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.09, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(g);
      g.connect(filter);
      osc.start(now);
      osc.stop(now + 0.6);
      step += 1;
    }, 720);

    musicStarted = true;
    applyMusicGain();
  }

  return {
    resume() {
      const ctx = ensureContext();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    play(name) {
      if (isMuted()) return;
      const ctx = ensureContext();
      if (!ctx) return;
      const sequence = SOUNDS[name];
      if (!sequence) return;
      const master = sfxVol();
      if (master <= 0) return;
      const now = ctx.currentTime;
      const peak = 0.055 * master;
      sequence.forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = name === 'hit' || name === 'crash' ? 'sawtooth' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.055);
        oscillator.frequency.exponentialRampToValueAtTime(
          Math.max(40, frequency * 0.7),
          now + index * 0.055 + 0.12,
        );
        gain.gain.setValueAtTime(0.001, now + index * 0.055);
        gain.gain.exponentialRampToValueAtTime(peak, now + index * 0.055 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.055 + 0.17);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(now + index * 0.055);
        oscillator.stop(now + index * 0.055 + 0.19);
      });
    },
    startMusic() {
      startMusicInternal();
    },
    stopMusic() {
      stopMusicInternal();
    },
    /** Call when mute/music/volume settings change. */
    syncMusic() {
      if (!musicOn() || isMuted() || musicVol() <= 0) {
        applyMusicGain();
        return;
      }
      if (!musicStarted) {
        startMusicInternal();
      } else {
        applyMusicGain();
      }
    },
    isMusicPlaying() {
      return musicStarted && musicOn() && !isMuted();
    },
  };
}
