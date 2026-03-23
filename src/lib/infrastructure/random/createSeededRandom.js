export function createSeededRandom(seed) {
  let state = seed >>> 0 || 1;

  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    range(min, max) {
      if (max <= min) {
        return min;
      }

      return min + this.next() * (max - min);
    },
    int(min, max) {
      if (max <= min) {
        return min;
      }

      return Math.floor(this.range(min, max + 1));
    },
    pick(values) {
      if (values.length === 0) {
        return undefined;
      }

      return values[this.int(0, values.length - 1)];
    },
    chance(probability) {
      return this.next() <= probability;
    },
    sign() {
      return this.chance(0.5) ? 1 : -1;
    },
  };
}
