package com.sufe.ai.defense.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "defense_practice")
public class DefensePracticeRecord {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", length = 36, nullable = false, updatable = false)
    private String userId;

    @Column(name = "idea_id", length = 36, nullable = false, updatable = false)
    private String ideaId;

    @Column(name = "client_practice_id", length = 64, nullable = false, updatable = false)
    private String clientPracticeId;

    @Column(name = "content_json", columnDefinition = "TEXT", nullable = false)
    private String contentJson;

    @Column(length = 16, nullable = false)
    private String visibility;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected DefensePracticeRecord() {
    }

    private DefensePracticeRecord(
            String userId,
            String ideaId,
            String clientPracticeId,
            String contentJson,
            String visibility
    ) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID().toString();
        this.userId = requireText(userId, "userId");
        this.ideaId = requireText(ideaId, "ideaId");
        this.clientPracticeId = requireText(clientPracticeId, "clientPracticeId");
        this.contentJson = requireText(contentJson, "contentJson");
        this.visibility = requireVisibility(visibility);
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static DefensePracticeRecord create(
            String userId,
            String ideaId,
            String clientPracticeId,
            String contentJson,
            String visibility
    ) {
        return new DefensePracticeRecord(userId, ideaId, clientPracticeId, contentJson, visibility);
    }

    public void update(String contentJson, String visibility) {
        this.contentJson = requireText(contentJson, "contentJson");
        this.visibility = requireVisibility(visibility);
        this.updatedAt = Instant.now();
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " 不能为空");
        }
        return value.trim();
    }

    private static String requireVisibility(String value) {
        String visibility = requireText(value, "visibility");
        if (!visibility.equals("self") && !visibility.equals("teacher")) {
            throw new IllegalArgumentException("visibility 无效");
        }
        return visibility;
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getIdeaId() { return ideaId; }
    public String getClientPracticeId() { return clientPracticeId; }
    public String getContentJson() { return contentJson; }
    public String getVisibility() { return visibility; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
