-- ============================================================
-- 007: Expanded audit logs
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_email VARCHAR(255),
    actor_type VARCHAR(20) NOT NULL DEFAULT 'system', -- admin, customer, system
    action VARCHAR(50) NOT NULL, -- LOGIN, LOGOUT, PASSWORD_RESET, UPDATE, INSERT, DELETE, etc.
    table_name VARCHAR(100),
    record_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Migrate existing pricing audit history into new audit_logs
INSERT INTO audit_logs (actor_email, actor_type, action, table_name, record_id, old_values, new_values, created_at)
SELECT 
    admin_email,
    'admin',
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    changed_at
FROM pricing_audit_history
WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE audit_logs.created_at = pricing_audit_history.changed_at AND audit_logs.actor_email = pricing_audit_history.admin_email AND audit_logs.action = pricing_audit_history.action)
ON CONFLICT DO NOTHING;

-- Note: we keep pricing_audit_history for backward compatibility but new code should use audit_logs.
