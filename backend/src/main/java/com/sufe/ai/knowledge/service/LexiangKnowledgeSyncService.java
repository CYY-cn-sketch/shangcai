package com.sufe.ai.knowledge.service;

import com.sufe.ai.knowledge.domain.KnowledgeAsset;
import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.domain.LexiangCourseMapping;
import com.sufe.ai.knowledge.domain.LexiangSyncStatus;
import com.sufe.ai.knowledge.repository.KnowledgeAssetRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import com.sufe.ai.knowledge.repository.LexiangCourseMappingRepository;
import com.sufe.ai.provider.config.LexiangProperties;
import com.sufe.ai.provider.lexiang.LexiangKnowledgeClient;
import com.sufe.ai.provider.lexiang.LexiangKnowledgeClient.LexiangEntryType;
import com.sufe.ai.storage.FileStorageService;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.Objects;

@Service
public class LexiangKnowledgeSyncService {

    private final KnowledgeAssetRepository assetRepository;
    private final KnowledgeBaseRepository baseRepository;
    private final LexiangCourseMappingRepository mappingRepository;
    private final FileStorageService fileStorageService;
    private final LexiangKnowledgeClient client;
    private final LexiangProperties properties;
    private final TransactionTemplate transactions;

    public LexiangKnowledgeSyncService(
            KnowledgeAssetRepository assetRepository,
            KnowledgeBaseRepository baseRepository,
            LexiangCourseMappingRepository mappingRepository,
            FileStorageService fileStorageService,
            LexiangKnowledgeClient client,
            LexiangProperties properties,
            PlatformTransactionManager transactionManager
    ) {
        this.assetRepository = assetRepository;
        this.baseRepository = baseRepository;
        this.mappingRepository = mappingRepository;
        this.fileStorageService = fileStorageService;
        this.client = client;
        this.properties = properties;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    public KnowledgeAsset syncNow(String assetId) {
        SyncSnapshot snapshot = transactions.execute(status -> prepare(assetId));
        if (snapshot == null) {
            return requireAsset(assetId);
        }

        try {
            String entryId = snapshot.entryId();
            if (entryId != null) {
                String currentRemoteVersion = client.describeEntry(entryId).remoteUpdatedAt();
                if (snapshot.remoteUpdatedAt() == null
                        || !Objects.equals(snapshot.remoteUpdatedAt(), currentRemoteVersion)) {
                    markPushConflict(assetId);
                    return requireAsset(assetId);
                }
            }
            byte[] bytes = readFile(snapshot.storageKey());
            if (entryId == null) {
                entryId = client.createFile(
                        snapshot.remoteName(),
                        bytes,
                        snapshot.entryType(),
                        snapshot.spaceId(),
                        snapshot.parentEntryId()
                );
            } else {
                if (!Objects.equals(snapshot.sha256(), snapshot.syncedSha256())) {
                    client.replaceFile(entryId, snapshot.remoteName(), bytes, snapshot.entryType());
                }
                if (!Objects.equals(snapshot.remoteName(), snapshot.syncedName())) {
                    client.rename(entryId, snapshot.remoteName());
                }
            }
            client.setEnabled(entryId, snapshot.enabled());
            String pushedRemoteVersion = client.describeEntry(entryId).remoteUpdatedAt();
            String finalEntryId = entryId;
            String finalRemoteVersion = pushedRemoteVersion;
            return transactions.execute(status -> {
                KnowledgeAsset asset = requireAsset(assetId);
                asset.markLexiangSynced(finalEntryId, finalRemoteVersion);
                return assetRepository.saveAndFlush(asset);
            });
        } catch (RuntimeException exception) {
            transactions.executeWithoutResult(status -> {
                assetRepository.findById(assetId).ifPresent(asset -> {
                    asset.markLexiangFailed(safeError(exception));
                    assetRepository.saveAndFlush(asset);
                });
            });
            return requireAsset(assetId);
        }
    }

    public void deleteRemoteBeforeLocal(KnowledgeAsset asset) {
        if (asset.getLexiangEntryId() == null || asset.getLexiangEntryId().isBlank()) return;
        if (!properties.knowledgeConfigured()) {
            asset.markLexiangFailed("乐享知识库尚未配置，无法确认远端删除；平台资料已保留");
            assetRepository.saveAndFlush(asset);
            throw new LexiangKnowledgeDeleteException("乐享知识库尚未配置，本地资料未删除");
        }
        try {
            String currentRemoteVersion = client.describeEntry(asset.getLexiangEntryId()).remoteUpdatedAt();
            if (asset.getLexiangRemoteUpdatedAt() == null
                    || !Objects.equals(asset.getLexiangRemoteUpdatedAt(), currentRemoteVersion)) {
                asset.markLexiangPushConflict("乐享版本与平台基线不一致，未执行删除；请先回拉并处理冲突");
                assetRepository.saveAndFlush(asset);
                throw new LexiangKnowledgeDeleteException("乐享文件已变化或缺少版本基线，本地资料未删除");
            }
            client.delete(asset.getLexiangEntryId());
        } catch (LexiangKnowledgeDeleteException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            asset.markLexiangFailed(safeError(exception));
            assetRepository.saveAndFlush(asset);
            throw new LexiangKnowledgeDeleteException("乐享知识节点删除失败，本地资料未删除", exception);
        }
    }

    private SyncSnapshot prepare(String assetId) {
        KnowledgeAsset asset = requireAsset(assetId);
        KnowledgeBase base = baseRepository.findById(asset.getKnowledgeBaseId())
                .orElseThrow(() -> new IllegalStateException("知识库不存在"));
        if (!base.isCourseShared() || !asset.hasFile()
                || !("COURSE_UPLOAD".equals(asset.getOriginType()) || asset.isLexiangPull())) {
            return null;
        }
        LexiangCourseMapping mapping = mappingRepository
                .findByKnowledgeBaseIdAndEnabledTrue(base.getId())
                .orElse(null);
        if (mapping == null) {
            asset.markLexiangNotConfigured("课程知识库尚未配置启用的乐享目录映射，文件已安全保存在平台");
            assetRepository.saveAndFlush(asset);
            return null;
        }
        if (!properties.knowledgeConfigured()) {
            asset.markLexiangNotConfigured();
            assetRepository.saveAndFlush(asset);
            return null;
        }
        LexiangEntryType entryType = entryType(asset.getOriginalName());
        if (entryType == null) {
            asset.markLexiangUnsupported("该文件类型不在乐享普通知识文件的官方支持范围，文件仅保存在平台");
            assetRepository.saveAndFlush(asset);
            return null;
        }
        asset.markLexiangSyncing();
        assetRepository.saveAndFlush(asset);
        return new SyncSnapshot(
                asset.getStorageKey(),
                remoteName(asset),
                asset.getSha256(),
                asset.getLexiangEntryId(),
                asset.getLexiangSyncedSha256(),
                asset.getLexiangSyncedName(),
                asset.isEnabled(),
                entryType,
                mapping.getSpaceId(),
                mapping.getParentEntryId(),
                asset.getLexiangRemoteUpdatedAt()
        );
    }

    private byte[] readFile(String storageKey) {
        Resource resource = fileStorageService.load(storageKey);
        try (InputStream inputStream = resource.getInputStream()) {
            return inputStream.readAllBytes();
        } catch (IOException exception) {
            throw new IllegalStateException("读取平台知识文件失败", exception);
        }
    }

    private KnowledgeAsset requireAsset(String assetId) {
        return assetRepository.findById(assetId)
                .orElseThrow(() -> new IllegalArgumentException("知识资料不存在"));
    }

    private void markPushConflict(String assetId) {
        transactions.executeWithoutResult(status -> assetRepository.findById(assetId).ifPresent(asset -> {
            asset.markLexiangPushConflict("乐享版本与平台基线不一致，未覆盖任一版本；请先回拉并处理冲突");
            assetRepository.saveAndFlush(asset);
        }));
    }

    private static String remoteName(KnowledgeAsset asset) {
        String source = asset.getName();
        String original = asset.getOriginalName();
        String extension = extensionOf(original);
        if (extension.isEmpty() || source.toLowerCase(Locale.ROOT).endsWith(extension)) return source;
        return source + extension;
    }

    private static LexiangEntryType entryType(String fileName) {
        return switch (extensionOf(fileName)) {
            case ".mp3", ".m4a", ".wav" -> LexiangEntryType.AUDIO;
            case ".mp4", ".mov" -> LexiangEntryType.VIDEO;
            case ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".csv", ".txt", ".md",
                    ".jpg", ".jpeg", ".png", ".gif", ".bmp" -> LexiangEntryType.FILE;
            default -> null;
        };
    }

    public static String extensionOf(String fileName) {
        if (fileName == null) return "";
        int separator = fileName.lastIndexOf('.');
        return separator < 0 ? "" : fileName.substring(separator).toLowerCase(Locale.ROOT);
    }

    private static String safeError(RuntimeException exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) return "乐享知识库同步失败";
        return message.replaceAll("(?i)(access[_-]?token|app[_-]?secret|authorization)\\s*[:=]\\s*\\S+", "$1=<redacted>");
    }

    private record SyncSnapshot(
            String storageKey,
            String remoteName,
            String sha256,
            String entryId,
            String syncedSha256,
            String syncedName,
            boolean enabled,
            LexiangEntryType entryType,
            String spaceId,
            String parentEntryId,
            String remoteUpdatedAt
    ) {
    }

    public static final class LexiangKnowledgeDeleteException extends RuntimeException {
        public LexiangKnowledgeDeleteException(String message) {
            super(message);
        }

        public LexiangKnowledgeDeleteException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
