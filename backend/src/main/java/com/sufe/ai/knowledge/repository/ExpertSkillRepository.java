package com.sufe.ai.knowledge.repository;

import com.sufe.ai.knowledge.domain.ExpertSkill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExpertSkillRepository extends JpaRepository<ExpertSkill, String> {

    List<ExpertSkill> findByExpertIdOrderByCreatedAtAsc(String expertId);

    void deleteByExpertIdAndStage(String expertId, String stage);

    void deleteByExpertId(String expertId);
}
