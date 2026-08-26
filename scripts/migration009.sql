CREATE TABLE IF NOT EXISTS roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  name character varying(100) NOT NULL,
  code character varying(50) NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  color character varying(50) NOT NULL DEFAULT 'indigo',
  permissions jsonb NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT PK_roles_id PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS IDX_roles_organization_id ON roles (organization_id);
CREATE INDEX IF NOT EXISTS IDX_roles_code ON roles (code);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  refresh_token_hash character varying(255) NOT NULL,
  device_info character varying(255) NOT NULL DEFAULT 'Web Terminal (Desktop)',
  ip_address character varying(100) NOT NULL DEFAULT '127.0.0.1',
  location character varying(100) NOT NULL DEFAULT 'Direct Connection',
  last_active_at TIMESTAMP NOT NULL DEFAULT now(),
  expires_at TIMESTAMP NOT NULL,
  is_revoked boolean NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT PK_sessions_id PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS IDX_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS IDX_sessions_refresh_token_hash ON sessions (refresh_token_hash);

-- Seed initial system roles
INSERT INTO roles (name, code, description, is_system, color, permissions)
VALUES 
('Super Administrator', 'super_admin', 'Unrestricted operational, financial, and organizational authority across all facilities.', true, 'indigo', '["inventory:read", "inventory:write", "inventory:delete", "inventory:adjust", "warehouse:read", "warehouse:write", "warehouse:transfer", "warehouse:audit", "procurement:read", "procurement:write", "procurement:receive", "sales:read", "sales:write", "sales:dispatch", "finance:gst", "finance:valuation", "finance:zoho", "compliance:audit_logs", "compliance:roles", "compliance:users", "compliance:approvals"]'::jsonb),
('Warehouse & Logistics Manager', 'warehouse_manager', 'Full control over warehouse layouts, multi-stage transfers, dock receiving, picking & cycle counts.', true, 'emerald', '["inventory:read", "inventory:write", "inventory:adjust", "warehouse:read", "warehouse:write", "warehouse:transfer", "warehouse:audit", "procurement:read", "procurement:receive", "sales:read", "sales:dispatch", "compliance:approvals"]'::jsonb),
('Procurement Specialist', 'procurement_specialist', 'Manages vendor directories, generates Purchase Orders, and monitors inbound logistics.', true, 'blue', '["inventory:read", "procurement:read", "procurement:write", "procurement:receive", "warehouse:read"]'::jsonb),
('Floor Operator / Barcode Scanner', 'floor_operator', 'Optimized for warehouse floor stations: physical counting, dock scanning, and pick-path fulfillment.', true, 'amber', '["inventory:read", "warehouse:read", "warehouse:transfer", "warehouse:audit", "procurement:receive", "sales:dispatch"]'::jsonb),
('Auditor / Read-Only Observer', 'auditor_readonly', 'Read-only access to immutable stock ledger, financial valuation, and compliance logs.', true, 'slate', '["inventory:read", "warehouse:read", "procurement:read", "sales:read", "finance:gst", "finance:valuation", "compliance:audit_logs"]'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO migrations (timestamp, name) VALUES (1689500000009, 'AddRbacAndSessions1689500000009') ON CONFLICT DO NOTHING;
