package com.sufe.ai.artifact.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "artifact_record")
public class ArtifactRecord {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", length = 36, nullable = false, updatable = false)
    private String userId;

    @Column(name = "idea_id", length = 36, nullable = false, updatable = false)
    private String ideaId;

    @Column(name = "source_message_id", length = 64)
    private String sourceMessageId;

    @Column(name = "artifact_type", length = 32, nullable = false)
    private String artifactType;

    @Column(length = 200, nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String summary;

    @Column(name = "content_json", columnDefinition = "TEXT", nullable = false)
    private String contentJson;

    @Column(name = "file_path", length = 512)
    private String filePath;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "mime_type", length = 150)
    private String mimeType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ArtifactRecord() {
    }

    private ArtifactRecord(
            String userId,
            String ideaId,
            String sourceMessageId,
            String artifactType,
            String title,
            String summary,
            String contentJson
    ) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID().toString();
        this.userId = requireText(userId, "userId");
        this.ideaId = requireText(ideaId, "ideaId");
        this.sourceMessageId = normalizeOptional(sourceMessageId);
        this.artifactType = requireText(artifactType, "artifactType");
        this.title = requireText(title, "title");
        this.summary = requireText(summary, "summary");
        this.contentJson = requireText(contentJson, "contentJson");
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static ArtifactRecord create(
            String userId,
            String ideaId,
            String sourceMessageId,
            String artifactType,
            String title,
            String summary,
            String contentJson
    ) {
        return new ArtifactRecord(userId, ideaId, sourceMessageId, artifactType, title, summary, contentJson);
    }

    public void refresh(String artifactType, String title, String summary, String contentJson) {
        this.artifactType = requireText(artifactType, "artifactType");
        this.title = requireText(title, "title");
        this.summary = requireText(summary, "summary");
        this.contentJson = requireText(contentJson, "contentJson");
        this.updatedAt = Instant.now();
    }

    public void attachFile(String filePath, String fileName, String mimeType) {
        this.filePath = requireText(filePath, "filePath");
        this.fileName = requireText(fileName, "fileName");
        this.mimeType = requireText(mimeType, "mimeType");
        this.updatedAt = Instant.now();
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
    public String getIdeaId() { return ideaId; }
    public String getSourceMessageId() { return sourceMessageId; }
    public String getArtifactType() { return artifactType; }
    public String getTitle() { return title; }
    public String getSummary() { return summary; }
    public String getContentJson() { return contentJson; }
    public String getFilePath() { return filePath; }
    public String getFileName() { return fileName; }
    public String getMimeType() { return mimeType; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
