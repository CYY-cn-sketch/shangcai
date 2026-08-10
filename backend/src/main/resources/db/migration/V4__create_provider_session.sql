CREATE TABLE provider_session (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64) NOT NULL,
    conversation_id VARCHAR(64) NOT NULL,
    expert_id VARCHAR(64) NOT NULL,
    provider VARCHAR(32) NOT NULL,
    anonymous_staff_id VARCHAR(32) NOT NULL,
    external_session_id VARCHAR(128),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_provider_session PRIMARY KEY (id),
    CONSTRAINT uk_provider_session_context
        UNIQUE (user_id, project_id, conversation_id, expert_id, provider)
);
