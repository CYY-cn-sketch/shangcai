package com.sufe.ai.workspace.repository;

import com.sufe.ai.workspace.domain.ExpertHandoff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExpertHandoffRepository extends JpaRepository<ExpertHandoff, String> {
    List<ExpertHandoff> findAllByUserIdOrderByConfirmedAtDesc(String userId);
    Optional<ExpertHandoff> findByUserIdAndSourceArtifactIdAndTargetExpertId(
            String userId,
            String sourceArtifactId,
            String targetExpertId
    );
}
