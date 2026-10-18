import fs from "node:fs";
import path from "node:path";

const dir = "reports/lighthouse";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json") && f.includes("mobile"));

for (const f of files) {
  const r = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const a = r.audits;
  console.log("\n=== " + f + " | perf " + Math.round(r.categories.performance.score * 100));
  console.log("FCP", a["first-contentful-paint"]?.displayValue, "| LCP", a["largest-contentful-paint"]?.displayValue);

  const lcp = a["largest-contentful-paint-element"]?.details?.items ?? [];
  for (const t of lcp) {
    for (const it of t.items ?? [t]) {
      if (it.node) console.log("Elemento LCP:", it.node.selector);
      if (it.phase) console.log("  fase:", it.phase, it.timing ?? it.percent ?? "");
    }
  }

  for (const id of ["lcp-breakdown-insight", "render-blocking-insight", "network-dependency-tree-insight"]) {
    if (a[id]) console.log(id, "->", a[id].displayValue ?? a[id].score);
  }

  const reqs = (a["network-requests"]?.details?.items ?? [])
    .sort((x, y) => y.transferSize - x.transferSize)
    .slice(0, 8);
  console.log("Maiores requisições:");
  for (const q of reqs) {
    console.log("  ", Math.round(q.transferSize / 1024) + " KB", Math.round(q.networkEndTime) + " ms", q.url.slice(0, 90));
  }
}