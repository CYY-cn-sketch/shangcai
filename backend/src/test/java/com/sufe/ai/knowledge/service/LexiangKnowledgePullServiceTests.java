package com.sufe.ai.knowledge.service;

import com.sufe.ai.knowledge.domain.KnowledgeAsset;
import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.domain.LexiangCourseMapping;
import com.sufe.ai.knowledge.domain.LexiangPullRun;
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
import com.sufe.ai.storage.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.dao.DataIntegrityViolationException;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

class LexiangKnowledgePullServiceTests {

    private KnowledgeAssetRepository assetRepository;
    private KnowledgeBaseRepository baseRepository;
    private LexiangCourseMappingRepository mappingRepository;
    private LexiangPullRunRepository runRepository;
    private LexiangPullLockRepository lockRepository;
    private LexiangKnowledgeClient client;
    private LexiangRemoteFileDownloader downloader;
    private FileStorageService fileStorageService;
    private DocumentTextExtractionService extractionService;
    private PlatformTransactionManager transactionManager;
    private final Map<String, KnowledgeAsset> assetsByEntry = new LinkedHashMap<>();
    private final List<LexiangPullRun> runs = new ArrayList<>();

    @BeforeEach
    void setUp() {
        assetRepository = mock(KnowledgeAssetRepository.class);
        baseRepository = mock(KnowledgeBaseRepository.class);
        mappingRepository = mock(LexiangCourseMappingRepository.class);
        runRepository = mock(LexiangPullRunRepository.class);
        lockRepository = mock(LexiangPullLockRepository.class);
        client = mock(LexiangKnowledgeClient.class);
        downloader = mock(LexiangRemoteFileDownloader.class);
        fileStorageService = mock(FileStorageService.class);
        extractionService = mock(DocumentTextExtractionService.class);
        transactionManager = mock(PlatformTransactionManager.class);

        when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(mappingRepository.existsByEnabledTrue()).thenReturn(true);
        when(assetRepository.findByLexiangEntryId(anyString()))
                .thenAnswer(invocation -> Optional.ofNullable(assetsByEntry.get(invocation.getArgument(0))));
        when(assetRepository.findById(anyString())).thenAnswer(invocation -> assetsByEntry.values().stream()
                .filter(asset -> asset.getId().equals(invocation.getArgument(0)))
                .findFirst());
        when(assetRepository.findByKnowledgeBaseIdAndLexiangEntryIdIsNotNull(anyString()))
                .thenAnswer(invocation -> assetsByEntry.values().stream()
                        .filter(asset -> asset.getKnowledgeBaseId().equals(invocation.getArgument(0)))
                        .toList());
        when(assetRepository.saveAndFlush(any())).thenAnswer(invocation -> {
            KnowledgeAsset asset = invocation.getArgument(0);
            if (asset.getLexiangEntryId() != null) assetsByEntry.put(asset.getLexiangEntryId(), asset);
            return asset;
        });
        when(runRepository.saveAndFlush(any())).thenAnswer(invocation -> {
            LexiangPullRun run = invocation.getArgument(0);
            runs.removeIf(existing -> existing.getId().equals(run.getId()));
            runs.add(run);
            return run;
        });
        when(runRepository.findById(anyString())).thenAnswer(invocation -> runs.stream()
                .filter(run -> run.getId().equals(invocation.getArgument(0)))
                .findFirst());
        when(runRepository.findFirstByOrderByStartedAtDesc()).thenAnswer(invocation -> runs.isEmpty()
                ? Optional.empty()
                : Optional.of(runs.get(runs.size() - 1)));
        when(lockRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void recursivelyPaginatesAndIsIdempotentByRemoteEntryId() throws Exception {
        KnowledgeBase base = KnowledgeBase.create("课程资料", "课程共享", "全部专家");
        LexiangCourseMapping mapping = mapping(base);
        when(mappingRepository.findAllByEnabledTrueOrderByKnowledgeBaseIdAsc()).thenReturn(List.of(mapping));
        when(baseRepository.findById(base.getId())).thenReturn(Optional.of(base));
        when(client.listEntries(anyString(), anyString(), any())).thenAnswer(invocation -> {
            String parent = invocation.getArgument(1);
            String token = invocation.getArgument(2);
            if (parent.equals("folder-root") && token == null) {
                return new LexiangEntryPage(List.of(file("entry-001", "第一课.txt")), "page-2");
            }
            if (parent.equals("folder-root")) {
                return new LexiangEntryPage(List.of(folder("folder-child")), null);
            }
            return new LexiangEntryPage(List.of(file("entry-002", "第二课.txt")), null);
        });
        when(client.describeEntry(anyString())).thenAnswer(invocation -> {
            String id = invocation.getArgument(0);
            return new LexiangEntryDetail(
                    id,
                    id.equals("entry-001") ? "第一课.txt" : "第二课.txt",
                    "file",
                    "v1",
                    false,
                    "https://file.lexiang-asset.com/" + id + ".txt"
            );
        });
        when(downloader.download(anyString(), anyString())).thenAnswer(invocation -> {
            String name = invocation.getArgument(1);
            return new DownloadedRemoteFile(name, "text/plain", "etag-v1", name.getBytes(StandardCharsets.UTF_8));
        });
        AtomicInteger storedSequence = new AtomicInteger();
        when(fileStorageService.storeKnowledgeFile(anyString(), any(byte[].class))).thenAnswer(invocation -> {
            String name = invocation.getArgument(0);
            byte[] content = invocation.getArgument(1);
            return new FileStorageService.StoredFile(
                    "knowledge/pull-" + storedSequence.incrementAndGet() + ".txt",
                    name,
                    "text/plain",
                    content.length,
                    "sha-" + storedSequence.get()
            );
        });
        when(fileStorageService.load(anyString())).thenReturn(new ByteArrayResource("正文".getBytes(StandardCharsets.UTF_8)));
        when(extractionService.extract(any(), anyString()))
                .thenReturn(new DocumentTextExtractionService.ExtractionResult("READY", "课程正文", "已提取"));

        var first = service().pullAll("teacher-1");
        var second = service().pullAll("teacher-1");

        assertThat(first.status()).isEqualTo("SUCCESS");
        assertThat(first.addedCount()).isEqualTo(2);
        assertThat(assetsByEntry).containsOnlyKeys("entry-001", "entry-002");
        assertThat(second.status()).isEqualTo("SUCCESS");
        assertThat(second.addedCount()).isZero();
        assertThat(second.updatedCount()).isZero();
        assertThat(storedSequence).hasValue(2);
        verify(client, times(2)).listEntries("space-course", "folder-root", "page-2");
        verify(client, times(2)).listEntries("space-course", "folder-child", null);
    }

    @Test
    void doesNotMarkRemoteMissingWhenListScanFails() {
        KnowledgeBase base = KnowledgeBase.create("课程资料", "课程共享", "全部专家");
        LexiangCourseMapping mapping = mapping(base);
        KnowledgeAsset existing = existingSyncedAsset(base, "entry-missing");
        assetsByEntry.put(existing.getLexiangEntryId(), existing);
        when(mappingRepository.findAllByEnabledTrueOrderByKnowledgeBaseIdAsc()).thenReturn(List.of(mapping));
        when(baseRepository.findById(base.getId())).thenReturn(Optional.of(base));
        when(client.listEntries("space-course", "folder-root", null))
                .thenThrow(new IllegalStateException("temporary list failure"));

        var result = service().pullAll("teacher-1");

        assertThat(result.status()).isEqualTo("FAILED");
        assertThat(result.failedCount()).isEqualTo(1);
        assertThat(existing.getLexiangSyncStatus()).isEqualTo(LexiangSyncStatus.SYNCED);
        verify(assetRepository, never()).findByKnowledgeBaseIdAndLexiangEntryIdIsNotNull(base.getId());
    }

    @Test
    void preservesLocalChangeAndRecordsConflict() {
        KnowledgeBase base = KnowledgeBase.create("课程资料", "课程共享", "全部专家");
        LexiangCourseMapping mapping = mapping(base);
        KnowledgeAsset existing = existingPulledAsset(base, "entry-001");
        existing.update("平台已修改", "1 KB", "TXT", "预览", "正文", true);
        existing.queueLexiangSync();
        assetsByEntry.put(existing.getLexiangEntryId(), existing);
        when(mappingRepository.findAllByEnabledTrueOrderByKnowledgeBaseIdAsc()).thenReturn(List.of(mapping));
        when(baseRepository.findById(base.getId())).thenReturn(Optional.of(base));
        when(client.listEntries("space-course", "folder-root", null))
                .thenReturn(new LexiangEntryPage(List.of(file("entry-001", "第一课.txt")), null));

        var result = service().pullAll("teacher-1");

        assertThat(result.conflictCount()).isZero();
        assertThat(existing.getName()).isEqualTo("平台已修改");
        assertThat(existing.getLexiangSyncStatus()).isEqualTo(LexiangSyncStatus.PENDING);
        verify(client, never()).describeEntry(anyString());
    }

    @Test
    void skipsVendorCallsWhenAnotherInstanceOwnsDatabaseLease() {
        when(lockRepository.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("duplicate lock"));

        var result = service().pullAll("teacher-1");

        assertThat(result.status()).isEqualTo("RUNNING");
        verify(client, never()).listEntries(anyString(), anyString(), any());
    }

    @Test
    void reportsNotConfiguredWithoutAnEnabledMappingAndDoesNotAcquireLock() {
        when(mappingRepository.existsByEnabledTrue()).thenReturn(false);

        var result = service().pullAll("teacher-1");

        assertThat(result.configured()).isFalse();
        assertThat(result.status()).isEqualTo("NOT_CONFIGURED");
        verify(lockRepository, never()).saveAndFlush(any());
        verify(client, never()).listEntries(anyString(), anyString(), any());
    }

    @Test
    void movedEntryIsSeenAsConflictInsteadOfMissingFromOriginalMapping() {
        KnowledgeBase originalBase = KnowledgeBase.create("原课程库", "课程共享", "全部专家");
        KnowledgeBase newBase = KnowledgeBase.create("新课程库", "课程共享", "全部专家");
        LexiangCourseMapping newMapping = LexiangCourseMapping.create(
                newBase.getId(), "space-course", "folder-new", true
        );
        LexiangCourseMapping originalMapping = LexiangCourseMapping.create(
                originalBase.getId(), "space-course", "folder-original", true
        );
        KnowledgeAsset existing = existingPulledAsset(originalBase, "entry-001");
        assetsByEntry.put(existing.getLexiangEntryId(), existing);
        when(mappingRepository.findAllByEnabledTrueOrderByKnowledgeBaseIdAsc())
                .thenReturn(List.of(newMapping, originalMapping));
        when(baseRepository.findById(newBase.getId())).thenReturn(Optional.of(newBase));
        when(baseRepository.findById(originalBase.getId())).thenReturn(Optional.of(originalBase));
        when(client.listEntries("space-course", "folder-new", null))
                .thenReturn(new LexiangEntryPage(List.of(file("entry-001", "第一课.txt")), null));
        when(client.listEntries("space-course", "folder-original", null))
                .thenReturn(new LexiangEntryPage(List.of(), null));

        var result = service().pullAll("teacher-1");

        assertThat(result.conflictCount()).isEqualTo(1);
        assertThat(result.missingCount()).isZero();
        assertThat(existing.getLexiangSyncStatus()).isEqualTo(LexiangSyncStatus.CONFLICT);
        assertThat(existing.getLexiangLastSeenRunId()).isNotBlank();
    }

    @Test
    void enabledOnlyChangeRemainsPendingWhenRemoteVersionIsUnchanged() {
        KnowledgeBase base = KnowledgeBase.create("课程资料", "课程共享", "全部专家");
        LexiangCourseMapping mapping = mapping(base);
        KnowledgeAsset existing = existingPulledAsset(base, "entry-001");
        existing.setEnabled(false);
        existing.queueLexiangSync();
        assetsByEntry.put(existing.getLexiangEntryId(), existing);
        when(mappingRepository.findAllByEnabledTrueOrderByKnowledgeBaseIdAsc()).thenReturn(List.of(mapping));
        when(baseRepository.findById(base.getId())).thenReturn(Optional.of(base));
        when(client.listEntries("space-course", "folder-root", null))
                .thenReturn(new LexiangEntryPage(List.of(file("entry-001", "第一课.txt")), null));

        var result = service().pullAll("teacher-1");

        assertThat(result.conflictCount()).isZero();
        assertThat(existing.getLexiangSyncStatus()).isEqualTo(LexiangSyncStatus.PENDING);
        assertThat(existing.isEnabled()).isFalse();
        verify(client, never()).describeEntry(anyString());
    }

    private LexiangKnowledgePullService service() {
        return new LexiangKnowledgePullService(
                assetRepository,
                baseRepository,
                mappingRepository,
                runRepository,
                lockRepository,
                client,
                downloader,
                fileStorageService,
                extractionService,
                configuredProperties(),
                transactionManager
        );
    }

    private static LexiangCourseMapping mapping(KnowledgeBase base) {
        return LexiangCourseMapping.create(base.getId(), "space-course", "folder-root", true);
    }

    private static LexiangEntrySummary file(String id, String name) {
        return new LexiangEntrySummary(id, name, "file", "v1", false);
    }

    private static LexiangEntrySummary folder(String id) {
        return new LexiangEntrySummary(id, "章节", "folder", "v1", true);
    }

    private static KnowledgeAsset existingSyncedAsset(KnowledgeBase base, String entryId) {
        KnowledgeAsset asset = KnowledgeAsset.create(base.getId(), "第一课.txt", "1 KB", "TXT", "预览", "正文", "教师");
        asset.attachFile("knowledge/existing.txt", "第一课.txt", "text/plain", 10, "sha-existing");
        asset.queueLexiangSync();
        asset.markLexiangSynced(entryId);
        return asset;
    }

    private static KnowledgeAsset existingPulledAsset(KnowledgeBase base, String entryId) {
        KnowledgeAsset asset = KnowledgeAsset.create(base.getId(), "第一课.txt", "1 KB", "TXT", "预览", "正文", "乐享");
        asset.applyLexiangPulledFile(
                "第一课.txt",
                "1 KB",
                "TXT",
                "预览",
                "正文",
                "READY",
                "已提取",
                "knowledge/pulled.txt",
                "第一课.txt",
                "text/plain",
                10,
                "sha-pulled",
                entryId,
                "v1",
                "etag-v1",
                "run-existing",
                null,
                true
        );
        return asset;
    }

    private static LexiangProperties configuredProperties() {
        return new LexiangProperties(
                true,
                URI.create("https://mock.lexiang.invalid"),
                "key",
                "secret",
                "system-bot",
                "knowledge-manager",
                "",
                1
        );
    }
}
