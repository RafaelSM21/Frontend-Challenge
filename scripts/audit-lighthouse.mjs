import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const baseUrl = process.env.LIGHTHOUSE_URL ?? 'http://localhost:4173';
const outputDir = 'reports/lighthouse';
const maxAttempts = Number(process.env.LIGHTHOUSE_ATTEMPTS ?? 3);
const lighthouseCli = createRequire(import.meta.url).resolve('lighthouse/cli/index.js');
const targets = [
  ['home', '/'],
  ['detail', '/nfts/nft-002'],
];
const profiles = [
  ['mobile', ['--preset=perf', '--form-factor=mobile', '--screenEmulation.mobile=true']],
  ['desktop', ['--preset=desktop', '--form-factor=desktop', '--screenEmulation.mobile=false']],
];

mkdirSync(outputDir, { recursive: true });

// Remove relatórios de execuções anteriores para não misturar resultados.
for (const file of readdirSync(outputDir)) {
  if (/^(home|detail)-(mobile|desktop)-\d+\.report\.(json|html)$/.test(file) || file === 'execution-log.json') {
    rmSync(join(outputDir, file));
  }
}

const log = [];
const writeLog = () =>
  writeFileSync(join(outputDir, 'execution-log.json'), JSON.stringify({ maxAttempts, runs: log }, null, 2));
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

for (const [profile, flags] of profiles) {
  for (const [name, path] of targets) {
    for (let run = 1; run <= 3; run += 1) {
      const id = `${name}-${profile}-${run}`;
      const stem = join(outputDir, id);
      const failures = [];
      let attempt = 0;
      for (;;) {
        attempt += 1;
        try {
          execFileSync(
            process.execPath,
            [
              lighthouseCli, `${baseUrl}${path}`, '--only-categories=performance,accessibility,best-practices,seo',
              `--output-path=${stem}`, '--output=html', '--output=json', '--quiet', ...flags,
            ],
            { stdio: 'inherit' },
          );
          break;
        } catch (error) {
          failures.push(error.status ?? error.signal ?? 'erro');
          console.error(`Falha em ${id} (tentativa ${attempt}/${maxAttempts}), código ${failures.at(-1)}.`);
          for (const suffix of ['.report.json', '.report.html']) rmSync(stem + suffix, { force: true });
          if (attempt >= maxAttempts) {
            log.push({ run: id, attempts: attempt, failures, ok: false });
            writeLog();
            process.exit(1);
          }
          sleep(3000);
        }
      }
      log.push({ run: id, attempts: attempt, failures, ok: true });
    }
  }
}
writeLog();
console.log(`Auditoria concluída: ${log.length} medições, ${log.filter((r) => r.attempts > 1).length} com nova tentativa.`);