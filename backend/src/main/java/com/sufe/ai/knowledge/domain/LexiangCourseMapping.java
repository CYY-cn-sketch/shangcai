package com.sufe.ai.knowledge.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "lexiang_course_mapping")
public class LexiangCourseMapping {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "knowledge_base_id", length = 36, nullable = false, unique = true)
    private String knowledgeBaseId;

    @Enumerated(EnumType.STRING)
    @Column(name = "knowledge_base_scope", length = 32, nullable = false, updatable = false)
    private KnowledgeBaseScope knowledgeBaseScope;

    @Column(name = "space_id", length = 64, nullable = false)
    private String spaceId;

    @Column(name = "parent_entry_id", length = 128, nullable = false)
    private String parentEntryId;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected LexiangCourseMapping() {
    }

    private LexiangCourseMapping(String knowledgeBaseId, String spaceId, String parentEntryId, boolean enabled) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID().toString();
        this.knowledgeBaseId = requireId(knowledgeBaseId, "knowledgeBaseId", 36);
        this.knowledgeBaseScope = KnowledgeBaseScope.COURSE_SHARED;
        this.spaceId = requireId(spaceId, "spaceId", 64);
        this.parentEntryId = requireId(parentEntryId, "parentEntryId", 128);
        this.enabled = enabled;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static LexiangCourseMapping create(
            String knowledgeBaseId,
            String spaceId,
            String parentEntryId,
            boolean enabled
    ) {
        return new LexiangCourseMapping(knowledgeBaseId, spaceId, parentEntryId, enabled);
    }

    public void update(String spaceId, String parentEntryId, boolean enabled) {
        this.spaceId = requireId(spaceId, "spaceId", 64);
        this.parentEntryId = requireId(parentEntryId, "parentEntryId", 128);
        this.enabled = enabled;
        this.updatedAt = Instant.now();
    }

    private static String requireId(String value, String field, int maxLength) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(field + " 不能为空");
        String normalized = value.trim();
        if (normalized.length() > maxLength || !normalized.matches("[A-Za-z0-9_-]+")) {
            throw new IllegalArgumentException(field + " 格式无效");
        }
        return normalized;
    }

    public String getId() { return id; }
    public String getKnowledgeBaseId() { return knowledgeBaseId; }
    public KnowledgeBaseScope getKnowledgeBaseScope() { return knowledgeBaseScope; }
    public String getSpaceId() { return spaceId; }
    public String getParentEntryId() { return parentEntryId; }
    public boolean isEnabled() { return enabled; }
    public Instant getUpdatedAt() { return updatedAt; }
}
