CREATE UNIQUE INDEX uq_knowledge_base_id_scope
    ON knowledge_base (id, scope_type);

CREATE TABLE lexiang_course_mapping (
    id VARCHAR(36) NOT NULL,
    knowledge_base_id VARCHAR(36) NOT NULL,
    knowledge_base_scope VARCHAR(32) NOT NULL DEFAULT 'COURSE_SHARED',
    space_id VARCHAR(64) NOT NULL,
    parent_entry_id VARCHAR(128) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_lexiang_course_mapping PRIMARY KEY (id),
    CONSTRAINT uq_lexiang_course_mapping_base UNIQUE (knowledge_base_id),
    CONSTRAINT uq_lexiang_course_mapping_remote UNIQUE (space_id, parent_entry_id),
    CONSTRAINT chk_lexiang_course_mapping_scope CHECK (knowledge_base_scope = 'COURSE_SHARED'),
    CONSTRAINT fk_lexiang_course_mapping_base_scope
        FOREIGN KEY (knowledge_base_id, knowledge_base_scope)
        REFERENCES knowledge_base (id, scope_type)
);

CREATE INDEX idx_lexiang_course_mapping_enabled
    ON lexiang_course_mapping (enabled, knowledge_base_id);

CREATE TABLE lexiang_pull_run (
    id VARCHAR(36) NOT NULL,
    status VARCHAR(32) NOT NULL,
    triggered_by VARCHAR(100) NOT NULL,
    started_at TIMESTAMP(6) NOT NULL,
    completed_at TIMESTAMP(6),
    seen_count INT NOT NULL DEFAULT 0,
    added_count INT NOT NULL DEFAULT 0,
    updated_count INT NOT NULL DEFAULT 0,
    missing_count INT NOT NULL DEFAULT 0,
    conflict_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    message VARCHAR(500),
    CONSTRAINT pk_lexiang_pull_run PRIMARY KEY (id)
);

CREATE INDEX idx_lexiang_pull_run_started
    ON lexiang_pull_run (started_at);

CREATE TABLE lexiang_pull_lock (
    lock_key VARCHAR(64) NOT NULL,
    owner_id VARCHAR(64) NOT NULL,
    locked_at TIMESTAMP(6) NOT NULL,
    expires_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_lexiang_pull_lock PRIMARY KEY (lock_key)
);

CREATE INDEX idx_lexiang_pull_lock_expires
    ON lexiang_pull_lock (expires_at);

ALTER TABLE knowledge_asset
    ADD COLUMN lexiang_remote_updated_at VARCHAR(32);

ALTER TABLE knowledge_asset
    ADD COLUMN lexiang_remote_etag VARCHAR(128);

ALTER TABLE knowledge_asset
    ADD COLUMN lexiang_last_seen_at TIMESTAMP(6);

ALTER TABLE knowledge_asset
    ADD COLUMN lexiang_last_seen_run_id VARCHAR(36);

CREATE UNIQUE INDEX uq_knowledge_asset_lexiang_entry
    ON knowledge_asset (lexiang_entry_id);

CREATE INDEX idx_knowledge_asset_lexiang_last_seen
    ON knowledge_asset (knowledge_base_id, lexiang_last_seen_run_id);

ALTER TABLE knowledge_asset
    ADD CONSTRAINT fk_knowledge_asset_lexiang_last_seen_run
        FOREIGN KEY (lexiang_last_seen_run_id) REFERENCES lexiang_pull_run (id);
