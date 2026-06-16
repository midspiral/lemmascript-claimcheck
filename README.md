# lemmascript-claimcheck

`claimcheck` for [LemmaScript](https://lemmascript.com): does a function's `//@ requires`/`//@ ensures` actually say what its plain-English `//@ contract` claims?

LemmaScript proves the formal spec; it can't prove the spec *means* what you think. This vets the gap. Write intent in English next to the proof:

```ts
//@ contract Clamps x into the inclusive range [lo, hi]; the result never falls outside it.
//@ requires lo <= hi
//@ ensures \result >= lo && \result <= hi
export function clamp(x: number, lo: number, hi: number): number { ... }
```

`lemmascript-claimcheck` informalizes the `requires`/`ensures` **blind** (without seeing the `//@ contract`) via the sibling [claimcheck](../claimcheck) round-trip, then compares the back-translation to the contract. A mismatch means your proof guarantees something other than what your prose advertises — or vice versa.

It is a downstream consumer of LemmaScript's frontend, like [lemmascript-guard](../lemmascript-guard): it shells the public `lsc extract` for the Raw IR (now carrying `//@ contract` strings) and shells `claimcheck --stdin` for the round-trip. Expects sibling `../LemmaScript` and `../claimcheck` checkouts (or `$LEMMASCRIPT`, `$CLAIMCHECK`).

## Usage

```sh
npm install
npx tsx src/cli.ts examples/demo.ts --bedrock
```

For `domain.ts` this writes `domain.guarantees.json` and `domain.guarantees.md` next to the source: a trust manifest of what the module promises in English, each promise vetted against its spec, with disputed and unbacked claims flagged.

```
lemmascript-claimcheck <file.ts> [--out <dir>] [--json] [--claims-only] [<claimcheck flags>]
```

- `<file.ts>` is the leading positional. Every other flag (and its value) is forwarded to claimcheck.
- `--claims-only` prints the claims that would be sent (no API call) — useful for inspection.
- `--out <dir>` writes the reports elsewhere; default is next to the source.

## Configuring the backend

The backend and models are claimcheck's concern — pick any setup it supports and pass it through:

| Layer | What | Example |
|-------|------|---------|
| `$CLAIMCHECK` | which binary | a dev checkout's `bin/claimcheck.js` (run via node), else global `claimcheck` |
| `$CLAIMCHECK_ARGS` | persistent default flags | `export CLAIMCHECK_ARGS="--bedrock"` |
| CLI passthrough | per-run flags (override the default) | `... examples/demo.ts --claude-code` |

So any of these work: direct API (`ANTHROPIC_API_KEY`), `--bedrock`, `--vertex`, the in-claimcheck `--claude-code` (reuses your Claude Code auth), `--model`/`--compare-model`/`--informalize-model`, `--single-prompt`. Use `--` to end this tool's own flag parsing.

## Output

Each `//@ contract`-carrying function becomes one entry:

| Status | Meaning |
|--------|---------|
| **confirmed** | the spec faithfully expresses the contract |
| **disputed** | the spec says less/other than the contract (with `weakeningType` + discrepancy) |
| **gap** | a `//@ contract` with no `//@ requires`/`//@ ensures` to back it |

Verification itself is **assumed** (run `lsc check` to discharge the proofs); the report header says so.

## Example

`examples/demo.ts` carries one faithful contract (`clamp`), one that over-claims against a weakened spec (`largest`), and one unbacked claim (`double`) — exercising all three verdicts.
