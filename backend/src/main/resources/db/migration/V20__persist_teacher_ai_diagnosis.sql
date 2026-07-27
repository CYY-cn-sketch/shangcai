ALTER TABLE artifact_submission
    ADD COLUMN ai_diagnosis_json TEXT;

ALTER TABLE artifact_submission
    ADD COLUMN ai_diagnosed_at TIMESTAMP(6);
