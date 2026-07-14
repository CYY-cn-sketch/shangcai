package com.sufe.ai.generation.service;

import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.generation.domain.ArtifactType;
import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.generation.repository.GenerationJobRepository;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GenerationJobServiceTests {

    @Test
    void returnsWinningJobWhenConcurrentSubmitHitsUniqueConstraint() {
        GenerationJobRepository generationJobRepository = mock(GenerationJobRepository.class);
        UserAccountRepository userAccountRepository = mock(UserAccountRepository.class);
        GenerationJobService service = new GenerationJobService(generationJobRepository, userAccountRepository);
        UserAccount user = UserAccount.create(
                "user-001",
                "student@test.local",
                "unused-password-hash",
                UserRole.STUDENT,
                "测试学生",
                "学生",
                100
        );
        GenerationJob winningJob = GenerationJob.queued(
                user.getId(),
                "conversation-001",
                "project-001",
                null,
                "pitch-expert",
                GenerationProvider.LEXIANG,
                ArtifactType.PPT,
                "{\"summary\":\"snapshot\"}",
                "same-key"
        );

        when(userAccountRepository.findByAccountIgnoreCase(user.getAccount())).thenReturn(Optional.of(user));
        when(generationJobRepository.findByUserIdAndIdempotencyKey(user.getId(), "same-key"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(winningJob));
        when(generationJobRepository.saveAndFlush(any(GenerationJob.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key"));

        GenerationJobService.SubmissionResult result = service.submit(
                user.getAccount(),
                new GenerationJobService.SubmitCommand(
                        ArtifactType.PPT,
                        "project-001",
                        "conversation-001",
                        "idea-001",
                        "pitch-expert",
                        "{\"summary\":\"snapshot\"}",
                        " same-key "
                )
        );

        assertThat(result.created()).isFalse();
        assertThat(result.job()).isSameAs(winningJob);
    }
}
