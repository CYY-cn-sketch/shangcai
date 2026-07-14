package com.sufe.ai.workspace.repository;

import com.sufe.ai.workspace.domain.StudentConversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentConversationRepository extends JpaRepository<StudentConversation, String> {
    List<StudentConversation> findAllByUserIdOrderByUpdatedAtDesc(String userId);
    Optional<StudentConversation> findByUserIdAndIdeaId(String userId, String ideaId);
}
