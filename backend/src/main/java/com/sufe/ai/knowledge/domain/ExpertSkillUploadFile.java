package com.sufe.ai.knowledge.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "expert_skill_upload_file")
public class ExpertSkillUploadFile {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "upload_id", length = 36, nullable = false, updatable = false)
    private String uploadId;

    @Column(name = "relative_path", length = 512, nullable = false, updatable = false)
    private String relativePath;

    @Enumerated(EnumType.STRING)
    @Column(name = "file_role", length = 32, nullable = false, updatable = false)
    private ExpertSkillFileRole fileRole;

    @Column(name = "content_text", columnDefinition = "MEDIUMTEXT", updatable = false)
    private String contentText;

    @Column(name = "storage_key", length = 512, nullable = false, updatable = false)
    private String storageKey;

    @Column(name = "mime_type", length = 150, nullable = false, updatable = false)
    private String mimeType;

    @Column(name = "file_size_bytes", nullable = false, updatable = false)
    private long fileSizeBytes;

    @Column(length = 64, nullable = false, updatable = false)
    private String sha256;

    @Column(name = "imported_asset_id", length = 36)
    private String importedAssetId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ExpertSkillUploadFile() {
    }

    public static ExpertSkillUploadFile create(
            String uploadId,
            String relativePath,
            ExpertSkillFileRole fileRole,
            String contentText,
            String storageKey,
            String mimeType,
            long fileSizeBytes,
            String sha256
    ) {
        if (fileSizeBytes <= 0) throw new IllegalArgumentException("fileSizeBytes 必须大于 0");
        ExpertSkillUploadFile file = new ExpertSkillUploadFile();
        file.id = UUID.randomUUID().toString();
        file.uploadId = requireText(uploadId, "uploadId");
        file.relativePath = requireText(relativePath, "relativePath");
        file.fileRole = fileRole;
        file.contentText = normalizeOptional(contentText);
        file.storageKey = requireText(storageKey, "storageKey");
        file.mimeType = requireText(mimeType, "mimeType");
        file.fileSizeBytes = fileSizeBytes;
        file.sha256 = requireText(sha256, "sha256");
        file.createdAt = Instant.now();
        return file;
    }

    public void markImported(String assetId) {
        if (fileRole != ExpertSkillFileRole.KNOWLEDGE_CANDIDATE) {
            throw new IllegalStateException("只有知识资料候选可以导入知识库");
        }
        if (importedAssetId != null) throw new IllegalStateException("该文件已经导入知识库");
        importedAssetId = requireText(assetId, "assetId");
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(field + " 不能为空");
        return value.trim();
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public String getId() { return id; }
    public String getUploadId() { return uploadId; }
    public String getRelativePath() { return relativePath; }
    public ExpertSkillFileRole getFileRole() { return fileRole; }
    public String getContentText() { return contentText; }
    public String getStorageKey() { return storageKey; }
    public String getMimeType() { return mimeType; }
    public long getFileSizeBytes() { return fileSizeBytes; }
    public String getSha256() { return sha256; }
    public String getImportedAssetId() { return importedAssetId; }
    public Instant getCreatedAt() { return createdAt; }
}
