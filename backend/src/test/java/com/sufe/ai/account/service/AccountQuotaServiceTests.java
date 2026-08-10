package com.sufe.ai.account.service;

import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.generation.repository.GenerationJobRepository;
import com.sufe.ai.provider.deepseek.AiChatRequestRepository;
import com.sufe.ai.usage.repository.AiUsageRecordRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AccountQuotaServiceTests {

    @Test
    void reportsIndependentAiPptAndVideoUsage() {
        UserAccountRepository userAccountRepository = mock(UserAccountRepository.class);
        AiUsageRecordRepository usageRecordRepository = mock(AiUsageRecordRepository.class);
        GenerationJobRepository generationJobRepository = mock(GenerationJobRepository.class);
        AiChatRequestRepository chatRequestRepository = mock(AiChatRequestRepository.class);
        AccountQuotaService service = new AccountQuotaService(
                userAccountRepository,
                usageRecordRepository,
                generationJobRepository,
                chatRequestRepository
        );
        UserAccount user = UserAccount.create(
                "student-001", "student@test.local", "unused", UserRole.STUDENT,
                "测试学生", "学生", 2000, 100, 20
        );

        when(userAccountRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(chatRequestRepository.countByUserId(user.getId())).thenReturn(8L);
        when(generationJobRepository.countByUserIdAndProvider(user.getId(), GenerationProvider.LEXIANG))
                .thenReturn(3L);
        when(usageRecordRepository.countByUserIdAndProviderAndOperation(
                user.getId(), GenerationProvider.LEXIANG, "PPT_KNOWLEDGE_GENERATION"
        )).thenReturn(2L);
        when(generationJobRepository.countByUserIdAndProvider(user.getId(), GenerationProvider.WORKBUDDY))
                .thenReturn(1L);

        AccountQuotaService.QuotaSnapshot snapshot = service.snapshot(user.getId());

        assertThat(snapshot.aiCalls()).isEqualTo(new AccountQuotaService.QuotaUsage(2000, 8, 1992));
        assertThat(snapshot.lexiangPpt()).isEqualTo(new AccountQuotaService.QuotaUsage(100, 5, 95));
        assertThat(snapshot.workbuddyVideo()).isEqualTo(new AccountQuotaService.QuotaUsage(20, 1, 19));
    }

    @Test
    void rejectsAProviderCallWhenItsOwnQuotaIsExhausted() {
        UserAccountRepository userAccountRepository = mock(UserAccountRepository.class);
        AiUsageRecordRepository usageRecordRepository = mock(AiUsageRecordRepository.class);
        GenerationJobRepository generationJobRepository = mock(GenerationJobRepository.class);
        AiChatRequestRepository chatRequestRepository = mock(AiChatRequestRepository.class);
        AccountQuotaService service = new AccountQuotaService(
                userAccountRepository,
                usageRecordRepository,
                generationJobRepository,
                chatRequestRepository
        );
        UserAccount user = UserAccount.create(
                "student-002", "student2@test.local", "unused", UserRole.STUDENT,
                "测试学生", "学生", 2000, 1, 20
        );

        when(userAccountRepository.findByIdForUpdate(user.getId())).thenReturn(Optional.of(user));
        when(generationJobRepository.countByUserIdAndProvider(user.getId(), GenerationProvider.LEXIANG))
                .thenReturn(1L);

        assertThatThrownBy(() -> service.reserveLexiangPpt(
                user.getId(),
                Optional::empty,
                () -> "new-call"
        ))
                .isInstanceOf(AccountQuotaExceededException.class)
                .hasMessage("乐享 PPT 生成额度已用完");
    }
}
