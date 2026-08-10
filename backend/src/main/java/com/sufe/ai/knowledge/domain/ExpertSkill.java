package com.sufe.ai.knowledge.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "expert_skill")
public class ExpertSkill {

    @Id
    @Column(length = 64, nullable = false, updatable = false)
    private String id;

    @Column(name = "expert_id", length = 64, nullable = false, updatable = false)
    private String expertId;

    @Column(length = 100, nullable = false)
    private String name;

    @Column(length = 100, nullable = false)
    private String stage;

    @Column(length = 500, nullable = false)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ExpertSkill() {
    }

    private ExpertSkill(String id, String expertId, String name, String stage, String description) {
        this.id = KnowledgeBase.requireText(id, "id");
        this.expertId = KnowledgeBase.requireText(expertId, "expertId");
        this.name = KnowledgeBase.requireText(name, "name");
        this.stage = KnowledgeBase.requireText(stage, "stage");
        this.description = KnowledgeBase.requireText(description, "description");
        this.createdAt = Instant.now();
    }

    public static ExpertSkill create(String id, String expertId, String name, String stage, String description) {
        return new ExpertSkill(id, expertId, name, stage, description);
    }

    public String getId() {
        return id;
    }

    public String getExpertId() {
        return expertId;
    }

    public String getName() {
        return name;
    }

    public String getStage() {
        return stage;
    }

    public String getDescription() {
        return description;
    }
}
