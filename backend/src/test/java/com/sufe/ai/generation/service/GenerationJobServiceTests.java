package com.sufe.ai.generation.service;

import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.account.service.AccountQuotaService;
import com.sufe.ai.generation.domain.ArtifactType;
import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.generation.repository.GenerationJobRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class GenerationJobServiceTests {

    @Test
    void reusesTheActiveVideoJobEvenIfASecondRequestUsesAnotherKey() {
        GenerationJobRepository generationJobRepository = mock(GenerationJobRepository.class);
        UserAccountRepository userAccountRepository = mock(UserAccountRepository.class);
        AccountQuotaService quotaService = mock(AccountQuotaService.class);
        GenerationJobService service = new GenerationJobService(generationJobRepository, userAccountRepository, quotaService);
        UserAccount user = UserAccount.create(
                "user-video", "video@test.local", "unused", UserRole.STUDENT, "Video user", "student", 100);
        GenerationJob activeJob = GenerationJob.queued(
                user.getId(), "conversation-001", "project-001", "idea-001", "media",
                GenerationProvider.WORKBUDDY, ArtifactType.VIDEO,
                "{\"businessPrompt\":\"snapshot\"}", "workbuddy-video:asset-001:v1");

        when(userAccountRepository.findByAccountIgnoreCase(user.getAccount())).thenReturn(Optional.of(user));
        when(generationJobRepository.findByUserIdAndIdempotencyKey(user.getId(), "second-key"))
                .thenReturn(Optional.empty());
        when(generationJobRepository
                .findFirstByUserIdAndIdeaIdAndArtifactTypeAndStatusInOrderByCreatedAtDesc(
                        any(), any(), any(), any()))
                .thenReturn(Optional.of(activeJob));

        GenerationJobService.SubmissionResult result = service.submit(
                user.getAccount(),
                new GenerationJobService.SubmitCommand(
                        ArtifactType.VIDEO, "project-001", "conversation-001", "idea-001", "media",
                        "{\"businessPrompt\":\"snapshot\"}", "second-key", true));

        assertThat(result.created()).isFalse();
        assertThat(result.job()).isSameAs(activeJob);
        verify(generationJobRepository, never()).saveAndFlush(any());
    }

    @Test
    void returnsWinningJobWhenQuotaReservationFindsConcurrentSubmit() {
        GenerationJobRepository generationJobRepository = mock(GenerationJobRepository.class);
        UserAccountRepository userAccountRepository = mock(UserAccountRepository.class);
        AccountQuotaService quotaService = mock(AccountQuotaService.class);
        GenerationJobService service = new GenerationJobService(generationJobRepository, userAccountRepository, quotaService);
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
                .thenReturn(Optional.empty());
        when(quotaService.<GenerationJob>reserveLexiangPpt(any(), any(), any()))
                .thenReturn(new AccountQuotaService.Reservation<>(winningJob, false));

        GenerationJobService.SubmissionResult result = service.submit(
                user.getAccount(),
                new GenerationJobService.SubmitCommand(
                        ArtifactType.PPT,
                        "project-001",
                        "conversation-001",
                        "idea-001",
                        "pitch-expert",
                        "{\"summary\":\"snapshot\"}",
                        " same-key ",
                        false
                )
        );

        assertThat(result.created()).isFalse();
        assertThat(result.job()).isSameAs(winningJob);
    }
}
