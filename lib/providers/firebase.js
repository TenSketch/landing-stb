// Firebase Cloud Messaging provider abstraction
import { BaseProvider } from './base.js';

export class FirebaseProvider extends BaseProvider {
  constructor(config = {}) {
    super('firebase', config);
  }

  isConfigured() {
    return Boolean(this.config.projectId && this.config.serverKeyEncrypted);
  }

  validateConfig() {
    const errors = [];
    if (!this.config.projectId) errors.push('projectId is required');
    if (!this.config.serverKeyEncrypted) errors.push('serverKey is required');
    return { valid: errors.length === 0, errors };
  }

  async send({ token, title, body, data }) {
    if (!this.isEnabled() || !this.isConfigured()) {
      return { success: false, error: 'Firebase provider not enabled or configured' };
    }
    console.log(`[FirebaseProvider] placeholder send to ${token}: ${title}`);
    return { success: true, provider: 'fcm', placeholder: true };
  }
}
