-- ============================================================
-- 004: RBAC, admin_users upgrade, permissions
-- Migrates the existing email-PK admin_users table.
-- ============================================================

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    key VARCHAR(128) UNIQUE NOT NULL,
    module VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- Ensure updated_at columns exist on roles/permissions if migrating from earlier 004
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Upgrade existing admin_users (email PK) with RBAC + password columns
ALTER TABLE admin_users
    ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS password_salt VARCHAR(255),
    ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS two_factor_secret_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admin_users_id') THEN
        CREATE UNIQUE INDEX idx_admin_users_id ON admin_users(id);
    END IF;
END $$;

-- Seed roles
INSERT INTO roles (slug, name, description, is_system_role) VALUES
    ('SUPER_ADMIN', 'Super Admin', 'Full platform access', TRUE),
    ('ADMIN', 'Admin', 'General administration', TRUE),
    ('DISPATCHER', 'Dispatcher', 'Manages bookings and drivers', TRUE),
    ('OPERATIONS', 'Operations', 'Day-to-day operations', TRUE),
    ('VIEWER', 'Viewer', 'Read-only access', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Seed permissions
INSERT INTO permissions (key, module, action, description) VALUES
    ('dashboard.view', 'dashboard', 'view', 'View admin dashboard'),
    ('bookings.view', 'bookings', 'view', 'View bookings'),
    ('bookings.manage', 'bookings', 'manage', 'Create/update bookings'),
    ('bookings.assign_driver', 'bookings', 'assign_driver', 'Assign driver to booking'),
    ('bookings.cancel', 'bookings', 'cancel', 'Cancel bookings'),
    ('customers.view', 'customers', 'view', 'View customers'),
    ('customers.manage', 'customers', 'manage', 'Manage customers'),
    ('vehicles.view', 'vehicles', 'view', 'View vehicles'),
    ('vehicles.manage', 'vehicles', 'manage', 'Manage vehicles'),
    ('pricing.view', 'pricing', 'view', 'View pricing'),
    ('pricing.manage', 'pricing', 'manage', 'Manage pricing'),
    ('drivers.view', 'drivers', 'view', 'View drivers'),
    ('drivers.manage', 'drivers', 'manage', 'Manage drivers'),
    ('notifications.view', 'notifications', 'view', 'View notifications'),
    ('notifications.manage', 'notifications', 'manage', 'Manage notifications'),
    ('payments.view', 'payments', 'view', 'View payment providers'),
    ('payments.manage', 'payments', 'manage', 'Manage payment providers'),
    ('integrations.view', 'integrations', 'view', 'View integrations'),
    ('integrations.manage', 'integrations', 'manage', 'Manage integrations'),
    ('settings.view', 'settings', 'view', 'View settings'),
    ('settings.manage', 'settings', 'manage', 'Manage settings'),
    ('users.view', 'users', 'view', 'View admin users and roles'),
    ('users.manage', 'users', 'manage', 'Manage admin users and roles'),
    ('audit_logs.view', 'audit_logs', 'view', 'View audit logs')
ON CONFLICT (key) DO NOTHING;

-- SUPER_ADMIN: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE slug = 'SUPER_ADMIN'), id FROM permissions
ON CONFLICT DO NOTHING;

-- ADMIN permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE slug = 'ADMIN'), id FROM permissions
WHERE key IN (
    'dashboard.view','bookings.view','bookings.manage','bookings.assign_driver','bookings.cancel',
    'customers.view','customers.manage','vehicles.view','vehicles.manage','pricing.view','pricing.manage',
    'drivers.view','drivers.manage','notifications.view','notifications.manage','payments.view','payments.manage',
    'integrations.view','integrations.manage','settings.view','settings.manage','users.view','users.manage',
    'audit_logs.view'
)
ON CONFLICT DO NOTHING;

-- DISPATCHER permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE slug = 'DISPATCHER'), id FROM permissions
WHERE key IN (
    'dashboard.view','bookings.view','bookings.manage','bookings.assign_driver','bookings.cancel',
    'customers.view','drivers.view','drivers.manage','vehicles.view'
)
ON CONFLICT DO NOTHING;

-- OPERATIONS permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE slug = 'OPERATIONS'), id FROM permissions
WHERE key IN (
    'dashboard.view','bookings.view','bookings.manage','bookings.assign_driver',
    'customers.view','vehicles.view','drivers.view','notifications.view','settings.view'
)
ON CONFLICT DO NOTHING;

-- VIEWER permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE slug = 'VIEWER'), id FROM permissions
WHERE key IN (
    'dashboard.view','bookings.view','customers.view','vehicles.view','pricing.view',
    'drivers.view','notifications.view','payments.view','integrations.view','settings.view','users.view','audit_logs.view'
)
ON CONFLICT DO NOTHING;

-- Assign existing admin user to SUPER_ADMIN if not already assigned
UPDATE admin_users SET role_id = (SELECT id FROM roles WHERE slug = 'SUPER_ADMIN') WHERE role_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_users_role_id ON admin_users(role_id);
