package com.sufe.ai.artifact.repository;

import com.sufe.ai.artifact.domain.ArtifactSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ArtifactSubmissionRepository extends JpaRepository<ArtifactSubmission, String> {
    List<ArtifactSubmission> findAllByStudentUserIdOrderBySubmittedAtDesc(String studentUserId);
    List<ArtifactSubmission> findAllByOrderBySubmittedAtDesc();
    Optional<ArtifactSubmission> findByArtifactId(String artifactId);
    Optional<ArtifactSubmission> findByIdAndStudentUserId(String id, String studentUserId);
    boolean existsByArtifactId(String artifactId);
}
