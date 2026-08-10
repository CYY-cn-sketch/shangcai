package com.sufe.ai.artifact.repository;

import com.sufe.ai.artifact.domain.ArtifactSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ArtifactSubmissionRepository extends JpaRepository<ArtifactSubmission, String> {
    List<ArtifactSubmission> findAllByStudentUserIdOrderBySubmittedAtDescSubmissionVersionDesc(String studentUserId);
    List<ArtifactSubmission> findAllByOrderBySubmittedAtDescSubmissionVersionDesc();
    Optional<ArtifactSubmission> findFirstByArtifactIdOrderBySubmissionVersionDesc(String artifactId);
    Optional<ArtifactSubmission> findByIdAndStudentUserId(String id, String studentUserId);
    boolean existsByArtifactId(String artifactId);

    @Query("select submission.artifactId from ArtifactSubmission submission where submission.id = :id")
    Optional<String> findArtifactIdById(@Param("id") String id);
}
