package com.sufe.ai.usage.domain;

import com.sufe.ai.generation.domain.GenerationProvider;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
        name = "ai_usage_record",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_ai_usage_provider_request",
                columnNames = {"provider", "request_id"}
        )
)
public class AiUsageRecord {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", length = 36, nullable = false, updatable = false)
    private String userId;

    @Column(name = "user_display_name", length = 100, nullable = false, updatable = false)
    private String userDisplayName;

    @Column(name = "group_id", length = 36, updatable = false)
    private String groupId;

    @Column(name = "group_label", length = 50, updatable = false)
    private String groupLabel;

    @Column(name = "group_name", length = 150, updatable = false)
    private String groupName;

    @Enumerated(EnumType.STRING)
    @Column(length = 32, nullable = false, updatable = false)
    private GenerationProvider provider;

    @Column(name = "model_name", length = 100, updatable = false)
    private String modelName;

    @Column(length = 64, nullable = false, updatable = false)
    private String operation;

    @Column(name = "request_id", length = 128, nullable = false, updatable = false)
    private String requestId;

    @Column(name = "input_tokens", nullable = false, updatable = false)
    private long inputTokens;

    @Column(name = "output_tokens", nullable = false, updatable = false)
    private long outputTokens;

    @Column(name = "total_tokens", nullable = false, updatable = false)
    private long totalTokens;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt;

    protected AiUsageRecord() {
    }

    private AiUsageRecord(
            String userId,
            String userDisplayName,
            String groupId,
            String groupLabel,
            String groupName,
            GenerationProvider provider,
            String modelName,
            String operation,
            String requestId,
            long inputTokens,
            long outputTokens
    ) {
        if (inputTokens < 0 || outputTokens < 0) {
            throw new IllegalArgumentException("Token 数量不能小于 0");
        }
        this.id = UUID.randomUUID().toString();
        this.userId = requireText(userId, "userId");
        this.userDisplayName = requireText(userDisplayName, "userDisplayName");
        this.groupId = normalizeOptional(groupId);
        this.groupLabel = normalizeOptional(groupLabel);
        this.groupName = normalizeOptional(groupName);
        this.provider = Objects.requireNonNull(provider, "provider 不能为空");
        this.modelName = normalizeOptional(modelName);
        this.operation = requireText(operation, "operation");
        this.requestId = requireText(requestId, "requestId");
        this.inputTokens = inputTokens;
        this.outputTokens = outputTokens;
        this.totalTokens = Math.addExact(inputTokens, outputTokens);
        this.recordedAt = Instant.now();
    }

    public static AiUsageRecord create(
            String userId,
            String userDisplayName,
            String groupId,
            String groupLabel,
            String groupName,
            GenerationProvider provider,
            String modelName,
            String operation,
            String requestId,
            long inputTokens,
            long outputTokens
    ) {
        return new AiUsageRecord(
                userId,
                userDisplayName,
                groupId,
                groupLabel,
                groupName,
                provider,
                modelName,
                operation,
                requestId,
                inputTokens,
                outputTokens
        );
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " 不能为空");
        }
        return value.trim();
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getUserDisplayName() { return userDisplayName; }
    public String getGroupId() { return groupId; }
    public String getGroupLabel() { return groupLabel; }
    public String getGroupName() { return groupName; }
    public GenerationProvider getProvider() { return provider; }
    public String getModelName() { return modelName; }
    public String getOperation() { return operation; }
    public String getRequestId() { return requestId; }
    public long getInputTokens() { return inputTokens; }
    public long getOutputTokens() { return outputTokens; }
    public long getTotalTokens() { return totalTokens; }
    public Instant getRecordedAt() { return recordedAt; }
}
