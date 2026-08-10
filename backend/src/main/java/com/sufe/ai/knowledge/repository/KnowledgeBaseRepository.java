package com.sufe.ai.knowledge.repository;

import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.domain.KnowledgeBaseScope;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface KnowledgeBaseRepository extends JpaRepository<KnowledgeBase, String> {

    Optional<KnowledgeBase> findByCategory(String category);

    Optional<KnowledgeBase> findByOwnerExpertIdAndScopeType(String ownerExpertId, KnowledgeBaseScope scopeType);

    List<KnowledgeBase> findByScopeTypeOrderByCategoryAsc(KnowledgeBaseScope scopeType);
}
