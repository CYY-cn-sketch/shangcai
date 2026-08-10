CREATE TABLE account_permission_denial (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    permission_key VARCHAR(100) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_account_permission_denial PRIMARY KEY (id),
    CONSTRAINT uk_account_permission_denial_user_permission UNIQUE (user_id, permission_key),
    CONSTRAINT fk_account_permission_denial_user FOREIGN KEY (user_id) REFERENCES user_account (id) ON DELETE CASCADE
);

CREATE INDEX idx_account_permission_denial_user
    ON account_permission_denial (user_id);

CREATE TABLE audit_log (
    id VARCHAR(36) NOT NULL,
    actor_user_id VARCHAR(36) NOT NULL,
    actor_account VARCHAR(190) NOT NULL,
    actor_display_name VARCHAR(100) NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_audit_log PRIMARY KEY (id)
);

CREATE INDEX idx_audit_log_created_at
    ON audit_log (created_at);

CREATE INDEX idx_audit_log_actor_created_at
    ON audit_log (actor_user_id, created_at);
