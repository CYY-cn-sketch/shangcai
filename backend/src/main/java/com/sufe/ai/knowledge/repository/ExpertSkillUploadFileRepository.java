package com.sufe.ai.knowledge.repository;

import com.sufe.ai.knowledge.domain.ExpertSkillUploadFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExpertSkillUploadFileRepository extends JpaRepository<ExpertSkillUploadFile, String> {

    List<ExpertSkillUploadFile> findByUploadIdOrderByRelativePathAsc(String uploadId);

    Optional<ExpertSkillUploadFile> findByImportedAssetId(String importedAssetId);
}
