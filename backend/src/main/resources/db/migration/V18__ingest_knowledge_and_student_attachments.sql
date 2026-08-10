ALTER TABLE knowledge_asset
    ADD COLUMN extraction_status VARCHAR(32) NOT NULL DEFAULT 'READY';

ALTER TABLE knowledge_asset
    ADD COLUMN extraction_message VARCHAR(500);

ALTER TABLE knowledge_asset
    MODIFY COLUMN content_text MEDIUMTEXT;

CREATE TABLE student_attachment (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    idea_id VARCHAR(36) NOT NULL,
    client_message_id VARCHAR(64) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(150) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    extraction_status VARCHAR(32) NOT NULL,
    extraction_message VARCHAR(500),
    content_text MEDIUMTEXT,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_student_attachment PRIMARY KEY (id),
    CONSTRAINT uk_student_attachment_message_sha UNIQUE (user_id, client_message_id, sha256),
    CONSTRAINT fk_student_attachment_user FOREIGN KEY (user_id) REFERENCES user_account (id) ON DELETE CASCADE,
    CONSTRAINT fk_student_attachment_idea FOREIGN KEY (idea_id) REFERENCES student_idea (id) ON DELETE CASCADE
);

CREATE INDEX idx_student_attachment_user_message
    ON student_attachment (user_id, client_message_id, created_at);

CREATE INDEX idx_student_attachment_user_idea
    ON student_attachment (user_id, idea_id, created_at);
