package com.sufe.ai.knowledge.service;

import com.sufe.ai.knowledge.domain.LexiangSyncStatus;
import com.sufe.ai.knowledge.repository.KnowledgeAssetRepository;
import com.sufe.ai.provider.config.LexiangProperties;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class LexiangKnowledgeSyncScheduler {

    private final KnowledgeAssetRepository assetRepository;
    private final LexiangKnowledgeSyncService syncService;
    private final LexiangProperties properties;

    public LexiangKnowledgeSyncScheduler(
            KnowledgeAssetRepository assetRepository,
            LexiangKnowledgeSyncService syncService,
            LexiangProperties properties
    ) {
        this.assetRepository = assetRepository;
        this.syncService = syncService;
        this.properties = properties;
    }

    @Scheduled(fixedDelayString = "${sufe.providers.lexiang.knowledge-sync-delay-ms:5000}")
    public void synchronizePendingAssets() {
        List<LexiangSyncStatus> statuses = properties.knowledgeConfigured()
                ? List.of(LexiangSyncStatus.PENDING, LexiangSyncStatus.NOT_CONFIGURED)
                : List.of(LexiangSyncStatus.PENDING);
        assetRepository.findTop20ByLexiangSyncStatusInOrderByCreatedAtAsc(
                        statuses
                )
                .forEach(asset -> syncService.syncNow(asset.getId()));
    }
}
