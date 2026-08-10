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
import com.sufe.ai.provider.lexiang.LexiangKnowledgeClient.LexiangEntryDetail;
import com.sufe.ai.storage.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.net.URI;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LexiangKnowledgeSyncServiceTests {

    private KnowledgeAssetRepository assetRepository;
    private KnowledgeBaseRepository baseRepository;
    private LexiangCourseMappingRepository mappingRepository;
    private FileStorageService fileStorageService;
    private LexiangKnowledgeClient client;
    private PlatformTransactionManager transactionManager;

    @BeforeEach
    void setUp() {
        assetRepository = mock(KnowledgeAssetRepository.class);
        baseRepository = mock(KnowledgeBaseRepository.class);
        mappingRepository = mock(LexiangCourseMappingRepository.class);
        fileStorageService = mock(FileStorageService.class);
        client = mock(LexiangKnowledgeClient.class);
        transactionManager = mock(PlatformTransactionManager.class);
        when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(assetRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void synchronizesOnlyCourseFilesAndPersistsRemoteIdentity() {
        KnowledgeBase base = KnowledgeBase.create("课程资料", "课程共享资料", "全部专家");
        KnowledgeAsset asset = courseAsset(base);
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(baseRepository.findById(base.getId())).thenReturn(Optional.of(base));
        when(mappingRepository.findByKnowledgeBaseIdAndEnabledTrue(base.getId()))
                .thenReturn(Optional.of(mapping(base)));
        when(fileStorageService.load("knowledge/course.pdf"))
                .thenReturn(new ByteArrayResource("content".getBytes()));
        when(client.createFile(anyString(), any(), any(), anyString(), anyString()))
                .thenReturn("entry-course-001");
        when(client.describeEntry("entry-course-001")).thenReturn(new LexiangEntryDetail(
                "entry-course-001",
                "课程资料.pdf",
                "file",
                "v1",
                false,
                "https://file.lexiang-asset.com/course.pdf"
        ));

        LexiangKnowledgeSyncService service = service(configuredProperties());
        KnowledgeAsset result = service.syncNow(asset.getId());

        assertThat(result.getLexiangSyncStatus()).isEqualTo(LexiangSyncStatus.SYNCED);
        assertThat(result.getLexiangEntryId()).isEqualTo("entry-course-001");
        assertThat(result.getLexiangSyncedSha256()).isEqualTo("sha-course");
        assertThat(result.getLexiangRemoteUpdatedAt()).isEqualTo("v1");
        verify(client).createFile(anyString(), any(), any(), anyString(), anyString());
        verify(client).setEnabled("entry-course-001", true);
    }

    @Test
    void keepsCourseFileLocallyWhenLexiangIsNotConfigured() {
        KnowledgeBase base = KnowledgeBase.create("课程资料", "课程共享资料", "全部专家");
        KnowledgeAsset asset = courseAsset(base);
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(baseRepository.findById(base.getId())).thenReturn(Optional.of(base));

        KnowledgeAsset result = service(disabledProperties()).syncNow(asset.getId());

        assertThat(result.getLexiangSyncStatus()).isEqualTo(LexiangSyncStatus.NOT_CONFIGURED);
        verify(client, never()).createFile(anyString(), any(), any(), anyString(), anyString());
    }

    @Test
    void neverSendsExpertPrivateKnowledgeToLexiang() {
        KnowledgeBase base = KnowledgeBase.createExpertPrivate("专家专属库", "Skill 资料", "专家", "expert-1");
        KnowledgeAsset asset = KnowledgeAsset.create(base.getId(), "专属资料.pdf", "1 KB", "PDF", "预览", "正文", "教师");
        asset.markExpertDirectUpload();
        asset.attachFile("knowledge/private.pdf", "专属资料.pdf", "application/pdf", 10, "sha-private");
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(baseRepository.findById(base.getId())).thenReturn(Optional.of(base));

        KnowledgeAsset result = service(configuredProperties()).syncNow(asset.getId());

        assertThat(result.getLexiangSyncStatus()).isEqualTo(LexiangSyncStatus.NOT_APPLICABLE);
        verify(client, never()).createFile(anyString(), any(), any(), anyString(), anyString());
    }

    @Test
    void keepsCourseFileLocalWhenNoExplicitDirectoryMappingExists() {
        KnowledgeBase base = KnowledgeBase.create("课程资料", "课程共享资料", "全部专家");
        KnowledgeAsset asset = courseAsset(base);
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(baseRepository.findById(base.getId())).thenReturn(Optional.of(base));

        KnowledgeAsset result = service(configuredProperties()).syncNow(asset.getId());

        assertThat(result.getLexiangSyncStatus()).isEqualTo(LexiangSyncStatus.NOT_CONFIGURED);
        assertThat(result.getLexiangSyncError()).contains("目录映射");
        verify(client, never()).createFile(anyString(), any(), any(), anyString(), anyString());
    }

    @Test
    void pushesLocallyEditedPulledFileWhenRemoteVersionIsUnchanged() {
        KnowledgeBase base = KnowledgeBase.create("课程资料", "课程共享资料", "全部专家");
        KnowledgeAsset asset = pulledAsset(base);
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(baseRepository.findById(base.getId())).thenReturn(Optional.of(base));
        when(mappingRepository.findByKnowledgeBaseIdAndEnabledTrue(base.getId()))
                .thenReturn(Optional.of(mapping(base)));
        when(fileStorageService.load("knowledge/new.txt"))
                .thenReturn(new ByteArrayResource("new content".getBytes()));
        when(client.describeEntry("entry-pulled-001"))
                .thenReturn(detail("v1"), detail("v2"));

        KnowledgeAsset result = service(configuredProperties()).syncNow(asset.getId());

        assertThat(result.getLexiangSyncStatus()).isEqualTo(LexiangSyncStatus.SYNCED);
        assertThat(result.getLexiangRemoteUpdatedAt()).isEqualTo("v2");
        verify(client).replaceFile(anyString(), anyString(), any(), any());
    }

    @Test
    void recordsConflictWhenBothPulledFileAndRemoteVersionChanged() {
        KnowledgeBase base = KnowledgeBase.create("课程资料", "课程共享资料", "全部专家");
        KnowledgeAsset asset = pulledAsset(base);
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(baseRepository.findById(base.getId())).thenReturn(Optional.of(base));
        when(mappingRepository.findByKnowledgeBaseIdAndEnabledTrue(base.getId()))
                .thenReturn(Optional.of(mapping(base)));
        when(client.describeEntry("entry-pulled-001")).thenReturn(detail("v2"));

        KnowledgeAsset result = service(configuredProperties()).syncNow(asset.getId());

        assertThat(result.getLexiangSyncStatus()).isEqualTo(LexiangSyncStatus.CONFLICT);
        verify(client, never()).replaceFile(anyString(), anyString(), any(), any());
    }

    @Test
    void recordsConflictWhenCourseUploadAndRemoteWereBothChanged() {
        KnowledgeBase base = KnowledgeBase.create("课程资料", "课程共享资料", "全部专家");
        KnowledgeAsset asset = courseAsset(base);
        asset.markLexiangSynced("entry-course-001", "v1");
        asset.attachFile("knowledge/course-new.pdf", "课程资料.pdf", "application/pdf", 11, "sha-course-new");
        asset.queueLexiangSync();
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(baseRepository.findById(base.getId())).thenReturn(Optional.of(base));
        when(mappingRepository.findByKnowledgeBaseIdAndEnabledTrue(base.getId()))
                .thenReturn(Optional.of(mapping(base)));
        when(client.describeEntry("entry-course-001")).thenReturn(new LexiangEntryDetail(
                "entry-course-001",
                "课程资料.pdf",
                "file",
                "v2",
                false,
                "https://file.lexiang-asset.com/course.pdf"
        ));

        KnowledgeAsset result = service(configuredProperties()).syncNow(asset.getId());

        assertThat(result.getLexiangSyncStatus()).isEqualTo(LexiangSyncStatus.CONFLICT);
        assertThat(result.getLexiangRemoteUpdatedAt()).isEqualTo("v1");
        verify(client, never()).replaceFile(anyString(), anyString(), any(), any());
    }

    private LexiangKnowledgeSyncService service(LexiangProperties properties) {
        return new LexiangKnowledgeSyncService(
                assetRepository,
                baseRepository,
                mappingRepository,
                fileStorageService,
                client,
                properties,
                transactionManager
        );
    }

    private static KnowledgeAsset courseAsset(KnowledgeBase base) {
        KnowledgeAsset asset = KnowledgeAsset.create(base.getId(), "课程资料", "1 KB", "PDF", "预览", "正文", "教师");
        asset.attachFile("knowledge/course.pdf", "课程资料.pdf", "application/pdf", 10, "sha-course");
        asset.queueLexiangSync();
        return asset;
    }

    private static LexiangCourseMapping mapping(KnowledgeBase base) {
        return LexiangCourseMapping.create(base.getId(), "space-course", "folder-course", true);
    }

    private static KnowledgeAsset pulledAsset(KnowledgeBase base) {
        KnowledgeAsset asset = KnowledgeAsset.create(base.getId(), "课程.txt", "1 KB", "TXT", "预览", "正文", "乐享");
        asset.applyLexiangPulledFile(
                "课程.txt", "1 KB", "TXT", "预览", "正文", "READY", "已提取",
                "knowledge/old.txt", "课程.txt", "text/plain", 10, "sha-old",
                "entry-pulled-001", "v1", "etag-v1", "run-previous", null, true
        );
        asset.attachFile("knowledge/new.txt", "课程.txt", "text/plain", 11, "sha-new");
        asset.queueLexiangSync();
        return asset;
    }

    private static LexiangEntryDetail detail(String remoteVersion) {
        return new LexiangEntryDetail(
                "entry-pulled-001",
                "课程.txt",
                "file",
                remoteVersion,
                false,
                "https://file.lexiang-asset.com/course.txt"
        );
    }

    private static LexiangProperties configuredProperties() {
        return new LexiangProperties(true, URI.create("https://mock.lexiang.invalid"), "key", "secret", "system-bot", "manager", "space", 1);
    }

    private static LexiangProperties disabledProperties() {
        return new LexiangProperties(false, URI.create("https://mock.lexiang.invalid"), "", "", "", "", "", 1);
    }
}
