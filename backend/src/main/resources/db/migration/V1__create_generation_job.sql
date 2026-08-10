CREATE TABLE generation_job (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    conversation_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64) NOT NULL,
    idea_id VARCHAR(64),
    expert_id VARCHAR(64) NOT NULL,
    provider VARCHAR(32) NOT NULL,
    artifact_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    provider_worker_id VARCHAR(64),
    external_run_id VARCHAR(128),
    external_session_id VARCHAR(128),
    input_snapshot TEXT NOT NULL,
    output_path VARCHAR(512),
    idempotency_key VARCHAR(128) NOT NULL,
    error_message VARCHAR(1000),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    started_at TIMESTAMP(6),
    completed_at TIMESTAMP(6),
    CONSTRAINT pk_generation_job PRIMARY KEY (id),
    CONSTRAINT uk_generation_job_user_idempotency UNIQUE (user_id, idempotency_key)
);

CREATE INDEX idx_generation_job_status_created
    ON generation_job (status, created_at);

CREATE INDEX idx_generation_job_context
    ON generation_job (user_id, project_id, conversation_id);
