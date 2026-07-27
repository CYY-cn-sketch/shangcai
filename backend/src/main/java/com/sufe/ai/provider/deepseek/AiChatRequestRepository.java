package com.sufe.ai.provider.deepseek;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AiChatRequestRepository extends JpaRepository<AiChatRequest, String> {
    Optional<AiChatRequest> findByUserIdAndClientMessageId(String userId, String clientMessageId);
}
