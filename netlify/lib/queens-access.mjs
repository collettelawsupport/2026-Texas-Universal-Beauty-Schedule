import { getStore } from '@netlify/blobs';
import { configured, settings } from './queens-auth.mjs';

// This store is only read by server functions. No public route serves its contents.
// Environment settings remain available for hosts that support secret variables.
export async function loadAccess() {
  const env = settings();
  if (configured(env)) return env;
  try {
    const config = await getStore({ name: 'queens-access', consistency: 'strong' }).get('config.json', { type: 'json' });
    return config && configured(config) ? config : env;
  } catch { return env; }
}
