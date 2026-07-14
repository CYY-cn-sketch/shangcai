package com.sufe.ai.workspace.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "conversation_message")
public class ConversationMessage {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", length = 36, nullable = false, updatable = false)
    private String userId;

    @Column(name = "conversation_id", length = 36, nullable = false, updatable = false)
    private String conversationId;

    @Column(name = "client_message_id", length = 64, nullable = false, updatable = false)
    private String clientMessageId;

    @Column(length = 16, nullable = false, updatable = false)
    private String sender;

    @Column(name = "input_mode", length = 16)
    private String inputMode;

    @Column(name = "expert_id", length = 64)
    private String expertId;

    @Column(name = "expert_name", length = 100)
    private String expertName;

    @Column(name = "skill_name", length = 100)
    private String skillName;

    @Column(name = "artifact_type", length = 32)
    private String artifactType;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "blocks_json", columnDefinition = "TEXT")
    private String blocksJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ConversationMessage() {
    }

    private ConversationMessage(
            String userId,
            String conversationId,
            String clientMessageId,
            String sender,
            String inputMode,
            String expertId,
            String expertName,
            String skillName,
            String artifactType,
            String content,
            String blocksJson
    ) {
        this.id = UUID.randomUUID().toString();
        this.userId = requireText(userId, "userId");
        this.conversationId = requireText(conversationId, "conversationId");
        this.clientMessageId = requireText(clientMessageId, "clientMessageId");
        this.sender = requireText(sender, "sender");
        this.inputMode = normalizeOptional(inputMode);
        this.expertId = normalizeOptional(expertId);
        this.expertName = normalizeOptional(expertName);
        this.skillName = normalizeOptional(skillName);
        this.artifactType = normalizeOptional(artifactType);
        this.content = requireText(content, "content");
        this.blocksJson = normalizeOptional(blocksJson);
        this.createdAt = Instant.now();
    }

    public static ConversationMessage create(
            String userId,
            String conversationId,
            String clientMessageId,
            String sender,
            String inputMode,
            String expertId,
            String expertName,
            String skillName,
            String artifactType,
            String content,
            String blocksJson
    ) {
        return new ConversationMessage(userId, conversationId, clientMessageId, sender, inputMode, expertId,
                expertName, skillName, artifactType, content, blocksJson);
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(fieldName + " 不能为空");
        return value.trim();
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getConversationId() { return conversationId; }
    public String getClientMessageId() { return clientMessageId; }
    public String getSender() { return sender; }
    public String getInputMode() { return inputMode; }
    public String getExpertId() { return expertId; }
    public String getExpertName() { return expertName; }
    public String getSkillName() { return skillName; }
    public String getArtifactType() { return artifactType; }
    public String getContent() { return content; }
    public String getBlocksJson() { return blocksJson; }
    public Instant getCreatedAt() { return createdAt; }
}
