# DESIGN — vetting intent against spec in LemmaScript

## The gap

LemmaScript proves a function's `//@ requires`/`//@ ensures`. It cannot prove the spec *means* what the author thinks it means. A spec can be verified and still guarantee less — or other — than intended: `ensures \result >= a` proves cleanly but does not say "the larger of a and b."

`claimcheck` closes that gap for Dafny lemmas by round-tripping: informalize the formal contract back to English **blind** (without seeing the stated requirement), then compare. This tool applies the same round-trip to LemmaScript, with the natural-language claim co-located as a `//@ contract` annotation on the function:

```ts
//@ contract Clamps x into the inclusive range [lo, hi]; the result never falls outside it.
//@ requires lo <= hi
//@ ensures \result >= lo && \result <= hi
export function clamp(x: number, lo: number, hi: number): number { ... }
```

Because the same author writes both the prose and the spec, a mismatch is a **self-consistency** failure: their mental model and their formalization diverged. That is arguably more useful than checking an externally-supplied requirement — it catches the author misleading themselves (or a reader) about what the proof buys.

## Why co-location

`claimcheck`'s weakest link is its external `{requirement, lemmaName}` mapping JSON — a hand-authored file that drifts from the code. Putting the claim *on the function* as `//@ contract` makes the mapping implicit: each function carrying a contract is exactly one claim, and `lsc extract` emits the pairing for free. There is no second registry to maintain. (Contrast `lemmafit`, which hand-authors a `SPEC.yaml` plus a `guarantees.json` mapping; here both are derived.)

## The trust model

A guarantee in the output report rests on three independent legs:

1. **verified** — `lsc check` discharges the `requires`/`ensures` (LemmaScript's job).
2. **specified** — there is a formal contract behind the English, not just prose.
3. **vetted** — the round-trip confirms the English faithfully describes that spec.

This tool establishes only leg 3. It **assumes** leg 1 (verification is run separately; the report header says so) and it does **not** re-check leg 2's lowering — that LemmaScript's spec compiles faithfully to Dafny/Lean is LemmaScript's own guarantee, not the gap being filled here. So the trust boundary is precise: *given a verified spec, does the contract describe it?* A `//@ contract` with no `requires`/`ensures` has leg 2 missing — it is reported as a **gap**, a claim with nothing formal behind it.

## Decisions

- **Formal side is LS-level.** The round-trip informalizes a synthesized `function … requires … ensures …` block built from the IR's signature and spec strings — not generated Dafny. Checking the generated Dafny would test lowering fidelity, which is out of scope (see leg 2). The synthesized block keeps the tool a pure consumer of `lsc extract`.
- **Reuse `claimcheck` unchanged.** It is shelled as a sibling via `--stdin`. Its prompts are Dafny-flavored, but they read the synthesized block (LemmaScript spec syntax, TS types, `\result`) without adaptation — no fork or special-casing was needed.
- **`//@ contract` lives in the public extractor.** It is a verified-docstring directive in the `//@` namespace, ignored by the prover (never parsed as a spec expression). The extractor surfaces it so this tool can stay a downstream consumer, exactly like `lsc extract` feeds `lemmascript-guard`.

## Architecture

A consumer of two siblings, no logic of its own beyond the adapter and the report:

```
core.ts ──lsc extract──▶ Raw IR (carries //@ contract per function)
                              │  collect: backed claims + gaps
   {requirement, lemmaName, dafnyCode: synth block} ──claimcheck --stdin──▶ verdicts
                              │  merge
                  domain.guarantees.json + domain.guarantees.md
```

`RawModule` is imported type-only (the IR shape); its values arrive over the subprocess. The report is named after the source file, mirroring `lemmascript-guard`'s `core.guarded.ts`.

## The feedback loop

A disputed verdict points to one of two fixes, and the `weakeningType` usually says which:

- the spec proves less than the prose claims → **strengthen the `ensures`** (then re-verify), or
- the prose overstates what was intended → **fix the `//@ contract`**.

Either way the report is the prompt: write intent in English, prove a spec, and let the round-trip surface where they disagree. This composes with an agent loop — the disputed entries and their discrepancies are direct, actionable feedback.

## Limitations

- **Verification is assumed**, not enforced. The report vets faithfulness only; an unverified file can still produce a clean-looking report. Run `lsc check` first.
- **The unit is one function.** Cross-function properties (a state-machine invariant) are captured only insofar as each action's `//@ ensures` carries them; there is no whole-module claim.
- **Function names leak intent** into the otherwise-blind Pass 1 (`largest`, `clamp`). The round-trip tolerates this, as `claimcheck` does, but a deliberately misleading name could anchor a back-translation.
- **The check is only as honest as the contracts are load-bearing.** On a toy spec the round-trip is correct-by-construction theater; its value shows on a spec where a weakened `ensures` would be a genuine, catchable lie.
