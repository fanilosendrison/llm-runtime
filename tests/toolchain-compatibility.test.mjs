import assert from 'node:assert/strict';
import { test } from 'node:test';
import { transformWithEsbuild } from 'vite';

test('the installed Vite toolchain can execute its esbuild binary', async () => {
  const result = await transformWithEsbuild(
    'const answer: number = 42; export { answer };',
    'toolchain-probe.ts',
    { loader: 'ts' },
  );

  assert.match(result.code, /const answer = 42;/);
  assert.doesNotMatch(result.code, /: number/);
});
