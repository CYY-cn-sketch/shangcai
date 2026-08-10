ALTER TABLE expert_skill_upload
    ADD COLUMN parsed_skill_name VARCHAR(100);

ALTER TABLE expert_skill_upload
    ADD COLUMN parsed_skill_description VARCHAR(500);

ALTER TABLE expert_skill_upload
    ADD COLUMN parsed_knowledge_rule MEDIUMTEXT;

ALTER TABLE expert_skill_upload
    ADD COLUMN parsed_output_format MEDIUMTEXT;

ALTER TABLE expert_skill_upload
    ADD COLUMN parsed_boundaries MEDIUMTEXT;

CREATE TABLE expert_skill_upload_file (
    id VARCHAR(36) NOT NULL,
    upload_id VARCHAR(36) NOT NULL,
    relative_path VARCHAR(512) NOT NULL,
    file_role VARCHAR(32) NOT NULL,
    content_text MEDIUMTEXT,
    storage_key VARCHAR(512) NOT NULL,
    mime_type VARCHAR(150) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    imported_asset_id VARCHAR(36),
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_expert_skill_upload_file PRIMARY KEY (id),
    CONSTRAINT uk_expert_skill_upload_file_path UNIQUE (upload_id, relative_path),
    CONSTRAINT fk_expert_skill_upload_file_upload FOREIGN KEY (upload_id) REFERENCES expert_skill_upload (id) ON DELETE CASCADE,
    CONSTRAINT fk_expert_skill_upload_file_asset FOREIGN KEY (imported_asset_id) REFERENCES knowledge_asset (id) ON DELETE SET NULL,
    CONSTRAINT chk_expert_skill_upload_file_role CHECK (file_role IN ('CONFIG', 'PROMPT', 'KNOWLEDGE_CANDIDATE', 'REFERENCE')),
    CONSTRAINT chk_expert_skill_upload_file_size CHECK (file_size_bytes > 0)
);

CREATE INDEX idx_expert_skill_upload_file_upload_role
    ON expert_skill_upload_file (upload_id, file_role, relative_path);

CREATE INDEX idx_expert_skill_upload_file_asset
    ON expert_skill_upload_file (imported_asset_id);
