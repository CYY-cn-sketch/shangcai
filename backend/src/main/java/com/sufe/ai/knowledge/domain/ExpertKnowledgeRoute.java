package com.sufe.ai.knowledge.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "expert_knowledge_route")
public class ExpertKnowledgeRoute {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "expert_id", length = 64, nullable = false, updatable = false)
    private String expertId;

    @Column(length = 100, nullable = false, updatable = false)
    private String category;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ExpertKnowledgeRoute() {
    }

    private ExpertKnowledgeRoute(String expertId, String category) {
        this.id = UUID.randomUUID().toString();
        this.expertId = KnowledgeBase.requireText(expertId, "expertId");
        this.category = KnowledgeBase.requireText(category, "category");
        this.createdAt = Instant.now();
    }

    public static ExpertKnowledgeRoute create(String expertId, String category) {
        return new ExpertKnowledgeRoute(expertId, category);
    }

    public String getExpertId() {
        return expertId;
    }

    public String getCategory() {
        return category;
    }
}
