CREATE TABLE knowledge_base (
    id VARCHAR(36) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    used_by VARCHAR(300) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_knowledge_base PRIMARY KEY (id),
    CONSTRAINT uk_knowledge_base_category UNIQUE (category)
);

CREATE TABLE knowledge_asset (
    id VARCHAR(36) NOT NULL,
    knowledge_base_id VARCHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    size_label VARCHAR(50) NOT NULL,
    file_type VARCHAR(80) NOT NULL,
    preview VARCHAR(1000) NOT NULL,
    content_text TEXT,
    uploaded_by VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_knowledge_asset PRIMARY KEY (id),
    CONSTRAINT fk_knowledge_asset_base FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_base (id)
);

CREATE INDEX idx_knowledge_asset_base_enabled
    ON knowledge_asset (knowledge_base_id, enabled);

CREATE TABLE expert_profile (
    id VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role_description VARCHAR(500) NOT NULL,
    scenario VARCHAR(300) NOT NULL,
    accent VARCHAR(32) NOT NULL,
    source_skill_name VARCHAR(200),
    source_skill_content TEXT,
    source_skill_uploaded_by VARCHAR(100),
    system_prompt TEXT,
    user_prompt TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_expert_profile PRIMARY KEY (id),
    CONSTRAINT uk_expert_profile_name UNIQUE (name)
);

CREATE TABLE expert_skill (
    id VARCHAR(64) NOT NULL,
    expert_id VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    stage VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_expert_skill PRIMARY KEY (id),
    CONSTRAINT fk_expert_skill_profile FOREIGN KEY (expert_id) REFERENCES expert_profile (id) ON DELETE CASCADE
);

CREATE TABLE expert_knowledge_route (
    id VARCHAR(36) NOT NULL,
    expert_id VARCHAR(64) NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_expert_knowledge_route PRIMARY KEY (id),
    CONSTRAINT uk_expert_knowledge_route UNIQUE (expert_id, category)
);
