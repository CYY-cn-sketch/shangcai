ALTER TABLE knowledge_base
    ADD COLUMN scope_type VARCHAR(32) NOT NULL DEFAULT 'COURSE_SHARED';

ALTER TABLE knowledge_base
    ADD COLUMN owner_expert_id VARCHAR(64);

INSERT INTO knowledge_base (
    id,
    category,
    description,
    used_by,
    active,
    created_at,
    updated_at,
    scope_type,
    owner_expert_id
)
SELECT
    CONCAT('expert-kb-', SUBSTRING(ep.id, 1, 13), '-', RIGHT(ep.id, 12)),
    CONCAT(SUBSTRING(ep.name, 1, 92), '专属知识库'),
    CONCAT(ep.name, '的 Skill 知识资料，仅供该专家检索使用。'),
    ep.name,
    ep.active,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'EXPERT_PRIVATE',
    ep.id
FROM expert_profile ep
WHERE NOT EXISTS (
    SELECT 1
    FROM knowledge_base kb
    WHERE kb.scope_type = 'EXPERT_PRIVATE'
      AND kb.owner_expert_id = ep.id
);

INSERT INTO expert_knowledge_route (id, expert_id, category, created_at)
SELECT
    CONCAT('private-', SUBSTRING(ep.id, 1, 13), '-', RIGHT(ep.id, 12)),
    ep.id,
    kb.category,
    CURRENT_TIMESTAMP
FROM expert_profile ep
JOIN knowledge_base kb
  ON kb.scope_type = 'EXPERT_PRIVATE'
 AND kb.owner_expert_id = ep.id
WHERE NOT EXISTS (
    SELECT 1
    FROM expert_knowledge_route route
    WHERE route.expert_id = ep.id
      AND route.category = kb.category
);

ALTER TABLE knowledge_base
    ADD CONSTRAINT fk_knowledge_base_owner_expert
        FOREIGN KEY (owner_expert_id) REFERENCES expert_profile (id);

ALTER TABLE knowledge_base
    ADD CONSTRAINT chk_knowledge_base_scope_owner
        CHECK (
            (scope_type = 'COURSE_SHARED' AND owner_expert_id IS NULL)
            OR (scope_type = 'EXPERT_PRIVATE' AND owner_expert_id IS NOT NULL)
        );

ALTER TABLE knowledge_base
    ADD CONSTRAINT uk_knowledge_base_expert_scope UNIQUE (owner_expert_id, scope_type);

CREATE INDEX idx_knowledge_base_scope_active
    ON knowledge_base (scope_type, active, category);
