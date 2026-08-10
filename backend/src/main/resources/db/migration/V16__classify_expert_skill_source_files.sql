ALTER TABLE expert_skill_upload_file
    DROP CONSTRAINT chk_expert_skill_upload_file_role;

ALTER TABLE expert_skill_upload_file
    ADD CONSTRAINT chk_expert_skill_upload_file_role
        CHECK (file_role IN ('CONFIG', 'PROMPT', 'KNOWLEDGE_CANDIDATE', 'SOURCE_CODE', 'REFERENCE'));
