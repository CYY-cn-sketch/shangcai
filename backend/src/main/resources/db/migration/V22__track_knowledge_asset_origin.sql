ALTER TABLE knowledge_asset
    ADD COLUMN origin_type VARCHAR(32) NOT NULL DEFAULT 'COURSE_UPLOAD';

UPDATE knowledge_asset
SET origin_type = 'SKILL_IMPORT'
WHERE knowledge_base_id IN (
    SELECT id
    FROM knowledge_base
    WHERE scope_type = 'EXPERT_PRIVATE'
);
