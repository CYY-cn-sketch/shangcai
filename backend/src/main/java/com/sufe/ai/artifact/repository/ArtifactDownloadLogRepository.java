package com.sufe.ai.artifact.repository;

import com.sufe.ai.artifact.domain.ArtifactDownloadLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ArtifactDownloadLogRepository extends JpaRepository<ArtifactDownloadLog, String> {
    long countByArtifactId(String artifactId);
}
