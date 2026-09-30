/**
 * A SEEDED RANDOM SOURCE: the same seed gives the same numbers, in the same
 * order, on every device and in every version from 1.1.0 on. Hand it to
 * `randomScramble` and two people a world apart turn the same scramble.
 *
 * The seed is any text. It is hashed to 32 bits (xmur3) and the numbers come
 * from mulberry32: small, quick and even enough for a scramble. It is not for
 * secrets.
 *
 * @example
 * const random = seededRandom("club night");
 * movesNotation(randomScramble(3, 25, random), 3); // the same 25 turns, everywhere
 */
export function seededRandom(seed: string): () => number {
  let hash = 1779033703 ^ seed.length;
  for (let at = 0; at < seed.length; at += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(at), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
  let state = (hash ^ (hash >>> 16)) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
