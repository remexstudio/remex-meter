'use strict';

// Stable window identities for the quota pools in docs/POOLS.md.
// The popover selects a pool row by limitId. A display label is not an identity.

const CURSOR_MODE_POOL = 'cursor.modePool';
const CURSOR_OTHER_MODES = 'cursor.otherModes';
const CURSOR_REQUESTS = 'cursor.requests';
const CURSOR_OVERALL = 'cursor.overall';
const CURSOR_GROK_BOT = 'cursor.grokBot';
const CURSOR_TEAM_POOL = 'cursor.teamPool';
const CURSOR_ON_DEMAND = 'cursor.onDemand';

const GROK_HEAVY_WEEKLY = 'grok.heavyWeekly';
const GROK_BOLT_WEEKLY = 'grok.boltWeekly';
const GROK_CREDITS = 'grok.credits';

const POOL_MODULES = Object.freeze({
  cursor: Object.freeze([
    Object.freeze({
      limitId: CURSOR_MODE_POOL,
      label: 'Cursor Mode Pool',
      absentHint: 'This account did not report a Mode Pool window.'
    }),
    Object.freeze({
      limitId: CURSOR_OTHER_MODES,
      label: 'Cursor Other Modes',
      absentHint: 'This account did not report an Other Modes window.'
    })
  ]),
  grok: Object.freeze([
    Object.freeze({
      limitId: GROK_HEAVY_WEEKLY,
      label: 'Grok Heavy Weekly',
      absentHint: 'Grok does not report a separate Heavy weekly allowance.'
    }),
    Object.freeze({
      limitId: GROK_BOLT_WEEKLY,
      label: 'Grok Bolt Weekly',
      absentHint: 'Grok does not report a separate Bolt weekly allowance.'
    })
  ])
});

module.exports = {
  CURSOR_GROK_BOT,
  CURSOR_MODE_POOL,
  CURSOR_ON_DEMAND,
  CURSOR_OTHER_MODES,
  CURSOR_OVERALL,
  CURSOR_REQUESTS,
  CURSOR_TEAM_POOL,
  GROK_BOLT_WEEKLY,
  GROK_CREDITS,
  GROK_HEAVY_WEEKLY,
  POOL_MODULES
};
