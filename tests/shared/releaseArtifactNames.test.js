'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const rootPackage = require('../../package.json');
const {
  referencedArtifactNames,
  verifyUpdaterArtifactNames
} = require('../../scripts/verify-updater-artifact-names');
const { extractReleaseNotes } = require('../../src/shared/appUpdater');

test('the mac artifact template names the Apple Silicon DMG', () => {
  assert.equal(rootPackage.build.mac.artifactName, 'Remex-Meter-${version}-arm64.${ext}');
  assert.doesNotMatch(rootPackage.build.mac.artifactName, /\s/);
  assert.deepEqual(rootPackage.build.mac.target, ['dmg', 'zip']);
  assert.equal(rootPackage.build.appId, 'studio.remex.meter');
  assert.equal(rootPackage.build.productName, 'Remex Meter');
  assert.deepEqual(rootPackage.build.publish, [{ provider: 'github', owner: 'remexstudio', repo: 'remex-meter' }]);
});

test('updater metadata embeds every localized release-note section', () => {
  assert.equal(rootPackage.build.releaseInfo?.releaseNotesFile, '.github/RELEASE_TEMPLATE.md');
  const releaseTemplate = fs.readFileSync(
    path.join(__dirname, '..', '..', rootPackage.build.releaseInfo.releaseNotesFile),
    'utf8'
  );
  const notes = extractReleaseNotes(releaseTemplate);
  assert.deepEqual(Object.keys(notes), ['en', 'zh', 'zh-TW', 'ko', 'ja']);
  for (const locale of Object.keys(notes)) {
    assert.ok(notes[locale].length > 0, `${locale} has no release-note groups`);
    assert.ok(notes[locale].every((group) => group.items.length > 0), `${locale} has an empty release-note group`);
  }
});

test('mac release scripts build Apple Silicon artifacts only', () => {
  assert.match(rootPackage.scripts['dist:mac'], /--mac --arm64/);
  assert.match(rootPackage.scripts['dist:mac:widget'], /--mac --arm64/);
  for (const name of Object.keys(rootPackage.scripts)) {
    assert.doesNotMatch(name, /x64|win|linux/, name);
  }
  assert.equal(fs.existsSync(path.join(__dirname, '..', '..', '.github', 'workflows', 'release.yml')), false);
});

test('release icons use source assets without the legacy generator', () => {
  const projectRoot = path.join(__dirname, '..', '..');
  assert.ok(fs.existsSync(path.join(projectRoot, rootPackage.build.mac.icon)));
  assert.equal(rootPackage.scripts.icons, undefined);
  assert.equal(rootPackage.devDependencies['electron-icon-builder'], undefined);
});

test('extracts updater artifact names from url and path fields', () => {
  const names = referencedArtifactNames([
    'files:',
    '  - url: Remex-Meter-0.25.0-arm64.zip',
    'path: "Remex-Meter-0.25.0-arm64.zip"',
    "  - url: 'https://example.com/Remex-Meter-0.25.0-arm64.dmg'"
  ].join('\n'));
  assert.deepEqual(names, [
    'Remex-Meter-0.25.0-arm64.zip',
    'Remex-Meter-0.25.0-arm64.dmg'
  ]);
});

test('fails when updater metadata references an asset that will not be uploaded', (t) => {
  const distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'remex-meter-release-'));
  t.after(() => fs.rmSync(distDir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(distDir, 'latest-mac.yml'), [
    'version: 0.25.0',
    'files:',
    '  - url: Remex-Meter-0.25.0-arm64.zip',
    'path: Remex-Meter-0.25.0-arm64.zip'
  ].join('\n'));

  assert.throws(
    () => verifyUpdaterArtifactNames(distDir),
    /latest-mac\.yml -> Remex-Meter-0\.25\.0-arm64\.zip/
  );

  fs.writeFileSync(path.join(distDir, 'Remex-Meter-0.25.0-arm64.zip'), 'artifact');
  assert.deepEqual(verifyUpdaterArtifactNames(distDir), {
    metadataFiles: ['latest-mac.yml']
  });
});
