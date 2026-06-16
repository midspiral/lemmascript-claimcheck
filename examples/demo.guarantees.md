# Guarantees: examples/demo.ts

Generated: 2026-06-16

> Verification is **assumed** (run `lsc check` to discharge the proofs). This report vets only that each `//@ contract` faithfully describes its formal `requires`/`ensures`, via claimcheck's blind round-trip.

## Coverage

- **2** backed contracts: 1 confirmed, 1 disputed
- **1** gaps (contract with no formal spec behind it)

## Claimcheck Results

| Function | Contract | Status |
|----------|----------|--------|
| `clamp` | Clamps x into the inclusive range [lo, hi]; the result never falls outside it. | ✅ confirmed |
| `largest` | Returns the larger of a and b. | ❌ disputed |

## Confirmed Guarantees

**Clamps x into the inclusive range [lo, hi]; the result never falls outside it.** — `clamp`
```
clamp(x: number, lo: number, hi: number): number
  requires lo <= hi
  ensures \result >= lo && \result <= hi
```
- Back-translation: The clamp function takes three numbers (x, lo, hi) and returns a number that is greater than or equal to lo and less than or equal to hi.

## Disputed

**Returns the larger of a and b.** — `largest`
- Weakening: weakened-postcondition
- Discrepancy: The requirement says the function returns the LARGER of a and b, meaning the result must be >= a AND >= b (i.e., result = max(a, b)). The contract only ensures result >= a, completely omitting the constraint that result >= b. A value could satisfy the postcondition while being less than b, meaning it is not necessarily the larger of the two values.
- Back-translation: The largest function takes two numbers (a, b) and returns a number that is greater than or equal to a.
```
largest(a: number, b: number): number
  ensures \result >= a
```

## Gaps

- `double`: Doubles its input. — //@ contract present but no //@ requires/ensures to back it

