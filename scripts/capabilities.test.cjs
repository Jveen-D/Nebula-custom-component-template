'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = process.env.TYPESCRIPT_PATH ? require(path.resolve(process.env.TYPESCRIPT_PATH)) : require('typescript');
const root = path.resolve(__dirname, '..');
const capabilities = path.join(root, 'src/capabilities');

// 用真实 TS 实现转译后加载，替身只代替宿主，不复制能力实现。
function loader(globals = {}, modules = {}, onLoad = () => {}) {
  const cache = new Map();
  function load(file) {
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index');
    if (!path.extname(file)) file += fs.existsSync(file + '.ts') ? '.ts' : '.tsx';
    if (cache.has(file)) return cache.get(file).exports;
    onLoad(file);
    const module = { exports: {} }; cache.set(file, module);
    const source = fs.readFileSync(file, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
    const sandbox = { ...globals, module, exports: module.exports, require(name) {
      if (Object.hasOwn(modules, name)) return modules[name];
      assert.ok(name.startsWith('.'), `Unexpected runtime dependency: ${name}`);
      return load(path.resolve(path.dirname(file), name));
    }};
    vm.runInNewContext(compiled, sandbox, { filename: file });
    return module.exports;
  }
  return relative => load(path.join(root, relative));
}

test('core imports, example imports and default rendering do not touch host objects or execute operations', () => {
  const forbidden = new Proxy({}, { get() { throw new Error('Host accessed before explicit action'); } });
  const cleanups = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: value => [value, () => {}],
    useRef: () => ({ current: undefined }),
    useEffect: callback => cleanups.push(callback()),
  };
  const load = loader({ window: forbidden, document: forbidden }, {
    react: { __esModule: true, default: react, ...react },
    antd: { Button: 'button', Input: { TextArea: 'textarea' } },
    './styles': { __esModule: true, default: () => ({ styles: { Wrapper: 'wrapper' } }) },
  });
  const api = load('src/capabilities/index.ts');
  assert.equal(load('src/service.ts').executeApiCall, api.executeApiCall);
  const { capabilityExampleConfig } = load('src/capabilities/examples/config.ts');
  assert.equal(Object.hasOwn(capabilityExampleConfig, 'enabled'), false);
  assert.deepEqual(Object.keys(capabilityExampleConfig), []);
  const { CapabilityExamples } = load('src/capabilities/examples/CapabilityExamples.tsx');
  CapabilityExamples({ hostProps: { customPropsResult: { value: 1 } }, config: {} });
  cleanups.forEach(cleanup => cleanup?.());
  const { default: Component, getAppByUuid } = load('src/component/index.tsx');
  assert.equal(getAppByUuid, api.getAppByUuid);
  const tree = Component({});
  assert.equal(tree.type, 'div');
  assert.equal(tree.children.some(child => child && child.type === CapabilityExamples), false);
});

test('the reference React example subscribes only after a click and cleans up on unmount', async () => {
  const listeners = new Map(), cleanups = [];
  const document = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: value => [value, () => {}], useRef: () => ({ current: undefined }),
    useEffect: callback => cleanups.push(callback()),
  };
  const load = loader({ document, window: { BlackHole3D: { Probe: { getCurProbeRet: () => ({}) } } } }, {
    react: { __esModule: true, default: react, ...react }, antd: { Button: 'button', Input: { TextArea: 'textarea' } },
  });
  const { CapabilityExamples } = load('src/capabilities/examples/CapabilityExamples.tsx');
  const tree = CapabilityExamples({ hostProps: {}, config: {} });
  assert.equal(listeners.size, 0);
  const start = tree.children.find(child => child && child.children.includes('开始监听选择'));
  assert.ok(start);
  await start.props.onClick();
  assert.equal(listeners.size, 1);
  cleanups.forEach(cleanup => cleanup?.());
  assert.equal(listeners.size, 0);
});

