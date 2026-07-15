ALTER TABLE generation_job
    ADD COLUMN queue_sequence BIGINT NOT NULL AUTO_INCREMENT UNIQUE;

CREATE INDEX idx_generation_job_provider_status_queue
    ON generation_job (provider, status, created_at, queue_sequence);
