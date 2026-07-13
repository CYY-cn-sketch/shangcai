package com.sufe.ai.generation.repository;

import com.sufe.ai.generation.domain.GenerationJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GenerationJobRepository extends JpaRepository<GenerationJob, String> {

    Optional<GenerationJob> findByUserIdAndIdempotencyKey(String userId, String idempotencyKey);
}
