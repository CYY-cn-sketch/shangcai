CREATE TABLE workbuddy_run (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    run_id VARCHAR(128) NOT NULL,
    job_directory VARCHAR(512) NOT NULL,
    output_path VARCHAR(512) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_workbuddy_run PRIMARY KEY (id),
    CONSTRAINT uk_workbuddy_run_run_id UNIQUE (run_id),
    CONSTRAINT fk_workbuddy_run_user FOREIGN KEY (user_id) REFERENCES user_account (id) ON DELETE CASCADE
);

CREATE INDEX idx_workbuddy_run_user_created
    ON workbuddy_run (user_id, created_at);
