// Merge backed claims + claimcheck verdicts + gaps into a guarantees report
// (JSON + Markdown), shaped after lemmafit's reports/guarantees.md.
import type { BackedClaim, Gap } from "./claims.js";
import type { CCResult } from "./claimcheck.js";

export type Status = "confirmed" | "disputed" | "unchecked";

export interface Guarantee {
  specId: string;
  function: string;
  requirement: string;
  spec: { signature: string; requires: string[]; ensures: string[] };
  status: Status;
  weakeningType?: string;
  discrepancy?: string;
  backTranslation?: string;
}

export interface Report {
  file: string;
  generated: string;
  assumesVerified: true;
  summary: { contracts: number; confirmed: number; disputed: number; gaps: number };
  guarantees: Guarantee[];
  gaps: Gap[];
}

export function buildReport(file: string, backed: BackedClaim[], results: CCResult[], gaps: Gap[], generated: string): Report {
  const byName = new Map(results.map((r) => [r.lemmaName, r]));
  const guarantees: Guarantee[] = backed.map((b) => {
    const r = byName.get(b.fn.name);
    const status: Status = r?.status === "confirmed" ? "confirmed" : r?.status === "disputed" ? "disputed" : "unchecked";
    const g: Guarantee = {
      specId: b.fn.name,
      function: b.fn.name,
      requirement: b.requirement,
      spec: b.spec,
      status,
    };
    if (status === "disputed") {
      const wt = r?.weakeningType ?? r?.comparison?.weakeningType;
      const disc = r?.discrepancy ?? r?.comparison?.discrepancy;
      if (wt) g.weakeningType = wt;
      if (disc) g.discrepancy = disc;
    }
    const bt = r?.informalization?.naturalLanguage;
    if (bt) g.backTranslation = bt;
    return g;
  });
  return {
    file,
    generated,
    assumesVerified: true,
    summary: {
      contracts: backed.length,
      confirmed: guarantees.filter((g) => g.status === "confirmed").length,
      disputed: guarantees.filter((g) => g.status === "disputed").length,
      gaps: gaps.length,
    },
    guarantees,
    gaps,
  };
}

function specBlock(g: Guarantee): string[] {
  const lines = ["```", g.spec.signature];
  for (const r of g.spec.requires) lines.push(`  requires ${r}`);
  for (const e of g.spec.ensures) lines.push(`  ensures ${e}`);
  lines.push("```");
  return lines;
}

export function renderMarkdown(report: Report): string {
  const L: string[] = [];
  L.push(`# Guarantees: ${report.file}`, "");
  L.push(`Generated: ${report.generated}`, "");
  L.push(
    "> Verification is **assumed** (run `lsc check` to discharge the proofs). " +
      "This report vets only that each `//@ contract` faithfully describes its formal " +
      "`requires`/`ensures`, via claimcheck's blind round-trip.",
    "",
  );

  const s = report.summary;
  L.push(`## Coverage`, "");
  L.push(`- **${s.contracts}** backed contracts: ${s.confirmed} confirmed, ${s.disputed} disputed`);
  L.push(`- **${s.gaps}** gaps (contract with no formal spec behind it)`, "");

  const checked = report.guarantees.filter((g) => g.status !== "unchecked");
  if (checked.length) {
    L.push(`## Claimcheck Results`, "");
    L.push(`| Function | Contract | Status |`, `|----------|----------|--------|`);
    for (const g of report.guarantees) {
      const badge = g.status === "confirmed" ? "✅ confirmed" : g.status === "disputed" ? "❌ disputed" : "— unchecked";
      L.push(`| \`${g.function}\` | ${g.requirement} | ${badge} |`);
    }
    L.push("");
  }

  const confirmed = report.guarantees.filter((g) => g.status === "confirmed");
  if (confirmed.length) {
    L.push(`## Confirmed Guarantees`, "");
    for (const g of confirmed) {
      L.push(`**${g.requirement}** — \`${g.function}\``);
      L.push(...specBlock(g));
      if (g.backTranslation) L.push(`- Back-translation: ${g.backTranslation}`);
      L.push("");
    }
  }

  const disputed = report.guarantees.filter((g) => g.status === "disputed");
  if (disputed.length) {
    L.push(`## Disputed`, "");
    for (const g of disputed) {
      L.push(`**${g.requirement}** — \`${g.function}\``);
      if (g.weakeningType && g.weakeningType !== "none") L.push(`- Weakening: ${g.weakeningType}`);
      if (g.discrepancy) L.push(`- Discrepancy: ${g.discrepancy}`);
      if (g.backTranslation) L.push(`- Back-translation: ${g.backTranslation}`);
      L.push(...specBlock(g));
      L.push("");
    }
  }

  if (report.gaps.length) {
    L.push(`## Gaps`, "");
    for (const gap of report.gaps) L.push(`- \`${gap.specId}\`: ${gap.requirement} — ${gap.reason}`);
    L.push("");
  }

  return L.join("\n");
}
