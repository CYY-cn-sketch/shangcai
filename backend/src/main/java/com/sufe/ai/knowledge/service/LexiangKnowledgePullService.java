package com.sufe.ai.knowledge.service;

import com.sufe.ai.knowledge.domain.KnowledgeAsset;
import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.domain.LexiangCourseMapping;
import com.sufe.ai.knowledge.domain.LexiangPullRun;
import com.sufe.ai.knowledge.domain.LexiangPullLock;
import com.sufe.ai.knowledge.domain.LexiangPullRunStatus;
import com.sufe.ai.knowledge.domain.LexiangSyncStatus;
import com.sufe.ai.knowledge.repository.KnowledgeAssetRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import com.sufe.ai.knowledge.repository.LexiangCourseMappingRepository;
import com.sufe.ai.knowledge.repository.LexiangPullRunRepository;
import com.sufe.ai.knowledge.repository.LexiangPullLockRepository;
import com.sufe.ai.provider.config.LexiangProperties;
import com.sufe.ai.provider.lexiang.LexiangKnowledgeClient;
import com.sufe.ai.provider.lexiang.LexiangKnowledgeClient.LexiangEntryDetail;
import com.sufe.ai.provider.lexiang.LexiangKnowledgeClient.LexiangEntryPage;
import com.sufe.ai.provider.lexiang.LexiangKnowledgeClient.LexiangEntrySummary;
import com.sufe.ai.provider.lexiang.LexiangRemoteFileDownloader;
import com.sufe.ai.provider.lexiang.LexiangRemoteFileDownloader.DownloadedRemoteFile;
import com.sufe.ai.storage.DocumentTextExtractionService;
import com.sufe.ai.storage.DocumentTextExtractionService.ExtractionResult;
import com.sufe.ai.storage.FileStorageService;
import com.sufe.ai.storage.FileStorageService.StoredFile;
import org.springframework.stereotype.Service;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.time.Duration;
import java.util.UUID;

@Service
public class LexiangKnowledgePullService {

    private static final int MAX_ENTRIES_PER_MAPPING = 10_000;
    private static final String PULL_LOCK_KEY = "course-knowledge-pull";
    private static final Duration PULL_LOCK_TTL = Duration.ofHours(2);

    private final KnowledgeAssetRepository assetRepository;
    private final KnowledgeBaseRepository baseRepository;
    private final LexiangCourseMappingRepository mappingRepository;
    private final LexiangPullRunRepository runRepository;
    private final LexiangPullLockRepository lockRepository;
    private final LexiangKnowledgeClient client;
    private final LexiangRemoteFileDownloader downloader;
    private final FileStorageService fileStorageService;
    private final DocumentTextExtractionService extractionService;
    private final LexiangProperties properties;
    private final TransactionTemplate transactions;
    private final AtomicBoolean running = new AtomicBoolean();

