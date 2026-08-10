package com.sufe.ai.knowledge.service;

import com.sufe.ai.knowledge.domain.KnowledgeAsset;
import com.sufe.ai.knowledge.domain.LexiangSyncStatus;
import com.sufe.ai.knowledge.repository.KnowledgeAssetRepository;
import com.sufe.ai.provider.config.LexiangProperties;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LexiangKnowledgeSyncSchedulerTests {

    private final KnowledgeAssetRepository assetRepository = mock(KnowledgeAssetRepository.class);
    private final LexiangKnowledgeSyncService syncService = mock(LexiangKnowledgeSyncService.class);
    private final LexiangProperties properties = mock(LexiangProperties.class);
    private final LexiangKnowledgeSyncScheduler scheduler = new LexiangKnowledgeSyncScheduler(
            assetRepository,
            syncService,
            properties
    );

    @Test
    void marksNewPendingAssetsWhenLexiangIsNotConfiguredWithoutRescanningNotConfiguredAssets() {
        KnowledgeAsset pendingAsset = mock(KnowledgeAsset.class);
        when(properties.knowledgeConfigured()).thenReturn(false);
        when(pendingAsset.getId()).thenReturn("asset-17");
        when(assetRepository.findTop20ByLexiangSyncStatusInOrderByCreatedAtAsc(
                List.of(LexiangSyncStatus.PENDING)
        )).thenReturn(List.of(pendingAsset));

        scheduler.synchronizePendingAssets();

        verify(syncService).syncNow("asset-17");
    }

    @Test
    void retriesPendingAndNotConfiguredAssetsAfterLexiangIsConfigured() {
        when(properties.knowledgeConfigured()).thenReturn(true);
        when(assetRepository.findTop20ByLexiangSyncStatusInOrderByCreatedAtAsc(
                List.of(LexiangSyncStatus.PENDING, LexiangSyncStatus.NOT_CONFIGURED)
        )).thenReturn(List.of());

        scheduler.synchronizePendingAssets();

        verify(assetRepository).findTop20ByLexiangSyncStatusInOrderByCreatedAtAsc(
                List.of(LexiangSyncStatus.PENDING, LexiangSyncStatus.NOT_CONFIGURED)
        );
    }
}
