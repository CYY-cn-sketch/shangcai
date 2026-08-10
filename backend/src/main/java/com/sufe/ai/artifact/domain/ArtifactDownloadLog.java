package com.sufe.ai.artifact.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "artifact_download_log")
public class ArtifactDownloadLog {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "artifact_id", length = 36, nullable = false, updatable = false)
    private String artifactId;

    @Column(name = "actor_user_id", length = 36, nullable = false, updatable = false)
    private String actorUserId;

    @Column(name = "delivery_mode", length = 32, nullable = false, updatable = false)
    private String deliveryMode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ArtifactDownloadLog() {
    }

    private ArtifactDownloadLog(String artifactId, String actorUserId, String deliveryMode) {
        this.id = UUID.randomUUID().toString();
        this.artifactId = requireText(artifactId, "artifactId");
        this.actorUserId = requireText(actorUserId, "actorUserId");
        this.deliveryMode = requireText(deliveryMode, "deliveryMode");
        this.createdAt = Instant.now();
    }

    public static ArtifactDownloadLog create(String artifactId, String actorUserId, String deliveryMode) {
        return new ArtifactDownloadLog(artifactId, actorUserId, deliveryMode);
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(fieldName + " 不能为空");
        return value.trim();
    }

    public String getId() { return id; }
    public String getArtifactId() { return artifactId; }
    public String getActorUserId() { return actorUserId; }
    public String getDeliveryMode() { return deliveryMode; }
    public Instant getCreatedAt() { return createdAt; }
}
