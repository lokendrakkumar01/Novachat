// ============================================================
// NovaChat - Web Audio API Sound Effects Synthesizer
// Clean, pure JavaScript Web Audio API synthesizer for ringtones,
// call alerts, and message notification sounds.
// ============================================================

let audioCtx = null;
let outgoingInterval = null;
let incomingInterval = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// ------------------------------------------------------------
// 1. Message Received Notification Sound (Soft Chime)
// ------------------------------------------------------------
export function playMessageSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Note 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Note 2: E5 (659.25 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.08);
    gain2.gain.setValueAtTime(0.2, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.35);
  } catch (e) {
    console.warn("Could not play message sound:", e);
  }
}

// ------------------------------------------------------------
// 2. Outgoing Call Ringback Tone (Pulsed Dial Tone)
// ------------------------------------------------------------
export function playOutgoingRing() {
  stopOutgoingRing();
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playPulse = () => {
      if (!audioCtx || audioCtx.state === "closed") return;
      const now = ctx.currentTime;

      // 440 Hz + 480 Hz dual tone
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.4);
      osc2.stop(now + 1.4);
    };

    playPulse();
    outgoingInterval = setInterval(playPulse, 3000);
  } catch (e) {
    console.warn("Could not play outgoing ring tone:", e);
  }
}

export function stopOutgoingRing() {
  if (outgoingInterval) {
    clearInterval(outgoingInterval);
    outgoingInterval = null;
  }
}

// ------------------------------------------------------------
// 3. Incoming Call Ringtone (Melodic WhatsApp Chime)
// ------------------------------------------------------------
export function playIncomingRingtone() {
  stopIncomingRingtone();
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playChimeSequence = () => {
      if (!audioCtx || audioCtx.state === "closed") return;
      const now = ctx.currentTime;
      const notes = [
        { f: 587.33, t: 0 },    // D5
        { f: 659.25, t: 0.15 }, // E5
        { f: 880.00, t: 0.3 },  // A5
        { f: 783.99, t: 0.5 },  // G5
        { f: 659.25, t: 0.7 },  // E5
        { f: 880.00, t: 0.9 },  // A5
      ];

      notes.forEach(({ f, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + t);
        gain.gain.setValueAtTime(0.18, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.3);
      });
    };

    playChimeSequence();
    incomingInterval = setInterval(playChimeSequence, 2000);
  } catch (e) {
    console.warn("Could not play incoming ringtone:", e);
  }
}

export function stopIncomingRingtone() {
  if (incomingInterval) {
    clearInterval(incomingInterval);
    incomingInterval = null;
  }
}

// ------------------------------------------------------------
// 4. Call Ended Sound (Descending Tone)
// ------------------------------------------------------------
export function playCallEnded() {
  try {
    stopOutgoingRing();
    stopIncomingRingtone();

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.warn("Could not play call ended sound:", e);
  }
}

export default {
  playMessageSound,
  playOutgoingRing,
  stopOutgoingRing,
  playIncomingRingtone,
  stopIncomingRingtone,
  playCallEnded,
};
