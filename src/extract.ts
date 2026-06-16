// Raw IR via LemmaScript's public `lsc extract`. By default we shell `lsc` from
// PATH (install with `npm i -g lemmascript`); set $LEMMASCRIPT to a sibling
// checkout to run its source through tsx instead (dev). The `//@ contract`
// strings ride along on each function (lemmascript >= 0.5.7).
import { execFileSync } from "child_process";
import * as path from "path";
import type { RawModule } from "./ir.js";

function lscInvocation(): { cmd: string; pre: string[] } {
  const env = process.env.LEMMASCRIPT;
  if (env) {
    const lsc = path.join(env, "tools", "src", "lsc.ts");
    return { cmd: "npx", pre: ["--prefix", path.join(env, "tools"), "tsx", lsc] };
  }
  return { cmd: "lsc", pre: [] };
}

export function extractModule(absFile: string): RawModule {
  const { cmd, pre } = lscInvocation();
  const json = execFileSync(cmd, [...pre, "extract", absFile], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  return JSON.parse(json) as RawModule;
}
