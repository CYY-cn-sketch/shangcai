package com.sufe.ai.workspace.repository;

import com.sufe.ai.workspace.domain.StudentConversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentConversationRepository extends JpaRepository<StudentConversation, String> {
    List<StudentConversation> findAllByUserIdOrderByUpdatedAtDesc(String userId);
    List<StudentConversation> findAllByUserIdAndIdeaIdOrderByUpdatedAtDesc(String userId, String ideaId);
    Optional<StudentConversation> findFirstByUserIdAndIdeaIdOrderByUpdatedAtDesc(String userId, String ideaId);
    Optional<StudentConversation> findByIdAndUserId(String id, String userId);

    /** 兼容旧调用；多会话模式下返回该项目最近更新的一条对话。 */
    default Optional<StudentConversation> findByUserIdAndIdeaId(String userId, String ideaId) {
        return findFirstByUserIdAndIdeaIdOrderByUpdatedAtDesc(userId, ideaId);
    }
}
