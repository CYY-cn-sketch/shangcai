CREATE TABLE ai_chat_request (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    idea_id VARCHAR(36) NOT NULL,
    client_message_id VARCHAR(64) NOT NULL,
    expert_id VARCHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL,
    assistant_message_id VARCHAR(36),
    error_message VARCHAR(1000),
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    completed_at TIMESTAMP(6),
    CONSTRAINT pk_ai_chat_request PRIMARY KEY (id),
    CONSTRAINT uk_ai_chat_request_user_client UNIQUE (user_id, client_message_id),
    CONSTRAINT fk_ai_chat_request_user FOREIGN KEY (user_id) REFERENCES user_account (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_chat_request_idea FOREIGN KEY (idea_id) REFERENCES student_idea (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_chat_request_message FOREIGN KEY (assistant_message_id) REFERENCES conversation_message (id) ON DELETE SET NULL
);

CREATE INDEX idx_ai_chat_request_user_idea_updated
    ON ai_chat_request (user_id, idea_id, updated_at);
