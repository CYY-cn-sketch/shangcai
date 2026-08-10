package com.sufe.ai.provider.session.repository;

import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.provider.session.domain.ProviderSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProviderSessionRepository extends JpaRepository<ProviderSession, String> {

    Optional<ProviderSession> findByUserIdAndProjectIdAndConversationIdAndExpertIdAndProvider(
            String userId,
            String projectId,
            String conversationId,
            String expertId,
            GenerationProvider provider
    );
}
