package com.sufe.ai.provider.session.domain;

import com.sufe.ai.generation.domain.GenerationProvider;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
        name = "provider_session",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_provider_session_context",
                columnNames = {"user_id", "project_id", "conversation_id", "expert_id", "provider"}
        )
)
public class ProviderSession {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", length = 64, nullable = false, updatable = false)
    private String userId;

    @Column(name = "project_id", length = 64, nullable = false, updatable = false)
    private String projectId;

    @Column(name = "conversation_id", length = 64, nullable = false, updatable = false)
    private String conversationId;

    @Column(name = "expert_id", length = 64, nullable = false, updatable = false)
    private String expertId;

    @Enumerated(EnumType.STRING)
    @Column(length = 32, nullable = false, updatable = false)
    private GenerationProvider provider;

    @Column(name = "anonymous_staff_id", length = 32, nullable = false, updatable = false)
    private String anonymousStaffId;

    @Column(name = "external_session_id", length = 128)
    private String externalSessionId;

    @Version
    @Column(nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ProviderSession() {
    }

    private ProviderSession(
            String userId,
            String projectId,
            String conversationId,
            String expertId,
            GenerationProvider provider,
            String anonymousStaffId
    ) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID().toString();
        this.userId = requireText(userId, "userId");
        this.projectId = requireText(projectId, "projectId");
        this.conversationId = requireText(conversationId, "conversationId");
        this.expertId = requireText(expertId, "expertId");
        this.provider = Objects.requireNonNull(provider, "provider 不能为空");
        this.anonymousStaffId = requireLength(anonymousStaffId, "anonymousStaffId", 16, 32);
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static ProviderSession create(
            String userId,
            String projectId,
            String conversationId,
            String expertId,
            GenerationProvider provider,
            String anonymousStaffId
    ) {
        return new ProviderSession(
                userId,
                projectId,
                conversationId,
                expertId,
                provider,
                anonymousStaffId
        );
    }

    public void updateExternalSessionId(String externalSessionId) {
        String normalized = requireText(externalSessionId, "externalSessionId");
        if (normalized.equals(this.externalSessionId)) {
            return;
        }
        this.externalSessionId = normalized;
        this.updatedAt = Instant.now();
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " 不能为空");
        }
        return value.trim();
    }

    private static String requireLength(String value, String fieldName, int minLength, int maxLength) {
        String normalized = requireText(value, fieldName);
        if (normalized.length() < minLength || normalized.length() > maxLength) {
            throw new IllegalArgumentException(fieldName + " 长度必须在 " + minLength + " 到 " + maxLength + " 之间");
        }
        return normalized;
    }

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getProjectId() {
        return projectId;
    }

    public String getConversationId() {
        return conversationId;
    }

    public String getExpertId() {
        return expertId;
    }

    public GenerationProvider getProvider() {
        return provider;
    }

    public String getAnonymousStaffId() {
        return anonymousStaffId;
    }

    public String getExternalSessionId() {
        return externalSessionId;
    }

    public long getVersion() {
        return version;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
