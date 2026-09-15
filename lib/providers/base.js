// Provider abstraction base class
export class BaseProvider {
  constructor(type, config = {}) {
    this.type = type;
    this.config = config;
  }

  isConfigured() {
    return false;
  }

  isEnabled() {
    return this.config?.enabled === true;
  }

  validateConfig() {
    return { valid: true, errors: [] };
  }

  async send(payload) {
    throw new Error(`send() not implemented for provider type ${this.type}`);
  }
}
