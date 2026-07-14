package com.sufe.ai.knowledge.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "knowledge_base")
public class KnowledgeBase {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(length = 100, nullable = false, unique = true)
    private String category;

    @Column(length = 500, nullable = false)
    private String description;

    @Column(name = "used_by", length = 300, nullable = false)
    private String usedBy;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected KnowledgeBase() {
    }

    private KnowledgeBase(String category, String description, String usedBy) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID().toString();
        this.category = requireText(category, "category");
        this.description = requireText(description, "description");
        this.usedBy = requireText(usedBy, "usedBy");
        this.active = true;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static KnowledgeBase create(String category, String description, String usedBy) {
        return new KnowledgeBase(category, description, usedBy);
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
}
