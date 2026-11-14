import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cache = path.join(root, 'node_modules/.cache');
mkdirSync(cache, { recursive: true });
const evidence = mkdtempSync(path.join(cache, 'mistral-package-'));
const consumer = path.join(evidence, 'consumer');
mkdirSync(consumer);
function run(name, args, cwd, extra = {}) {
  const r = spawnSync(args[0], args.slice(1), {
    cwd,
    env: { ...process.env, ...extra },
    encoding: 'utf8',
    shell: false,
    timeout: 120000,
    maxBuffer: 4 * 1024 * 1024,
  });
  writeFileSync(path.join(evidence, `${name}.log`), `${r.stdout ?? ''}${r.stderr ?? ''}`);
  assert.equal(r.status, 0, `${name} failed: inspect ${evidence}`);
  return r.stdout;
}
run('pack', ['pnpm', 'pack', '--pack-destination', evidence], root);
const tarballs = readdirSync(evidence).filter((f) => f.endsWith('.tgz'));
assert.equal(tarballs.length, 1);
const tarball = path.join(evidence, tarballs[0]);
const version = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;
writeFileSync(
  path.join(consumer, 'package.json'),
  JSON.stringify({
    name: 'mistral-package-consumer',
    private: true,
    type: 'module',
    dependencies: { '@fanilosendrison/llm-runtime': `file:${tarball}` },
  }),
);
run(
  'install',
  ['pnpm', '--ignore-workspace', 'install', '--ignore-scripts', '--lockfile=false'],
  consumer,
);
const installed = path.join(consumer, 'node_modules/@fanilosendrison/llm-runtime');
assert.equal(
  JSON.parse(readFileSync(path.join(installed, 'package.json'), 'utf8')).version,
  version,
);
// Independent byte check catches stale or source-only implementations in packed artifacts.
for (const file of [
  'index.js',
  'bindings/openai-compatible.js',
  'bindings/_internal/mistral-response.js',
]) {
  assert.deepEqual(
    readFileSync(path.join(installed, 'dist', file)),
    readFileSync(path.join(root, 'dist', file)),
  );
}
copyFileSync(
  path.join(root, 'tests/package/mistral-response.node.mjs'),
  path.join(consumer, 'consumer.test.mjs'),
);
run('consumer-tests', ['node', '--test', 'consumer.test.mjs'], consumer, {
  LLM_PACKAGE_UNDER_TEST: '@fanilosendrison/llm-runtime',
});
const receipt = {
  version,
  tarball,
  sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),
  consumer,
  independentlyInstalled: true,
  dependencyInstall: 'registry resolution; local runtime tarball; scripts disabled',
  liveProviderCalls: 0,
  compiledTests: 'PASS',
  contentBytesMatch: true,
};
writeFileSync(path.join(evidence, 'receipt.json'), JSON.stringify(receipt, null, 2));
process.stdout.write(`${JSON.stringify(receipt)}\n`);
