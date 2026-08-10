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
@Table(name = "knowledge_base")
public class KnowledgeBase {

    private static final int CATEGORY_MAX_CODE_POINTS = 100;
    private static final int READABLE_EXPERT_NAME_MAX_CODE_POINTS = 92;
    private static final String EXPERT_PRIVATE_SUFFIX = "专属知识库";

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(length = 100, nullable = false, unique = true)
    private String category;

    @Column(length = 500, nullable = false)
    private String description;

    @Column(name = "used_by", length = 300, nullable = false)
    private String usedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope_type", length = 32, nullable = false)
    private KnowledgeBaseScope scopeType;

    @Column(name = "owner_expert_id", length = 64)
    private String ownerExpertId;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected KnowledgeBase() {
    }

    private KnowledgeBase(
            String category,
            String description,
            String usedBy,
            KnowledgeBaseScope scopeType,
            String ownerExpertId
    ) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID().toString();
        this.category = requireText(category, "category");
        this.description = requireText(description, "description");
        this.usedBy = requireText(usedBy, "usedBy");
        this.scopeType = scopeType;
        this.ownerExpertId = ownerExpertId;
        this.active = true;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static KnowledgeBase create(String category, String description, String usedBy) {
        return new KnowledgeBase(category, description, usedBy, KnowledgeBaseScope.COURSE_SHARED, null);
    }

    public static KnowledgeBase createExpertPrivate(
            String category,
            String description,
            String usedBy,
            String ownerExpertId
    ) {
        return new KnowledgeBase(
                category,
                description,
                usedBy,
                KnowledgeBaseScope.EXPERT_PRIVATE,
                requireText(ownerExpertId, "ownerExpertId")
        );
    }

    public static String expertPrivateCategory(String expertName, String expertId) {
        String name = requireText(expertName, "expertName");
        String id = requireText(expertId, "expertId");
        if (codePointLength(name) <= READABLE_EXPERT_NAME_MAX_CODE_POINTS) {
            return name + EXPERT_PRIVATE_SUFFIX;
        }

        String uniqueSuffix = EXPERT_PRIVATE_SUFFIX + "-" + id;
        int nameBudget = CATEGORY_MAX_CODE_POINTS - codePointLength(uniqueSuffix);
        if (nameBudget < 1) {
            throw new IllegalArgumentException("expertId 过长，无法生成专属知识库名称");
        }
        return truncateCodePoints(name, nameBudget) + uniqueSuffix;
    }

    public void update(String category, String description, String usedBy, boolean active) {
        this.category = requireText(category, "category");
        this.description = requireText(description, "description");
        this.usedBy = requireText(usedBy, "usedBy");
        this.active = active;
        this.updatedAt = Instant.now();
    }

    static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " 不能为空");
        }
        return value.trim();
    }

    private static int codePointLength(String value) {
        return value.codePointCount(0, value.length());
    }

    private static String truncateCodePoints(String value, int maxCodePoints) {
        if (codePointLength(value) <= maxCodePoints) return value;
        return value.substring(0, value.offsetByCodePoints(0, maxCodePoints));
    }

    public String getId() {
        return id;
    }

    public String getCategory() {
        return category;
    }

    public String getDescription() {
        return description;
    }

    public String getUsedBy() {
        return usedBy;
    }

    public boolean isActive() {
        return active;
    }

    public KnowledgeBaseScope getScopeType() {
        return scopeType;
    }

    public String getOwnerExpertId() {
        return ownerExpertId;
    }

    public boolean isCourseShared() {
        return scopeType == KnowledgeBaseScope.COURSE_SHARED;
    }

    public boolean isOwnedByExpert(String expertId) {
        return scopeType == KnowledgeBaseScope.EXPERT_PRIVATE && ownerExpertId.equals(expertId);
    }
}
