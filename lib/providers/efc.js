// EFC provider placeholder / configuration structure
// EFC API contract is not available in the repository, so this is a clean
// provider interface that can be implemented once the specification is known.
import { BaseProvider } from './base.js';

export class EfcProvider extends BaseProvider {
  constructor(config = {}) {
    super('efc', config);
  }

  isConfigured() {
    return Boolean(this.config.providerKey && this.config.baseUrl);
  }

  validateConfig() {
    const errors = [];
    if (!this.config.providerKey) errors.push('providerKey is required');
    if (!this.config.baseUrl) errors.push('baseUrl is required');
    return { valid: errors.length === 0, errors };
  }

  async send(payload) {
    if (!this.isEnabled() || !this.isConfigured()) {
      return { success: false, error: 'EFC provider not enabled or configured' };
    }
    console.log('[EfcProvider] placeholder send:', payload);
    return {
      success: true,
      provider: this.config.providerKey,
      placeholder: true,
      note: 'EFC API contract not available; implement when specification is provided.'
    };
  }
}
