package com.sufe.ai.usage.repository;

import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.usage.domain.AiUsageRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface AiUsageRecordRepository extends JpaRepository<AiUsageRecord, String> {

    Optional<AiUsageRecord> findByProviderAndRequestId(GenerationProvider provider, String requestId);

    List<AiUsageRecord> findByRecordedAtGreaterThanEqualOrderByRecordedAtDesc(Instant recordedAt);

    List<AiUsageRecord> findAllByOrderByRecordedAtDesc();
}
