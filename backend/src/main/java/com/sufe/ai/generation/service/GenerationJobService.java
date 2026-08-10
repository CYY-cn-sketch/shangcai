package com.sufe.ai.generation.service;

import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.account.service.AccountQuotaService;
import com.sufe.ai.generation.domain.ArtifactType;
import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.generation.repository.GenerationJobRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.List;

@Service
public class GenerationJobService {

    private final GenerationJobRepository generationJobRepository;
    private final UserAccountRepository userAccountRepository;
    private final AccountQuotaService quotaService;

    public GenerationJobService(
            GenerationJobRepository generationJobRepository,
            UserAccountRepository userAccountRepository,
            AccountQuotaService quotaService
    ) {
        this.generationJobRepository = generationJobRepository;
        this.userAccountRepository = userAccountRepository;
        this.quotaService = quotaService;
    }

    public SubmissionResult submit(String accountName, SubmitCommand command) {
        String userId = resolveUserId(accountName);
        String idempotencyKey = command.idempotencyKey().trim();

        Optional<GenerationJob> existing = findReusableJob(userId, idempotencyKey, command);
        if (existing.isPresent()) {
            return new SubmissionResult(existing.get(), false);
        }

        validateNewSubmission(command);

        GenerationJob queuedJob = GenerationJob.queued(
                userId,
                command.conversationId(),
                command.projectId(),
                command.ideaId(),
                command.expertId(),
                resolveProvider(command.artifactType()),
                command.artifactType(),
                command.contextSnapshot(),
                idempotencyKey,
                command.costConfirmed()
        );
        AccountQuotaService.Reservation<GenerationJob> reservation = switch (command.artifactType()) {
            case PPT -> quotaService.reserveLexiangPpt(
                    userId,
                    () -> findReusableJob(userId, idempotencyKey, command),
                    () -> generationJobRepository.saveAndFlush(queuedJob)
            );
            case VIDEO -> quotaService.reserveWorkbuddyVideo(
                    userId,
                    () -> findReusableJob(userId, idempotencyKey, command),
                    () -> generationJobRepository.saveAndFlush(queuedJob)
            );
            case WORD -> throw new IllegalArgumentException("WORD 生成适配器尚未启用");
        };
        return new SubmissionResult(reservation.value(), reservation.created());
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

    private Optional<GenerationJob> findReusableJob(
            String userId,
            String idempotencyKey,
            SubmitCommand command
    ) {
        Optional<GenerationJob> existing = generationJobRepository
                .findByUserIdAndIdempotencyKey(userId, idempotencyKey);
        if (existing.isPresent() || command.artifactType() != ArtifactType.VIDEO) return existing;
        if (command.ideaId() == null || command.ideaId().isBlank()) return Optional.empty();
        return generationJobRepository
                .findFirstByUserIdAndIdeaIdAndArtifactTypeAndStatusInOrderByCreatedAtDesc(
                        userId,
                        command.ideaId().trim(),
                        ArtifactType.VIDEO,
                        List.of(
                                com.sufe.ai.generation.domain.GenerationJobStatus.QUEUED,
                                com.sufe.ai.generation.domain.GenerationJobStatus.RUNNING
                        )
                );
    }

    private static GenerationProvider resolveProvider(ArtifactType artifactType) {
        return switch (artifactType) {
            case PPT -> GenerationProvider.LEXIANG;
            case VIDEO -> GenerationProvider.WORKBUDDY;
            case WORD -> throw new IllegalArgumentException("WORD 生成适配器尚未启用");
        };
    }

    private static void validateNewSubmission(SubmitCommand command) {
        if (command.artifactType() != ArtifactType.VIDEO) {
            return;
        }
        if (!command.costConfirmed()) {
            throw new IllegalArgumentException("VIDEO generation requires explicit cost confirmation");
        }
        if (!"media".equals(command.expertId())) {
            throw new IllegalArgumentException("VIDEO generation is only available to the media expert");
        }
        if (command.ideaId() == null || command.ideaId().isBlank()) {
            throw new IllegalArgumentException("VIDEO generation requires ideaId");
        }
    }

    public record SubmitCommand(
            ArtifactType artifactType,
            String projectId,
            String conversationId,
            String ideaId,
            String expertId,
            String contextSnapshot,
            String idempotencyKey,
            boolean costConfirmed
    ) {
    }

    public record SubmissionResult(GenerationJob job, boolean created) {
    }
}
