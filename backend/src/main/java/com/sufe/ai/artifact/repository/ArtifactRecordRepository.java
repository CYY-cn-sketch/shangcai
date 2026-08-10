package com.sufe.ai.artifact.repository;

import com.sufe.ai.artifact.domain.ArtifactRecord;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ArtifactRecordRepository extends JpaRepository<ArtifactRecord, String> {
    List<ArtifactRecord> findAllByUserIdOrderByCreatedAtDesc(String userId);
    Optional<ArtifactRecord> findByIdAndUserId(String id, String userId);
    Optional<ArtifactRecord> findByUserIdAndSourceMessageId(String userId, String sourceMessageId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select artifact from ArtifactRecord artifact where artifact.id = :id and artifact.userId = :userId")
    Optional<ArtifactRecord> findOwnedByIdForUpdate(@Param("id") String id, @Param("userId") String userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select artifact from ArtifactRecord artifact where artifact.id = :id")
    Optional<ArtifactRecord> findByIdForUpdate(@Param("id") String id);
}
