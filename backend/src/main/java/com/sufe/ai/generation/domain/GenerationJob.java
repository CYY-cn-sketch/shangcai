package com.sufe.ai.generation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "generation_job")
public class GenerationJob {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", length = 64, nullable = false, updatable = false)
    private String userId;

    @Column(name = "conversation_id", length = 64, nullable = false, updatable = false)
    private String conversationId;

    @Column(name = "project_id", length = 64, nullable = false, updatable = false)
    private String projectId;

    @Column(name = "idea_id", length = 64, updatable = false)
    private String ideaId;

    @Column(name = "expert_id", length = 64, nullable = false, updatable = false)
    private String expertId;

    @Enumerated(EnumType.STRING)
    @Column(length = 32, nullable = false, updatable = false)
    private GenerationProvider provider;

    @Enumerated(EnumType.STRING)
    @Column(name = "artifact_type", length = 32, nullable = false, updatable = false)
    private ArtifactType artifactType;

    @Enumerated(EnumType.STRING)
    @Column(length = 32, nullable = false)
    private GenerationJobStatus status;

    @Column(name = "provider_worker_id", length = 64)
    private String providerWorkerId;

    @Column(name = "external_run_id", length = 128)
    private String externalRunId;

    @Column(name = "external_session_id", length = 128)
    private String externalSessionId;

    @Column(name = "input_snapshot", columnDefinition = "TEXT", nullable = false, updatable = false)
    private String inputSnapshot;

    @Column(name = "output_path", length = 512)
    private String outputPath;

    @Column(name = "idempotency_key", length = 128, nullable = false, updatable = false)
    private String idempotencyKey;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Version
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    protected GenerationJob() {
    }

    private GenerationJob(
            String userId,
            String conversationId,
            String projectId,
            String ideaId,
            String expertId,
            GenerationProvider provider,
            ArtifactType artifactType,
            String inputSnapshot,
            String idempotencyKey
    ) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID().toString();
        this.userId = requireText(userId, "userId");
        this.conversationId = requireText(conversationId, "conversationId");
        this.projectId = requireText(projectId, "projectId");
        this.ideaId = normalizeOptional(ideaId);
        this.expertId = requireText(expertId, "expertId");
        this.provider = Objects.requireNonNull(provider, "provider 不能为空");
        this.artifactType = Objects.requireNonNull(artifactType, "artifactType 不能为空");
        this.status = GenerationJobStatus.QUEUED;
        this.inputSnapshot = requireText(inputSnapshot, "inputSnapshot");
        this.idempotencyKey = requireText(idempotencyKey, "idempotencyKey");
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static GenerationJob queued(
            String userId,
            String conversationId,
            String projectId,
            String ideaId,
            String expertId,
            GenerationProvider provider,
            ArtifactType artifactType,
            String inputSnapshot,
            String idempotencyKey
    ) {
        return new GenerationJob(
                userId,
                conversationId,
                projectId,
                ideaId,
                expertId,
                provider,
                artifactType,
                inputSnapshot,
                idempotencyKey
        );
    }

    public void start(String providerWorkerId) {
        requireStatus(GenerationJobStatus.QUEUED);
        String normalizedProviderWorkerId = requireText(providerWorkerId, "providerWorkerId");
        this.status = GenerationJobStatus.RUNNING;
        this.providerWorkerId = normalizedProviderWorkerId;
        this.startedAt = Instant.now();
        this.updatedAt = this.startedAt;
    }

    public void recordExternalRunId(String externalRunId) {
        requireStatus(GenerationJobStatus.RUNNING);
        this.externalRunId = requireText(externalRunId, "externalRunId");
        this.updatedAt = Instant.now();
    }

    public void complete(String outputPath, String externalSessionId) {
        requireStatus(GenerationJobStatus.RUNNING);
        this.status = GenerationJobStatus.SUCCEEDED;
        this.outputPath = requireText(outputPath, "outputPath");
        this.externalSessionId = normalizeOptional(externalSessionId);
        this.errorMessage = null;
        this.completedAt = Instant.now();
        this.updatedAt = this.completedAt;
    }

    public void fail(String errorMessage) {
        if (status == GenerationJobStatus.SUCCEEDED || status == GenerationJobStatus.CANCELED) {
            throw new IllegalStateException("已结束任务不能标记失败");
        }
        this.status = GenerationJobStatus.FAILED;
        this.errorMessage = requireText(errorMessage, "errorMessage");
        this.completedAt = Instant.now();
        this.updatedAt = this.completedAt;
    }

    private void requireStatus(GenerationJobStatus expected) {
        if (status != expected) {
            throw new IllegalStateException("任务状态必须为 " + expected + "，当前为 " + status);
        }
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

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getConversationId() {
        return conversationId;
    }

    public String getProjectId() {
        return projectId;
    }

    public String getIdeaId() {
        return ideaId;
    }

    public String getExpertId() {
        return expertId;
    }

    public GenerationProvider getProvider() {
        return provider;
    }

    public ArtifactType getArtifactType() {
        return artifactType;
    }

    public GenerationJobStatus getStatus() {
        return status;
    }

    public String getProviderWorkerId() {
        return providerWorkerId;
    }

    public String getExternalRunId() {
        return externalRunId;
    }

    public String getExternalSessionId() {
        return externalSessionId;
    }

    public String getInputSnapshot() {
        return inputSnapshot;
    }

    public String getOutputPath() {
        return outputPath;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }
}
