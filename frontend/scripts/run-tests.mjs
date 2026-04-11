import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, '..');
const testsDir = path.join(frontendDir, 'tests');
const outDir = path.join(frontendDir, '.test-dist');

function collectTestFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }

    if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

if (!fs.existsSync(testsDir)) {
  console.error('No frontend tests directory found.');
  process.exit(1);
}

const testFiles = collectTestFiles(testsDir);

if (testFiles.length === 0) {
  console.error('No frontend test files found.');
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const testFile of testFiles) {
  const relativePath = path.relative(testsDir, testFile);
  const shouldBundle = !relativePath.endsWith('server.test.ts');

  await build({
    entryPoints: [testFile],
    outbase: testsDir,
    outdir: outDir,
    bundle: shouldBundle,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    jsx: 'automatic',
    packages: 'external',
    sourcemap: 'inline',
    logLevel: 'silent',
    loader: {
      '.ts': 'ts',
      '.tsx': 'tsx',
    },
  });
}

const compiledTests = testFiles.map((file) =>
  path.join(
    outDir,
    path.relative(testsDir, file).replace(/\.(ts|tsx|jsx)$/, '.js')
  )
);

execFileSync(process.execPath, ['--test', ...compiledTests], {
  cwd: frontendDir,
  stdio: 'inherit',
});
