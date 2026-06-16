// Raw IR via the sibling LemmaScript's public `lsc extract` CLI — the same seam
// lemmascript-guard uses: a type-only import for the shape, the values over a
// subprocess. The `//@ contract` strings ride along on each RawFunction.
import { execFileSync } from "child_process";
import { existsSync } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { RawModule } from "../../LemmaScript/tools/src/rawir.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const LS = process.env.LEMMASCRIPT ?? path.resolve(here, "../../LemmaScript");
const LSC = path.join(LS, "tools", "src", "lsc.ts");

export function extractModule(absFile: string): RawModule {
  if (!existsSync(LSC)) {
    throw new Error(`LemmaScript not found at ${LS} — set LEMMASCRIPT=<path>`);
  }
  const json = execFileSync(
    "npx",
    ["--prefix", path.join(LS, "tools"), "tsx", LSC, "extract", absFile],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  );
  return JSON.parse(json) as RawModule;
}
