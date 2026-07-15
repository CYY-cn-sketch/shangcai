package com.sufe.ai.generation.worker;

import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationJobStatus;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.generation.repository.GenerationJobRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Optional;

@Component
public class GenerationJobWorker {

    private final GenerationJobRepository generationJobRepository;

    public GenerationJobWorker(GenerationJobRepository generationJobRepository) {
        this.generationJobRepository = generationJobRepository;
    }

    @Transactional
    public Optional<GenerationJob> claimNext(
            GenerationProvider provider,
            String providerWorkerId
    ) {
        Objects.requireNonNull(provider, "provider 不能为空");
        return generationJobRepository
                .findFirstByProviderAndStatusOrderByCreatedAtAscQueueSequenceAsc(
                        provider,
                        GenerationJobStatus.QUEUED
                )
                .map(job -> {
                    job.start(providerWorkerId);
                    return job;
                });
    }

    @Transactional
    public GenerationJob recordExternalRunId(String jobId, String externalRunId) {
        GenerationJob job = generationJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("生成任务不存在: " + jobId));
        job.recordExternalRunId(externalRunId);
        return job;
    }
}