    public LexiangKnowledgePullService(
            KnowledgeAssetRepository assetRepository,
            KnowledgeBaseRepository baseRepository,
            LexiangCourseMappingRepository mappingRepository,
            LexiangPullRunRepository runRepository,
            LexiangPullLockRepository lockRepository,
            LexiangKnowledgeClient client,
            LexiangRemoteFileDownloader downloader,
            FileStorageService fileStorageService,
            DocumentTextExtractionService extractionService,
            LexiangProperties properties,
            PlatformTransactionManager transactionManager
    ) {
        this.assetRepository = assetRepository;
        this.baseRepository = baseRepository;
        this.mappingRepository = mappingRepository;
        this.runRepository = runRepository;
        this.lockRepository = lockRepository;
        this.client = client;
        this.downloader = downloader;
        this.fileStorageService = fileStorageService;
        this.extractionService = extractionService;
        this.properties = properties;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    public boolean configured() {
        return properties.knowledgeConfigured() && mappingRepository.existsByEnabledTrue();
    }

    public PullSummary pullAll(String triggeredBy) {
        if (!configured()) return PullSummary.notConfigured();
        if (!running.compareAndSet(false, true)) {
            return latestSummary().orElseGet(PullSummary::running);
        }
        String lockOwner = UUID.randomUUID().toString();
        if (!acquireDatabaseLock(lockOwner)) {
            running.set(false);
            return latestSummary().orElseGet(PullSummary::running);
        }
        try {
            LexiangPullRun run = transactions.execute(status ->
                    runRepository.saveAndFlush(LexiangPullRun.start(triggeredBy))
            );
            if (run == null) throw new IllegalStateException("无法创建乐享知识回拉记录");
            Counters counters = new Counters();
            try {
            List<LexiangCourseMapping> mappings = mappingRepository.findAllByEnabledTrueOrderByKnowledgeBaseIdAsc();
            for (LexiangCourseMapping mapping : mappings) {
                KnowledgeBase base = baseRepository.findById(mapping.getKnowledgeBaseId()).orElse(null);
                if (base == null || !base.isCourseShared()) {
                    counters.failed++;
                    continue;
                }
                boolean complete = scanMapping(mapping, run.getId(), counters);
                if (complete) markRemoteMissing(mapping.getKnowledgeBaseId(), run.getId(), counters);
            }
            LexiangPullRunStatus status = counters.failed == 0
                    ? LexiangPullRunStatus.SUCCESS
                    : counters.hasProgress() ? LexiangPullRunStatus.PARTIAL : LexiangPullRunStatus.FAILED;
            completeRun(run.getId(), status, counters, resultMessage(status, counters));
            } catch (RuntimeException exception) {
                counters.failed++;
                completeRun(run.getId(), LexiangPullRunStatus.FAILED, counters, safeError(exception));
            }
            return latestSummary().orElseThrow(() -> new IllegalStateException("乐享知识回拉记录不存在"));
        } finally {
            releaseDatabaseLock(lockOwner);
            running.set(false);
        }
    }

    public Optional<PullSummary> latestSummary() {
        return runRepository.findFirstByOrderByStartedAtDesc().map(run -> PullSummary.from(run, configured()));
    }

    public PullSummary latestOrInitial() {
        return latestSummary().orElseGet(() -> configured() ? PullSummary.neverRun() : PullSummary.notConfigured());
    }

    private boolean acquireDatabaseLock(String ownerId) {
        Instant now = Instant.now();
        try {
            Boolean acquired = transactions.execute(status -> {
                lockRepository.deleteExpired(PULL_LOCK_KEY, now);
                lockRepository.saveAndFlush(LexiangPullLock.acquire(
                        PULL_LOCK_KEY,
                        ownerId,
                        now,
                        now.plus(PULL_LOCK_TTL)
                ));
                return true;
            });
            return Boolean.TRUE.equals(acquired);
        } catch (DataIntegrityViolationException exception) {
            return false;
        }
    }

    private void releaseDatabaseLock(String ownerId) {
        try {
            transactions.executeWithoutResult(status -> lockRepository.deleteOwned(PULL_LOCK_KEY, ownerId));
        } catch (RuntimeException ignored) {
            // 锁有两小时租期；进程或数据库异常时由后续实例清理过期锁。
        }
    }

    private boolean scanMapping(LexiangCourseMapping mapping, String runId, Counters counters) {
        ArrayDeque<String> folders = new ArrayDeque<>();
        Set<String> visitedFolders = new HashSet<>();
        folders.add(mapping.getParentEntryId());
        int scanned = 0;
        try {
            while (!folders.isEmpty()) {
                String parentId = folders.removeFirst();
                if (!visitedFolders.add(parentId)) continue;
                String pageToken = null;
                Set<String> pageTokens = new HashSet<>();
                do {
                    LexiangEntryPage page = client.listEntries(mapping.getSpaceId(), parentId, pageToken);
                    for (LexiangEntrySummary entry : page.entries()) {
                        if (++scanned > MAX_ENTRIES_PER_MAPPING) {
                            throw new IllegalStateException("单个乐享目录超过安全扫描上限 10000 个节点");
                        }
                        if (entry.isFolder() && entry.hasChildren()) {
                            folders.addLast(entry.id());
                        } else if (entry.isFile()) {
                            counters.seen++;
                            pullEntry(mapping, entry, runId, counters);
                        }
                    }
                    String next = page.nextPageToken();
                    if (next != null && !pageTokens.add(next)) {
                        throw new IllegalStateException("乐享知识列表返回重复 page_token");
                    }
                    pageToken = next;
                } while (pageToken != null);
            }
            return true;
        } catch (RuntimeException exception) {
            counters.failed++;
            return false;
        }
    }

    private void pullEntry(
            LexiangCourseMapping mapping,
            LexiangEntrySummary summary,
            String runId,
            Counters counters
    ) {
        Instant seenAt = Instant.now();
        StoredFile pendingStoredFile = null;
        try {
            Optional<KnowledgeAsset> existing = assetRepository.findByLexiangEntryId(summary.id());
            if (existing.isPresent() && !existing.get().getKnowledgeBaseId().equals(mapping.getKnowledgeBaseId())) {
                markConflict(
                        existing.get().getId(),
                        summary.remoteUpdatedAt(),
                        runId,
                        seenAt,
                        "同一乐享知识节点出现在另一课程映射，未自动移动平台资料"
                );
                counters.conflict++;
                return;
            }
            boolean localPushPending = existing.isPresent()
                    && (existing.get().hasLocalLexiangConflict()
                    || existing.get().getLexiangSyncStatus() == LexiangSyncStatus.PENDING
                    || existing.get().getLexiangSyncStatus() == LexiangSyncStatus.SYNCING);
            if (localPushPending) {
                boolean remoteUnchanged = summary.remoteUpdatedAt() != null
                        && Objects.equals(summary.remoteUpdatedAt(), existing.get().getLexiangRemoteUpdatedAt());
                if (remoteUnchanged) {
                    markSeenKeepingStatus(existing.get().getId(), summary.remoteUpdatedAt(), runId, seenAt);
                } else {
                    markConflict(
                            existing.get().getId(),
                            summary.remoteUpdatedAt(),
                            runId,
                            seenAt,
                            "平台与乐享文件均有变更，未覆盖任一版本"
                    );
                    counters.conflict++;
                }
                return;
            }
            if (existing.isPresent()
                    && summary.remoteUpdatedAt() != null
                    && Objects.equals(summary.remoteUpdatedAt(), existing.get().getLexiangRemoteUpdatedAt())) {
                markSeen(existing.get().getId(), summary.remoteUpdatedAt(), runId, seenAt);
                return;
            }

            LexiangEntryDetail detail = client.describeEntry(summary.id());
            if (!detail.isFile() || !detail.id().equals(summary.id()) || detail.downloadUrl() == null) {
                throw new IllegalStateException("乐享知识详情缺少有效文件下载地址");
            }
            DownloadedRemoteFile remoteFile = downloader.download(detail.downloadUrl(), detail.name());
            StoredFile stored = fileStorageService.storeKnowledgeFile(remoteFile.fileName(), remoteFile.content());
            pendingStoredFile = stored;
            ExtractionResult extraction = extractionService.extract(
                    fileStorageService.load(stored.storageKey()),
                    stored.originalName()
            );
            ApplyOutcome outcome = applyDownloaded(
                    mapping,
                    detail,
                    remoteFile,
                    stored,
                    extraction,
                    runId,
                    seenAt
            );
            if (!outcome.usedStoredFile()) fileStorageService.delete(stored.storageKey());
            pendingStoredFile = null;
            if (outcome.oldStorageKey() != null) fileStorageService.delete(outcome.oldStorageKey());
            if (outcome.result() == PullEntryResult.ADDED) counters.added++;
            if (outcome.result() == PullEntryResult.UPDATED) counters.updated++;
            if (outcome.result() == PullEntryResult.CONFLICT) counters.conflict++;
        } catch (RuntimeException | IOException exception) {
            if (pendingStoredFile != null) fileStorageService.delete(pendingStoredFile.storageKey());
            assetRepository.findByLexiangEntryId(summary.id())
                    .filter(asset -> asset.getKnowledgeBaseId().equals(mapping.getKnowledgeBaseId()))
                    .ifPresent(asset -> markFailed(asset.getId(), runId, seenAt, safeError(exception)));
            counters.failed++;
        }
    }

    private ApplyOutcome applyDownloaded(
            LexiangCourseMapping mapping,
            LexiangEntryDetail detail,
            DownloadedRemoteFile remoteFile,
            StoredFile stored,
            ExtractionResult extraction,
            String runId,
            Instant seenAt
    ) {
        return transactions.execute(status -> {
            KnowledgeAsset asset = assetRepository.findByLexiangEntryId(detail.id()).orElse(null);
            if (asset != null && !asset.getKnowledgeBaseId().equals(mapping.getKnowledgeBaseId())) {
                return new ApplyOutcome(PullEntryResult.CONFLICT, false, null);
            }
            if (asset != null && asset.hasLocalLexiangConflict()) {
                asset.markLexiangConflict(detail.remoteUpdatedAt(), runId, seenAt, "平台文件已有本地修改，未覆盖乐享回拉版本");
                assetRepository.saveAndFlush(asset);
                return new ApplyOutcome(PullEntryResult.CONFLICT, false, null);
            }

            boolean imported = asset == null;
            String oldStorageKey = imported ? null : asset.getStorageKey();
            if (imported) {
                asset = KnowledgeAsset.create(
                        mapping.getKnowledgeBaseId(),
                        remoteFile.fileName(),
                        formatFileSize(stored.size()),
                        displayFileType(remoteFile.fileName()),
                        preview(extraction),
                        extraction.contentText(),
                        "腾讯乐享回拉"
                );
            }
            asset.applyLexiangPulledFile(
                    remoteFile.fileName(),
                    formatFileSize(stored.size()),
                    displayFileType(remoteFile.fileName()),
                    preview(extraction),
                    extraction.contentText(),
                    extraction.status(),
                    extraction.message(),
                    stored.storageKey(),
                    stored.originalName(),
                    stored.mimeType(),
                    stored.size(),
                    stored.sha256(),
                    detail.id(),
                    detail.remoteUpdatedAt(),
                    remoteFile.etag(),
                    runId,
                    seenAt,
                    imported
            );
            assetRepository.saveAndFlush(asset);
            return new ApplyOutcome(
                    imported ? PullEntryResult.ADDED : PullEntryResult.UPDATED,
                    true,
                    Objects.equals(oldStorageKey, stored.storageKey()) ? null : oldStorageKey
            );
        });
    }

    private void markSeen(String assetId, String remoteUpdatedAt, String runId, Instant seenAt) {
        transactions.executeWithoutResult(status -> assetRepository.findById(assetId).ifPresent(asset -> {
            asset.markLexiangSeen(remoteUpdatedAt, runId, seenAt);
            assetRepository.saveAndFlush(asset);
        }));
    }

    private void markConflict(
            String assetId,
            String remoteUpdatedAt,
            String runId,
            Instant seenAt,
            String message
    ) {
        transactions.executeWithoutResult(status -> assetRepository.findById(assetId).ifPresent(asset -> {
            asset.markLexiangConflict(remoteUpdatedAt, runId, seenAt, message);
            assetRepository.saveAndFlush(asset);
        }));
    }

    private void markSeenKeepingStatus(String assetId, String remoteUpdatedAt, String runId, Instant seenAt) {
        transactions.executeWithoutResult(status -> assetRepository.findById(assetId).ifPresent(asset -> {
            asset.markLexiangSeenKeepingStatus(remoteUpdatedAt, runId, seenAt);
            assetRepository.saveAndFlush(asset);
        }));
    }

    private void markFailed(String assetId, String runId, Instant seenAt, String message) {
        transactions.executeWithoutResult(status -> assetRepository.findById(assetId).ifPresent(asset -> {
            asset.markLexiangPullFailed(runId, seenAt, message);
            assetRepository.saveAndFlush(asset);
        }));
    }

    private void markRemoteMissing(String baseId, String runId, Counters counters) {
        transactions.executeWithoutResult(status -> {
            for (KnowledgeAsset asset : assetRepository.findByKnowledgeBaseIdAndLexiangEntryIdIsNotNull(baseId)) {
                if (runId.equals(asset.getLexiangLastSeenRunId())) continue;
                asset.markLexiangRemoteMissing("完整扫描未发现对应乐享知识节点，平台文件已保留");
                assetRepository.save(asset);
                counters.missing++;
            }
            assetRepository.flush();
        });
    }

    private void completeRun(String runId, LexiangPullRunStatus status, Counters counters, String message) {
        transactions.executeWithoutResult(transactionStatus -> {
            LexiangPullRun run = runRepository.findById(runId)
                    .orElseThrow(() -> new IllegalStateException("乐享知识回拉记录不存在"));
            run.complete(
                    status,
                    counters.seen,
                    counters.added,
                    counters.updated,
                    counters.missing,
                    counters.conflict,
                    counters.failed,
                    message
            );
            runRepository.saveAndFlush(run);
        });
    }

    private static String preview(ExtractionResult extraction) {
        String content = extraction.contentText();
        if (content != null && !content.isBlank()) {
            String normalized = content.replaceAll("\\s+", " ").trim();
            return normalized.length() <= 300 ? normalized : normalized.substring(0, 300) + "…";
        }
        String message = extraction.message();
        return message == null || message.isBlank() ? "乐享知识文件已回拉" : message;
    }

    private static String formatFileSize(long size) {
        if (size < 1024) return size + " B";
        if (size < 1024 * 1024) return String.format(Locale.ROOT, "%.1f KB", size / 1024.0);
        return String.format(Locale.ROOT, "%.1f MB", size / (1024.0 * 1024.0));
    }

    private static String displayFileType(String name) {
        int separator = name.lastIndexOf('.');
        return separator < 0 || separator == name.length() - 1
                ? "文件"
                : name.substring(separator + 1).toUpperCase(Locale.ROOT);
    }

    private static String resultMessage(LexiangPullRunStatus status, Counters counters) {
        return "乐享课程知识回拉" + (status == LexiangPullRunStatus.SUCCESS ? "完成" : "部分完成")
                + "：新增 " + counters.added
                + "，更新 " + counters.updated
                + "，缺失 " + counters.missing
                + "，冲突 " + counters.conflict
                + "，失败 " + counters.failed;
    }

    private static String safeError(Throwable exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) return "乐享课程知识回拉失败";
        String redacted = message.replaceAll(
                "(?i)(access[_-]?token|app[_-]?secret|authorization)\\s*[:=]\\s*\\S+",
                "$1=<redacted>"
        );
        return redacted.length() <= 500 ? redacted : redacted.substring(0, 500);
    }