test('request capabilities preserve observed envelopes, options and complete responses without auto execution', async () => {
  const calls = [], response = { data: { ok: true }, message: 'host' };
  const hostRequest = (url, options) => { calls.push({ url, options }); return Promise.resolve(response); };
  const load = loader({ window: { core: { request: hostRequest } } });
  const api = load('src/capabilities/index.ts');
  assert.equal(calls.length, 0);
  assert.equal(api.getHostRequest(), hostRequest);
  assert.equal(await api.getAppByUuid('sample-app'), response);
  const external = { url: 'https://service.example/produce/pedestalOccupancy', method: 'GET', headers: {}, requestBody: {}, requestParam: {} };
  assert.equal(await api.executeApiCall(external), response);
  await api.getDictionaryValues('sample-dictionary');
  const visual = { base64Image: 'sample', definedType: 1, projId: 'sample-project', resourceId: 'sample-resource', visualAngle: 'sample-view' };
  await api.setVisualAngle(visual);
  const serial = value => JSON.parse(JSON.stringify(value));
  assert.deepEqual(serial(calls), [
    { url: 'bjgraphicplatform/app/getAppByUuid', options: { method: 'POST', data: 'sample-app' } },
    { url: 'bjgraphicplatform/apiConfig/executeApiCall', options: { method: 'POST', data: external, skipErrorHandler: true } },
    { url: '/bjsystem/dict/searchDictValueByParam', options: { data: { param: { parentDictCode: 'sample-dictionary' } }, autoBoxParam: false, skipErrorThrower: true } },
    { url: '/newblackholeapi/blackHole3D/project/userDefined/v3/SetVisualAngle', options: { data: visual, autoBoxParam: false, skipErrorThrower: true, autoApiPrefix: false } },
  ]);
  assert.equal(calls[1].options.data, external);
  assert.equal(calls[3].options.data, visual);
  const failure = new Error('host rejection');
  await assert.rejects(api.getAppByUuid('sample', () => Promise.reject(failure)), error => error === failure);
  assert.throws(() => loader()('src/capabilities/index.ts').getHostRequest(), /window.core.request/);
});

test('three-dimensional adapters only operate on explicitly supplied targets and appearance', () => {
  const calls = []; let constructions = 0;
  const engine = {
    REElemAttr: class { constructor() { constructions++; } },
    REColor: class { constructor(...rgba) { this.rgba = rgba; } },
    BIM: { setElemAttr: item => calls.push(item), resetElemAttr: (...target) => calls.push(target) },
  };
  const api = loader({ window: { BlackHole3D: engine } })('src/capabilities/index.ts');
  assert.equal(constructions, 0); assert.equal(calls.length, 0);
  const target = { dataSetId: 'sample-dataset', elemIdList: 'sample-element' };
  const appearance = { color: [5, 39, 175, 10], elemEmis: 0, elemEmisPercent: 255, elemSmooth: 0, elemMetal: 0, elemSmmePercent: 0 };
  api.setElementAppearance(target, appearance);
  assert.equal(constructions, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), { ...target, elemClr: { rgba: appearance.color }, elemEmis: 0, elemEmisPercent: 255, elemSmooth: 0, elemMetal: 0, elemSmmePercent: 0 });
  api.resetElementAppearance(target);
  assert.deepEqual(calls[1], [target.dataSetId, target.elemIdList]);
});

test('selection subscription is explicit and its cleanup is idempotent', () => {
  const listeners = new Map(), selected = [], sample = { element: 'sample' }; let probes = 0, removals = 0;
  const target = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name, fn) => { assert.equal(listeners.get(name), fn); removals++; listeners.delete(name); } };
  const engine = { Probe: { getCurProbeRet: () => { probes++; return sample; } } };
  const api = loader()('src/capabilities/index.ts');
  assert.equal(listeners.size, 0);
  const stop = api.subscribeToSelection((value, event) => selected.push([value, event]), { target, engine });
  assert.equal(listeners.size, 1); assert.equal(probes, 0);
  const event = { type: 'RESystemSelElement' }, callback = listeners.get(event.type);
  callback(event); assert.equal(selected[0][0], sample); assert.equal(selected[0][1], event);
  stop(); stop(); callback(event);
  assert.equal(removals, 1); assert.equal(listeners.size, 0); assert.equal(probes, 1); assert.equal(selected.length, 1);
});

test('DOM linkage targets caller-selected elements and leaves toggle state to the caller', () => {
  const elements = { left: { style: { display: 'block' } }, right: { style: { display: 'block' } } };
  const api = loader()('src/capabilities/index.ts');
  const document = { getElementById: id => elements[id] };
  api.setLinkedElementsVisible(false, ['left', 'right'], document);
  assert.equal(elements.left.style.display, 'none'); assert.equal(elements.right.style.display, 'none');
  api.setLinkedElementsVisible(true, ['left', 'right'], document);
  assert.equal(elements.left.style.display, 'block'); assert.equal(elements.right.style.display, 'block');
});

