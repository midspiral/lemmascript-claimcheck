#!/usr/bin/env node
// lemmascript-claimcheck — vet that each `//@ contract` faithfully describes the
// function's formal `//@ requires`/`//@ ensures`, then emit a guarantees report.
//
//   lemmascript-claimcheck <file.ts> [--out <dir>] [--json] [--claims-only]
//                                    [<any claimcheck flags>]
//
// `<file.ts>` is the leading positional; every other flag (and its value) is
// forwarded to claimcheck unchanged — so the backend/model are configured there
// (--bedrock, --vertex, --claude-code, --model, --compare-model, --single-prompt,
// ...), or persistently via $CLAIMCHECK_ARGS. Use `--` to end our own parsing.
//
// For `domain.ts` writes `domain.guarantees.json` + `domain.guarantees.md`
// next to the source (or under --out).
import { existsSync, writeFileSync } from "fs";
import * as path from "path";
import { extractModule } from "./extract.js";
import { collectClaims } from "./claims.js";
import { runClaimcheck } from "./claimcheck.js";
import { buildReport, renderMarkdown } from "./guarantees.js";

function usage(): never {
  console.error(
    "usage: lemmascript-claimcheck <file.ts> [--out <dir>] [--json] [--claims-only] [<claimcheck flags>]",
  );
  process.exit(1);
}

let file: string | undefined;
let outDir: string | undefined;
let json = false;
let claimsOnly = false;
const passthrough: string[] = []; // everything we don't own → forwarded to claimcheck

const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--") {
    passthrough.push(...argv.slice(i + 1));
    break;
  } else if (a === "--out") {
    outDir = argv[++i];
  } else if (a === "--json") {
    json = true;
  } else if (a === "--claims-only") {
    claimsOnly = true;
  } else if (!file && !a.startsWith("-")) {
    file = a;
  } else {
    passthrough.push(a); // any other flag (or its value) goes to claimcheck
  }
}
if (!file) usage();

const abs = path.resolve(file);
if (!existsSync(abs)) {
  console.error(`file not found: ${abs}`);
  process.exit(1);
}

const mod = extractModule(abs);
const { backed, gaps } = collectClaims(mod);
const domain = path.basename(abs, ".ts");
const claims = backed.map((b) => ({ requirement: b.requirement, lemmaName: b.fn.name, dafnyCode: b.dafnyCode }));

if (claimsOnly) {
  console.log(JSON.stringify({ domain, claims, gaps }, null, 2));
  process.exit(0);
}

const results = runClaimcheck(claims, domain, passthrough);
const generated = new Date().toISOString().split("T")[0];
const report = buildReport(file, backed, results, gaps, generated);

const dir = outDir ?? path.dirname(abs);
const jsonPath = path.join(dir, `${domain}.guarantees.json`);
const mdPath = path.join(dir, `${domain}.guarantees.md`);
writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");
writeFileSync(mdPath, renderMarkdown(report) + "\n");

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const s = report.summary;
  console.log(`${domain}: ${s.confirmed} confirmed, ${s.disputed} disputed, ${s.gaps} gaps`);
  console.log(`→ ${mdPath}`);
  console.log(`→ ${jsonPath}`);
}
