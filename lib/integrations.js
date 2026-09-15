// Integration settings service (payments, SMS, WhatsApp, EFC, Firebase, Email)
import { query } from './db.js';
import { encryptSecret, decryptSecret } from './security.js';

export async function listIntegrations({ type = null } = {}) {
  let sql = `SELECT id, provider_type, provider_key, display_name, enabled, mode, config, is_default, created_at, updated_at FROM integration_settings`;
  const params = [];
  if (type) {
    params.push(type);
    sql += ` WHERE provider_type = $${params.length}`;
  }
  sql += ` ORDER BY provider_type, provider_key`;
  const res = await query(sql, params);
  return res.rows;
}

export async function getIntegration(id) {
  const res = await query(
    `SELECT id, provider_type, provider_key, display_name, enabled, mode, config, secrets_encrypted, is_default
     FROM integration_settings WHERE id = $1`,
    [id]
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return { ...row, secrets: decryptSecrets(row) };
}

function decryptSecrets(row) {
  if (!row.secrets_encrypted) return null;
  try {
    return JSON.parse(decryptSecret(row.secrets_encrypted));
  } catch (err) {
    console.warn('[Integrations] failed to decrypt secrets for', row.provider_key, err.message);
    return null;
  }
}

export async function upsertIntegration({ id, providerType, providerKey, displayName, enabled, mode, config, secrets, isDefault, actorEmail }) {
  const encryptedSecrets = secrets ? encryptSecret(JSON.stringify(secrets)) : null;
  if (id) {
    await query(
      `UPDATE integration_settings
       SET provider_type = $1, provider_key = $2, display_name = $3, enabled = $4, mode = $5,
           config = $6, secrets_encrypted = COALESCE($7, secrets_encrypted), is_default = $8, updated_at = NOW()
       WHERE id = $9`,
      [providerType, providerKey, displayName, enabled, mode, JSON.stringify(config || {}), encryptedSecrets, isDefault, id]
    );
    return await getIntegration(id);
  }
  const insertRes = await query(
    `INSERT INTO integration_settings (provider_type, provider_key, display_name, enabled, mode, config, secrets_encrypted, is_default, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT (provider_type, provider_key) DO UPDATE
     SET display_name = EXCLUDED.display_name, enabled = EXCLUDED.enabled, mode = EXCLUDED.mode,
         config = EXCLUDED.config, secrets_encrypted = COALESCE(EXCLUDED.secrets_encrypted, integration_settings.secrets_encrypted),
         is_default = EXCLUDED.is_default, updated_at = NOW()
     RETURNING id`,
    [providerType, providerKey, displayName, enabled, mode, JSON.stringify(config || {}), encryptedSecrets, isDefault]
  );
  return await getIntegration(insertRes.rows[0].id);
}

export async function setDefaultIntegration(providerType, id) {
  await query('UPDATE integration_settings SET is_default = FALSE WHERE provider_type = $1', [providerType]);
  await query('UPDATE integration_settings SET is_default = TRUE, updated_at = NOW() WHERE id = $1', [id]);
  return true;
}

export async function deleteIntegration(id) {
  await query('DELETE FROM integration_settings WHERE id = $1', [id]);
  return true;
}

export async function getDefaultIntegration(providerType) {
  const res = await query(
    `SELECT id, provider_type, provider_key, display_name, enabled, mode, config, secrets_encrypted
     FROM integration_settings
     WHERE provider_type = $1 AND is_default = TRUE AND enabled = TRUE
     LIMIT 1`,
    [providerType]
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return { ...row, secrets: decryptSecrets(row) };
}

export async function isPaymentEnabled() {
  const row = await getDefaultIntegration('PAYMENT');
  return row?.enabled === true;
}
