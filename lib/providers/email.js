// Email provider using Nodemailer
import nodemailer from 'nodemailer';
import { BaseProvider } from './base.js';

export class EmailProvider extends BaseProvider {
  constructor(config = {}) {
    super('email', config);
    this.transporter = null;
  }

  isConfigured() {
    return Boolean(
      this.config.host && this.config.user && (this.config.password || this.config.pass)
    );
  }

  async getTransporter() {
    if (this.transporter) return this.transporter;
    if (!this.isConfigured()) return null;
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: Number(this.config.port || 587),
      secure: Number(this.config.port || 587) === 465,
      auth: {
        user: this.config.user,
        pass: this.config.password || this.config.pass
      }
    });
    return this.transporter;
  }

  async send({ to, from, subject, html, text }) {
    const transporter = await this.getTransporter();
    if (!transporter) {
      console.warn('[EmailProvider] not configured; email not sent.');
      return { success: false, error: 'Email provider not configured' };
    }
    try {
      const info = await transporter.sendMail({
        from: from || this.config.from,
        to,
        subject,
        html,
        text
      });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[EmailProvider] send failed:', err.message);
      return { success: false, error: err.message };
    }
  }
}
