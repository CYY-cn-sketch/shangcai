package com.sufe.ai.account.service;

import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.generation.repository.GenerationJobRepository;
import com.sufe.ai.provider.deepseek.AiChatRequestRepository;
import com.sufe.ai.usage.repository.AiUsageRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.function.Supplier;

@Service
public class AccountQuotaService {

    private static final String DIRECT_LEXIANG_PPT_OPERATION = "PPT_KNOWLEDGE_GENERATION";

    private final UserAccountRepository userAccountRepository;
    private final AiUsageRecordRepository usageRecordRepository;
    private final GenerationJobRepository generationJobRepository;
    private final AiChatRequestRepository chatRequestRepository;

    public AccountQuotaService(
            UserAccountRepository userAccountRepository,
            AiUsageRecordRepository usageRecordRepository,
            GenerationJobRepository generationJobRepository,
            AiChatRequestRepository chatRequestRepository
    ) {
        this.userAccountRepository = userAccountRepository;
        this.usageRecordRepository = usageRecordRepository;
        this.generationJobRepository = generationJobRepository;
        this.chatRequestRepository = chatRequestRepository;
    }

    public QuotaSnapshot snapshot(String userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("账号不存在"));
        return snapshot(user);
    }

    @Transactional
    public <T> Reservation<T> reserveAiCall(
            String userId,
            Supplier<Optional<T>> reusable,
            Supplier<T> create
    ) {
        return reserve(userId, QuotaType.AI_CALL, reusable, create);
    }

    @Transactional
    public <T> Reservation<T> reserveLexiangPpt(
            String userId,
            Supplier<Optional<T>> reusable,
            Supplier<T> create
    ) {
        return reserve(userId, QuotaType.LEXIANG_PPT, reusable, create);
    }

    @Transactional
    public <T> Reservation<T> reserveWorkbuddyVideo(
            String userId,
            Supplier<Optional<T>> reusable,
            Supplier<T> create
    ) {
        return reserve(userId, QuotaType.WORKBUDDY_VIDEO, reusable, create);
    }

    private <T> Reservation<T> reserve(
            String userId,
            QuotaType quotaType,
            Supplier<Optional<T>> reusable,
            Supplier<T> create
    ) {
        UserAccount user = userAccountRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new IllegalStateException("账号不存在"));
        Optional<T> existing = reusable.get();
        if (existing.isPresent()) return new Reservation<>(existing.get(), false);

        QuotaSnapshot snapshot = snapshot(user);
        switch (quotaType) {
            case AI_CALL -> requireAvailable("AI_CALL_QUOTA_EXCEEDED", "AI 对话调用额度已用完", snapshot.aiCalls());
            case LEXIANG_PPT -> requireAvailable("LEXIANG_PPT_QUOTA_EXCEEDED", "乐享 PPT 生成额度已用完", snapshot.lexiangPpt());
            case WORKBUDDY_VIDEO -> requireAvailable("WORKBUDDY_VIDEO_QUOTA_EXCEEDED", "WorkBuddy 视频生成额度已用完", snapshot.workbuddyVideo());
        }
        return new Reservation<>(create.get(), true);
    }

    private QuotaSnapshot snapshot(UserAccount user) {
        String userId = user.getId();
        long aiCallsUsed = chatRequestRepository.countByUserId(userId);
        long lexiangPptUsed = generationJobRepository.countByUserIdAndProvider(userId, GenerationProvider.LEXIANG)
                + usageRecordRepository.countByUserIdAndProviderAndOperation(
                        userId,
                        GenerationProvider.LEXIANG,
                        DIRECT_LEXIANG_PPT_OPERATION
                );
        long workbuddyVideoUsed = generationJobRepository.countByUserIdAndProvider(
                userId,
                GenerationProvider.WORKBUDDY
        );
        return new QuotaSnapshot(
                QuotaUsage.of(user.getQuotaRemaining(), aiCallsUsed),
                QuotaUsage.of(user.getLexiangPptQuota(), lexiangPptUsed),
                QuotaUsage.of(user.getWorkbuddyVideoQuota(), workbuddyVideoUsed)
        );
    }

    private static void requireAvailable(String code, String message, QuotaUsage quota) {
        if (quota.remaining() <= 0) {
            throw new AccountQuotaExceededException(code, message);
        }
    }

    public record QuotaSnapshot(QuotaUsage aiCalls, QuotaUsage lexiangPpt, QuotaUsage workbuddyVideo) {
    }

    public record Reservation<T>(T value, boolean created) {
    }

    public record QuotaUsage(int total, long used, long remaining) {

        private static QuotaUsage of(int total, long used) {
            return new QuotaUsage(total, used, Math.max(0, (long) total - used));
        }
    }

    private enum QuotaType {
        AI_CALL,
        LEXIANG_PPT,
        WORKBUDDY_VIDEO
    }
}
