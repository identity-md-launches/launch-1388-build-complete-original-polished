export class SafeStore {
  memory = new Map<string, string>();
  available = true;
  constructor() {
    try {
      const k = "pepe-odyssey-probe";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
    } catch {
      this.available = false;
    }
  }
  get(key: string, fallback = ""): string {
    try {
      return (
        (this.available
          ? localStorage.getItem(`odyssey:${key}`)
          : this.memory.get(key)) ?? fallback
      );
    } catch {
      this.available = false;
      return this.memory.get(key) ?? fallback;
    }
  }
  set(key: string, value: string) {
    this.memory.set(key, value);
    try {
      if (this.available) localStorage.setItem(`odyssey:${key}`, value);
    } catch {
      this.available = false;
    }
  }
  best(seed: string) {
    const n = Number(this.get(`best:${seed}`, "0"));
    return Number.isSafeInteger(n) && n >= 0 ? n : 0;
  }
  saveBest(seed: string, score: number) {
    const best = Math.max(this.best(seed), score);
    this.set(`best:${seed}`, String(best));
    return best;
  }
}
