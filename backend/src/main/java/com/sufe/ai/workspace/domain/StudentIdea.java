package com.sufe.ai.workspace.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "student_idea")
public class StudentIdea {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", length = 36, nullable = false, updatable = false)
    private String userId;

    @Column(length = 100, nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(length = 64, nullable = false)
    private String stage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected StudentIdea() {
    }

    private StudentIdea(String userId, String title, String description, String stage) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID().toString();
        this.userId = requireText(userId, "userId");
        this.title = requireText(title, "title");
        this.description = requireText(description, "description");
        this.stage = requireText(stage, "stage");
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static StudentIdea create(String userId, String title, String description, String stage) {
        return new StudentIdea(userId, title, description, stage);
    }

    public void update(String title, String description, String stage) {
        this.title = requireText(title, "title");
        this.description = requireText(description, "description");
        this.stage = requireText(stage, "stage");
        this.updatedAt = Instant.now();
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " 不能为空");
        }
        return value.trim();
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getStage() { return stage; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
