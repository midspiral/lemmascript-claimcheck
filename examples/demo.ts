// Three contracts exercising every verdict claimcheck can return.
// All three functions VERIFY under `lsc check` — fork #4 assumes the proofs hold;
// claimcheck only judges whether the English matches the formal spec.

//@ contract Clamps x into the inclusive range [lo, hi]; the result never falls outside it.
//@ requires lo <= hi
//@ ensures \result >= lo && \result <= hi
export function clamp(x: number, lo: number, hi: number): number {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

// The contract claims "the larger of a and b", but the spec only proves `>= a`
// — it never mentions b. The proof guarantees less than the prose advertises.
//@ contract Returns the larger of a and b.
//@ ensures \result >= a
export function largest(a: number, b: number): number {
  return a >= b ? a : b;
}

// A claim with no //@ requires/ensures behind it — nothing formal to check.
//@ contract Doubles its input.
export function double(n: number): number {
  return n + n;
}
