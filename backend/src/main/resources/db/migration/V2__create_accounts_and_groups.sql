CREATE TABLE user_account (
    id VARCHAR(36) NOT NULL,
    account VARCHAR(190) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role VARCHAR(32) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    title VARCHAR(150) NOT NULL,
    status VARCHAR(32) NOT NULL,
    quota_remaining INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_user_account PRIMARY KEY (id),
    CONSTRAINT uk_user_account_account UNIQUE (account)
);

CREATE INDEX idx_user_account_role_status
    ON user_account (role, status);

CREATE TABLE project_group (
    id VARCHAR(36) NOT NULL,
    group_label VARCHAR(50) NOT NULL,
    project_name VARCHAR(150) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_project_group PRIMARY KEY (id)
);

CREATE TABLE group_membership (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    group_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_group_membership PRIMARY KEY (id),
    CONSTRAINT uk_group_membership_user UNIQUE (user_id),
    CONSTRAINT fk_group_membership_user FOREIGN KEY (user_id) REFERENCES user_account (id),
    CONSTRAINT fk_group_membership_group FOREIGN KEY (group_id) REFERENCES project_group (id)
);

CREATE INDEX idx_group_membership_group
    ON group_membership (group_id);
