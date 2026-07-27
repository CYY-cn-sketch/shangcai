package com.sufe.ai.knowledge.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "knowledge_asset")
public class KnowledgeAsset {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "knowledge_base_id", length = 36, nullable = false)
    private String knowledgeBaseId;

    @Column(length = 200, nullable = false)
    private String name;

    @Column(name = "size_label", length = 50, nullable = false)
    private String sizeLabel;

    @Column(name = "file_type", length = 80, nullable = false)
    private String fileType;

    @Column(length = 1000, nullable = false)
    private String preview;

    @Column(name = "content_text", columnDefinition = "MEDIUMTEXT")
    private String contentText;

    @Column(name = "uploaded_by", length = 100, nullable = false)
    private String uploadedBy;

    @Column(name = "storage_key", length = 512)
    private String storageKey;

    @Column(name = "original_name", length = 255)
    private String originalName;

    @Column(name = "mime_type", length = 150)
    private String mimeType;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(length = 64)
    private String sha256;

    @Column(name = "extraction_status", length = 32, nullable = false)
    private String extractionStatus;

    @Column(name = "extraction_message", length = 500)
    private String extractionMessage;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected KnowledgeAsset() {
    }

    private KnowledgeAsset(
            String knowledgeBaseId,
            String name,
            String sizeLabel,
            String fileType,
            String preview,
            String contentText,
            String uploadedBy
    ) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID().toString();
        this.knowledgeBaseId = KnowledgeBase.requireText(knowledgeBaseId, "knowledgeBaseId");
        this.name = KnowledgeBase.requireText(name, "name");
        this.sizeLabel = KnowledgeBase.requireText(sizeLabel, "sizeLabel");
        this.fileType = KnowledgeBase.requireText(fileType, "fileType");
        this.preview = KnowledgeBase.requireText(preview, "preview");
        this.contentText = normalizeOptional(contentText);
        this.uploadedBy = KnowledgeBase.requireText(uploadedBy, "uploadedBy");
        this.extractionStatus = this.contentText == null ? "EMPTY" : "READY";
        this.enabled = true;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static KnowledgeAsset create(
            String knowledgeBaseId,
            String name,
            String sizeLabel,
            String fileType,
            String preview,
            String contentText,
            String uploadedBy
    ) {
        return new KnowledgeAsset(knowledgeBaseId, name, sizeLabel, fileType, preview, contentText, uploadedBy);
    }

    public void update(String name, String sizeLabel, String fileType, String preview, String contentText, boolean enabled) {
        this.name = KnowledgeBase.requireText(name, "name");
        this.sizeLabel = KnowledgeBase.requireText(sizeLabel, "sizeLabel");
        this.fileType = KnowledgeBase.requireText(fileType, "fileType");
        this.preview = KnowledgeBase.requireText(preview, "preview");
        this.contentText = normalizeOptional(contentText);
        this.enabled = enabled;
        this.updatedAt = Instant.now();
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
        this.updatedAt = Instant.now();
    }

    public void attachFile(
            String storageKey,
            String originalName,
            String mimeType,
            long fileSizeBytes,
            String sha256
    ) {
        this.storageKey = KnowledgeBase.requireText(storageKey, "storageKey");
        this.originalName = KnowledgeBase.requireText(originalName, "originalName");
        this.mimeType = KnowledgeBase.requireText(mimeType, "mimeType");
        if (fileSizeBytes < 0) throw new IllegalArgumentException("fileSizeBytes 不能小于 0");
        this.fileSizeBytes = fileSizeBytes;
        this.sha256 = KnowledgeBase.requireText(sha256, "sha256");
        this.updatedAt = Instant.now();
    }

    public void updateExtraction(String status, String message, String contentText) {
        this.extractionStatus = KnowledgeBase.requireText(status, "extractionStatus");
        this.extractionMessage = normalizeOptional(message);
        this.contentText = normalizeOptional(contentText);
        this.updatedAt = Instant.now();
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public String getId() {
        return id;
    }

    public String getKnowledgeBaseId() {
        return knowledgeBaseId;
    }

    public String getName() {
        return name;
    }

    public String getSizeLabel() {
        return sizeLabel;
    }

    public String getFileType() {
        return fileType;
    }

    public String getPreview() {
        return preview;
    }

    public String getContentText() {
        return contentText;
    }

    public String getUploadedBy() {
        return uploadedBy;
    }

    public String getStorageKey() { return storageKey; }
    public String getOriginalName() { return originalName; }
    public String getMimeType() { return mimeType; }
    public Long getFileSizeBytes() { return fileSizeBytes; }
    public String getSha256() { return sha256; }
    public String getExtractionStatus() { return extractionStatus; }
    public String getExtractionMessage() { return extractionMessage; }
    public boolean hasFile() { return storageKey != null; }

    public boolean isEnabled() {
        return enabled;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
