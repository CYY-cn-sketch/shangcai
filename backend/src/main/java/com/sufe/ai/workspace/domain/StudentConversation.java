package com.sufe.ai.workspace.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "student_conversation")
public class StudentConversation {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", length = 36, nullable = false, updatable = false)
    private String userId;

    @Column(name = "idea_id", length = 36, nullable = false, updatable = false)
    private String ideaId;

    @Column(name = "selected_expert_id", length = 64, nullable = false)
    private String selectedExpertId;

    @Column(name = "selected_skill_id", length = 64, nullable = false)
    private String selectedSkillId;

    @Column(name = "model_mode", length = 32, nullable = false)
    private String modelMode;

    @Column(name = "knowledge_selection_json", columnDefinition = "TEXT", nullable = false)
    private String knowledgeSelectionJson;

    @Column(length = 120, nullable = false)
    private String title;

    @Column(length = 20, nullable = false)
    private String status;

    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected StudentConversation() {
    }

    private StudentConversation(String userId, String ideaId, String title) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID().toString();
        this.userId = requireText(userId, "userId");
        this.ideaId = requireText(ideaId, "ideaId");
        this.selectedExpertId = "pitch";
        this.selectedSkillId = "deck";
        this.modelMode = "Auto";
        this.knowledgeSelectionJson = "{\"categories\":[],\"uploadIds\":[]}";
        this.title = requireText(title, "title");
        this.status = "ACTIVE";
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static StudentConversation create(String userId, String ideaId) {
        return new StudentConversation(userId, ideaId, "项目对话");
    }

    public static StudentConversation create(String userId, String ideaId, String title) {
        return new StudentConversation(userId, ideaId, title);
    }

    public void updateSettings(String expertId, String skillId, String modelMode, String knowledgeSelectionJson) {
        this.selectedExpertId = requireText(expertId, "selectedExpertId");
        this.selectedSkillId = requireText(skillId, "selectedSkillId");
        this.modelMode = requireText(modelMode, "modelMode");
        this.knowledgeSelectionJson = requireText(knowledgeSelectionJson, "knowledgeSelectionJson");
        this.updatedAt = Instant.now();
    }

    public void update(String title, String expertId, String skillId, String modelMode, String knowledgeSelectionJson) {
        this.title = requireText(title, "title");
        updateSettings(expertId, skillId, modelMode, knowledgeSelectionJson);
    }

    public void markMessageAppended(Instant messageAt) {
        this.lastMessageAt = messageAt == null ? Instant.now() : messageAt;
        this.updatedAt = this.lastMessageAt;
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " 不能为空");
        }
        return value.trim();
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getIdeaId() { return ideaId; }
    public String getSelectedExpertId() { return selectedExpertId; }
    public String getSelectedSkillId() { return selectedSkillId; }
    public String getModelMode() { return modelMode; }
    public String getKnowledgeSelectionJson() { return knowledgeSelectionJson; }
    public String getTitle() { return title; }
    public String getStatus() { return status; }
    public Instant getLastMessageAt() { return lastMessageAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
