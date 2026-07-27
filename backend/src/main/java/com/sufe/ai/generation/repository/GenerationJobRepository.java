package com.sufe.ai.generation.repository;

import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationJobStatus;
import com.sufe.ai.generation.domain.GenerationProvider;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;
import java.util.Collection;

public interface GenerationJobRepository extends JpaRepository<GenerationJob, String> {

    Optional<GenerationJob> findByUserIdAndIdempotencyKey(String userId, String idempotencyKey);

    Optional<GenerationJob> findFirstByUserIdAndIdeaIdAndArtifactTypeAndStatusInOrderByCreatedAtDesc(
            String userId,
            String ideaId,
            com.sufe.ai.generation.domain.ArtifactType artifactType,
            Collection<GenerationJobStatus> statuses
    );

    long countByProviderAndStatus(GenerationProvider provider, GenerationJobStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<GenerationJob> findFirstByProviderAndStatusOrderByCreatedAtAscQueueSequenceAsc(
            GenerationProvider provider,
            GenerationJobStatus status
    );
}
