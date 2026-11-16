// Sound from thin air: a handful of WebAudio oscillators and one noise buffer, shaped into a
// collect chirp, a collision thud and a level-up jingle. No audio files, nothing fetched. The
// context is born on the first user gesture (starting a game), as browsers insist, and the M key
// mutes the lot.

export function createAudio() {
  let context = null;
  let master = null;
  let noiseBuffer = null;
  let muted = false;

  function ensure() {
    if (context !== null) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return true;
    }
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return false;
      context = new AudioCtor();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.45;
      master.connect(context.destination);
      noiseBuffer = context.createBuffer(1, context.sampleRate * 0.25, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
      return true;
    } catch {
      context = null;
      return false;
    }
  }

  function tone({ freq, end = null, duration = 0.12, type = 'sine', volume = 0.5, delay = 0 }) {
    if (!ensure()) return;
    const start = context.currentTime + delay;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (end !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(30, end), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function thud() {
    if (!ensure()) return;
    const start = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, start);
    filter.frequency.exponentialRampToValueAtTime(90, start + 0.22);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.8, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + 0.26);
  }

  return {
    /** Unlock audio from a user gesture; safe to call on every start press. */
    unlock() {
      ensure();
    },
    collect(combo) {
      const lift = Math.min(combo, 8) * 45;
      tone({ freq: 540 + lift, end: 880 + lift, duration: 0.1, type: 'sine', volume: 0.45 });
      tone({ freq: 1080 + lift, duration: 0.07, type: 'triangle', volume: 0.18, delay: 0.03 });
    },
    hit() {
      thud();
      tone({ freq: 170, end: 55, duration: 0.28, type: 'sawtooth', volume: 0.4 });
    },
    levelUp() {
      tone({ freq: 523, duration: 0.09, type: 'triangle', volume: 0.4 });
      tone({ freq: 659, duration: 0.09, type: 'triangle', volume: 0.4, delay: 0.08 });
      tone({ freq: 784, duration: 0.14, type: 'triangle', volume: 0.45, delay: 0.16 });
    },
    gameOver() {
      tone({ freq: 392, duration: 0.16, type: 'triangle', volume: 0.4 });
      tone({ freq: 311, duration: 0.16, type: 'triangle', volume: 0.4, delay: 0.15 });
      tone({ freq: 233, duration: 0.3, type: 'triangle', volume: 0.45, delay: 0.3 });
    },
    toggleMute() {
      muted = !muted;
      if (master !== null) master.gain.value = muted ? 0 : 0.45;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
