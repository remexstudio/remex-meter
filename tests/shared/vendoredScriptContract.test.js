'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const packageJson = require('../../package.json');

const runtimeScripts = [
  'start',
  'widget',
  'dev',
  'agent',
  'agent:once',
  'pack',
  'pack:mac:widget',
  'dist:mac',
  'dist:mac:widget'
];

test('runtime and packaging scripts explicitly ensure vendored tokscale', () => {
  for (const name of runtimeScripts) {
    assert.match(packageJson.scripts[name], /ensure:tokscale/, name);
  }
  for (const name of ['pack:mac:widget', 'dist:mac', 'dist:mac:widget']) {
    assert.match(packageJson.scripts[name], /--platform=darwin-arm64/, name);
  }
});

test('ordinary install-adjacent scripts do not pull the vendored binary', () => {
  for (const name of ['hub', 'test', 'lint', 'verify', 'build:mac-widget']) {
    assert.doesNotMatch(packageJson.scripts[name], /ensure:tokscale/, name);
  }
  assert.equal(packageJson.scripts.postinstall, undefined);
  assert.equal(packageJson.scripts.prepack, undefined);
});

test('no packaging script opts out of a strict ensure', () => {
  for (const name of runtimeScripts) {
    assert.doesNotMatch(packageJson.scripts[name], /--allow-missing-target-package/, name);
  }
});

test('vendored CI keeps the complete Release asset verifier wired in', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', 'vendor-tokscale.yml'), 'utf8');
  assert.match(workflow, /verify-release-assets:/);
  assert.match(workflow, /node scripts\/verify-vendored-tokscale-release\.js/);
  assert.match(workflow, /'scripts\/verify-vendored-tokscale-release\.js'/);
});
