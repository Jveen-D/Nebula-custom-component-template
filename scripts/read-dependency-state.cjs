'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

function readDependencyState(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lockPath = path.join(root, 'package-lock.json');
  assert.ok(fs.existsSync(lockPath), '模板需要随仓库保留真实 package-lock.json，不能用过程文档替代锁文件。');
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies);
  assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies);
  return { pkg, packages: lock.packages, lockAvailable: true };
}

module.exports = { readDependencyState };
