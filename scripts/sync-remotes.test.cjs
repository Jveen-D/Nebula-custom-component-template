'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { run } = require('./sync-remotes.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nebula-sync-test-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.match(path.basename(root), /^nebula-sync-test-/);
    fs.rmSync(root, { recursive: true, force: true });
  });
  const emptyConfig = path.join(root, 'empty.gitconfig');
  fs.writeFileSync(emptyConfig, '');
  const local = path.join(root, 'local');
  fs.mkdirSync(local);
  const git = (args, cwd = local) => {
    const result = spawnSync('git', args, {
      cwd, encoding: 'utf8', windowsHide: true,
      env: { ...process.env, GIT_CONFIG_GLOBAL: emptyConfig, GIT_CONFIG_SYSTEM: emptyConfig },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return result.stdout.trim();
  };
  git(['init', '--initial-branch=main']);
  git(['config', 'user.name', 'Sync Test']);
  git(['config', 'user.email', 'sync-test@example.invalid']);
  git(['config', 'commit.gpgsign', 'false']);
  const commit = (name = 'file.txt', value = 'initial\n') => {
    fs.writeFileSync(path.join(local, name), value);
    git(['add', '--', name]);
    git(['commit', '-m', name]);
    return git(['rev-parse', 'HEAD']);
  };
  const initial = commit();
  const targets = ['github', 'gitee'].map(option => {
    const url = path.join(root, `${option}.git`).replace(/\\/g, '/');
    git(['init', '--bare', '--initial-branch=main', url]);
    const remote = option === 'github' ? 'origin' : 'gitee';
    git(['remote', 'add', remote, url]);
    return { label: option, option, remote, url };
  });
  const sync = (args = []) => {
    const output = [];
    const saved = { GIT_CONFIG_GLOBAL: process.env.GIT_CONFIG_GLOBAL, GIT_CONFIG_SYSTEM: process.env.GIT_CONFIG_SYSTEM };
    process.env.GIT_CONFIG_GLOBAL = emptyConfig;
    process.env.GIT_CONFIG_SYSTEM = emptyConfig;
    try {
      const code = run({ cwd: local, args, targets, log: text => output.push(text), error: text => output.push(text) });
      return { code, output: output.join('\n') };
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  };
  const refs = target => git(['ls-remote', target.url]);
  return { root, local, git, commit, initial, targets, sync, refs };
}

test('preflight is read-only; only the selected branch and explicit tags publish; reruns are safe', t => {
  const f = fixture(t);
  f.git(['branch', 'private-work']);
  f.git(['tag', 'v1.0.0']);
  f.git(['tag', '-a', 'unselected-tag', '-m', 'must not publish implicitly']);
  f.git(['config', 'push.followTags', 'true']);
  f.git(['config', 'remote.gitee.mirror', 'true']);
  assert.equal(f.sync(['--check']).code, 0);
  for (const target of f.targets) assert.equal(f.refs(target), '');
  assert.equal(f.sync().code, 0);
  for (const target of f.targets) assert.equal(f.refs(target).includes('refs/tags/'), false);
  assert.equal(f.sync(['--tag', 'v1.0.0']).code, 0);
  assert.equal(f.sync(['--tag', 'v1.0.0']).code, 0);
  for (const target of f.targets) {
    const refs = f.refs(target);
    assert.match(refs, new RegExp(`${f.initial}\\s+refs/heads/main`));
    assert.match(refs, /refs\/tags\/v1\.0\.0/);
    assert.doesNotMatch(refs, /private-work|unselected-tag/);
  }
  const advanced = f.commit('next.txt', 'normal fast-forward');
  const result = f.sync();
  assert.equal(result.code, 0, result.output);
  for (const target of f.targets) {
    assert.match(f.refs(target), new RegExp(`${advanced}\\s+refs/heads/main`));
    assert.match(f.refs(target), new RegExp(`${f.initial}\\s+refs/tags/v1.0.0`));
  }
});

test('unrelated remote history is preserved and blocks all pushes', t => {
  const f = fixture(t);
  const tree = f.git(['rev-parse', 'HEAD^{tree}']);
  const unrelated = f.git(['commit-tree', tree, '-m', 'unrelated root']);
  f.git(['push', 'gitee', `${unrelated}:refs/heads/main`]);
  const result = f.sync();
  assert.equal(result.code, 1);
  assert.match(result.output, /unrelated/);
  assert.equal(f.refs(f.targets[0]), '');
  assert.match(f.refs(f.targets[1]), new RegExp(`${unrelated}\\s+refs/heads/main`));
});

test('one remote divergence blocks all pushes and preserves both histories', t => {
  const f = fixture(t);
  assert.equal(f.sync().code, 0);
  f.git(['checkout', '-b', 'other-history']);
  const remoteTip = f.commit('remote.txt', 'remote change');
  f.git(['push', 'gitee', 'HEAD:refs/heads/main']);
  f.git(['checkout', 'main']);
  f.commit('local.txt', 'local change');
  const result = f.sync();
  assert.equal(result.code, 1);
  assert.match(result.output, /ahead, divergent or unrelated/);
  assert.match(f.refs(f.targets[0]), new RegExp(`${f.initial}\\s+refs/heads/main`));
  assert.match(f.refs(f.targets[1]), new RegExp(`${remoteTip}\\s+refs/heads/main`));
});

test('tag conflicts block branch advancement on both remotes', t => {
  const f = fixture(t);
  f.git(['tag', 'v1.0.0']);
  assert.equal(f.sync(['--tag', 'v1.0.0']).code, 0);
  f.commit('next.txt', 'next');
  f.git(['tag', '-f', 'v1.0.0']);
  const result = f.sync(['--tag', 'v1.0.0']);
  assert.equal(result.code, 1);
  assert.match(result.output, /Tag conflict/);
  for (const target of f.targets) assert.match(f.refs(target), new RegExp(`${f.initial}\\s+refs/heads/main`));
});

test('a failed remote reports partial success and safely completes on retry', t => {
  const f = fixture(t);
  f.git(['config', 'receive.denyNonFastForwards', 'true'], f.targets[1].url);
  f.git(['config', 'receive.denyCurrentBranch', 'refuse'], f.targets[1].url);
  f.git(['config', 'core.bare', 'false'], f.targets[1].url);
  const failed = f.sync();
  assert.equal(failed.code, 1);
  assert.match(failed.output, /\[github\] SUCCESS/);
  assert.match(failed.output, /\[gitee\] FAILED/);
  assert.match(failed.output, /Sync incomplete/);
  f.git(['config', 'core.bare', 'true'], f.targets[1].url);
  const retried = f.sync();
  assert.equal(retried.code, 0, retried.output);
  for (const target of f.targets) assert.match(f.refs(target), new RegExp(`${f.initial}\\s+refs/heads/main`));
});

test('deleted private configuration is still rejected from history', t => {
  const f = fixture(t);
  // Reuse an existing blob: object-name enumeration alone would miss this path.
  f.commit('.npmrc', 'initial\n');
  f.git(['rm', '.npmrc']);
  f.git(['commit', '-m', 'remove config']);
  const result = f.sync();
  assert.equal(result.code, 1);
  assert.match(result.output, /private configuration in committed history/);
  for (const target of f.targets) assert.equal(f.refs(target), '');
});

test('token-free HTTPS npmrc is allowed, authentication settings in its history are blocked', t => {
  const f = fixture(t);
  const safe = 'registry=https://nexus.bjblackhole.cn/repository/npm-group/\nstrict-ssl=true\n';
  f.commit('.npmrc', safe);
  assert.equal(f.sync().code, 0);
  f.commit('.npmrc', 'registry=https://registry.npmjs.org/\nstrict-ssl=true\n');
  assert.equal(f.sync().code, 0);
  // A fake marker exercises the config guard without using a real credential.
  f.commit('.npmrc', safe + '//example.invalid/:_authToken=TEST_ONLY_NOT_A_CREDENTIAL\n');
  f.commit('.npmrc', safe);
  const result = f.sync();
  assert.equal(result.code, 1);
  assert.match(result.output, /No authentication fields/);
});

test('dirty work and tags outside selected history cannot publish', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.local, 'unreviewed.txt'), 'unreviewed');
  assert.match(f.sync().output, /Working tree is not clean/);
  fs.unlinkSync(path.join(f.local, 'unreviewed.txt'));
  f.git(['checkout', '-b', 'other']);
  f.commit('other.txt', 'other');
  f.git(['tag', 'v2.0.0']);
  f.git(['checkout', 'main']);
  assert.match(f.sync(['--tag', 'v2.0.0']).output, /does not belong/);
  for (const target of f.targets) assert.equal(f.refs(target), '');
});

test('nonempty remote with a different branch name stops before any push', t => {
  const f = fixture(t);
  f.git(['push', 'gitee', 'HEAD:refs/heads/master']);
  f.git(['symbolic-ref', 'HEAD', 'refs/heads/master'], f.targets[1].url);
  const result = f.sync();
  assert.equal(result.code, 1);
  assert.match(result.output, /Default branch: master/);
  assert.match(result.output, /absent on this nonempty remote/);
  assert.equal(f.refs(f.targets[0]), '');
});

test('additional push URLs are refused, including unintended destinations', t => {
  const f = fixture(t);
  f.git(['remote', 'set-url', '--add', '--push', 'origin', f.targets[0].url]);
  f.git(['remote', 'set-url', '--add', '--push', 'origin', 'https://example.invalid/unintended.git']);
  const result = f.sync();
  assert.equal(result.code, 1);
  assert.match(result.output, /exactly the approved fetch and push URL/);
  for (const target of f.targets) assert.equal(f.refs(target), '');
});
