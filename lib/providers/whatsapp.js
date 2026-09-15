// WhatsApp provider abstraction
import { BaseProvider } from './base.js';

export class WhatsAppProvider extends BaseProvider {
  constructor(config = {}) {
    super('whatsapp', config);
  }

  isConfigured() {
    return Boolean(this.config.providerKey && this.config.senderNumber);
  }

  validateConfig() {
    const errors = [];
    if (!this.config.providerKey) errors.push('providerKey is required');
    if (!this.config.senderNumber) errors.push('senderNumber is required');
    return { valid: errors.length === 0, errors };
  }

  /**
   * Send via provider API. Actual vendor implementation is placeholder.
   */
  async send({ to, body, templateName }) {
    if (!this.isEnabled() || !this.isConfigured()) {
      return { success: false, error: 'WhatsApp provider not enabled or configured' };
    }
    console.log(`[WhatsAppProvider] placeholder send to ${to}: ${body || templateName}`);
    return { success: true, provider: this.config.providerKey, placeholder: true };
  }

  /**
   * Build a wa.me fallback link for direct message.
   */
  makeFallbackLink({ phone, message }) {
    const cleanPhone = String(phone).replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message || '')}`;
  }
}
