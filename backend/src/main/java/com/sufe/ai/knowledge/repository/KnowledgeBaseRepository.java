package com.sufe.ai.knowledge.repository;

import com.sufe.ai.knowledge.domain.KnowledgeBase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface KnowledgeBaseRepository extends JpaRepository<KnowledgeBase, String> {

    Optional<KnowledgeBase> findByCategory(String category);
}
