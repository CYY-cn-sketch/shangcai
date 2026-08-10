package com.sufe.ai.knowledge.repository;

import com.sufe.ai.knowledge.domain.KnowledgeAsset;
import com.sufe.ai.knowledge.domain.LexiangSyncStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface KnowledgeAssetRepository extends JpaRepository<KnowledgeAsset, String> {

    List<KnowledgeAsset> findByKnowledgeBaseId(String knowledgeBaseId);

    Optional<KnowledgeAsset> findFirstByNameOrderByCreatedAtAsc(String name);

    Optional<KnowledgeAsset> findFirstByKnowledgeBaseIdAndNameOrderByCreatedAtAsc(String knowledgeBaseId, String name);

    Optional<KnowledgeAsset> findByLexiangEntryId(String lexiangEntryId);

    long countByKnowledgeBaseId(String knowledgeBaseId);

    List<KnowledgeAsset> findTop20ByLexiangSyncStatusInOrderByCreatedAtAsc(List<LexiangSyncStatus> statuses);

    List<KnowledgeAsset> findByKnowledgeBaseIdAndLexiangEntryIdIsNotNull(String knowledgeBaseId);

    boolean existsByKnowledgeBaseIdAndLexiangEntryIdIsNotNull(String knowledgeBaseId);
}
