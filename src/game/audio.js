/**
 * Lightweight Web Audio synthesizer for SFX.
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
};

export function createAudio({ getMuted, getSfxVolume } = {}) {
  let context;

  const isMuted = () => (typeof getMuted === 'function' ? getMuted() : false);
  const volume = () => {
    const v = typeof getSfxVolume === 'function' ? getSfxVolume() : 0.8;
    return Math.max(0, Math.min(1, v));
  };

  return {
    resume() {
      if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
        return;
      }
      const Ctx = AudioContext || webkitAudioContext;
      if (!context) context = new Ctx();
      if (context.state === 'suspended') context.resume();
    },
    play(name) {
      if (isMuted()) return;
      if (!context) return;
      const sequence = SOUNDS[name];
      if (!sequence) return;
      const master = volume();
      if (master <= 0) return;
      const now = context.currentTime;
      const peak = 0.055 * master;
      sequence.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = name === 'hit' || name === 'crash' ? 'sawtooth' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.055);
        oscillator.frequency.exponentialRampToValueAtTime(
          Math.max(40, frequency * 0.7),
          now + index * 0.055 + 0.12,
        );
        gain.gain.setValueAtTime(0.001, now + index * 0.055);
        gain.gain.exponentialRampToValueAtTime(peak, now + index * 0.055 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.055 + 0.17);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now + index * 0.055);
        oscillator.stop(now + index * 0.055 + 0.19);
      });
    },
  };
}
