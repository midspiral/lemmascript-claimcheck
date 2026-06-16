// Shell `claimcheck --stdin` for the blind round-trip. The backend and models are
// claimcheck's concern — we just forward flags, so any setup works (direct API,
// --bedrock, --vertex, the in-claimcheck --claude-code, --model/--compare-model,
// --single-prompt, ...).
//
// Configuration, lowest to highest precedence:
//   (default)         shell `claimcheck` from PATH (install with `npm i -g claimcheck`).
//   $CLAIMCHECK       override: a command on PATH, or a path to a dev checkout's
//                     bin/claimcheck.js (run via node).
//   $CLAIMCHECK_ARGS  default flags, space-separated (a project's persistent
//                     backend choice, e.g. "--bedrock" or "--claude-code").
//   passthrough       per-invocation flags from the CLI (override the env default).
import { execFileSync } from "child_process";

export interface Informalization {
  naturalLanguage?: string;
  preconditions?: string;
  postcondition?: string;
  scope?: string;
  strength?: string;
  confidence?: number;
}

export interface CCResult {
  requirement: string;
  lemmaName: string;
  status: "confirmed" | "disputed" | "error";
  dafnyCode?: string;
  informalization?: Informalization;
  comparison?: { match?: boolean; discrepancy?: string; weakeningType?: string; explanation?: string };
  discrepancy?: string;
  weakeningType?: string;
  error?: string;
}

export interface Claim {
  requirement: string;
  lemmaName: string;
  dafnyCode: string;
}

function resolveCmd(): { cmd: string; pre: string[] } {
  const env = process.env.CLAIMCHECK;
  if (env) return env.endsWith(".js") ? { cmd: "node", pre: [env] } : { cmd: env, pre: [] };
  return { cmd: "claimcheck", pre: [] };
}

/** `--lang lemmascript` (the formal side is a function contract, not a Dafny lemma),
 *  then $CLAIMCHECK_ARGS, then CLI passthrough — later wins, so either can override. */
export function claimcheckArgs(passthrough: string[] = []): string[] {
  const envArgs = (process.env.CLAIMCHECK_ARGS ?? "").split(/\s+/).filter(Boolean);
  return ["--stdin", "--lang", "lemmascript", ...envArgs, ...passthrough];
}

export function runClaimcheck(claims: Claim[], domain: string, passthrough: string[] = []): CCResult[] {
  if (claims.length === 0) return [];
  const { cmd, pre } = resolveCmd();
  const out = execFileSync(cmd, [...pre, ...claimcheckArgs(passthrough)], {
    input: JSON.stringify({ claims, domain }),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return (JSON.parse(out).results ?? []) as CCResult[];
}
