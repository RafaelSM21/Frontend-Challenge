import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lê os JSON de reports/lighthouse e imprime, por página e perfil, a mediana das
 * quatro categorias e de FCP, LCP, CLS e TBT, mais as versões e as condições de
 * execução de cada perfil (throttling e benchmark da máquina).
 * Uso: npm run audit:summary
 */
const dir = process.env.LIGHTHOUSE_DIR ?? 'reports/lighthouse';
const files = readdirSync(dir).filter((file) => file.endsWith('.report.json'));
if (files.length === 0) {
  console.error(`Nenhum relatório JSON em ${dir}. Rode npm run audit:lighthouse antes.`);
  process.exit(1);
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const groups = new Map();
const byProfile = new Map();
let meta;
for (const file of files.sort()) {
  const match = file.match(/^(.+)-(mobile|desktop)-(\d+)\.report\.json$/);
  if (!match) continue;
  const report = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  meta ??= report;
  const profile = match[2];
  if (!byProfile.has(profile)) byProfile.set(profile, { report, benchmarks: [] });
  const benchmark = report.environment?.benchmarkIndex;
  if (typeof benchmark === 'number') byProfile.get(profile).benchmarks.push(benchmark);
  const key = `${match[1]}|${profile}`;
  const audits = report.audits;
  const row = {
    performance: report.categories.performance.score * 100,
    accessibility: report.categories.accessibility.score * 100,
    bestPractices: report.categories['best-practices'].score * 100,
    seo: report.categories.seo.score * 100,
    fcp: audits['first-contentful-paint'].numericValue,
    lcp: audits['largest-contentful-paint'].numericValue,
    cls: audits['cumulative-layout-shift'].numericValue,
    tbt: audits['total-blocking-time'].numericValue,
  };
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}

const names = { home: 'Início', detail: 'Detalhe' };
const profiles = { mobile: 'Mobile', desktop: 'Desktop' };
const ms = (value) => `${Math.round(value).toLocaleString('pt-BR')} ms`;
console.log('| Página | Perfil | Execuções | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const [key, rows] of [...groups].sort()) {
  const [page, profile] = key.split('|');
  const pick = (field) => median(rows.map((row) => row[field]));
  console.log(
    `| ${names[page] ?? page} | ${profiles[profile]} | ${rows.length} | ${Math.round(pick('performance'))} | ${Math.round(pick('accessibility'))} | ${Math.round(pick('bestPractices'))} | ${Math.round(pick('seo'))} | ${ms(pick('fcp'))} | ${ms(pick('lcp'))} | ${pick('cls').toFixed(3)} | ${ms(pick('tbt'))} |`,
  );
}
if (meta) {
  console.log('');
  console.log(`Lighthouse ${meta.lighthouseVersion} | ${meta.environment?.hostUserAgent ?? ''}`);
  for (const [profile, { report, benchmarks }] of [...byProfile].sort()) {
    const settings = report.configSettings ?? {};
    const range = benchmarks.length ? ` | benchmark da máquina ${Math.min(...benchmarks)}–${Math.max(...benchmarks)}` : '';
    console.log(`${profiles[profile]}: throttling ${settings.throttlingMethod} | ${JSON.stringify(settings.throttling)}${range}`);
  }
  console.log(`Gerado em: ${meta.fetchTime}`);
}
const logPath = join(dir, 'execution-log.json');
if (existsSync(logPath)) {
  const { runs } = JSON.parse(readFileSync(logPath, 'utf8'));
  const retried = runs.filter((run) => run.attempts > 1);
  console.log(`Medições: ${runs.length} | com nova tentativa após falha do Chrome: ${retried.length}`);
  for (const run of retried) console.log(`  ${run.run}: ${run.attempts} tentativas (códigos ${run.failures.join(', ')})`);
}