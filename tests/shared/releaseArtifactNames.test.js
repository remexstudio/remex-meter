'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { MacUpdater } = require('electron-updater');

const rootPackage = require('../../package.json');
const {
  referencedArtifactNames,
  verifyUpdaterArtifactNames
} = require('../../scripts/verify-updater-artifact-names');
const { mergeMacUpdaterMetadata } = require('../../scripts/merge-mac-updater-metadata');
const { extractReleaseNotes } = require('../../src/shared/appUpdater');
const { MAC_APP_MIN_DARWIN_VERSION } = require('../../src/shared/macSystemRequirements');

function macUpdaterMetadata(version, arch) {
  return [
    `version: ${version}`,
    'files:',
    `  - url: Token-Monitor-${version}-${arch}.zip`,
    `    sha512: ${arch}-zip-hash`,
    '    size: 100',
    `  - url: Token-Monitor-${version}-${arch}.dmg`,
    `    sha512: ${arch}-dmg-hash`,
    '    size: 200',
    `path: Token-Monitor-${version}-${arch}.zip`,
    `sha512: ${arch}-zip-hash`,
    "releaseDate: '2026-07-21T00:00:00.000Z'",
    'releaseNotes: |',
    '  <!-- app-update-notes:en:start -->',
    '  ### Fixed',
    `  - ${arch} release notes survive metadata processing.`,
    '  <!-- app-update-notes:en:end -->',
    ''
  ].join('\n');
}

test('the macOS artifact is the Apple Silicon Remex Meter DMG and zip', () => {
  assert.equal(rootPackage.build.mac.artifactName, 'Remex-Meter-${version}-arm64.${ext}');
  assert.doesNotMatch(rootPackage.build.mac.artifactName, /\s/);
  assert.deepEqual(rootPackage.build.mac.target, [
    { target: 'dmg', arch: ['arm64'] },
    { target: 'zip', arch: ['arm64'] }
  ]);
  assert.equal(rootPackage.build.appId, 'studio.remex.meter');
  assert.equal(rootPackage.build.productName, 'Remex Meter');
  assert.deepEqual(rootPackage.build.publish, [{ provider: 'github', owner: 'remexstudio', repo: 'remex-meter' }]);
});

test('only macOS Apple Silicon is packaged', () => {
  for (const key of ['win', 'linux', 'nsis', 'portable']) {
    assert.equal(rootPackage.build[key], undefined, key);
  }
  for (const name of Object.keys(rootPackage.scripts)) {
    assert.doesNotMatch(name, /^dist:(?:win|linux)|:x64$/, name);
    assert.doesNotMatch(rootPackage.scripts[name], /--(?:win|linux|x64)\b|--platform=(?:win32|linux|darwin-x64)/, name);
  }
  assert.match(rootPackage.scripts['dist:mac'], /--mac --arm64/);
  assert.match(rootPackage.scripts['dist:mac:widget'], /--mac --arm64/);
  assert.equal(fs.existsSync(path.join(__dirname, '..', '..', '.github', 'workflows', 'release.yml')), false);
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

test('release icons use source assets without the legacy generator', () => {
  const projectRoot = path.join(__dirname, '..', '..');
  assert.ok(fs.existsSync(path.join(projectRoot, rootPackage.build.mac.icon)), `missing release icon source: ${rootPackage.build.mac.icon}`);
  assert.equal(rootPackage.scripts.icons, undefined);
  assert.equal(rootPackage.devDependencies['electron-icon-builder'], undefined);
});

test('extracts updater artifact names from url and path fields', () => {
  const names = referencedArtifactNames([
    'files:',
    '  - url: Token-Monitor-0.25.0-arm64.zip',
    'path: "Token-Monitor-0.25.0-arm64.zip"',
    "  - url: 'https://example.com/Token-Monitor-0.25.0-arm64.dmg'"
  ].join('\n'));
  assert.deepEqual(names, [
    'Token-Monitor-0.25.0-arm64.zip',
    'Token-Monitor-0.25.0-arm64.dmg'
  ]);
});

test('fails when updater metadata references an asset that will not be uploaded', (t) => {
  const distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'token-monitor-release-'));
  t.after(() => fs.rmSync(distDir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(distDir, 'latest-mac.yml'), [
    'version: 0.25.0',
    'files:',
    '  - url: Token-Monitor-0.25.0-arm64.zip',
    'path: Token-Monitor-0.25.0-arm64.zip'
  ].join('\n'));

  assert.throws(
    () => verifyUpdaterArtifactNames(distDir),
    /latest-mac\.yml -> Token-Monitor-0\.25\.0-arm64\.zip/
  );

  fs.writeFileSync(path.join(distDir, 'Token-Monitor-0.25.0-arm64.zip'), 'artifact');
  assert.deepEqual(verifyUpdaterArtifactNames(distDir), {
    metadataFiles: ['latest-mac.yml']
  });
});

test('merges arm64 and x64 mac updater files into one architecture-aware feed', (t) => {
  const version = '0.33.0';
  const merged = mergeMacUpdaterMetadata(
    macUpdaterMetadata(version, 'arm64'),
    macUpdaterMetadata(version, 'x64')
  );
  assert.deepEqual(referencedArtifactNames(merged), [
    `Token-Monitor-${version}-arm64.zip`,
    `Token-Monitor-${version}-arm64.dmg`,
    `Token-Monitor-${version}-x64.zip`,
    `Token-Monitor-${version}-x64.dmg`
  ]);
  assert.match(merged, new RegExp(`^path: Token-Monitor-${version}-arm64\\.zip$`, 'm'));
  assert.match(merged, new RegExp(`^minimumSystemVersion: ${MAC_APP_MIN_DARWIN_VERSION.replaceAll('.', '\\.')}$`, 'm'));
  assert.equal((merged.match(/^minimumSystemVersion:/gm) || []).length, 1);
  assert.match(merged, /arm64 release notes survive metadata processing/);
  assert.doesNotMatch(merged, /x64 release notes survive metadata processing/);

  const files = referencedArtifactNames(merged).map((fileName) => ({
    url: new URL(`https://release.invalid/${fileName}`),
    info: { url: fileName }
  }));
  assert.deepEqual(
    MacUpdater.filterFilesForArch(files, true).map((file) => path.basename(file.url.pathname)),
    [`Token-Monitor-${version}-arm64.zip`, `Token-Monitor-${version}-arm64.dmg`]
  );
  assert.deepEqual(
    MacUpdater.filterFilesForArch(files, false).map((file) => path.basename(file.url.pathname)),
    [`Token-Monitor-${version}-x64.zip`, `Token-Monitor-${version}-x64.dmg`]
  );

  const distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'token-monitor-mac-release-'));
  t.after(() => fs.rmSync(distDir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(distDir, 'latest-mac.yml'), merged);
  for (const fileName of referencedArtifactNames(merged)) {
    fs.writeFileSync(path.join(distDir, fileName), 'artifact');
  }
  assert.deepEqual(verifyUpdaterArtifactNames(distDir), {
    metadataFiles: ['latest-mac.yml']
  });
});

