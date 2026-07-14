package com.sufe.ai.artifact.repository;

import com.sufe.ai.artifact.domain.ArtifactRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ArtifactRecordRepository extends JpaRepository<ArtifactRecord, String> {
    List<ArtifactRecord> findAllByUserIdOrderByCreatedAtDesc(String userId);
    Optional<ArtifactRecord> findByIdAndUserId(String id, String userId);
    Optional<ArtifactRecord> findByUserIdAndSourceMessageId(String userId, String sourceMessageId);
}
