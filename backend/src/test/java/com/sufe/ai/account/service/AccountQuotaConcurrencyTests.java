package com.sufe.ai.account.service;

import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.generation.domain.ArtifactType;
import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.generation.repository.GenerationJobRepository;
import com.sufe.ai.provider.deepseek.AiChatRequest;
import com.sufe.ai.provider.deepseek.AiChatRequestRepository;
import com.sufe.ai.usage.domain.AiUsageRecord;
import com.sufe.ai.usage.repository.AiUsageRecordRepository;
import com.sufe.ai.workspace.domain.StudentIdea;
import com.sufe.ai.workspace.repository.StudentIdeaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("test")
@SpringBootTest(properties =
        "spring.datasource.url=jdbc:h2:mem:sufe-ai-quota-concurrency;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AccountQuotaConcurrencyTests {

    @Autowired
    private AccountQuotaService quotaService;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private AiChatRequestRepository chatRequestRepository;

    @Autowired
    private AiUsageRecordRepository usageRecordRepository;

    @Autowired
    private GenerationJobRepository generationJobRepository;

    @Autowired
    private StudentIdeaRepository ideaRepository;

    @Test
    void admitsOnlyOneConcurrentAiReservationWhenOneCallRemains() throws Exception {
        UserAccount user = saveUser("quota-ai", 1, 10, 10);
        StudentIdea idea = ideaRepository.saveAndFlush(StudentIdea.create(
                user.getId(), "并发额度创意", "验证 AI 调用额度", "头脑风暴"
        ));

        List<Throwable> outcomes = runConcurrently(
                () -> reserveAi(user, idea.getId(), "message-ai-1"),
                () -> reserveAi(user, idea.getId(), "message-ai-2")
        );

        assertSingleQuotaRejection(outcomes, "AI 对话调用额度已用完");
        assertThat(chatRequestRepository.countByUserId(user.getId())).isEqualTo(1);
    }

    @Test
    void admitsOnlyOneConcurrentDirectLexiangReservationWhenOneCallRemains() throws Exception {
        UserAccount user = saveUser("quota-lexiang", 10, 1, 10);

        List<Throwable> outcomes = runConcurrently(
                () -> reserveDirectLexiang(user, "lexiang-reservation-1"),
                () -> reserveDirectLexiang(user, "lexiang-reservation-2")
        );

        assertSingleQuotaRejection(outcomes, "乐享 PPT 生成额度已用完");
        assertThat(usageRecordRepository.countByUserIdAndProviderAndOperation(
                user.getId(), GenerationProvider.LEXIANG, "PPT_KNOWLEDGE_GENERATION"
        )).isEqualTo(1);
    }

    @Test
    void admitsOnlyOneConcurrentWorkbuddyReservationWhenOneCallRemains() throws Exception {
        UserAccount user = saveUser("quota-workbuddy", 10, 10, 1);

        List<Throwable> outcomes = runConcurrently(
                () -> reserveWorkbuddy(user, "video-key-1", "idea-video-1"),
                () -> reserveWorkbuddy(user, "video-key-2", "idea-video-2")
        );

        assertSingleQuotaRejection(outcomes, "WorkBuddy 视频生成额度已用完");
        assertThat(generationJobRepository.countByUserIdAndProvider(
                user.getId(), GenerationProvider.WORKBUDDY
        )).isEqualTo(1);
    }

    private UserAccount saveUser(String suffix, int aiQuota, int lexiangQuota, int workbuddyQuota) {
        return userAccountRepository.saveAndFlush(UserAccount.create(
                "U-" + suffix,
                suffix + "@test.local",
                "unused",
                UserRole.STUDENT,
                "并发额度用户",
                "学生",
                aiQuota,
                lexiangQuota,
                workbuddyQuota
        ));
    }

    private void reserveAi(UserAccount user, String ideaId, String clientMessageId) {
        quotaService.reserveAiCall(
                user.getId(),
                Optional::empty,
                () -> chatRequestRepository.saveAndFlush(AiChatRequest.running(
                        user.getId(), ideaId, clientMessageId, "brainstorm"
                ))
        );
    }

    private void reserveDirectLexiang(UserAccount user, String requestId) {
        quotaService.reserveLexiangPpt(
                user.getId(),
                Optional::empty,
                () -> usageRecordRepository.saveAndFlush(AiUsageRecord.create(
                        user.getId(),
                        user.getDisplayName(),
                        null,
                        null,
                        null,
                        GenerationProvider.LEXIANG,
                        null,
                        "PPT_KNOWLEDGE_GENERATION",
                        requestId,
                        0,
                        0
                ))
        );
    }

    private void reserveWorkbuddy(UserAccount user, String idempotencyKey, String ideaId) {
        quotaService.reserveWorkbuddyVideo(
                user.getId(),
                Optional::empty,
                () -> generationJobRepository.saveAndFlush(GenerationJob.queued(
                        user.getId(),
                        "conversation-video",
                        "project-video",
                        ideaId,
                        "media",
                        GenerationProvider.WORKBUDDY,
                        ArtifactType.VIDEO,
                        "{\"businessPrompt\":\"snapshot\"}",
                        idempotencyKey,
                        true
                ))
        );
    }

    private static List<Throwable> runConcurrently(Runnable first, Runnable second) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<Throwable> firstResult = executor.submit(task(first, ready, start));
            Future<Throwable> secondResult = executor.submit(task(second, ready, start));
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            return List.of(firstResult.get(10, TimeUnit.SECONDS), secondResult.get(10, TimeUnit.SECONDS));
        } finally {
            executor.shutdownNow();
        }
    }

    private static Callable<Throwable> task(Runnable action, CountDownLatch ready, CountDownLatch start) {
        return () -> {
            ready.countDown();
            start.await(5, TimeUnit.SECONDS);
            try {
                action.run();
                return new SuccessfulReservation();
            } catch (Throwable throwable) {
                return throwable;
            }
        };
    }

    private static void assertSingleQuotaRejection(List<Throwable> outcomes, String message) {
        assertThat(outcomes).filteredOn(AccountQuotaExceededException.class::isInstance).singleElement()
                .satisfies(error -> assertThat(error).hasMessage(message));
        assertThat(outcomes).filteredOn(SuccessfulReservation.class::isInstance).hasSize(1);
    }

    private static final class SuccessfulReservation extends RuntimeException {
    }
}
