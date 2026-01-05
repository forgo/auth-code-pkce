/**
 * Authentik 2025.6.x initializer
 *
 * Uses same API format as 2024.12:
 * - Object-based redirect_uris with matching_mode
 * - Requires invalidation_flow
 */

import { Authentik2024_12Initializer } from './v2024-12.js';

export class Authentik2025_6Initializer extends Authentik2024_12Initializer {
  override readonly version = '2025.6';

  // Inherits all behavior from 2024.12
  // Override methods here if future versions introduce API changes
}
