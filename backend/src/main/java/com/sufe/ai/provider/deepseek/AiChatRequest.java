package com.sufe.ai.provider.deepseek;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_chat_request")
public class AiChatRequest {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", length = 36, nullable = false, updatable = false)
    private String userId;

    @Column(name = "idea_id", length = 36, nullable = false, updatable = false)
    private String ideaId;

    @Column(name = "client_message_id", length = 64, nullable = false, updatable = false)
    private String clientMessageId;

    @Column(name = "expert_id", length = 64, nullable = false, updatable = false)
    private String expertId;

    @Column(length = 16, nullable = false)
    private String status;

    @Column(name = "assistant_message_id", length = 36)
    private String assistantMessageId;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    protected AiChatRequest() {
    }

    private AiChatRequest(String userId, String ideaId, String clientMessageId, String expertId) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID().toString();
        this.userId = requireText(userId, "userId");
        this.ideaId = requireText(ideaId, "ideaId");
        this.clientMessageId = requireText(clientMessageId, "clientMessageId");
        this.expertId = requireText(expertId, "expertId");
        this.status = "RUNNING";
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static AiChatRequest running(String userId, String ideaId, String clientMessageId, String expertId) {
        return new AiChatRequest(userId, ideaId, clientMessageId, expertId);
    }

    public void complete(String assistantMessageId) {
        Instant now = Instant.now();
        this.status = "COMPLETED";
        this.assistantMessageId = requireText(assistantMessageId, "assistantMessageId");
        this.errorMessage = null;
        this.completedAt = now;
        this.updatedAt = now;
    }

    public void fail(String message) {
        Instant now = Instant.now();
        this.status = "FAILED";
        this.errorMessage = message == null || message.isBlank() ? "AI 服务未完成本次请求" : trimTo(message, 1000);
        this.completedAt = now;
        this.updatedAt = now;
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(fieldName + " 不能为空");
        return value.trim();
    }

    private static String trimTo(String value, int maxLength) {
        String normalized = value.trim();
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getIdeaId() { return ideaId; }
    public String getClientMessageId() { return clientMessageId; }
    public String getExpertId() { return expertId; }
    public String getStatus() { return status; }
    public String getAssistantMessageId() { return assistantMessageId; }
    public String getErrorMessage() { return errorMessage; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getCompletedAt() { return completedAt; }
}
