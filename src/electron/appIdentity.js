'use strict';

// Product identity. Names here are fixed by AGENTS.md ("Names"); change them
// only together with package.json and tests/electron/appIdentity.test.js.
const APP_NAME = 'Remex Meter';
const MENU_BAR_EXTRA_LABEL = 'Meter';
const STUDIO_NAME = 'Remex Studio';
const ABOUT_LINE = `${APP_NAME} · ${STUDIO_NAME}`;
const REPOSITORY_URL = 'https://github.com/remexstudio/remex-meter';

function aboutPanelOptions(version = '') {
  return {
    applicationName: APP_NAME,
    ...(version ? { applicationVersion: String(version) } : {}),
    copyright: ABOUT_LINE,
    website: REPOSITORY_URL
  };
}

module.exports = {
  ABOUT_LINE,
  APP_NAME,
  MENU_BAR_EXTRA_LABEL,
  REPOSITORY_URL,
  STUDIO_NAME,
  aboutPanelOptions
};
