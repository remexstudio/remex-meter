'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const identity = require('../../src/electron/appIdentity');
const packageJson = require('../../package.json');
const { GITHUB_REPO, RELEASES_LATEST_URL } = require('../../src/shared/appUpdater');

const ROOT = path.join(__dirname, '..', '..');
const main = fs.readFileSync(path.join(ROOT, 'src', 'electron', 'main.js'), 'utf8');

test('the app carries the Remex Meter names from AGENTS.md', () => {
  assert.equal(identity.APP_NAME, 'Remex Meter');
  assert.equal(identity.MENU_BAR_EXTRA_LABEL, 'Meter');
  assert.equal(identity.ABOUT_LINE, 'Remex Meter · Remex Studio');
  assert.deepEqual(identity.aboutPanelOptions('1.2.3'), {
    applicationName: 'Remex Meter',
    applicationVersion: '1.2.3',
    copyright: 'Remex Meter · Remex Studio',
    website: 'https://github.com/remexstudio/remex-meter'
  });
});

test('package metadata matches the product identity', () => {
  assert.equal(packageJson.name, 'remex-meter');
  assert.equal(packageJson.productName, identity.APP_NAME);
  assert.equal(packageJson.build.productName, identity.APP_NAME);
  assert.equal(packageJson.build.appId, 'studio.remex.meter');
  assert.equal(packageJson.build.mac.artifactName, 'Remex-Meter-${version}-arm64.${ext}');
  assert.equal(packageJson.repository.url, 'git+https://github.com/remexstudio/remex-meter.git');
  assert.equal(packageJson.homepage, 'https://github.com/remexstudio/remex-meter#readme');
  assert.equal(packageJson.bugs.url, 'https://github.com/remexstudio/remex-meter/issues');
});

test('main names the app, sets the About panel and the Meter tooltip', () => {
  assert.match(main, /const \{ APP_NAME, aboutPanelOptions \} = require\('\.\/appIdentity'\);/);
  assert.match(main, /app\.setName\(APP_NAME\);/);
  assert.match(main, /app\.setAboutPanelOptions\(aboutPanelOptions\(app\.getVersion\(\)\)\)/);
  assert.match(main, /tray\.setToolTip\(`Meter · \$\{tip\}`\)/);
});

test('the updater never checks the upstream repository', () => {
  assert.equal(GITHUB_REPO, 'remexstudio/remex-meter');
  assert.equal(RELEASES_LATEST_URL, 'https://github.com/remexstudio/remex-meter/releases/latest');
  const shipped = ['src', 'scripts'].flatMap((dir) => listFiles(path.join(ROOT, dir)));
  for (const file of shipped) {
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /Javis603\/token-monitor(?!\/compare)/, path.relative(ROOT, file));
  }
});

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return /\.(js|html|css|json)$/.test(entry.name) ? [full] : [];
  });
}
