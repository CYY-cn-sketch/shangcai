package com.sufe.ai.generation.service;

import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.generation.domain.ArtifactType;
import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.generation.repository.GenerationJobRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class GenerationJobService {

    private final GenerationJobRepository generationJobRepository;
    private final UserAccountRepository userAccountRepository;

    public GenerationJobService(
            GenerationJobRepository generationJobRepository,
            UserAccountRepository userAccountRepository
    ) {
        this.generationJobRepository = generationJobRepository;
        this.userAccountRepository = userAccountRepository;
    }

    public SubmissionResult submit(String accountName, SubmitCommand command) {
        String userId = resolveUserId(accountName);
        String idempotencyKey = command.idempotencyKey().trim();

        Optional<GenerationJob> existing = generationJobRepository
                .findByUserIdAndIdempotencyKey(userId, idempotencyKey);
        if (existing.isPresent()) {
            return new SubmissionResult(existing.get(), false);
        }

        GenerationJob queuedJob = GenerationJob.queued(
                userId,
                command.conversationId(),
                command.projectId(),
                command.ideaId(),
                command.expertId(),
                resolveProvider(command.artifactType()),
                command.artifactType(),
                command.contextSnapshot(),
                idempotencyKey
        );

        // 保持服务方法无外层事务，唯一键冲突回滚后才能安全回读已提交的任务。
        try {
            return new SubmissionResult(generationJobRepository.saveAndFlush(queuedJob), true);
        } catch (DataIntegrityViolationException exception) {
            return generationJobRepository.findByUserIdAndIdempotencyKey(userId, idempotencyKey)
                    .map(job -> new SubmissionResult(job, false))
                    .orElseThrow(() -> exception);
        }
    }

    public Optional<GenerationJob> findOwnedJob(String accountName, String jobId) {
        String userId = resolveUserId(accountName);
        return generationJobRepository.findById(jobId)
                .filter(job -> job.getUserId().equals(userId));
    }

    private String resolveUserId(String accountName) {
        return userAccountRepository.findByAccountIgnoreCase(accountName)
                .orElseThrow(() -> new IllegalStateException("认证账号不存在"))
                .getId();
    }

    private static GenerationProvider resolveProvider(ArtifactType artifactType) {
        return switch (artifactType) {
            case PPT -> GenerationProvider.LEXIANG;
            case VIDEO -> GenerationProvider.WORKBUDDY;
            case WORD -> throw new IllegalArgumentException("WORD 生成适配器尚未启用");
        };
    }

    public record SubmitCommand(
            ArtifactType artifactType,
            String projectId,
            String conversationId,
            String ideaId,
            String expertId,
            String contextSnapshot,
            String idempotencyKey
    ) {
    }

    public record SubmissionResult(GenerationJob job, boolean created) {
    }
}
