CREATE TABLE expert_skill_upload (
    id VARCHAR(36) NOT NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    folder_name VARCHAR(200) NOT NULL,
    main_file_path VARCHAR(512) NOT NULL,
    file_count INT NOT NULL,
    source_content MEDIUMTEXT NOT NULL,
    parsed_name VARCHAR(100) NOT NULL,
    parsed_role VARCHAR(500) NOT NULL,
    parsed_scenario VARCHAR(300) NOT NULL,
    parsed_accent VARCHAR(32) NOT NULL,
    parsed_system_prompt MEDIUMTEXT,
    parsed_user_prompt MEDIUMTEXT,
    status VARCHAR(16) NOT NULL,
    expert_id VARCHAR(64),
    confirmed_by VARCHAR(100),
    created_at TIMESTAMP(6) NOT NULL,
    confirmed_at TIMESTAMP(6),
    CONSTRAINT pk_expert_skill_upload PRIMARY KEY (id),
    CONSTRAINT fk_expert_skill_upload_expert FOREIGN KEY (expert_id) REFERENCES expert_profile (id),
    CONSTRAINT chk_expert_skill_upload_count CHECK (file_count > 0),
    CONSTRAINT chk_expert_skill_upload_status CHECK (status IN ('PARSED', 'ENABLED'))
);

CREATE INDEX idx_expert_skill_upload_created
    ON expert_skill_upload (created_at);

CREATE INDEX idx_expert_skill_upload_status
    ON expert_skill_upload (status, created_at);
