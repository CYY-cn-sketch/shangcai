CREATE TABLE artifact_record (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    idea_id VARCHAR(36) NOT NULL,
    source_message_id VARCHAR(64),
    artifact_type VARCHAR(32) NOT NULL,
    title VARCHAR(200) NOT NULL,
    summary TEXT NOT NULL,
    content_json TEXT NOT NULL,
    file_path VARCHAR(512),
    file_name VARCHAR(255),
    mime_type VARCHAR(150),
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_artifact_record PRIMARY KEY (id),
    CONSTRAINT uk_artifact_record_user_source UNIQUE (user_id, source_message_id),
    CONSTRAINT fk_artifact_record_user FOREIGN KEY (user_id) REFERENCES user_account (id) ON DELETE CASCADE,
    CONSTRAINT fk_artifact_record_idea FOREIGN KEY (idea_id) REFERENCES student_idea (id) ON DELETE CASCADE
);

CREATE INDEX idx_artifact_record_user_idea_created
    ON artifact_record (user_id, idea_id, created_at);

CREATE TABLE artifact_submission (
    id VARCHAR(36) NOT NULL,
    artifact_id VARCHAR(36) NOT NULL,
    student_user_id VARCHAR(36) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    group_label VARCHAR(50) NOT NULL,
    group_name VARCHAR(150) NOT NULL,
    status VARCHAR(32) NOT NULL,
    teacher_comment TEXT,
    reviewer_user_id VARCHAR(36),
    is_excellent BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMP(6) NOT NULL,
    reviewed_at TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_artifact_submission PRIMARY KEY (id),
    CONSTRAINT uk_artifact_submission_artifact UNIQUE (artifact_id),
    CONSTRAINT fk_artifact_submission_artifact FOREIGN KEY (artifact_id) REFERENCES artifact_record (id) ON DELETE CASCADE,
    CONSTRAINT fk_artifact_submission_student FOREIGN KEY (student_user_id) REFERENCES user_account (id) ON DELETE CASCADE,
    CONSTRAINT fk_artifact_submission_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES user_account (id) ON DELETE SET NULL
);

CREATE INDEX idx_artifact_submission_status_submitted
    ON artifact_submission (status, submitted_at);

CREATE INDEX idx_artifact_submission_student_submitted
    ON artifact_submission (student_user_id, submitted_at);

CREATE TABLE artifact_download_log (
    id VARCHAR(36) NOT NULL,
    artifact_id VARCHAR(36) NOT NULL,
    actor_user_id VARCHAR(36) NOT NULL,
    delivery_mode VARCHAR(32) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_artifact_download_log PRIMARY KEY (id),
    CONSTRAINT fk_artifact_download_artifact FOREIGN KEY (artifact_id) REFERENCES artifact_record (id) ON DELETE CASCADE,
    CONSTRAINT fk_artifact_download_actor FOREIGN KEY (actor_user_id) REFERENCES user_account (id) ON DELETE CASCADE
);

CREATE INDEX idx_artifact_download_artifact_created
    ON artifact_download_log (artifact_id, created_at);
