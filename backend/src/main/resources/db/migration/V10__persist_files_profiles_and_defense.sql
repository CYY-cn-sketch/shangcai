ALTER TABLE user_account
    ADD COLUMN avatar_id VARCHAR(64) NOT NULL DEFAULT 'student-boy';

ALTER TABLE knowledge_asset
    ADD COLUMN storage_key VARCHAR(512);

ALTER TABLE knowledge_asset
    ADD COLUMN original_name VARCHAR(255);

ALTER TABLE knowledge_asset
    ADD COLUMN mime_type VARCHAR(150);

ALTER TABLE knowledge_asset
    ADD COLUMN file_size_bytes BIGINT;

ALTER TABLE knowledge_asset
    ADD COLUMN sha256 VARCHAR(64);

CREATE TABLE defense_practice (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    idea_id VARCHAR(36) NOT NULL,
    client_practice_id VARCHAR(64) NOT NULL,
    content_json TEXT NOT NULL,
    visibility VARCHAR(16) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_defense_practice PRIMARY KEY (id),
    CONSTRAINT uk_defense_practice_user_client UNIQUE (user_id, client_practice_id),
    CONSTRAINT fk_defense_practice_user FOREIGN KEY (user_id) REFERENCES user_account (id) ON DELETE CASCADE,
    CONSTRAINT fk_defense_practice_idea FOREIGN KEY (idea_id) REFERENCES student_idea (id) ON DELETE CASCADE
);

CREATE INDEX idx_defense_practice_user_idea_created
    ON defense_practice (user_id, idea_id, created_at);
