import fs from "node:fs";

const f = "reports/lighthouse/home-mobile-2.report.json";
const r = JSON.parse(fs.readFileSync(f, "utf8"));
console.log("Throttling:", JSON.stringify(r.configSettings.throttling), "| método:", r.configSettings.throttlingMethod);
console.log("Emulação:", r.configSettings.formFactor);

const items = (r.audits["network-requests"]?.details?.items ?? [])
  .slice()
  .sort((a, b) => a.networkRequestTime - b.networkRequestTime);

for (const q of items) {
  const kb = Math.round((q.transferSize ?? 0) / 1024);
  const url = q.url.replace("http://localhost:4173", "").slice(0, 70);
  console.log(
    String(Math.round(q.networkRequestTime)).padStart(6),
    "->",
    String(Math.round(q.networkEndTime)).padStart(6),
    "ms",
    String(kb).padStart(4) + " KB",
    q.resourceType ?? "",
    url,
  );
}