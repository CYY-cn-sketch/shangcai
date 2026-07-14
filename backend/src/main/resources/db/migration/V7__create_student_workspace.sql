CREATE TABLE student_idea (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    stage VARCHAR(64) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_student_idea PRIMARY KEY (id),
    CONSTRAINT fk_student_idea_user FOREIGN KEY (user_id) REFERENCES user_account (id) ON DELETE CASCADE
);

CREATE INDEX idx_student_idea_user_updated
    ON student_idea (user_id, updated_at);

CREATE TABLE student_conversation (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    idea_id VARCHAR(36) NOT NULL,
    selected_expert_id VARCHAR(64) NOT NULL,
    selected_skill_id VARCHAR(64) NOT NULL,
    model_mode VARCHAR(32) NOT NULL,
    knowledge_selection_json TEXT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_student_conversation PRIMARY KEY (id),
    CONSTRAINT uk_student_conversation_user_idea UNIQUE (user_id, idea_id),
    CONSTRAINT fk_student_conversation_user FOREIGN KEY (user_id) REFERENCES user_account (id) ON DELETE CASCADE,
    CONSTRAINT fk_student_conversation_idea FOREIGN KEY (idea_id) REFERENCES student_idea (id) ON DELETE CASCADE
);

CREATE INDEX idx_student_conversation_user_updated
    ON student_conversation (user_id, updated_at);

CREATE TABLE conversation_message (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    conversation_id VARCHAR(36) NOT NULL,
    client_message_id VARCHAR(64) NOT NULL,
    sender VARCHAR(16) NOT NULL,
    input_mode VARCHAR(16),
    expert_id VARCHAR(64),
    expert_name VARCHAR(100),
    skill_name VARCHAR(100),
    artifact_type VARCHAR(32),
    content TEXT NOT NULL,
    blocks_json TEXT,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_conversation_message PRIMARY KEY (id),
    CONSTRAINT uk_conversation_message_user_client UNIQUE (user_id, client_message_id),
    CONSTRAINT fk_conversation_message_user FOREIGN KEY (user_id) REFERENCES user_account (id) ON DELETE CASCADE,
    CONSTRAINT fk_conversation_message_conversation FOREIGN KEY (conversation_id) REFERENCES student_conversation (id) ON DELETE CASCADE
);

CREATE INDEX idx_conversation_message_conversation_created
    ON conversation_message (conversation_id, created_at);

CREATE INDEX idx_conversation_message_user_created
    ON conversation_message (user_id, created_at);
