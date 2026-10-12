export class Synth {
  context?: AudioContext;
  master?: GainNode;
  muted = false;
  active = false;
  step = 0;
  next = 0;
  world = 0;
  async unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : 0.15;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") await this.context.resume();
    } catch {
      /* Audio is optional; the game remains playable when a browser denies it. */
    }
  }
  setMute(muted: boolean) {
    this.muted = muted;
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(
        muted ? 0 : 0.15,
        this.context.currentTime,
        0.02,
      );
  }
  tone(
    freq: number,
    duration: number,
    type: OscillatorType = "square",
    volume = 0.18,
    delay = 0,
    slide = 0,
  ) {
    if (
      !this.context ||
      !this.master ||
      this.context.state !== "running" ||
      this.muted
    )
      return;
    const t = this.context.currentTime + delay;
    const osc = this.context.createOscillator(),
      gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide)
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(25, freq + slide),
        t + duration,
      );
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.015);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  effect(name: string) {
    if (name === "jump") this.tone(240, 0.13, "square", 0.2, 0, 400);
    if (name === "fly") {
      this.tone(880, 0.08);
      this.tone(1320, 0.12, "square", 0.17, 0.065);
    }
    if (name === "stomp" || name === "brick")
      this.tone(145, 0.14, "triangle", 0.6, 0, -90);
    if (name === "fire") this.tone(520, 0.12, "sawtooth", 0.12, 0, -390);
    if (name === "hurt" || name === "death") {
      this.tone(240, 0.3, "sawtooth", 0.28, 0, -185);
      this.tone(80, 0.25, "triangle", 0.4, 0.12);
    }
    if (name === "power" || name === "checkpoint")
      [330, 440, 550, 660].forEach((n, i) =>
        this.tone(n, 0.12, "square", 0.15, i * 0.07),
      );
    if (name === "block" || name === "pipe")
      this.tone(420, 0.18, "triangle", 0.4, 0, -250);
    if (name === "boss-hit") this.tone(120, 0.25, "sawtooth", 0.4, 0, -70);
    if (name === "clear" || name === "victory" || name === "boss-dead")
      [523, 659, 784, 1047].forEach((n, i) =>
        this.tone(n, 0.3, "square", 0.2, i * 0.12),
      );
  }
  update(playing: boolean, world: number) {
    if (!this.context || this.context.state !== "running") return;
    this.active = playing;
    this.world = world;
    if (!playing || this.muted) {
      this.next = this.context.currentTime;
      return;
    }
    const now = this.context.currentTime;
    if (this.next < now - 0.5) this.next = now;
    const melody = [0, 7, 12, 7, 3, 10, 14, 10, 5, 12, 15, 12, 7, 10, 14, 7];
    while (this.next < now + 0.08) {
      const transpose = [0, -3, 5, -5][world];
      const note = melody[this.step % melody.length] + transpose;
      const freq = 261.63 * 2 ** (note / 12);
      const delay = Math.max(0, this.next - now);
      this.tone(freq, 0.115, "triangle", 0.16, delay);
      if (this.step % 4 === 0)
        this.tone(65.4 * 2 ** (transpose / 12), 0.24, "triangle", 0.28, delay);
      if (this.step % 4 === 2) this.tone(42, 0.07, "square", 0.08, delay, -12);
      this.next += world === 3 ? 0.17 : 0.19;
      this.step++;
    }
  }
}
