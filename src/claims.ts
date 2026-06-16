// Turn each `//@ contract`-carrying function into a claimcheck claim:
//   requirement = the contract (natural language)
//   lemmaName   = the function name
//   dafnyCode   = a synthesized contract block (signature + requires + ensures)
// A contract with no requires/ensures has nothing formal behind it → a gap.
import type { RawModule, RawFunction } from "../../LemmaScript/tools/src/rawir.js";

export interface SpecView {
  signature: string;
  requires: string[];
  ensures: string[];
}

export interface BackedClaim {
  fn: RawFunction;
  requirement: string;
  spec: SpecView;
  dafnyCode: string;
}

export interface Gap {
  specId: string;
  requirement: string;
  reason: string;
}

export function renderSig(fn: RawFunction): string {
  const tp = fn.typeParams.length ? `<${fn.typeParams.join(", ")}>` : "";
  const params = fn.params.map((p) => `${p.name}: ${p.tsType}`).join(", ");
  return `${fn.name}${tp}(${params}): ${fn.returnType}`;
}

/** The formal side fed to claimcheck — a Dafny-ish block built from the IR.
 *  LemmaScript spec syntax is near-identical to Dafny, so claimcheck's
 *  informalizer reads it directly; `\result` denotes the return value. */
export function synthContract(fn: RawFunction): string {
  const lines = [`function ${renderSig(fn)}`];
  for (const r of fn.requires) lines.push(`  requires ${r}`);
  for (const e of fn.ensures) lines.push(`  ensures ${e}`);
  return lines.join("\n");
}

export function collectClaims(mod: RawModule): { backed: BackedClaim[]; gaps: Gap[] } {
  const backed: BackedClaim[] = [];
  const gaps: Gap[] = [];
  for (const fn of mod.functions) {
    if (fn.contract.length === 0) continue;
    const requirement = fn.contract.join(" ");
    if (fn.requires.length === 0 && fn.ensures.length === 0) {
      gaps.push({
        specId: fn.name,
        requirement,
        reason: "//@ contract present but no //@ requires/ensures to back it",
      });
      continue;
    }
    backed.push({
      fn,
      requirement,
      spec: { signature: renderSig(fn), requires: fn.requires, ensures: fn.ensures },
      dafnyCode: synthContract(fn),
    });
  }
  return { backed, gaps };
}
