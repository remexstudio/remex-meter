'use strict';

const { DEFAULT_LIMIT_PROVIDER_IDS } = require('../shared/limits/providers');

function applyInitialLimitProviderSeed(pending, summary, deps = {}) {
  const healthClients = summary?.clientHealth?.clients;
  if (
    !pending
    || !deps.settings
    || !healthClients
    || typeof healthClients !== 'object'
    || Array.isArray(healthClients)
  ) {
    return false;
  }

  const previousProviders = deps.settings.limitProviders;
  // Remex Meter enables its six tools on a first run whether or not a local
  // source was detected yet; each one reports its own "not configured" state.
  deps.settings.limitProviders = DEFAULT_LIMIT_PROVIDER_IDS.join(',');
  try {
    if (deps.saveSettings?.() !== true) {
      deps.settings.limitProviders = previousProviders;
      return false;
    }
  } catch (error) {
    deps.settings.limitProviders = previousProviders;
    throw error;
  }

  deps.onPersisted?.();
  return true;
}

module.exports = {
  applyInitialLimitProviderSeed
};
