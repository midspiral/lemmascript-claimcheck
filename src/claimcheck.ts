// Shell the sibling `claimcheck --stdin` for the blind round-trip. The backend
// and models are claimcheck's own concern — we just forward flags, so any setup
// works (direct API, --bedrock, --vertex, the in-claimcheck --claude-code,
// --model/--compare-model/--informalize-model, --single-prompt, ...).
//
// Configuration, lowest to highest precedence:
//   $CLAIMCHECK       which binary: a command on PATH, or a path to a dev
//                     checkout's bin/claimcheck.js (run via node). Default: `claimcheck`.
//   $CLAIMCHECK_ARGS  default flags, space-separated (a project's persistent backend
//                     choice, e.g. "--bedrock" or "--claude-code").
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
  if (!env) return { cmd: "claimcheck", pre: [] };
  return env.endsWith(".js") ? { cmd: "node", pre: [env] } : { cmd: env, pre: [] };
}

/** Backend/model flags from $CLAIMCHECK_ARGS, then CLI passthrough (CLI wins). */
export function claimcheckArgs(passthrough: string[] = []): string[] {
  const envArgs = (process.env.CLAIMCHECK_ARGS ?? "").split(/\s+/).filter(Boolean);
  return ["--stdin", ...envArgs, ...passthrough];
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
