// Synthesized audio via Web Audio API — no asset imports.
let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function playChime() {
  const c = ac();
  if (!c) return;
  const now = c.currentTime;
  const notes = [523.25, 783.99]; // C5, G5
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.25, now + i * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.5);
    osc.connect(gain).connect(c.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.55);
  });
}

export function playApplause() {
  const c = ac();
  if (!c) return;
  const now = c.currentTime;
  const dur = 1.6;
  const buffer = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / c.sampleRate;
    const env = Math.min(1, t * 4) * Math.max(0, 1 - t / dur);
    data[i] = (Math.random() * 2 - 1) * env * 0.5;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2000;
  filter.Q.value = 0.5;
  const gain = c.createGain();
  gain.gain.value = 0.6;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start();
  // Add a soft chord on top
  [523.25, 659.25, 783.99].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = f;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    o.connect(g).connect(c.destination);
    o.start(now + i * 0.05);
    o.stop(now + 1.5);
  });
}
