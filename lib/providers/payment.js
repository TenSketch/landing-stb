// Payment provider abstraction
import { BaseProvider } from './base.js';

export class PaymentProvider extends BaseProvider {
  constructor(config = {}) {
    super('payment', config);
  }

  isConfigured() {
    return Boolean(this.config.providerKey);
  }

  validateConfig() {
    const errors = [];
    if (!this.config.providerKey) errors.push('providerKey is required');
    if (!this.config.currency) errors.push('currency is required');
    return { valid: errors.length === 0, errors };
  }

  /**
   * Initiate a payment.
   * Placeholder: actual provider integration goes here.
   */
  async initiate({ amount, currency, reference, description, metadata }) {
    if (!this.isEnabled() || !this.isConfigured()) {
      return { success: false, error: 'Payment provider not enabled or configured' };
    }
    console.log(`[PaymentProvider] placeholder initiate ${amount} ${currency} for ${reference}`);
    return {
      success: true,
      provider: this.config.providerKey,
      placeholder: true,
      transactionId: `PLACEHOLDER-${Date.now()}`,
      amount,
      currency
    };
  }

  /**
   * Verify/refund a payment.
   * Placeholder.
   */
  async verify(transactionId) {
    if (!this.isEnabled() || !this.isConfigured()) {
      return { success: false, error: 'Payment provider not enabled or configured' };
    }
    return { success: true, provider: this.config.providerKey, placeholder: true, transactionId };
  }

  async refund(transactionId, amount) {
    if (!this.isEnabled() || !this.isConfigured()) {
      return { success: false, error: 'Payment provider not enabled or configured' };
    }
    return { success: true, provider: this.config.providerKey, placeholder: true, transactionId, amount };
  }
}
