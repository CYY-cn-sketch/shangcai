package com.sufe.ai.knowledge.repository;

import com.sufe.ai.knowledge.domain.ExpertSkillUploadRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExpertSkillUploadRepository extends JpaRepository<ExpertSkillUploadRecord, String> {

    List<ExpertSkillUploadRecord> findAllByOrderByCreatedAtDesc();
}
