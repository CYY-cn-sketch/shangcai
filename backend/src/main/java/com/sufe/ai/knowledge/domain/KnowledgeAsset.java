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

    @Column(name = "content_text", columnDefinition = "TEXT")
    private String contentText;

    @Column(name = "uploaded_by", length = 100, nullable = false)
    private String uploadedBy;

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

    public boolean isEnabled() {
        return enabled;
    }
}
