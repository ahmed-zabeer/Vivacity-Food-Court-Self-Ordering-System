import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const testDirectory = resolve(projectRoot, 'test');
const testFiles = readdirSync(testDirectory)
  .filter(file => file.endsWith('.test.js'))
  .sort();

if (testFiles.length === 0) {
  throw new Error('No *.test.js files were found in the test directory.');
}

let hasFailures = false;

for (const testFile of testFiles) {
  const dataDirectory = mkdtempSync(join(tmpdir(), 'vivacity-test-'));
  try {
    const result = spawnSync(
      process.execPath,
      ['--test', '--test-concurrency=1', relative(projectRoot, join(testDirectory, testFile))],
      {
        cwd: projectRoot,
        env: { ...process.env, DATA_DIR: dataDirectory },
        stdio: 'inherit',
      }
    );

    if (result.error) {
      console.error(`Could not run ${testFile}:`, result.error);
      hasFailures = true;
    } else if (result.status !== 0) {
      hasFailures = true;
    }
  } finally {
    rmSync(dataDirectory, { recursive: true, force: true });
  }
}

if (hasFailures) {
  process.exitCode = 1;
}
