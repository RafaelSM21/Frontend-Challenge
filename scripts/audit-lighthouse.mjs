import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const baseUrl = process.env.LIGHTHOUSE_URL ?? 'http://localhost:4173';
const outputDir = 'reports/lighthouse';
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
for (const [profile, flags] of profiles) {
  for (const [name, path] of targets) {
    for (let run = 1; run <= 3; run += 1) {
      const stem = join(outputDir, `${name}-${profile}-${run}`);
      execFileSync(process.execPath, [
        lighthouseCli, `${baseUrl}${path}`, '--only-categories=performance,accessibility,best-practices,seo',
        `--output-path=${stem}`, '--output=html', '--output=json', '--quiet', ...flags,
      ], { stdio: 'inherit' });
    }
  }
}
