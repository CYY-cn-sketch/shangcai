CREATE TABLE ai_usage_record (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    user_display_name VARCHAR(100) NOT NULL,
    group_id VARCHAR(36),
    group_label VARCHAR(50),
    group_name VARCHAR(150),
    provider VARCHAR(32) NOT NULL,
    model_name VARCHAR(100),
    operation VARCHAR(64) NOT NULL,
    request_id VARCHAR(128) NOT NULL,
    input_tokens BIGINT NOT NULL,
    output_tokens BIGINT NOT NULL,
    total_tokens BIGINT NOT NULL,
    recorded_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_ai_usage_record PRIMARY KEY (id),
    CONSTRAINT uk_ai_usage_provider_request UNIQUE (provider, request_id),
    CONSTRAINT chk_ai_usage_input_tokens CHECK (input_tokens >= 0),
    CONSTRAINT chk_ai_usage_output_tokens CHECK (output_tokens >= 0),
    CONSTRAINT chk_ai_usage_total_tokens CHECK (total_tokens = input_tokens + output_tokens)
);

CREATE INDEX idx_ai_usage_recorded_at
    ON ai_usage_record (recorded_at);

CREATE INDEX idx_ai_usage_user_recorded
    ON ai_usage_record (user_id, recorded_at);

CREATE INDEX idx_ai_usage_group_recorded
    ON ai_usage_record (group_id, recorded_at);
