'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let ts;
try { ts = process.env.TYPESCRIPT_PATH ? require(path.resolve(process.env.TYPESCRIPT_PATH)) : require('typescript'); }
catch { throw new Error('Use installed TypeScript or set TYPESCRIPT_PATH to an existing typescript.js. No dependencies are installed by this test.'); }

function readConfiguration() {
  const parsed = ts.getParsedCommandLineOfConfigFile(path.join(root, 'tsconfig.json'), {}, {
    ...ts.sys, onUnRecoverableConfigFileDiagnostic: diagnostic => { throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')); },
  });
  assert.ok(parsed);
  assert.equal(parsed.errors.length, 0);
  return parsed;
}
function normalize(value) {
  if (typeof value === 'string') {
    const text = value.replace(/\\/g, '/');
    const normalizedRoot = root.replace(/\\/g, '/');
    return text.toLowerCase().startsWith(normalizedRoot.toLowerCase()) ? '<project>' + text.slice(normalizedRoot.length) : text;
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'configFile').map(([key, item]) => [key, normalize(item)]));
  return value;
}

test('effective compiler options match the pre-removal inheritance baseline', () => {
  const parsed = readConfiguration();
  const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/tsconfig-effective.json'), 'utf8'));
  assert.deepEqual(normalize(parsed.options), baseline);
  const config = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8'));
  assert.equal(config.extends, undefined);
  assert.equal(config.compilerOptions.baseUrl, undefined);
  assert.equal(config.include, undefined);
  assert.equal(config.exclude, undefined);
});

test('path aliases resolve to this template, not the former package directory', () => {
  const { options } = readConfiguration();
  for (const specifier of ['@/utils/request', '~/src/utils/request']) {
    const resolved = ts.resolveModuleName(specifier, path.join(root, 'src/service.ts'), options, ts.sys).resolvedModule;
    assert.ok(resolved, specifier);
    assert.equal(path.resolve(resolved.resolvedFileName), path.join(root, 'src/utils/request/index.ts'));
  }
});

test('the actual project compiler options still enforce the request type contract', () => {
  const { options } = readConfiguration();
  const program = ts.createProgram([
    path.join(__dirname, 'request-contract.types.ts'), path.join(root, 'react-app-env.d.ts'),
  ], { ...options, noEmit: true, types: [] });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => root, getCanonicalFileName: file => file, getNewLine: () => '\n',
  }));
});

test('no lint/Husky install chain remains and quality checks are manual and read-only', () => {
  const { pkg, packages } = require('./read-dependency-state.cjs').readDependencyState(root);
  for (const [location, entry] of Object.entries(packages)) {
    assert.doesNotMatch(location, /(?:^|\/)node_modules\/(?:@metacode\/lint|@commitlint\/[^/]+|husky|lint-staged)(?:\/|$)/);
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const name of Object.keys(entry[field] || {})) assert.doesNotMatch(name, /^(?:@metacode\/lint|@commitlint\/|husky$|lint-staged$)/);
    }
  }
  for (const name of ['preinstall', 'install', 'postinstall', 'prepare', 'precommit', 'pre-commit']) assert.equal(pkg.scripts[name], undefined);
  assert.equal(pkg.husky, undefined);
  assert.equal(pkg['lint-staged'], undefined);
  assert.equal(pkg.scripts.check, 'biome check .');
  assert.equal(pkg.scripts.typecheck, 'tsc --noEmit');
  assert.doesNotMatch(pkg.scripts.check, /--write|--apply|husky|commitlint|lint-staged/);
  assert.equal(pkg.devDependencies['@biomejs/biome'], '1.9.4');
  const biome = JSON.parse(fs.readFileSync(path.join(root, 'biome.json'), 'utf8'));
  assert.equal(biome.linter.enabled, true);
  assert.equal(biome.linter.rules.recommended, true);
  assert.equal(biome.formatter.enabled, true);
});
