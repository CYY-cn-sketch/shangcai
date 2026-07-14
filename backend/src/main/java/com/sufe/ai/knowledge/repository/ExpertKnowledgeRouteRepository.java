package com.sufe.ai.knowledge.repository;

import com.sufe.ai.knowledge.domain.ExpertKnowledgeRoute;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExpertKnowledgeRouteRepository extends JpaRepository<ExpertKnowledgeRoute, String> {

    List<ExpertKnowledgeRoute> findByExpertId(String expertId);

    void deleteByExpertId(String expertId);

    void deleteByCategory(String category);
}
