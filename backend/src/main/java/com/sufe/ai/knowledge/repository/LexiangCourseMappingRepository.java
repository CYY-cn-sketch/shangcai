package com.sufe.ai.knowledge.repository;

import com.sufe.ai.knowledge.domain.LexiangCourseMapping;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LexiangCourseMappingRepository extends JpaRepository<LexiangCourseMapping, String> {
    Optional<LexiangCourseMapping> findByKnowledgeBaseId(String knowledgeBaseId);
    Optional<LexiangCourseMapping> findByKnowledgeBaseIdAndEnabledTrue(String knowledgeBaseId);
    List<LexiangCourseMapping> findAllByOrderByKnowledgeBaseIdAsc();
    List<LexiangCourseMapping> findAllByEnabledTrueOrderByKnowledgeBaseIdAsc();
    boolean existsByEnabledTrue();
}
