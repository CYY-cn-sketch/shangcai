package com.sufe.ai.workspace.repository;

import com.sufe.ai.workspace.domain.StudentAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentAttachmentRepository extends JpaRepository<StudentAttachment, String> {
    List<StudentAttachment> findAllByUserIdAndClientMessageIdOrderByCreatedAtAsc(String userId, String clientMessageId);
    List<StudentAttachment> findAllByUserIdAndIdeaIdOrderByCreatedAtAsc(String userId, String ideaId);
    Optional<StudentAttachment> findByIdAndUserId(String id, String userId);
    Optional<StudentAttachment> findByUserIdAndClientMessageIdAndSha256(String userId, String clientMessageId, String sha256);
}