    private enum PullEntryResult { ADDED, UPDATED, CONFLICT }

    private record ApplyOutcome(PullEntryResult result, boolean usedStoredFile, String oldStorageKey) {}

    private static final class Counters {
        private int seen;
        private int added;
        private int updated;
        private int missing;
        private int conflict;
        private int failed;

        private boolean hasProgress() {
            return seen > 0 || added > 0 || updated > 0 || missing > 0 || conflict > 0;
        }
    }

    public record PullSummary(
            boolean configured,
            String status,
            Instant startedAt,
            Instant completedAt,
            int addedCount,
            int updatedCount,
            int missingCount,
            int conflictCount,
            int failedCount,
            String message
    ) {
        static PullSummary from(LexiangPullRun run, boolean configured) {
            return new PullSummary(
                    configured,
                    run.getStatus().name(),
                    run.getStartedAt(),
                    run.getCompletedAt(),
                    run.getAddedCount(),
                    run.getUpdatedCount(),
                    run.getMissingCount(),
                    run.getConflictCount(),
                    run.getFailedCount(),
                    run.getMessage()
            );
        }

        static PullSummary notConfigured() {
            return new PullSummary(
                    false,
                    "NOT_CONFIGURED",
                    null,
                    null,
                    0,
                    0,
                    0,
                    0,
                    0,
                    "乐享凭据未配置，或没有启用的课程知识库目录映射"
            );
        }

        static PullSummary running() {
            return new PullSummary(true, "RUNNING", null, null, 0, 0, 0, 0, 0, "乐享课程知识回拉正在执行");
        }

        static PullSummary neverRun() {
            return new PullSummary(true, "NEVER_RUN", null, null, 0, 0, 0, 0, 0, "尚未执行乐享课程知识回拉");
        }
    }
}
