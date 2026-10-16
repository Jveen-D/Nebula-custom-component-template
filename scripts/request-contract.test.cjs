'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
let ts;
try {
  ts = process.env.TYPESCRIPT_PATH ? require(path.resolve(process.env.TYPESCRIPT_PATH)) : require('typescript');
} catch {
  throw new Error('TypeScript compiler required. Use installed template dependencies or set TYPESCRIPT_PATH to an existing typescript.js; this test does not install anything.');
}

test('the local request contract accepts observed calls and rejects invalid types', () => {
  const program = ts.createProgram([
    path.join(__dirname, 'request-contract.types.ts'),
    path.join(root, 'react-app-env.d.ts'),
    path.join(root, 'src/utils/request/index.ts'),
    path.join(root, 'src/utils/request/types.ts'),
  ], {
    strict: true, noEmit: true, skipLibCheck: true, types: [],
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => root, getCanonicalFileName: name => name, getNewLine: () => '\n',
  }));
});

test('the export preserves host function identity, arguments, promise and rejection', async () => {
  const source = fs.readFileSync(path.join(root, 'src/utils/request/index.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  assert.doesNotMatch(compiled, /require\s*\(|@metacode\/request/);
  const calls = [];
  const response = { data: { id: 'example' } };
  const originalPromise = Promise.resolve(response);
  const originalRequest = (url, options) => { calls.push({ url, options }); return originalPromise; };
  const host = { request: originalRequest };
  const exported = {};
  vm.runInNewContext(compiled, { exports: exported, window: { core: host } });
  const { request } = exported;
  assert.equal(request, originalRequest);
  const options = { method: 'POST', data: { id: 'example' }, autoBoxParam: false };
  assert.equal(request('/example', options), originalPromise);
  assert.equal(calls[0].url, '/example');
  assert.equal(calls[0].options, options);
  assert.equal(await originalPromise, response);
  host.request = () => { throw new Error('must not perform a new host lookup'); };
  assert.equal(request('/again', options), originalPromise);

  const failure = new Error('host rejection');
  const rejectingExports = {};
  const rejected = Promise.reject(failure);
  vm.runInNewContext(compiled, { exports: rejectingExports, window: { core: { request: () => rejected } } });
  assert.equal(rejectingExports.request('/example', options), rejected);
  await assert.rejects(rejected, error => error === failure);
});

test('dependency manifests are consistent and contain no removed request branch', () => {
  const { pkg, packages, lockAvailable } = require('./read-dependency-state.cjs').readDependencyState(root);
  assert.equal(pkg.dependencies['@metacode/request'], undefined);
  for (const [location, entry] of Object.entries(packages)) {
    assert.doesNotMatch(location, /(?:^|\/)node_modules\/@metacode\/request(?:\/|$)/);
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      assert.equal(entry[field]?.['@metacode/request'], undefined, `${location}: ${field}`);
    }
  }
  assert.equal(pkg.dependencies.axios, '0.27.2');
  assert.ok(pkg.dependencies['js-cookie']);
  if (lockAvailable) {
    assert.equal(packages['node_modules/axios'].version, '0.27.2');
    assert.ok(packages['node_modules/js-cookie']);
  }
});
