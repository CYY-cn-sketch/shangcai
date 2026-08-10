package com.sufe.ai.workspace.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "student_attachment")
public class StudentAttachment {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", length = 36, nullable = false, updatable = false)
    private String userId;

    @Column(name = "idea_id", length = 36, nullable = false, updatable = false)
    private String ideaId;

    @Column(name = "client_message_id", length = 64, nullable = false, updatable = false)
    private String clientMessageId;

    @Column(name = "original_name", length = 255, nullable = false, updatable = false)
    private String originalName;

    @Column(name = "mime_type", length = 150, nullable = false, updatable = false)
    private String mimeType;

    @Column(name = "file_size_bytes", nullable = false, updatable = false)
    private long fileSizeBytes;

    @Column(length = 64, nullable = false, updatable = false)
    private String sha256;

    @Column(name = "storage_key", length = 512, nullable = false, updatable = false)
    private String storageKey;

    @Column(name = "extraction_status", length = 32, nullable = false, updatable = false)
    private String extractionStatus;

    @Column(name = "extraction_message", length = 500, updatable = false)
    private String extractionMessage;

    @Column(name = "content_text", columnDefinition = "MEDIUMTEXT", updatable = false)
    private String contentText;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected StudentAttachment() {
    }

    private StudentAttachment(
            String userId,
            String ideaId,
            String clientMessageId,
            String originalName,
            String mimeType,
            long fileSizeBytes,
            String sha256,
            String storageKey,
            String extractionStatus,
            String extractionMessage,
            String contentText
    ) {
        this.id = UUID.randomUUID().toString();
        this.userId = requireText(userId, "userId");
        this.ideaId = requireText(ideaId, "ideaId");
        this.clientMessageId = requireText(clientMessageId, "clientMessageId");
        this.originalName = requireText(originalName, "originalName");
        this.mimeType = requireText(mimeType, "mimeType");
        this.fileSizeBytes = fileSizeBytes;
        this.sha256 = requireText(sha256, "sha256");
        this.storageKey = requireText(storageKey, "storageKey");
        this.extractionStatus = requireText(extractionStatus, "extractionStatus");
        this.extractionMessage = optional(extractionMessage);
        this.contentText = optional(contentText);
        this.createdAt = Instant.now();
    }

    public static StudentAttachment create(
            String userId,
            String ideaId,
            String clientMessageId,
            String originalName,
            String mimeType,
            long fileSizeBytes,
            String sha256,
            String storageKey,
            String extractionStatus,
            String extractionMessage,
            String contentText
    ) {
        return new StudentAttachment(userId, ideaId, clientMessageId, originalName, mimeType, fileSizeBytes, sha256,
                storageKey, extractionStatus, extractionMessage, contentText);
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(field + " 不能为空");
        return value.trim();
    }

    private static String optional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getIdeaId() { return ideaId; }
    public String getClientMessageId() { return clientMessageId; }
    public String getOriginalName() { return originalName; }
    public String getMimeType() { return mimeType; }
    public long getFileSizeBytes() { return fileSizeBytes; }
    public String getSha256() { return sha256; }
    public String getStorageKey() { return storageKey; }
    public String getExtractionStatus() { return extractionStatus; }
    public String getExtractionMessage() { return extractionMessage; }
    public String getContentText() { return contentText; }
    public Instant getCreatedAt() { return createdAt; }
}