test('entry retains host registration, complete props forwarding, local mounting and public path behavior', () => {
  const react = { createElement: (type, props, ...children) => ({ type, props, children }), Fragment: 'fragment' };
  const modules = {
    react: { __esModule: true, default: react, ...react },
    'react-dom/client': { createRoot: () => { throw new Error('Host mode must not mount locally'); } },
    antd: { Button: 'button', Input: { TextArea: 'textarea' } },
    './styles': { __esModule: true, default: () => ({ styles: { Wrapper: 'wrapper' } }) },
  };
  const window = {}, resourcePath = 'https://assets.example/component/';
  const host = loader({ window, __RUN_ON_LOCAL__: false, __graphic_public_path__: resourcePath, __webpack_public_path__: '' }, modules);
  const { default: Com } = host('src/index.tsx');
  assert.equal(window.GraphicCustomComponent, Com);
  const customPropsResult = { sample: true }, tree = Com({ style: { left: 12, top: 34, width: 200 }, customPropsResult });
  const frame = tree.children[0];
  assert.equal(frame.props.style.left, 0); assert.equal(frame.props.style.top, 0);
  assert.equal(frame.props.style.width, 200); assert.equal(frame.props.style.transform, 'translate(12px, 34px)');
  assert.equal(frame.children[0].props.customPropsResult, customPropsResult);
  const container = {}, mounts = [];
  loader({ window: {}, __RUN_ON_LOCAL__: true, document: { getElementById: id => { assert.equal(id, 'app-root'); return container; } } }, {
    ...modules, 'react-dom/client': { createRoot: element => { assert.equal(element, container); return { render: child => mounts.push(child) }; } },
  })('src/index.tsx');
  assert.equal(mounts.length, 1); assert.equal(typeof mounts[0].type, 'function');
  const publicPath = fs.readFileSync(path.join(root, 'src/public-path.js'), 'utf8');
  const hosted = { __RUN_ON_LOCAL__: false, __graphic_public_path__: resourcePath };
  vm.runInNewContext(publicPath, hosted); assert.equal(hosted.__webpack_public_path__, resourcePath);
  const local = { __RUN_ON_LOCAL__: true };
  vm.runInNewContext(publicPath, local); assert.equal(Object.hasOwn(local, '__webpack_public_path__'), false);
});

test('AI index links are local and valid; capability implementations contain no former business targets', () => {
  const readme = fs.readFileSync(path.join(capabilities, 'README.md'), 'utf8');
  for (const match of readme.matchAll(/\]\((\.{1,2}\/[^)]+)\)/g)) assert.ok(fs.existsSync(path.join(capabilities, match[1])), match[1]);
  const forbidden = /3a21a896|3a21eb73|b25790b7|tongcangmishuzidian|pb27-4PoGQ|NQGBcsuZ37/;
  function visit(directory) { for (const item of fs.readdirSync(directory, { withFileTypes: true })) { const file = path.join(directory, item.name); if (item.isDirectory()) visit(file); else if (/\.(ts|tsx)$/.test(file)) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), forbidden, file); } }
  visit(capabilities);
});


test('default entry and public capability imports never load or export the reference UI', () => {
  const loaded = [];
  const observe = file => loaded.push(file.split(path.sep).join('/'));
  const api = loader({}, {}, observe)('src/capabilities/index.ts');
  assert.equal(Object.hasOwn(api, 'CapabilityExamples'), false);
  assert.equal(Object.hasOwn(api, 'capabilityExampleConfig'), false);
  const react = { createElement: (type, props, ...children) => ({ type, props, children }), Fragment: 'fragment' };
  const main = loader({ window: {}, __RUN_ON_LOCAL__: false, __graphic_public_path__: 'https://assets.example/component/', __webpack_public_path__: '' }, {
    react: { __esModule: true, default: react },
    'react-dom/client': { createRoot: () => { throw new Error('Host mode must not mount locally'); } },
    './styles': { __esModule: true, default: () => ({ styles: { Wrapper: 'wrapper' } }) },
    // No Antd or reference UI dependency is allowed in this import graph.
  }, observe)('src/index.tsx');
  const frame = main.default({}).children[0];
  assert.equal(frame.children[0].type({}).type, 'div');
  assert.ok(loaded.length > 0);
  assert.ok(loaded.every(file => !file.includes('/capabilities/examples/')), loaded.join('\n'));
});
