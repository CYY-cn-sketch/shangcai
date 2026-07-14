package com.sufe.ai.provider.session.service;

import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.provider.session.domain.ProviderSession;
import com.sufe.ai.provider.session.repository.ProviderSessionRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.UUID;

@Service
public class ProviderSessionService {

    private final ProviderSessionRepository providerSessionRepository;

    public ProviderSessionService(ProviderSessionRepository providerSessionRepository) {
        this.providerSessionRepository = providerSessionRepository;
    }

    public ProviderSession getOrCreate(
            String userId,
            String projectId,
            String conversationId,
            String expertId,
            GenerationProvider provider
    ) {
        String normalizedUserId = requireText(userId, "userId");
        String normalizedProjectId = requireText(projectId, "projectId");
        String normalizedConversationId = requireText(conversationId, "conversationId");
        String normalizedExpertId = requireText(expertId, "expertId");
        GenerationProvider requiredProvider = Objects.requireNonNull(provider, "provider 不能为空");

        return providerSessionRepository
                .findByUserIdAndProjectIdAndConversationIdAndExpertIdAndProvider(
                        normalizedUserId,
                        normalizedProjectId,
                        normalizedConversationId,
                        normalizedExpertId,
                        requiredProvider
                )
                .orElseGet(() -> createOrReadWinner(
                        normalizedUserId,
                        normalizedProjectId,
                        normalizedConversationId,
                        normalizedExpertId,
                        requiredProvider
                ));
    }

    @Transactional
    public ProviderSession updateExternalSessionId(String providerSessionId, String externalSessionId) {
        String normalizedId = requireText(providerSessionId, "providerSessionId");
        ProviderSession providerSession = providerSessionRepository.findById(normalizedId)
                .orElseThrow(() -> new IllegalArgumentException("供应商会话上下文不存在: " + normalizedId));
        providerSession.updateExternalSessionId(externalSessionId);
        return providerSessionRepository.saveAndFlush(providerSession);
    }

    private ProviderSession createOrReadWinner(
            String userId,
            String projectId,
            String conversationId,
            String expertId,
            GenerationProvider provider
    ) {
        ProviderSession providerSession = ProviderSession.create(
                userId,
                projectId,
                conversationId,
                expertId,
                provider,
                UUID.randomUUID().toString().replace("-", "")
        );

        // getOrCreate 不开启外层事务，插入失败回滚后才能安全读取并发事务创建的记录。
        try {
            return providerSessionRepository.saveAndFlush(providerSession);
        } catch (DataIntegrityViolationException exception) {
            return providerSessionRepository
                    .findByUserIdAndProjectIdAndConversationIdAndExpertIdAndProvider(
                            userId,
                            projectId,
                            conversationId,
                            expertId,
                            provider
                    )
                    .orElseThrow(() -> exception);
        }
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " 不能为空");
        }
        return value.trim();
    }
}
