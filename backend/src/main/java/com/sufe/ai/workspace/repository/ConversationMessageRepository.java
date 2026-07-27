package com.sufe.ai.workspace.repository;

import com.sufe.ai.workspace.domain.ConversationMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConversationMessageRepository extends JpaRepository<ConversationMessage, String> {
    List<ConversationMessage> findAllByUserIdOrderByCreatedAtAscIdAsc(String userId);
    List<ConversationMessage> findAllByUserIdAndConversationIdOrderByCreatedAtAscIdAsc(
            String userId,
            String conversationId
    );
    Optional<ConversationMessage> findByUserIdAndClientMessageId(String userId, String clientMessageId);
}
