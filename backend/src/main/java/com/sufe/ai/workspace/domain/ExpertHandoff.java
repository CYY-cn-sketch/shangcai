package com.sufe.ai.workspace.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "expert_handoff")
public class ExpertHandoff {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", length = 36, nullable = false, updatable = false)
    private String userId;

    @Column(name = "idea_id", length = 36, nullable = false, updatable = false)
    private String ideaId;

    @Column(name = "source_artifact_id", length = 36, nullable = false, updatable = false)
    private String sourceArtifactId;

    @Column(name = "source_expert_id", length = 64, nullable = false)
    private String sourceExpertId;

    @Column(name = "target_expert_id", length = 64, nullable = false, updatable = false)
    private String targetExpertId;

    @Column(length = 20, nullable = false)
    private String status;

    @Column(name = "payload_json", columnDefinition = "TEXT", nullable = false)
    private String payloadJson;

    @Column(name = "confirmed_at", nullable = false)
    private Instant confirmedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ExpertHandoff() {
    }

    private ExpertHandoff(
            String userId,
            String ideaId,
            String sourceArtifactId,
            String sourceExpertId,
            String targetExpertId,
            String payloadJson
    ) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID().toString();
        this.userId = requireText(userId, "userId");
        this.ideaId = requireText(ideaId, "ideaId");
        this.sourceArtifactId = requireText(sourceArtifactId, "sourceArtifactId");
        this.sourceExpertId = requireText(sourceExpertId, "sourceExpertId");
        this.targetExpertId = requireText(targetExpertId, "targetExpertId");
        this.status = "CONFIRMED";
        this.payloadJson = requireText(payloadJson, "payloadJson");
        this.confirmedAt = now;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static ExpertHandoff confirm(
            String userId,
            String ideaId,
            String sourceArtifactId,
            String sourceExpertId,
            String targetExpertId,
            String payloadJson
    ) {
        return new ExpertHandoff(userId, ideaId, sourceArtifactId, sourceExpertId, targetExpertId, payloadJson);
    }

    public boolean refresh(String sourceExpertId, String payloadJson) {
        String normalizedSourceExpertId = requireText(sourceExpertId, "sourceExpertId");
        String normalizedPayloadJson = requireText(payloadJson, "payloadJson");
        if (this.sourceExpertId.equals(normalizedSourceExpertId) && this.payloadJson.equals(normalizedPayloadJson)) {
            return false;
        }
        Instant now = Instant.now();
        this.sourceExpertId = normalizedSourceExpertId;
        this.payloadJson = normalizedPayloadJson;
        this.confirmedAt = now;
        this.updatedAt = now;
        return true;
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(fieldName + " 不能为空");
        return value.trim();
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getIdeaId() { return ideaId; }
    public String getSourceArtifactId() { return sourceArtifactId; }
    public String getSourceExpertId() { return sourceExpertId; }
    public String getTargetExpertId() { return targetExpertId; }
    public String getStatus() { return status; }
    public String getPayloadJson() { return payloadJson; }
    public Instant getConfirmedAt() { return confirmedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
