package com.sufe.ai.workspace.repository;

import com.sufe.ai.workspace.domain.StudentIdea;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentIdeaRepository extends JpaRepository<StudentIdea, String> {
    List<StudentIdea> findAllByUserIdOrderByUpdatedAtDesc(String userId);
    Optional<StudentIdea> findByIdAndUserId(String id, String userId);
}
