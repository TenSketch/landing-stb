// SMS provider abstraction
import { BaseProvider } from './base.js';

export class SmsProvider extends BaseProvider {
  constructor(config = {}) {
    super('sms', config);
  }

  isConfigured() {
    // Placeholder: requires provider-specific credentials
    return Boolean(this.config.providerKey && this.config.senderId);
  }

  validateConfig() {
    const errors = [];
    if (!this.config.providerKey) errors.push('providerKey is required');
    if (!this.config.senderId) errors.push('senderId is required');
    return { valid: errors.length === 0, errors };
  }

  async send({ to, body }) {
    if (!this.isEnabled() || !this.isConfigured()) {
      return { success: false, error: 'SMS provider not enabled or configured' };
    }
    // Provider-specific integration goes here.
    console.log(`[SmsProvider] placeholder send to ${to}: ${body}`);
    return { success: true, provider: this.config.providerKey, placeholder: true };
  }
}
