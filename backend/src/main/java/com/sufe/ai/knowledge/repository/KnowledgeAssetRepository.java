package com.sufe.ai.knowledge.repository;

import com.sufe.ai.knowledge.domain.KnowledgeAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface KnowledgeAssetRepository extends JpaRepository<KnowledgeAsset, String> {

    List<KnowledgeAsset> findByKnowledgeBaseId(String knowledgeBaseId);

    Optional<KnowledgeAsset> findFirstByNameOrderByCreatedAtAsc(String name);

    long countByKnowledgeBaseId(String knowledgeBaseId);
}
