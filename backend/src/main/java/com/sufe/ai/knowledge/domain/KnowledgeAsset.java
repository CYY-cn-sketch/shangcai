package com.sufe.ai.knowledge.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;
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

    @Column(name = "origin_type", length = 32, nullable = false)
    private String originType;

    @Enumerated(EnumType.STRING)
    @Column(name = "lexiang_sync_status", length = 32, nullable = false)
    private LexiangSyncStatus lexiangSyncStatus;

    @Column(name = "lexiang_entry_id", length = 64)
    private String lexiangEntryId;

    @Column(name = "lexiang_synced_sha256", length = 64)
    private String lexiangSyncedSha256;

    @Column(name = "lexiang_synced_name", length = 200)
    private String lexiangSyncedName;

    @Column(name = "lexiang_sync_error", length = 500)
    private String lexiangSyncError;

    @Column(name = "lexiang_synced_at")
    private Instant lexiangSyncedAt;

    @Column(name = "lexiang_remote_updated_at", length = 32)
    private String lexiangRemoteUpdatedAt;

    @Column(name = "lexiang_remote_etag", length = 128)
    private String lexiangRemoteEtag;

    @Column(name = "lexiang_last_seen_at")
    private Instant lexiangLastSeenAt;

    @Column(name = "lexiang_last_seen_run_id", length = 36)
    private String lexiangLastSeenRunId;

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
        this.originType = "COURSE_UPLOAD";
        this.lexiangSyncStatus = LexiangSyncStatus.NOT_APPLICABLE;
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

    public void markSkillImport() {
        this.originType = "SKILL_IMPORT";
        this.lexiangSyncStatus = LexiangSyncStatus.NOT_APPLICABLE;
        this.lexiangSyncError = null;
        this.updatedAt = Instant.now();
    }

    public void markExpertDirectUpload() {
        this.originType = "EXPERT_DIRECT_UPLOAD";
        this.lexiangSyncStatus = LexiangSyncStatus.NOT_APPLICABLE;
        this.updatedAt = Instant.now();
    }

    public void queueLexiangSync() {
        if ("LEXIANG_PULL".equals(originType) && hasFile()) {
            this.lexiangSyncStatus = LexiangSyncStatus.PENDING;
            this.lexiangSyncError = null;
            this.updatedAt = Instant.now();
            return;
        }
        if (!"COURSE_UPLOAD".equals(originType) || !hasFile()) {
            this.lexiangSyncStatus = LexiangSyncStatus.NOT_APPLICABLE;
            return;
        }
        this.lexiangSyncStatus = LexiangSyncStatus.PENDING;
        this.lexiangSyncError = null;
        this.updatedAt = Instant.now();
    }

    public void markLexiangSyncing() {
        this.lexiangSyncStatus = LexiangSyncStatus.SYNCING;
        this.lexiangSyncError = null;
        this.updatedAt = Instant.now();
    }

    public void markLexiangSynced(String entryId) {
        markLexiangSynced(entryId, null);
    }

    public void markLexiangSynced(String entryId, String remoteUpdatedAt) {
        this.lexiangEntryId = KnowledgeBase.requireText(entryId, "lexiangEntryId");
        this.lexiangSyncedSha256 = sha256;
        this.lexiangSyncedName = name;
        this.lexiangSyncStatus = LexiangSyncStatus.SYNCED;
        this.lexiangSyncError = null;
        this.lexiangSyncedAt = Instant.now();
        this.lexiangRemoteUpdatedAt = normalizeOptional(remoteUpdatedAt);
        this.lexiangRemoteEtag = null;
        this.updatedAt = this.lexiangSyncedAt;
    }

    public void markLexiangNotConfigured() {
        markLexiangNotConfigured("乐享知识库尚未配置，文件已安全保存在平台");
    }

    public void markLexiangNotConfigured(String message) {
        this.lexiangSyncStatus = LexiangSyncStatus.NOT_CONFIGURED;
        this.lexiangSyncError = normalizeSyncError(message);
        this.updatedAt = Instant.now();
    }

    public void markLexiangUnsupported(String message) {
        this.lexiangSyncStatus = LexiangSyncStatus.UNSUPPORTED;
        this.lexiangSyncError = normalizeSyncError(message);
        this.updatedAt = Instant.now();
    }

    public void markLexiangFailed(String message) {
        this.lexiangSyncStatus = LexiangSyncStatus.FAILED;
        this.lexiangSyncError = normalizeSyncError(message);
        this.updatedAt = Instant.now();
    }

    public void applyLexiangPulledFile(
            String name,
            String sizeLabel,
            String fileType,
            String preview,
            String contentText,
            String extractionStatus,
            String extractionMessage,
            String storageKey,
            String originalName,
            String mimeType,
            long fileSizeBytes,
            String sha256,
            String entryId,
            String remoteUpdatedAt,
            String remoteEtag,
            String runId,
            Instant seenAt,
            boolean imported
    ) {
        this.name = KnowledgeBase.requireText(name, "name");
        this.sizeLabel = KnowledgeBase.requireText(sizeLabel, "sizeLabel");
        this.fileType = KnowledgeBase.requireText(fileType, "fileType");
        this.preview = KnowledgeBase.requireText(preview, "preview");
        this.contentText = normalizeOptional(contentText);
        this.extractionStatus = KnowledgeBase.requireText(extractionStatus, "extractionStatus");
        this.extractionMessage = normalizeOptional(extractionMessage);
        attachFile(storageKey, originalName, mimeType, fileSizeBytes, sha256);
        if (imported) this.originType = "LEXIANG_PULL";
        this.lexiangEntryId = KnowledgeBase.requireText(entryId, "lexiangEntryId");
        this.lexiangSyncedSha256 = this.sha256;
        this.lexiangSyncedName = this.name;
        this.lexiangRemoteUpdatedAt = normalizeOptional(remoteUpdatedAt);
        this.lexiangRemoteEtag = normalizeOptional(remoteEtag);
        this.lexiangLastSeenRunId = KnowledgeBase.requireText(runId, "lexiangLastSeenRunId");
        this.lexiangLastSeenAt = seenAt == null ? Instant.now() : seenAt;
        this.lexiangSyncedAt = this.lexiangLastSeenAt;
        this.lexiangSyncStatus = "LEXIANG_PULL".equals(originType)
                ? LexiangSyncStatus.PULLED
                : LexiangSyncStatus.SYNCED;
        this.lexiangSyncError = null;
        this.updatedAt = this.lexiangLastSeenAt;
    }

    public void markLexiangSeen(String remoteUpdatedAt, String runId, Instant seenAt) {
        this.lexiangRemoteUpdatedAt = normalizeOptional(remoteUpdatedAt);
        this.lexiangLastSeenRunId = KnowledgeBase.requireText(runId, "lexiangLastSeenRunId");
        this.lexiangLastSeenAt = seenAt == null ? Instant.now() : seenAt;
        this.lexiangSyncStatus = "LEXIANG_PULL".equals(originType)
                ? LexiangSyncStatus.PULLED
                : LexiangSyncStatus.SYNCED;
        this.lexiangSyncError = null;
        this.updatedAt = this.lexiangLastSeenAt;
    }

    public void markLexiangConflict(String remoteUpdatedAt, String runId, Instant seenAt, String message) {
        this.lexiangRemoteUpdatedAt = normalizeOptional(remoteUpdatedAt);
        this.lexiangLastSeenRunId = KnowledgeBase.requireText(runId, "lexiangLastSeenRunId");
        this.lexiangLastSeenAt = seenAt == null ? Instant.now() : seenAt;
        this.lexiangSyncStatus = LexiangSyncStatus.CONFLICT;
        this.lexiangSyncError = normalizeSyncError(message);
        this.updatedAt = this.lexiangLastSeenAt;
    }

    public void markLexiangPushConflict(String message) {
        this.lexiangSyncStatus = LexiangSyncStatus.CONFLICT;
        this.lexiangSyncError = normalizeSyncError(message);
        this.updatedAt = Instant.now();
    }

    public void markLexiangSeenKeepingStatus(String remoteUpdatedAt, String runId, Instant seenAt) {
        this.lexiangRemoteUpdatedAt = normalizeOptional(remoteUpdatedAt);
        this.lexiangLastSeenRunId = KnowledgeBase.requireText(runId, "lexiangLastSeenRunId");
        this.lexiangLastSeenAt = seenAt == null ? Instant.now() : seenAt;
        this.updatedAt = this.lexiangLastSeenAt;
    }

    public void markLexiangPullFailed(String runId, Instant seenAt, String message) {
        this.lexiangLastSeenRunId = KnowledgeBase.requireText(runId, "lexiangLastSeenRunId");
        this.lexiangLastSeenAt = seenAt == null ? Instant.now() : seenAt;
        this.lexiangSyncStatus = LexiangSyncStatus.FAILED;
        this.lexiangSyncError = normalizeSyncError(message);
        this.updatedAt = this.lexiangLastSeenAt;
    }

    public void markLexiangRemoteMissing(String message) {
        this.lexiangSyncStatus = LexiangSyncStatus.REMOTE_MISSING;
        this.lexiangSyncError = normalizeSyncError(message);
        this.updatedAt = Instant.now();
    }

    public boolean hasLocalLexiangConflict() {
        return lexiangSyncedSha256 == null
                || lexiangSyncedName == null
                || !Objects.equals(sha256, lexiangSyncedSha256)
                || !Objects.equals(name, lexiangSyncedName);
    }

    private static String normalizeSyncError(String message) {
        String normalized = message == null || message.isBlank() ? "乐享知识库同步失败" : message.trim();
        return normalized.length() <= 500 ? normalized : normalized.substring(0, 500);
    }

    public boolean isSkillImport() {
        return "SKILL_IMPORT".equals(originType);
    }

    public boolean isExpertDirectUpload() {
        return "EXPERT_DIRECT_UPLOAD".equals(originType);
    }

    public boolean isLexiangPull() {
        return "LEXIANG_PULL".equals(originType);
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
    public String getOriginType() { return originType; }
    public LexiangSyncStatus getLexiangSyncStatus() { return lexiangSyncStatus; }
    public String getLexiangEntryId() { return lexiangEntryId; }
    public String getLexiangSyncedSha256() { return lexiangSyncedSha256; }
    public String getLexiangSyncedName() { return lexiangSyncedName; }
    public String getLexiangSyncError() { return lexiangSyncError; }
    public Instant getLexiangSyncedAt() { return lexiangSyncedAt; }
    public String getLexiangRemoteUpdatedAt() { return lexiangRemoteUpdatedAt; }
    public String getLexiangRemoteEtag() { return lexiangRemoteEtag; }
    public Instant getLexiangLastSeenAt() { return lexiangLastSeenAt; }
    public String getLexiangLastSeenRunId() { return lexiangLastSeenRunId; }
    public boolean hasFile() { return storageKey != null; }

    public boolean isEnabled() {
        return enabled;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
