/**
 * Linear Integration — OAuth + LinearClient.
 *
 * Supports PKCE authorization_code flow (OAuth) with API key fallback.
 * Owns the LinearClient lifecycle. API operations are exposed exclusively
 * through GraphQL (see schema.ts and api.ts).
 *
 * OAuth credentials are NOT hardcoded or read from environment variables.
 * Instead, `clientIdKey` and `clientSecretKey` point to secure storage keys
 * that the user configures via the integration settings UI. The OAuthManager
 * resolves these at flow time from the integration's scoped secure storage.
 */

import { defineIntegration } from '@tryvienna/sdk';
import type { IntegrationDefinition } from '@tryvienna/sdk';
import type { LinearClient } from '@linear/sdk';
import { registerLinearSchema } from './schema';

// ─────────────────────────────────────────────────────────────────────────────
// Linear SVG Icon
// ─────────────────────────────────────────────────────────────────────────────

const LINEAR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor"><path d="M1.22541 61.5228c-.97834-1.6499-.97834-3.7397 0-5.3896L29.5856 6.6073c.9784-1.6499 2.7833-2.6573 4.7401-2.6573h56.7203c1.9569 0 3.7618 1.0074 4.7402 2.6573l28.3602 49.5259c.9783 1.6499.9783 3.7397 0 5.3896L96.0462 93.3927c-.9784 1.6499-2.7833 2.6573-4.7402 2.6573H34.3257c-1.9568 0-3.7617-1.0074-4.7401-2.6573L1.22541 61.5228Z" fill="none"/><path d="M5.4 58.8L34.84 7.19c.77-1.3 2.19-2.09 3.73-2.09h44.66c1.54 0 2.96.8 3.73 2.09l15.72 27.57-24.28 24.28c-3.62-3.29-8.43-5.3-13.74-5.3-11.22 0-20.33 9.11-20.33 20.33 0 5.31 2.01 10.12 5.3 13.74L32.57 75.64c-5.41-6.2-8.7-14.32-8.7-23.14 0-19.44 15.76-35.2 35.2-35.2 8.82 0 16.94 3.29 23.14 8.7L97.89 10.32c-.73-.92-1.82-1.45-2.98-1.45H35.09c-.98 0-1.88.5-2.38 1.33L4.18 57.76c-.5.82-.5 1.83 0 2.66L24.5 94.06c.5.82 1.4 1.33 2.38 1.33h24.49L5.4 58.8ZM64.67 85.06c7.64 0 13.84-6.2 13.84-13.84S72.31 57.38 64.67 57.38s-13.84 6.2-13.84 13.84 6.2 13.84 13.84 13.84Z"/></svg>';

// ─────────────────────────────────────────────────────────────────────────────
// Integration Definition
// ─────────────────────────────────────────────────────────────────────────────

export const linearIntegration: IntegrationDefinition<LinearClient> = defineIntegration<LinearClient>({
  id: 'linear',
  name: 'Linear',
  description: 'Linear API for issues, projects, cycles, and team management',
  icon: { svg: LINEAR_SVG },

  oauth: {
    providers: [{
      providerId: 'linear',
      displayName: 'Linear',
      icon: 'linear',
      required: false,
      flow: {
        grantType: 'authorization_code',
        clientId: '',
        clientIdKey: 'linear_oauth_client_id',
        clientSecretKey: 'linear_oauth_client_secret',
        authorizationUrl: 'https://linear.app/oauth/authorize',
        tokenUrl: 'https://api.linear.app/oauth/token',
        scopes: ['read', 'write', 'issues:create', 'comments:create'],
        scopeSeparator: ',',
        pkce: { enabled: true, method: 'S256' },
        redirectPort: 5763,
        redirectPath: '/callbacks/linear',
      },
    }],
  },

  credentials: ['api_token', 'linear_oauth_client_id', 'linear_oauth_client_secret'],

  createClient: async (ctx) => {
    const { LinearClient: LinearClientClass } = await import('@linear/sdk');

    // Try OAuth first
    if (ctx.oauth) {
      const token = await ctx.oauth.getAccessToken('linear');
      if (token) return new LinearClientClass({ accessToken: token });
    }

    // Fallback to API key
    const apiKey = await ctx.storage.get('api_token');
    if (apiKey) return new LinearClientClass({ apiKey });

    ctx.logger.warn('No Linear token configured');
    return null;
  },

  schema: registerLinearSchema,
});
