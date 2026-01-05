/**
 * Authentik 2024.12.x initializer
 *
 * Uses new API format:
 * - Object-based redirect_uris with matching_mode
 * - Requires invalidation_flow
 */

import { AuthentikBaseInitializer } from './base.js';
import type { ProviderInitOptions, AuthContext, ApiResult } from '../types.js';

interface AuthentikFlow {
  pk: string;
}

interface AuthentikProvider {
  pk: number;
  name: string;
}

interface AuthentikPaginatedResponse<T> {
  results: T[];
}

export class Authentik2024_12Initializer extends AuthentikBaseInitializer {
  readonly version = '2024.12';

  /**
   * Format redirect URIs as array of objects (new format)
   */
  protected formatRedirectUris(
    uris: string[]
  ): Array<{ matching_mode: string; url: string }> {
    return uris.map((url) => ({ matching_mode: 'strict', url }));
  }

  /**
   * Get invalidation flow (required in 2024.12+)
   */
  protected override async getInvalidationFlow(
    baseUrl: string,
    auth: AuthContext
  ): Promise<string | null> {
    this.log('Getting invalidation flow...');

    const result = await this.fetchJson<AuthentikPaginatedResponse<AuthentikFlow>>(
      `${baseUrl}/api/v3/flows/instances/?slug=default-provider-invalidation-flow`,
      { auth }
    );

    const pk = result.data?.results?.[0]?.pk;
    if (pk) {
      this.log(`Found invalidation flow: ${pk}`);
      return pk;
    }

    this.warn('Invalidation flow not found');
    return null;
  }

  /**
   * Create OAuth2 provider with new API format
   */
  async createOAuthClient(
    options: ProviderInitOptions,
    auth: AuthContext
  ): Promise<ApiResult<{ clientId: string; providerId?: string }>> {
    this.log('Creating OAuth2 provider...');

    const flowPk = await this.getAuthorizationFlow(options.baseUrl, auth);
    const invalidationFlowPk = await this.getInvalidationFlow(options.baseUrl, auth);
    const scopeMappings = await this.getScopeMappings(options.baseUrl, auth);

    if (!invalidationFlowPk) {
      return {
        success: false,
        error: 'Invalidation flow not found (required for Authentik 2024.12+)',
      };
    }

    // Check if provider exists
    const existingResult = await this.fetchJson<AuthentikPaginatedResponse<AuthentikProvider>>(
      `${options.baseUrl}/api/v3/providers/oauth2/?name=test-spa-provider`,
      { auth }
    );

    if ((existingResult.data?.results?.length || 0) > 0) {
      const existingPk = existingResult.data!.results[0].pk;
      this.warn(`OAuth2 provider already exists (pk: ${existingPk}), updating scope mappings...`);

      // Update scope mappings on existing provider
      if (scopeMappings.length > 0) {
        await this.fetchJson(
          `${options.baseUrl}/api/v3/providers/oauth2/${existingPk}/`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ property_mappings: scopeMappings }),
            auth,
          }
        );
      }

      // Ensure application exists
      await this.createApplication(options, auth, existingPk);

      return {
        success: true,
        data: {
          clientId: options.client.clientId,
          providerId: String(existingPk),
        },
      };
    }

    // Create provider with new API format (object redirect_uris + invalidation_flow)
    this.log('Using new API format (Authentik 2024.12+)...');
    const createResult = await this.fetchJson<AuthentikProvider>(
      `${options.baseUrl}/api/v3/providers/oauth2/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'test-spa-provider',
          authorization_flow: flowPk,
          invalidation_flow: invalidationFlowPk,
          client_type: options.client.clientType,
          client_id: options.client.clientId,
          redirect_uris: this.formatRedirectUris(options.client.redirectUris),
          property_mappings: scopeMappings.length > 0 ? scopeMappings : undefined,
          access_code_validity: 'minutes=1',
          access_token_validity: 'hours=1',
          refresh_token_validity: 'days=30',
          include_claims_in_id_token: true,
          sub_mode: 'hashed_user_id',
          issuer_mode: 'per_provider',
        }),
        auth,
      }
    );

    if (!createResult.success || !createResult.data?.pk) {
      return {
        success: false,
        error: `Failed to create provider: ${createResult.error}`,
      };
    }

    this.log(`Created OAuth2 provider (pk: ${createResult.data.pk})`);

    // Create application
    await this.createApplication(options, auth, createResult.data.pk);

    return {
      success: true,
      data: {
        clientId: options.client.clientId,
        providerId: String(createResult.data.pk),
      },
    };
  }
}