test('rejects mismatched or mislabelled mac updater metadata', () => {
  assert.throws(
    () => mergeMacUpdaterMetadata(
      macUpdaterMetadata('0.33.0', 'arm64'),
      macUpdaterMetadata('0.33.1', 'x64')
    ),
    /versions differ/
  );
  assert.throws(
    () => mergeMacUpdaterMetadata(
      macUpdaterMetadata('0.33.0', 'x64'),
      macUpdaterMetadata('0.33.0', 'arm64')
    ),
    /expected only arm64 artifacts/
  );
  assert.throws(
    () => mergeMacUpdaterMetadata(
      macUpdaterMetadata('0.33.0', 'arm64').replace(
        'files:',
        'minimumSystemVersion: 23.0.0\nfiles:'
      ),
      macUpdaterMetadata('0.33.0', 'x64')
    ),
    /does not match release policy/
  );
  assert.throws(
    () => mergeMacUpdaterMetadata(
      macUpdaterMetadata('0.33.0', 'arm64').replace(
        'files:',
        'minimumSystemVersion:\nfiles:'
      ),
      macUpdaterMetadata('0.33.0', 'x64')
    ),
    /empty top-level minimumSystemVersion/
  );
});

test('rejects stale or missing top-level mac updater paths', () => {
  const version = '0.33.0';
  const arm64Metadata = macUpdaterMetadata(version, 'arm64');
  const x64Metadata = macUpdaterMetadata(version, 'x64');

  assert.throws(
    () => mergeMacUpdaterMetadata(
      arm64Metadata.replace(
        `path: Token-Monitor-${version}-arm64.zip`,
        `path: Token-Monitor-${version}-x64.zip`
      ),
      x64Metadata
    ),
    /arm64 metadata path Token-Monitor-0\.33\.0-x64\.zip does not reference an arm64 artifact/
  );
  assert.throws(
    () => mergeMacUpdaterMetadata(
      arm64Metadata.replace(
        `path: Token-Monitor-${version}-arm64.zip`,
        `path: Other-Monitor-${version}-arm64.zip`
      ),
      x64Metadata
    ),
    /arm64 metadata path Other-Monitor-0\.33\.0-arm64\.zip is not present in its files list/
  );
  assert.throws(
    () => mergeMacUpdaterMetadata(
      arm64Metadata.replace(
        `path: Token-Monitor-${version}-arm64.zip`,
        `path: Token-Monitor-${version}-arm64.dmg`
      ),
      x64Metadata
    ),
    /arm64 metadata path Token-Monitor-0\.33\.0-arm64\.dmg is not a zip artifact/
  );
  assert.throws(
    () => mergeMacUpdaterMetadata(
      arm64Metadata.replace(`path: Token-Monitor-${version}-arm64.zip\n`, ''),
      x64Metadata
    ),
    /arm64 metadata must have exactly one top-level path/
  );
});
